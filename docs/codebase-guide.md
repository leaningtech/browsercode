# BrowserCode Codebase Guide

A structural tour of the merged codebase: the **agents app** (AI coding CLIs in the browser, at
`/agents/[tool]`) and the **playground IDE** (formerly the standalone `tieknot-preview-demo` repo,
now at `/ide`). Both run on [BrowserPod](https://browserpod.io), a WebAssembly Node.js environment
with a POSIX filesystem, terminals and instant preview URLs ("portals").

## The two experiences

|             | Agents (`/agents/claude`, `/agents/gemini`)                                                                        | Playground IDE (`/ide`)                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| What boots  | A precompiled **ext2 disk image** per tool (`wss://disks.browserpod.io/…`) containing the CLI and its node_modules | A blank pod, **hydrated at runtime** from a framework template in `static/templates/` |
| Persistence | `storageKey` per disk-image version — user changes persist across sessions in IndexedDB                            | None — every visit starts fresh from the template                                     |
| UI          | Terminal (the CLI's own TUI) + preview portal                                                                      | Monaco editor + file tree + terminal tabs + preview portal                            |
| Boot entry  | `bootCLI()` in `src/lib/utils/main.ts`                                                                             | `IdeSession.boot()` in `src/lib/ide/session.svelte.ts`                                |

## Routing

- `/` → client-side redirect to `/ide` (`src/routes/+page.ts`). Easy to swap for a landing page later: replace the redirect with a page component.
- `/ide` → the playground (`src/routes/ide/+page.svelte`), framework chosen via `?framework=<id>`.
- `/agents/[tool]` → the agent pages (`src/routes/agents/[tool]/+page.svelte`).
- `/claude`, `/gemini`, … → legacy URLs, permanently redirected to `/agents/<tool>` by `src/routes/[tool]/+page.ts`.

The app is a **client-rendered SPA** (`adapter-static`, `ssr = false`, `200.html` fallback), so all
of these redirects run in the browser, not on a server. Real HTTP 301s would need host-side rules.

Navigation between tools/IDE uses full page loads (`window.location.href`) **on purpose** — it is
the teardown mechanism for the running pod.

## How a pod boots

### Agents (`src/lib/utils/main.ts`)

1. The page (not `main.ts`) decides _which_ agent to boot, from the route param; `bootCLI()` receives the tool id.
2. The BrowserPod import happens lazily inside the function — the package fetches its runtime via top-level await, so a static import would block route module init under CSR.
3. iOS is detected and rejected up front (constant-refresh issues on iOS; `IosUnsupportedModal` is also shown globally).
4. `BrowserPod.boot({ apiKey, userImage, storageKey })` — the agent is loaded from its precompiled ext2 image. Updating a tool = building a new disk image and bumping `userImage`/`storageKey` in `src/lib/config/tools.ts`.
5. A terminal is attached to the `#console` div, `pod.onPortal` is wired to the preview, and the CLI is launched with `pod.run(command, args, { cwd: '/home/user/project' })`.
6. `CLAUDE.md`/`GEMINI.md` from `static/project/` is copied into the pod filesystem first. It gives the CLI guidelines and **overrides for the WebAssembly environment**, and because it lives in the pod FS the user can read and modify it.
7. Claude-specific: an `onOpen` callback rewrites the OAuth localhost callback to the code-based exchange (`src/lib/config/tools.ts`).

### Playground (`src/lib/ide/session.svelte.ts`)

1. Each framework template is a real project checked into `static/templates/<dir>/` with a `manifest.txt` listing every file BrowserPod needs to load (one path per line). `package-lock.json` is included deliberately so `npm install` inside the pod is fast and deterministic.
2. `IdeSession.boot()` fetches the manifest, fetches each file, and writes them into the pod FS under `/home/user/` — the pod has a proper filesystem, so the editor reads/writes through `pod.openFile`/`pod.createFile` (`src/lib/ide/pod-fs.ts`).
3. Setup commands then the dev server run via `pod.run('npm', …, { cwd: '/home/user' })`, streaming into the first Terminal tab. The "+" control spawns additional closeable terminal tabs, each running an interactive `bash -i` (available once the pod is ready).
4. Framework registry: `src/lib/config/frameworks.ts`. Astro and Angular are **not** implemented — blocked by BrowserPod (Astro's install is too big; Angular insists on `ng serve`).
5. File management: creating files/folders uses the direct BrowserPod API (`createFile`/`createDirectory`); rename and delete are translated to `mv`/`rm` run through `bash -c` in a hidden terminal (`createCustomTerminal`), fire-and-trust with an optimistic tree update — `pod.run` exposes no exit code, and probing results through `openFile` is unreliable (the file API's view can lag the process world), so results are deliberately not verified. Hidden-terminal output is mirrored to the browser console as `[ide-fs]`. Pod→UI sync (picking up `touch`/`rm` made from terminal tabs) is not implemented yet — a pod-side watcher was tried and wedged the boot, so it needs a design that provably doesn't contend with `npm install`.

## Portals (previews)

When a service starts listening on a port inside the pod, BrowserPod emits `{ port, url }`.
There is no local hosting — the portal URL is a real, shareable BrowserPod URL.

- Both pages collect portal events into a `portals` array and render `src/lib/components/Portal.svelte`: preview iframe, **port dropdown when multiple ports/previews are open**, and a menu with copy link / open in new tab / QR code.
- Frameworks with a fixed app port (`appPort` in `frameworks.ts`: nuxt 3000, express 4000) pin the preview to that port; other ports stay reachable via the dropdown.

## Frontend structure

```
src/
├── app.html                       # analytics (GTM + Plausible), then SvelteKit takes over
├── routes/
│   ├── +layout.ts                 # ssr = false, prerender = true (CSR SPA)
│   ├── +layout.svelte             # Sidebar, OG meta, Stepper (agents only), UtilityBar
│   ├── +page.ts                   # / → /ide redirect
│   ├── [tool]/+page.ts            # legacy /claude → /agents/claude redirects
│   ├── agents/[tool]/+page.svelte # terminal + portal split view, mobile tabs
│   └── ide/+page.svelte           # playground layout: rail, panels, dividers, mobile tabs
└── lib/
    ├── config/tools.ts            # agent registry: disk images, commands, project files
    ├── config/frameworks.ts       # playground registry: templates, commands, ports
    ├── utils/main.ts              # bootCLI() for agents
    ├── ide/session.svelte.ts      # IdeSession: pod lifecycle + file/portal/terminal state
    ├── ide/pod-fs.ts              # pod filesystem read/write helpers
    ├── components/                # Sidebar, Portal, Terminal, Stepper, UtilityBar, …
    └── components/ide/            # IdeShell, IdeLanding, EditorPane (Monaco),
                                   # FileTreePanel, TerminalTabs
```

Design intent behind the `lib/ide/` split: `session.svelte.ts`, `pod-fs.ts` and
`config/frameworks.ts` are the parts that survive the planned **Monaco → VS Code Web
migration**; `components/ide/EditorPane.svelte` and `components/ide/monaco.ts` are the only files
that import `monaco-editor` and are meant to be replaced wholesale, along with `FileTreePanel`
(VS Code brings its own explorer).

- Monaco is loaded lazily (dynamic import in `EditorPane`) so its chunk stays off the agents routes; `monaco.ts` wires the Vite `?worker` workers, the `browsercode-dark` theme, and the file-suffix → language mapping. Svelte/Vue files highlight as HTML (Monaco has no grammar for them); TS/JS semantic validation is off (no resolvable node_modules in the pod).
- Open files are tabs: `IdeSession.openFiles` holds one `{ path, content, savedContent, preview }` entry per tab and `selectedFile` is the active path. `EditorPane` renders the tab strip and keeps one Monaco model per tab (plus a saved view state for cursor/scroll), so switching tabs preserves undo history and position. Switching or closing a dirty tab flushes it to the pod so the 1s autosave debounce can't drop an edit; renames remap open tab paths, deletes close the affected tabs. Single-clicking a file in the tree opens a preview tab (italic label) that the next single-click reuses; double-clicking or editing pins it.
- Terminal styling: BrowserPod terminals are xterm.js — restyling means overriding `.xterm-*` CSS classes (see `TerminalTabs.svelte` / agents `Terminal.svelte`).

## Headers / CORS

BrowserPod requires cross-origin isolation. Headers live in **two places** and must stay in sync:

- `vite.config.ts` — dev-server headers (COOP/COEP/CORP + CSP frame-ancestors).
- `static/_headers` — production headers, served with the built `dist/`.

Do not remove either; the WASM runtime breaks without them.

## Build & deploy

- `npm run dev` / `check` / `lint` / `format` / `build` (output in `dist/`).
- `VITE_API_KEY` (BrowserPod API key) must be set at build time. The old playground repo used `VITE_BP_APIKEY` — that name is gone; CI/deploy envs need the browsercode name.
- Deployment: pushed to Cloudflare-fronted hosting (the standalone repos used CircleCI: build → rsync to the deploy server → purge Cloudflare cache). The playground repo additionally ran lint checks in CI.
- **TODO (follow-up from the merge):** consolidate CI for this repo and add `npm run check` + `npm run lint` gates.

## Known limitations

- iOS unsupported (detected at boot); Safari only partially — use Chromium.
- No TCP networking inside the pod; no native binaries.
- Playground: no persistence yet (agents persist via `storageKey`); Astro/Angular templates blocked upstream.
