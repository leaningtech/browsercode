# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is BrowserCode?

BrowserCode is a web-based IDE that runs entirely in the browser using WebAssembly. It has two experiences: a **playground IDE** at `/ide` (editor + file tree + terminals + live preview, with per-framework starter templates) and **AI coding CLIs** (Claude Code, Gemini CLI) at `/agents/[tool]`. Both are built on BrowserPod, which provides a sandboxed Node.js environment with persistent filesystem storage, POSIX CLI tools (bash, git, npm), and instant app previews via WebAssembly-based portal URLs.

See `docs/codebase-guide.md` for a full structural tour.

## Quick Start

```bash
npm install                # Install dependencies
npm run dev               # Start development server at http://localhost:5173
npm run check             # Run type checking and Svelte validation
npm run lint              # Check code style with ESLint and Prettier
npm run format            # Auto-format code with Prettier
npm run build             # Build for production
npm run preview           # Preview production build locally
```

## Tech Stack

- **Framework**: SvelteKit 2.50.2 (Svelte 5.51.0)
- **Build**: Vite 7.3.1
- **Styling**: Tailwind CSS 4.1.18
- **Runtime**: BrowserPod 2.8.0 (WebAssembly Node.js environment)
- **Type System**: TypeScript 5.9.3 (strict mode)
- **Icons**: Iconify + mingcute icon set
- **Code Quality**: ESLint 9.39.2, Prettier 3.8.1

## High-Level Architecture

### User-Facing Flow

```
User visits browsercode.io
  ↓
/ redirects to /ide (playground); agents live at /agents/claude, /agents/gemini
  ↓
+layout.svelte renders: Sidebar + Main Content Area
  ↓
/ide: ide/+page.svelte → IdeSession.boot() hydrates a framework template into a pod
/agents/[tool]: agents/[tool]/+page.svelte → bootCLI() boots the tool's disk image
  ↓
Terminal renders stdio output; Portal iframes live previews
```

### Routing & Tool Selection

The app is a client-rendered SPA (`adapter-static`, `ssr = false`, `200.html` fallback), so all redirects below run client-side.

- **Root**: `/` redirects to `/ide` (`src/routes/+page.ts`)
- **Playground IDE**: `/ide`, framework selected via `?framework=<id>` (registry in `lib/config/frameworks.ts`; templates in `static/templates/`)
- **Agent Pages**: `/agents/[tool]` (`routes/agents/[tool]/+page.svelte`)
- **Legacy URLs**: `/claude`, `/gemini`, … redirect to `/agents/<tool>` (`routes/[tool]/+page.ts`)
- **Supported Tools** (lib/config/tools.ts):
  - Claude Code: enabled, uses claude_20260506 disk image
  - Gemini CLI: enabled, uses gemini_20260430_2 disk image
  - Codex, OpenCode: disabled (coming soon)

Tool/IDE switching uses full page loads (`window.location.href`) on purpose — that is the teardown mechanism for the running pod.

### Component Hierarchy

**+layout.svelte** (root layout)

- Renders Sidebar (left) + main content (right)
- Manages tool validation and active tool state
- Sets up OG meta tags for social sharing

**agents/[tool]/+page.svelte** (agent application)

