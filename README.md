<div align="center">

<img src="./static/readme/browsercode.webp" alt="BrowserCode — run AI coding CLIs in the browser" width="300" />

<br />

# Build web apps that embed AI coding CLIs

BrowserCode is an open source project built on [BrowserPod](https://browserpod.io/), a serverless runtime with a POSIX filesystem, `bash`, `git`, `npm`, and live previews, all running client-side via WebAssembly.

[![Discord server](https://img.shields.io/discord/988743885121548329?style=flat-square&color=%235865F2&logo=discord&logoColor=%23fff&label=discord)](https://discord.gg/8ySMrQv6X)
[![Issues](https://img.shields.io/github/issues/leaningtech/browsercode?style=flat-square&logo=github)](https://github.com/leaningtech/browsercode/issues)
[![Version](https://img.shields.io/badge/version-0.5.0-blue?style=flat-square)](package.json)
[![License](https://img.shields.io/badge/license-Apache--2.0-green?style=flat-square)](LICENSE.txt)
[![npm](https://img.shields.io/npm/v/browserpod)](https://npm.im/browserpod)

[Try it live](https://browsercode.io) · [Quickstart](#quickstart) · [How it works](#how-it-works) · [Roadmap](#roadmap) · [BrowserPod docs](https://browserpod.io/docs)

</div>

---

## What is BrowserCode?

BrowserCode is a runtime for AI coding CLIs. Using [BrowserPod](https://browserpod.io/), the POSIX filesystem, the dev server, and the network proxy all run **inside the user's browser tab** via WebAssembly. It boots instantly.

This repo is the demo: a clean SvelteKit shell that boots [Claude Code](https://www.anthropic.com/claude-code) and [Gemini CLI](https://github.com/google-gemini/gemini-cli) (with [Codex](https://openai.com/codex) and [OpenCode](https://opencode.ai) on the way), each in its own route, each with a live preview pane fed by BrowserPod's portal function.

## Quickstart

### Use it

Just open **[browsercode.io](https://browsercode.io)**. The default route boots Claude Code in your browser; switch CLIs from the sidebar or by visiting:

| Route | CLI |
| --- | --- |
| [`/claude`](https://browsercode.io/claude) | Claude Code |
| [`/gemini`](https://browsercode.io/gemini) | Gemini CLI |
| [`/codex`](https://browsercode.io/codex) | Codex *(coming soon)* |
| [`/opencode`](https://browsercode.io/opencode) | OpenCode *(coming soon)* |

Depending on your auth method, you may be asked to copy a code from a separate tab. After that, prompt the agent like you would on your laptop — except the filesystem it edits, the `npm install` it runs, and the dev server it spins up are all living in the same tab.

### Run it locally

```bash
git clone https://github.com/leaningtech/browsercode.git
cd browsercode
npm install
echo "VITE_API_KEY=your_browserpod_api_key" > .env
npm run dev
```

Get a BrowserPod API key from [browserpod.io](https://browserpod.io/). The dev server runs on `http://localhost:5173` with the cross-origin isolation headers BrowserPod requires already wired up in [vite.config.ts](vite.config.ts).

```bash
npm run build      # production build via @sveltejs/adapter-cloudflare
npm run check      # svelte-check + tsc
npm run lint       # prettier + eslint
```

## How it works

```text
┌──────────────────────────── Browser tab ────────────────────────────┐
│                                                                     │
│   Shell                ┌─────────────────────────────────────────┐  │
│   ┌──────────────┐     │           BrowserPod                    │  │
│   │  Sidebar     │     │  ┌─────────────────────────────────┐    │  │
│   │  /claude     │────▶│  │  Node.js (Wasm)                 │    │  │
│   │  /gemini     │     │  │  bash · git · npm · coreutils   │    │  │
│   │  /codex      │     │  │  POSIX FS (OPFS / IndexedDB)    │    │  │
│   │  /opencode   │     │  │                                 │    │  │
│   └──────────────┘     │  │  $ claude   ◀── the CLI itself  │    │  │
│        │               │  └─────────────────────────────────┘    │  │
│        │               │            │                            │  │
│        ▼               │            ▼                            │  │
│   ┌──────────────┐     │     dev server on :3000                 │  │
│   │  Terminal    │◀────┤            │                            │  │
│   │  (xterm)     │     │            ▼                            │  │
│   └──────────────┘     │     BrowserPod portal ──── public URL ──┼──┐
│                        │                                         │  │
│   ┌──────────────┐     └─────────────────────────────────────────┘  │
│   │  Portal pane │◀──────────── iframe ──────────────────────────── │
│   └──────────────┘                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

The shell does three things:

1. **Boots a Pod per route.** `/[tool]/+page.svelte` calls `bootCLI(tool)` from [src/lib/utils/main.ts](src/lib/utils/main.ts), which loads `@leaningtech/browserpod`, mounts the right disk image (e.g. `claude_20260506.ext2`), and runs the CLI's entrypoint inside the sandbox.
2. **Wires a terminal.** A real terminal emulator is bound to the Pod's stdio. The agent's keystrokes, output, and TTY signals all flow through it.
3. **Surfaces previews via the portal.** Whenever the agent (or you) starts a server inside the Pod, BrowserPod's `onPortal` callback fires with a public URL. The Portal pane embeds it as an iframe, with QR code + copy-link affordances for testing on a phone.

Per-tool config — disk image, command, args, optional auth-redirect rewrite — lives in [src/lib/config/tools.ts](src/lib/config/tools.ts).

## What you get

|  |  |
|---|---|
| **Real Node.js, in the browser** | Node 22 compiled to Wasm. Run `node`, `npm install`, `npm run build` against an actual POSIX filesystem — no shims, no fake VFS. |
| **POSIX-like filesystem** | Pods are ephemeral, but files can persist via OPFS / IndexedDB. The agent's project state is yours, scoped to the tab. |
| **Instant previews via portal URLs** | Any port the agent opens gets a public preview URL through BrowserPod's portal. |
| **Cross-origin isolated** | `COOP`/`COEP`/`CORP` headers configured for both Vite dev and Cloudflare prod (see [_headers](_headers) and [vite.config.ts](vite.config.ts)). Required for `SharedArrayBuffer` and Wasm threads. |
| **Frameworks supported** | Express, Svelte, Next, Nuxt, and React work out of the box (with Wasm overrides — see below). |
| **Browser-only** | No backend to deploy. The shell is a static Cloudflare Pages site; all compute is client-side. |

## The single most important constraint: Wasm overrides

Because the Pod runs Node compiled to Wasm, **any npm package that ships prebuilt native binaries for x64/arm64 won't load.** Any project the agent scaffolds — and any dependency it pulls — needs a Wasm-compatible substitute for native modules.

The shipped agent skill (see [static/project/claude/CLAUDE.md](static/project/claude/CLAUDE.md)) tells the model exactly which substitutions to make. The most common ones:

| Native package | Wasm replacement (via `overrides`) |
| --- | --- |
| `esbuild` | `npm:esbuild-wasm@*` |
| `rollup` | `npm:@rollup/wasm-node@*` |
| `@parcel/watcher` | `npm:@parcel/watcher-wasm@*` |
| Next.js SWC native | add `@next/swc-wasm-nodejs` (pinned to `next` version) |
| `@oxc-*` native bindings | `@oxc-*/binding-wasm32-wasi` |

If something fails to install, this is the first place to look.

## Project layout

```text
browsercode/
├── src/
│   ├── routes/
│   │   ├── +layout.svelte        # shell, sidebar, route-aware OG tags
│   │   ├── +page.server.ts       # / → /claude redirect
│   │   └── [tool]/
│   │       └── +page.svelte      # terminal + portal pane per CLI
│   └── lib/
│       ├── components/           # Terminal, Portal, Sidebar, Stepper, UtilityBar
│       ├── config/tools.ts       # CLI registry + per-tool BrowserPod config
│       ├── utils/main.ts         # bootCLI() — mounts the Pod and runs the CLI
│       └── stores/               # Svelte runes-based stores
├── static/
│   ├── project/
│   │   ├── claude/CLAUDE.md      # shipped into the Pod for Claude Code
│   │   └── gemini/GEMINI.md      # shipped into the Pod for Gemini CLI
│   └── readme/                   # README assets
├── _headers                      # Cloudflare Pages COOP/COEP/CORP
├── vite.config.ts                # same headers, mirrored for dev
└── svelte.config.js              # @sveltejs/adapter-cloudflare
```

## Adding a CLI

Adding a new CLI is mostly a matter of registering it. To add (say) `mytool`:

1. **Build a disk image** containing the CLI and its dependencies, and host it where BrowserPod can fetch it (`wss://disks.browserpod.io/...`).
2. **Register it** in [src/lib/config/tools.ts](src/lib/config/tools.ts):
   ```ts
   export const toolItems: ToolItem[] = [
     // ...
     { id: 'mytool', icon: 'mingcute:terminal-line', label: 'My Tool', disabled: false },
   ];

   export const cliConfigs: Record<string, CLIConfig> = {
     // ...
     mytool: {
       userImage: 'wss://disks.browserpod.io/mytool_YYYYMMDD.ext2',
       storageKey: 'mytool_YYYYMMDD',
       command: 'node',
       args: ['/home/user/mytool/cli.js'],
       projectFile: 'project/mytool/MYTOOL.md',
     },
   };
   ```
3. **Drop a primer file** at `static/project/mytool/MYTOOL.md` so the agent boots with the right operating instructions for the Wasm runtime.

The route `/mytool` works automatically — `[tool]/+page.svelte` is dynamic and the layout's OG tags pick up the new entry from `toolItems`.

## Breaking BrowserCode

This is BrowserCode's second beta. Don't be kind to it. Here are the walls you'll hit:

- **The agent may ignore its primer on the first turn.** The `CLAUDE.md` / `GEMINI.md` shipped into the Pod tells the model it's running on Wasm, but it can default to its usual behavior before consulting the file. Re-prompt or remind it.
- **No native binaries.** See [Wasm overrides](#the-single-most-important-constraint-wasm-overrides) above. If `npm install` blows up, this is almost always why.
- **No raw TCP.** Outbound HTTP works through the Pod's network layer; arbitrary TCP sockets do not.
- **Chromium only.** Safari isn't supported yet. Firefox is best-effort.
- **OPFS quotas.** Big projects can hit per-origin storage limits. Clear site data to recover.

More edge cases live in the [BrowserPod docs](https://browserpod.io/docs/guides/native-binaries).

## Roadmap

| | CLI | Status |
| :---: | --- | --- |
| <img src="./static/readme/gemini.webp" alt="Gemini CLI" width="32" height="32" /> | **Gemini CLI** | ✅ Beta open now |
| <img src="./static/readme/claude.webp" alt="Claude Code" width="32" height="32" /> | **Claude Code** | ✅ Beta open now |
| <img src="./static/readme/codex.webp" alt="Codex" width="32" height="32" /> | **Codex** | 🚧 Coming soon |
| <img src="./static/readme/opencode.webp" alt="OpenCode" width="32" height="32" /> | **OpenCode** | 🚧 Coming soon |

## Contributing

Issues and PRs are welcome — especially: more CLI integrations, Wasm overrides we've missed, and reproductions for crashes/hangs you find while breaking it.

For platform-level questions (BrowserPod itself, disk images, native-binary support), the right venue is the [BrowserPod issue tracker](https://github.com/leaningtech/browserpod) and the [Discord](https://discord.gg/8ySMrQv6X).

## License

Apache-2.0 — see [LICENSE.txt](LICENSE.txt).

---

<div align="center">

Built by [Leaning Technologies](https://leaningtech.com) on top of [BrowserPod](https://browserpod.io/).

</div>
