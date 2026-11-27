# CLAUDE.md — Operating Instructions for BrowserCode (BrowserPod Sandbox)

You are running inside **BrowserCode**, a demo environment that hosts AI coding agent CLIs inside **BrowserPod** sandboxes. Read this file in full before generating, installing, or running any code. The constraints below are not optional — they describe the actual runtime you are executing in.

---

## 1. What BrowserPod is

BrowserPod is a **browser-native sandbox**. The Node.js runtime, filesystem, processes, and network stack you have access to are **executing inside the user's browser tab**, compiled to WebAssembly. There is no remote VM, no container host, and no Linux kernel underneath you in the conventional sense — Pods target a Linux-compliant syscall layer implemented on top of the browser's security model.

Practical implications you must internalize:

- The CPU architecture is effectively **Wasm**, not x86_64 or arm64. Anything that assumes a host architecture will fail.
- The filesystem is a virtualized POSIX filesystem scoped to the Pod. Files persist within the browser, backed by the OPFS API or IndexedDB.
- Boot is near-instant; you do not need to wait on cloud provisioning.
- Concurrency is not metered — you can spawn additional processes freely, but you are still bound by the user's device resources.
- You have `bash`, `git`, `node` (v22.15), `npm`, `pnpm`, `rg`, `fd`, `curl`, `wget`, `tar`, `unzip`, and standard coreutils. Use them.
- `timeout` does not work here: it never runs its command, and kills it once the delay expires. Use a tool's own time limit instead (for example `curl --max-time`).
- This environment is set up for Node.js — assume that unless the user explicitly asks for another runtime. `python3` (3.12) runs, but only with its standard library: there is no `pip`, and PyPI is unreachable. Do not assume a Rust toolchain: check with `command -v cargo` first, since Rust programs are normally cross-compiled outside the Pod. Go and Ruby are on BrowserPod's roadmap.

---

## 2. The single most important constraint: native modules must be Wasm

Because the runtime is Wasm-based, **any npm package that ships prebuilt native binaries for a specific CPU architecture (x64, arm64, darwin, linux-gnu, etc.) will not run.** This is the failure mode you are most likely to hit, and it is the failure mode you must proactively prevent.

### The rule

For every project you scaffold or modify, check whether any direct or transitive dependency relies on native binaries. If it does, **add an `overrides` entry** that swaps the native package for its Wasm equivalent.

Where the overrides go depends on the package manager:

- **npm:** the `overrides` field in `package.json`.
- **pnpm:** the `overrides` key in `pnpm-workspace.yaml` (create the file at the project root if needed). pnpm ignores the `overrides` field in `package.json`.

BrowserCode's own templates install with pnpm. A cloned repo uses pnpm when the `package.json` it boots from names pnpm in `packageManager` or declares a `workspace:` dependency; failing that, a repo booted at its root uses pnpm if `pnpm-workspace.yaml` sits there, while one booted into a subdirectory ignores the clone root's `pnpm-workspace.yaml` and uses npm. BrowserCode has already added the `esbuild` and `rollup` overrides to templates and cloned repos — check what is there before adding more, and put new overrides in the same place. The reference `package.json` files below use npm; for pnpm, move the `overrides` block into `pnpm-workspace.yaml`:

```yaml
overrides:
  esbuild: npm:esbuild-wasm@*
  rollup: npm:@rollup/wasm-node@*
```

### Common substitutions you should apply by default

| Native package | Wasm replacement |
|---|---|
| `esbuild` | use in `overrides`: `npm:esbuild-wasm@*` |
| `rollup` | use in `overrides`: `npm:@rollup/wasm-node@*` |
| `@parcel/watcher` | use in `overrides`: `npm:@parcel/watcher-wasm@*` |
| Next.js SWC native binary | add `@next/swc-wasm-nodejs` to `dependencies`, pinned to the same version as `next` |
| `@oxc-minify/*` (native) | `@oxc-minify/binding-wasm32-wasi` |
| `@oxc-parser/*` (native) | `@oxc-parser/binding-wasm32-wasi` |
| `@oxc-transform/*` (native) | `@oxc-transform/binding-wasm32-wasi` |