- Terminal component (simple div#console container)
- Portal component (preview iframe + controls)
- Desktop: split layout with drag-to-resize (portalFraction state)
- Mobile: tab navigation between Terminal and Preview views
- Handles portal updates from BrowserPod callbacks

**ide/+page.svelte** (playground application)

- Composes the IDE: icon rail, resizable side panel (FileTreePanel / FrameworkPanel), EditorPane (CodeMirror), TerminalTabs (Output + Bash), Portal preview
- Pod lifecycle and file/portal state live in `lib/ide/session.svelte.ts` (IdeSession); pod file I/O helpers in `lib/ide/pod-fs.ts`
- `lib/components/ide/EditorPane.svelte` is the only file importing `@codemirror/*` — it is designed to be replaced by VS Code Web later; session/pod-fs/frameworks survive that migration

**Portal.svelte**

- iFrame displaying preview URLs
- Port selector (if multiple services running)
- Menu for copy URL, QR code, open in new tab
- QR code generation using qrcode library

**Sidebar.svelte**

- Fixed-width nav (desktop only, hidden mobile)
- Tool buttons, GitHub/Discord links, Help button
- Uses Iconify icons with hover tooltips

**Stepper.svelte**

- Onboarding tutorial modal
- State managed via stepperState store

### Data Flow: BrowserPod & Portals

```
lib/utils/main.ts: bootCLI()
  1. Detects iOS (unsupported platform)
  2. Initializes BrowserPod with VITE_API_KEY env var
  3. Creates terminal linked to #console div
  4. Sets up portal listener (pod.onPortal callback)
  5. Creates /home/user/project directory
  6. Copies optional project file (CLAUDE.md or GEMINI.md)
  7. Runs CLI: node /path/to/cli.js in /home/user/project

BrowserPod callbacks:
  - Portal events: { port, url } → portalUpdate state → Portal component
  - Open events: Optional custom handler (e.g., OAuth URL rewriting for Claude)
```

**Portal Updates**: When a service starts on a port, BrowserPod emits `{ port, url, active: true }`. This is collected in the `portals` array (state in [tool]/+page.svelte), and the selected portal renders in the iFrame.

### Storage & Persistence

- Each tool has a `storageKey` (e.g., `claude_20260506`) that maps to a BrowserPod disk image URL
- BrowserPod caches the WebAssembly filesystem locally (IndexedDB)
- Changes persist across sessions within the same storage key
- Disk images are versioned; updating the version syncs a new baseline

### Configuration

**lib/config/tools.ts** defines:

- Tool metadata (id, label, icon, disabled flag)
- CLI configurations: disk image URL, storage key, command, args, optional project file, optional open callback

To add a new tool:

1. Add to `toolItems` array
2. Add config to `cliConfigs` object
3. Ensure disk image is available at the WSS URL

## Development Workflow

### Adding a Component

1. Create a `.svelte` file in `src/lib/components/`
2. Use `<script lang="ts">` with `$props()` for type-safe props (Svelte 5 rune syntax)
3. Use `$derived()` for reactive computed values
4. Styling: Tailwind classes with `prettier-plugin-tailwindcss` auto-sorting

### Modifying Tool Configuration

Edit `src/lib/config/tools.ts`:

- Update disk image URLs when new versions are released
- Change `projectFile` path to copy a different CLAUDE.md/GEMINI.md
- Implement custom `openCallback` for OAuth or URL routing

### Responsive Design

- **Mobile breakpoint**: `max-width: 768px` (Tailwind's `md:` prefix)
- **Mobile view**: Tab-based navigation (terminal, preview, help tabs)
- **Desktop view**: Sidebar + resizable split layout
- **Safe area insets**: `env(safe-area-inset-bottom)` for notched devices

### CORS & Security

- **vite.config.ts**: Dev server headers set COEP, COOP, CSP for browserpod.io iframes
- **static/\_headers**: Production headers (served with the built `dist/`) enforce COOP/COEP/CSP, allow BrowserPod framing
- These are critical for BrowserPod to work; do not remove

## Key Files & Their Purposes

| File                                    | Purpose                                                  |
| --------------------------------------- | -------------------------------------------------------- |
| `src/routes/+page.ts`                   | Root route, redirects to /ide                            |
| `src/routes/[tool]/+page.ts`            | Legacy /claude, /gemini → /agents/\* redirects           |
| `src/routes/+layout.svelte`             | Main layout shell, sidebar, tool switching               |
| `src/routes/agents/[tool]/+page.svelte` | Terminal + preview portal interface (agents)             |
| `src/routes/ide/+page.svelte`           | Playground IDE layout and composition                    |
| `src/lib/components/*.svelte`           | UI components (Sidebar, Terminal, Portal, Stepper, etc.) |
| `src/lib/components/ide/*.svelte`       | IDE components (EditorPane, FileTreePanel, TerminalTabs) |
| `src/lib/config/tools.ts`               | Tool definitions, CLI args, disk image URLs              |
| `src/lib/config/frameworks.ts`          | Playground framework registry (templates, commands)      |
| `src/lib/utils/main.ts`                 | `bootCLI()` function, BrowserPod initialization (agents) |
| `src/lib/ide/session.svelte.ts`         | IdeSession: playground pod lifecycle and state           |
| `src/lib/ide/pod-fs.ts`                 | Pod filesystem read/write helpers                        |
| `src/lib/stores/stepper.svelte.ts`      | Tutorial modal state                                     |
| `static/templates/<id>/`                | Framework starter templates + manifest.txt               |
| `vite.config.ts`                        | Build config, dev CORS headers, Tailwind plugin          |
| `svelte.config.js`                      | SvelteKit static adapter (SPA, 200.html fallback)        |
| `tailwind.config.ts`                    | Custom theme colors (dark mode sidebar/panel/terminal)   |
| `static/_headers`                       | Production CORS headers                                  |

## Code Style & Conventions

- **Formatting**: Prettier with tabs (not spaces), 100 char line width
- **Plugins**: `prettier-plugin-svelte` + `prettier-plugin-tailwindcss` (auto-sorts Tailwind classes)
- **Linting**: ESLint with TypeScript and Svelte rules, no auto-fixes; use `npm run lint` to check
- **Type Safety**: Strict mode enabled; prefer `$props()` and type annotations over `let` with implicit types
- **Event Handlers**: Inline `onclick`/`onchange` attributes (Svelte convention)
- **Reactive**: Use `$derived()` for computed values, `$effect()` for side effects (Svelte 5 runes)

## Deployment

- **Adapter**: `@sveltejs/adapter-static` (client-rendered SPA, `200.html` fallback)
- **Build output**: `dist/` directory
- **Headers**: `static/_headers` configures headers for Netlify/Cloudflare
- **Environment**: `VITE_API_KEY` required at build/runtime (BrowserPod API key)

## Known Limitations (from README)

- iOS is not supported (detected at boot, shows `IosUnsupportedModal.svelte`)
- Safari is not fully supported — use a Chromium browser for maximum compatibility
- TCP networking is unavailable
- Native binaries are not supported (see [BrowserPod docs](https://browserpod.io/docs/guides/native-binaries))
