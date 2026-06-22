# Pi Agent — Integration Guide

## How agent support works in BrowserCode

Every agent in BrowserCode is defined by two things: a **tool entry** (metadata for the UI) and a **CLI config** (how BrowserPod boots and runs it). The entire integration surface is `src/lib/config/tools.ts`.

### Tool entry (`toolItems` array)

Controls whether the tool appears in the Sidebar/mobile sheet, whether it's clickable, and what icon it shows:

```ts
{ id: 'pi', icon: 'some-iconify-icon', label: 'Pi', disabled: false }
```

The `id` becomes the URL path (`/pi`), the storage key prefix, and the key into `cliConfigs`.

### CLI config (`cliConfigs` record)

Controls what BrowserPod actually runs:

| Field          | Purpose                                                                                                                                             |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `userImage`    | WSS URL to the `.ext2` disk image served by BrowserPod. Contains the pre-installed agent binary/node_modules.                                       |
| `storageKey`   | IndexedDB key for the user's persistent filesystem. Changing this wipes the user's local state and starts fresh from the disk image.                |
| `command`      | Executable to run (always `'node'` for pure-Node agents).                                                                                           |
| `args`         | Path(s) to the agent's entry point inside the disk image.                                                                                           |
| `projectFile`  | Path (relative to `static/`) of a file to copy into `/home/user/project/` at boot. Used to give the agent context about the BrowserPod environment. |
| `openCallback` | Optional function called by BrowserPod when the agent tries to `window.open()` a URL. Used for OAuth rewrites (see Claude's config).                |

### Boot sequence (`src/lib/utils/main.ts`)

`bootCLI()` is called once on mount in `[tool]/+page.svelte`:

1. Detects iOS → shows unsupported message if true
2. `BrowserPod.boot({ userImage, storageKey })` — downloads/resumes the OPFS-cached disk image
3. `pod.createDefaultTerminal(#console)` — attaches terminal I/O to the DOM
4. `pod.onPortal(cb)` — listens for port→URL mappings (live previews); feeds into `portalUpdate` state
5. `pod.onOpen(openCallback)` — optional URL intercept
6. `pod.createDirectory('/home/user/project')` — ensures project directory exists
7. `copyFile(pod, projectFile, ...)` — copies the agent instruction file into the project dir
8. `pod.run(command, args, { cwd: '/home/user/project' })` — starts the agent

### What "pure Node.js" means for BrowserPod compatibility

BrowserPod runs Node.js v22 compiled to WebAssembly. Any npm package that ships **prebuilt native binaries** for a host architecture (x64, arm64, etc.) will fail. Pi is pure Node.js, meaning it has no native binary dependencies — it will run on BrowserPod without any Wasm override shims.

---

## Steps to implement Pi support

### Step 1 — Get a Pi disk image from BrowserPod

Contact BrowserPod / Leaningtech to provision a disk image with Pi pre-installed:

- Pi should be installed globally in the image: `npm install -g @pi-cli/core` (or whatever the actual package name is — check [the Pi repo](https://pi.dev/) for the correct package)
- The entry point will be something like `/usr/local/lib/node_modules/@pi-cli/core/dist/cli.js` — confirm the exact path from the installed image
- Pick a versioned name for the image, e.g. `pi_20260601.ext2`, so future updates can bump the `storageKey` without breaking existing users

You'll get back a WSS URL like `wss://disks.browserpod.io/pi_20260601.ext2`.

### Step 2 — Add the tool entry in `src/lib/config/tools.ts`

Add Pi to `toolItems` (replace the `disabled: true` placeholder if Codex/OpenCode are to stay, or insert before them):

```ts
export type ToolId = 'claude' | 'gemini' | 'pi' | 'codex' | 'opencode';

// In toolItems:
{ id: 'pi', icon: '<iconify-icon-id>', label: 'Pi', disabled: false },
```

Find a suitable Iconify icon — `mingcute:robot-line` or `simple-icons:pi` are candidates. Check [Iconify](https://icon-sets.iconify.design/) for availability. If none exist, use the same SVG fallback pattern as OpenCode (add a `pi-logo.svg` to `src/lib/assets/` and handle the null-icon case in `Sidebar.svelte` and `[tool]/+page.svelte`).

### Step 3 — Add the CLI config in `src/lib/config/tools.ts`

```ts
pi: {
    userImage: 'wss://disks.browserpod.io/pi_20260601.ext2',
    storageKey: 'pi_20260601',
    command: 'node',
    args: ['/path/to/pi/cli.js'],   // confirm exact path from disk image
    projectFile: 'project/pi/PI.md' // see Step 4
}
```

Pi supports many model providers. If it reads API keys from environment variables (e.g. `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`), check whether BrowserPod's `pod.run()` accepts an `env` array — `bootCLI()` already passes `['COLORTERM=truecolor']`. Add keys there if needed, or rely on Pi's own interactive auth flow.

### Step 4 — Create the project instruction file

Create `static/project/pi/PI.md` (or `AGENTS.md`, whatever filename Pi reads by default). Model it on `static/project/gemini/GEMINI.md` — it should tell Pi:

- It is running inside BrowserCode on BrowserPod (browser-native Wasm Node.js)
- Native npm packages with prebuilt binaries will fail; pure-JS/Wasm alternatives must be used
- No TCP networking; HTTP via BrowserPod's portal system
- The user's project files are in `/home/user/project`

This file is fetched at boot via `copyFile()` using a standard `fetch()` call against the static asset path, so it must live under `static/`.

### Step 5 — Handle the icon in `Sidebar.svelte` and `[tool]/+page.svelte`

Both components already have a null-icon fallback for OpenCode using `opencode-logo.svg`. If Pi has no Iconify icon, follow the same pattern:

In `Sidebar.svelte` the `navButton` snippet:

```svelte
{#if item.icon}
	<Icon icon={item.icon} width="26" height="26" />
{:else if item.id === 'pi'}
	<img
		src={piLogoSrc}
		alt={item.label}
		class="h-[26px] w-[26px] {item.disabled ? 'opacity-15' : ''}"
	/>
{:else}
	<img src={opencodeLogoSrc} ... />
{/if}
```

In `[tool]/+page.svelte` the mobile tool menu sheet uses the same pattern — update both places.

### Step 6 — Update the Stepper onboarding modal

`src/lib/components/Stepper.svelte` hardcodes pixel offsets for the sidebar button positions (see the comment block around `agentButtonOffsets`). If Pi is inserted before Codex/OpenCode in `toolItems`, the button offsets for those two will shift by ~42px per inserted tool. Update `agentButtonOffsets.codex` and `agentButtonOffsets.opencode` accordingly.

### Step 7 — Test locally

```bash
npm run dev
```

Navigate to `http://localhost:5173/pi`. Verify:

1. BrowserPod boots and the terminal shows Pi's startup output
2. Pi responds to a prompt (e.g. "say hello")
3. If Pi can scaffold a web server, verify the portal preview activates
4. Confirm `npm run check` passes (no new TypeScript errors from the `ToolId` union change)

### Step 8 — Add Pi to the README roadmap table

Update the roadmap table in `README.md` to reflect Pi's status (beta open / coming soon).