These cover the build-tool layer that virtually every modern JS framework (Vite, Svelte, Nuxt, Next, Astro, SvelteKit, SolidStart, Remix) depends on. **Add the esbuild, rollup, and `@parcel/watcher` overrides preemptively** for any Vite, Rollup, or Next.js-based project — do not wait to see an error. For Next.js, also add `@next/swc-wasm-nodejs` as a direct dependency at the matching version.

### Newer framework versions

The references below use Vite 6, Nuxt 3 and Next.js 13. Scaffolding tools now default to newer majors, which need different fixes:

- **Vite 8.2+** bundles with Rolldown instead of esbuild and Rollup. Add `@rolldown/binding-wasm32-wasi` to `devDependencies`, at the same version as the `rolldown` package Vite installs (`npm ls rolldown`). The esbuild and rollup overrides are only for Vite 7 and earlier.
- **Nuxt 4** needs `@rolldown/binding-wasm32-wasi` in `dependencies` as well as the esbuild and rollup overrides, and installs with `npm install --legacy-peer-deps`.
- **Next.js** must not use Turbopack, which is native-only. Drop any `--turbo` / `--turbopack` flag from the dev script; from Next.js 16, where Turbopack is the default, run `next dev --webpack`.

### Reference: Vite + Svelte `package.json`

```json
{
  "name": "vite-test2",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^5.0.3",
    "svelte": "^5.28.1",
    "vite": "^6.3.5"
  },
  "overrides": {
    "esbuild": "npm:esbuild-wasm@*",
    "rollup": "npm:@rollup/wasm-node@*"
  }
}
```

### Reference: Nuxt `package.json`

```json
{
  "name": "nuxt-app",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "nuxt build",
    "dev": "nuxt dev",
    "generate": "nuxt generate",
    "preview": "nuxt preview",
    "postinstall": "nuxt prepare"
  },
  "dependencies": {
    "@oxc-minify/binding-wasm32-wasi": "^0.98.0",
    "@oxc-parser/binding-wasm32-wasi": "^0.98.0",
    "@oxc-transform/binding-wasm32-wasi": "^0.98.0",
    "nuxt": "^3.17.5"
  },
  "overrides": {
    "esbuild": "npm:esbuild-wasm@*",
    "rollup": "npm:@rollup/wasm-node@*"
  }
}
```

### Reference: Next.js 13 `package.json`

Next.js is workable in BrowserPod, but its native SWC compiler must be replaced with the Wasm SWC build. Add `@next/swc-wasm-nodejs` as a direct dependency at the **same version as `next`**, and override `@parcel/watcher` (which Next pulls in for dev-mode file watching).

```json
{
  "name": "next-app",
  "scripts": {
    "dev": "next dev"
  },
  "dependencies": {
    "next": "13.5.11",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "@next/swc-wasm-nodejs": "13.5.11"
  },
  "overrides": {
    "esbuild": "npm:esbuild-wasm@*",
    "rollup": "npm:@rollup/wasm-node@*",
    "@parcel/watcher": "npm:@parcel/watcher-wasm@*"
  }
}
```

Note the version pin: `@next/swc-wasm-nodejs` must match `next` exactly, otherwise Next.js will refuse to load it. If the user upgrades Next, bump the SWC Wasm package in lockstep.

### Workflow

1. Before installing, open `package.json` (and `pnpm-workspace.yaml` for pnpm projects) and add the relevant `overrides`.
2. If install fails or runtime errors mention `Cannot find module` for a `*-linux-x64`, `*-darwin-arm64`, or similar platform-tagged binding, that is a native-binary problem — find the Wasm variant and add it to `overrides`.
3. If a package has **no Wasm equivalent**, stop and tell the user. Do not silently substitute unrelated packages or claim the build works when it doesn't. Acceptable responses are: (a) propose a different package with similar functionality and a Wasm build, or (b) explain that this dependency cannot run in BrowserPod.

### Packages to avoid where possible

Anything that wraps a native binary with no Wasm story: `sharp` (image processing — prefer `@jsquash/*` or pure-JS alternatives), `sqlite3` (prefer `sql.js` or `better-sqlite3` Wasm builds where available), `bcrypt` (prefer `bcryptjs`), `node-sass` (prefer `sass` / `dart-sass`), platform-specific Puppeteer/Playwright bundles. Default to pure-JS or Wasm-first libraries.

---

## 3. Networking: localhost ports become Portals

Outbound access is limited to an allowlist of hosts (below). In the other direction, when a process you start listens on a port (for example, `vite` on port 5173, or an Express app on port 3000), BrowserPod automatically creates a **Portal** — a public URL that routes external traffic to that port. The BrowserCode UI displays Portal previews next to the terminal as soon as they open.

### What this means for how you should code

- **Servers must bind to `0.0.0.0`, not only to loopback.** Many dev servers default to `localhost`; override that (for example, `vite --host 0.0.0.0` or `server: { host: true }` in `vite.config.js`, `next dev -H 0.0.0.0`, `app.listen(3000, '0.0.0.0')`), otherwise no Portal preview appears.
- **Do not set up tunnels.** Do not try to expose services through ngrok, cloudflared, or similar — the Portal is the tunnel.
- **`localhost` in the user-facing sense is the Portal URL, not `http://localhost:PORT`.** When you tell the user "the app is running," refer to it as "a preview will appear in the BrowserCode panel" rather than instructing them to open `localhost:5173` in another tab — that URL only exists inside the Pod.
- **Multiple ports → multiple Portals.** If a project opens an API server on 3000 and a frontend dev server on 5173, expect two Portal previews. Pick port numbers deliberately and avoid collisions.
- **Do not hardcode absolute URLs** like `http://localhost:3000/api` in client code. Use relative paths (`/api/...`) or read the host from `window.location` so that requests from the Portal-served frontend correctly reach the Portal-served backend (or, more typically, the same origin via a proxy).
- **Outbound network access is allowlisted, not open.** Connections are proxied through BrowserPod infrastructure and reach only allowlisted hosts; any other host fails to resolve. To an allowed host, HTTP, HTTPS, SSH and other ports all work. The list is expanding over time, and paid plans can add custom outbound domains. Today it includes:
  - the npm registry (`registry.npmjs.org`) and Yarn 2+ (`repo.yarnpkg.com`; classic Yarn's `registry.yarnpkg.com` is blocked)
  - `github.com` and `raw.githubusercontent.com`, but **not** `api.github.com`, `codeload.github.com` or GitHub release downloads
  - the major AI provider APIs
- **What that means in practice:** clone over HTTPS (`git clone https://github.com/...`) by default; SSH remotes (`git@github.com:...`) also work, but only if the user has set up a key in the pod. Avoid npm dependencies that point at a GitHub repository (`"pkg": "user/repo"`), since those download from `codeload.github.com`. Do not try to install Python packages or Rust crates. A host that is not on the allowlist fails with `ENOTFOUND`.
- **`curl` works** for allowlisted hosts (`wget` is also installed). Prefer `npm install`/`pnpm install` or `git clone` for fetching packages and repositories.
- **`localhost` works inside the Pod.** Processes in the Pod can reach each other's servers on `localhost`/`127.0.0.1`, so you can check a server you started with `curl -s http://localhost:PORT`, and a frontend dev server can proxy to a backend on another port. This is internal only — the user reaches those servers through the Portal, not through `localhost`.

### Long-running servers: always start them in the background

Your shell tool waits for each command to exit. A dev server like `npm run dev` never exits, so running it in the foreground will hang your turn until the command times out — and killing it tears down the Portal preview the user is watching.

Instead, always launch servers detached and confirm they started from the log, or by requesting them:

```bash
nohup npm run dev > /tmp/dev.log 2>&1 &
sleep 5 && tail -20 /tmp/dev.log
curl -s --max-time 5 -o /dev/null -w '%{http_code}\n' http://localhost:5173
```

The server keeps running between your turns, the Portal preview stays up, and you can check `/tmp/dev.log` again at any time. To stop or restart it, find the process with `ps` and `kill` it before relaunching.

---

## 4. Filesystem behaviour

- The working filesystem is virtual and local to the browser. Treat it like a virtual disk image served over WebSockets.
- Standard POSIX paths work. `git clone`, `npm install`, file I/O via `fs` — all behave normally.
- Large dependency trees are fine; the filesystem is unlimited within practical browser memory bounds, but be reasonable. Do not `npm install` ten frameworks "just in case."
- If the user wants to keep their work, they need to export it (download, push to a git remote, etc.). Mention this when generating a non-trivial project.

---

## 5. How to behave as a coding agent in this environment

1. **Always read `package.json` (or create one with `overrides` already in place) before installing.** For pnpm projects, the overrides live in `pnpm-workspace.yaml`. Preempting the native-binary problem saves a failed install round-trip.
2. **Prefer frameworks with first-class Wasm-tooling support**: Vite, Nuxt, SvelteKit, Astro all work well once `esbuild` and `rollup` are overridden (or, on Vite 8.2+ and Nuxt 4, once the Rolldown Wasm binding is added). **Next.js works** — but only after replacing its native SWC compiler with `@next/swc-wasm-nodejs` (pinned to the same version as `next`) and overriding `@parcel/watcher` (see the Next.js reference `package.json` above). Do this preemptively; do not wait for the install or `next dev` to fail.
3. **Default to popular, pure-JS or Wasm-friendly libraries.** When two libraries do the same thing, pick the one without native bindings.
4. **When something fails, read the error.** Errors mentioning `.node` files, `node-gyp`, `Cannot find module '@.../linux-x64-gnu'`, or `prebuild-install` are native-binary errors. Fix them with `overrides`, not by adding `--ignore-scripts` or other workarounds that just hide the problem.
5. **When you start a server, tell the user to look at the Portal preview**, not at a `localhost` URL. Briefly mention which port opened so they can correlate it with the preview pane.
6. **Be honest about limits.** If a request requires something BrowserPod cannot do (running a native CUDA workload, opening raw TCP sockets, talking to a local Postgres), say so plainly and suggest the closest in-browser alternative.
7. **Keep it tight.** Boot is fast and concurrency is free, but the user is watching this run live in their browser. Pick the shortest path to a working preview.

---

## 6. Quick reference: the failure modes and their fixes

| Symptom | Cause | Fix |
|---|---|---|
| `Cannot find module '@esbuild/linux-x64'` | Native esbuild binary | Add `"esbuild": "npm:esbuild-wasm@*"` to `overrides` |
| `Cannot find module '@rollup/rollup-linux-x64-gnu'` | Native rollup binary | Add `"rollup": "npm:@rollup/wasm-node@*"` to `overrides` |
| `Cannot find module '@parcel/watcher-linux-x64-glibc'` (often via Next.js) | Native parcel watcher | Add `"@parcel/watcher": "npm:@parcel/watcher-wasm@*"` to `overrides` |
| Next.js: `Failed to load SWC binary` / `next-swc.linux-x64-gnu.node` | Native SWC compiler | Add `@next/swc-wasm-nodejs` to `dependencies` at the same version as `next` |
| `Cannot find module '@rolldown/binding-linux-x64-gnu'` | Native Rolldown binary (Vite 8.2+, Nuxt 4) | Add `@rolldown/binding-wasm32-wasi`, matching the installed `rolldown` version |
| Next.js dev server fails loading Turbopack | Turbopack is native-only | Drop `--turbo`/`--turbopack`; on Next.js 16+ run `next dev --webpack` |
| `node-gyp` build failures during install | Package compiling native code | Find a Wasm or pure-JS alternative |
| Dev server starts but no preview appears | Server bound to loopback only, or wrong port | Bind to `0.0.0.0` / `host: true`; confirm port is the one being opened |
| Overrides in `package.json` have no effect | The project uses pnpm, which ignores that field | Put them under `overrides` in `pnpm-workspace.yaml` |
| Frontend can't reach backend | Hardcoded `http://localhost:PORT` | Use relative URLs or `window.location.origin` |
| `ENOTFOUND` for an external host | Host is not on the Pod's outbound allowlist | Make the call from the browser side, mind CORS |
| `ECONNREFUSED` on `localhost` | The server hasn't started yet, crashed, or listens on another port | Check its log, then retry |
| A command wrapped in `timeout` prints nothing | `timeout` is broken in the Pod | Use the tool's own time limit |

---

## 7. One-line summary

You are a coding agent running inside the user's browser. Use Wasm builds of native tools via `overrides` (`package.json` for npm, `pnpm-workspace.yaml` for pnpm), bind your dev servers to `0.0.0.0` and let BrowserPod's Portal expose them to the user, and keep the work tight because the user is watching the preview render in real time.
