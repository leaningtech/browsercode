# CLAUDE.md — Operating Instructions for BrowserCode (BrowserPod Sandbox)

You are running inside **BrowserCode**, a demo environment that hosts AI coding agent CLIs inside **BrowserPod** sandboxes. Read this file in full before generating, installing, or running any code. The constraints below are not optional — they describe the actual runtime you are executing in.

---

## 1. What BrowserPod is

BrowserPod is a **browser-native sandbox**. The Node.js runtime, filesystem, processes, and network stack you have access to are **executing inside the user's browser tab**, compiled to WebAssembly. There is no remote VM, no container host, and no Linux kernel underneath you in the conventional sense — Pods target a Linux-compliant syscall layer implemented on top of the browser's security model.

Practical implications you must internalize:

- The CPU architecture is effectively **Wasm**, not x86_64 or arm64. Anything that assumes a host architecture will fail.
- The filesystem is a virtualized POSIX filesystem scoped to the Pod. Files persiste within the browser, backed by OPFS API or IndexedDB.
- Boot is near-instant; you do not need to wait on cloud provisioning.
- Concurrency is not metered — you can spawn additional processes freely, but you are still bound by the user's device resources.
- You have `bash`, `git`, `node`, `npm`, and standard coreutils. Use them.

---

## 2. The single most important constraint: native modules must be Wasm

Because the runtime is Wasm-based, **any npm package that ships prebuilt native binaries for a specific CPU architecture (x64, arm64, darwin, linux-gnu, etc.) will not run.** This is the failure mode you are most likely to hit, and it is the failure mode you must proactively prevent.

### The rule

For every project you scaffold or modify, check whether any direct or transitive dependency relies on native binaries. If it does, **add an `overrides` block to `package.json`** that swaps the native package for its Wasm equivalent.

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

1. Before running `npm install`, open `package.json` and add the relevant `overrides`.
2. If install fails or runtime errors mention `Cannot find module` for a `*-linux-x64`, `*-darwin-arm64`, or similar platform-tagged binding, that is a native-binary problem — find the Wasm variant and add it to `overrides`.
3. If a package has **no Wasm equivalent**, stop and tell the user. Do not silently substitute unrelated packages or claim the build works when it doesn't. Acceptable responses are: (a) propose a different package with similar functionality and a Wasm build, or (b) explain that this dependency cannot run in BrowserPod.

### Packages to avoid where possible

Anything that wraps a native binary with no Wasm story: `sharp` (image processing — prefer `@jsquash/*` or pure-JS alternatives), `sqlite3` (prefer `sql.js` or `better-sqlite3` Wasm builds where available), `bcrypt` (prefer `bcryptjs`), `node-sass` (prefer `sass` / `dart-sass`), platform-specific Puppeteer/Playwright bundles. Default to pure-JS or Wasm-first libraries.

---

## 3. Networking: localhost ports become Portals

You **do not** have an arbitrary egress network. What you do have is the inverse: when a process you start binds to a port on `localhost` (for example, `vite` opening `localhost:5173`, or an Express app on `localhost:3000`), BrowserPod automatically creates a **Portal** — a public URL that routes external traffic to that internal port. The BrowserCode UI displays Portal previews next to the terminal as soon as they open.

### What this means for how you should code

- **Bind dev servers to a port and let the framework defaults work.** Do not try to expose services through ngrok, cloudflared, or any tunnel — there is no host network to tunnel from. The Portal is the tunnel.
- **`localhost` in the user-facing sense is the Portal URL, not `http://localhost:PORT`.** When you tell the user "the app is running," refer to it as "a preview will appear in the BrowserCode panel" rather than instructing them to open `localhost:5173` in another tab — that URL only exists inside the Pod.
- **Multiple ports → multiple Portals.** If a project opens an API server on 3000 and a frontend dev server on 5173, expect two Portal previews. Pick port numbers deliberately and avoid collisions.
- **Do not hardcode absolute URLs** like `http://localhost:3000/api` in client code. Use relative paths (`/api/...`) or read the host from `window.location` so that requests from the Portal-served frontend correctly reach the Portal-served backend (or, more typically, the same origin via a proxy).
- **Configure dev servers to bind to all interfaces if they default to loopback-only.** For example, Vite users may need `vite --host 0.0.0.0` or `server: { host: true }` in `vite.config.js` so BrowserPod's Portal layer can reach the listener.
- **No outbound calls to arbitrary internet hosts during runtime.** You have npm registry access and git access for installs, but a running server inside the Pod is not a general-purpose outbound HTTP client. This limitation will be lifted in the future for logged-in users.
- **`curl` is not supported.** Do not run `curl` commands — the binary is not available in this environment. Use `npm install` or `git clone` for fetching packages and repositories.
- **No localhost interface access at this time.** Don't try to access a dev server port via `localhost` directly. The loopback interface is currently not supported. This limitation will also be lifted soon.

---

## 4. Filesystem behaviour

- The working filesystem is virtual and local to the browser. Treat it like a virtual disk image served over WebSockets.
- Standard POSIX paths work. `git clone`, `npm install`, file I/O via `fs` — all behave normally.
- Large dependency trees are fine; the filesystem is unlimited within practical browser memory bounds, but be reasonable. Do not `npm install` ten frameworks "just in case."
- If the user wants to keep their work, they need to export it (download, push to a git remote, etc.). Mention this when generating a non-trivial project.

---

## 5. How to behave as a coding agent in this environment

1. **Always read `package.json` (or create one with `overrides` already in place) before `npm install`.** Preempting the native-binary problem saves a failed install round-trip.
2. **Prefer frameworks with first-class Wasm-tooling support**: Vite, Nuxt, SvelteKit, Astro all work well once `esbuild` and `rollup` are overridden. **Next.js works** — but only after replacing its native SWC compiler with `@next/swc-wasm-nodejs` (pinned to the same version as `next`) and overriding `@parcel/watcher` (see the Next.js reference `package.json` above). Do this preemptively; do not wait for the install or `next dev` to fail.
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
| `node-gyp` build failures during install | Package compiling native code | Find a Wasm or pure-JS alternative |
| Dev server starts but no preview appears | Server bound to loopback only, or wrong port | Bind to `0.0.0.0` / `host: true`; confirm port is the one being opened |
| Frontend can't reach backend | Hardcoded `http://localhost:PORT` | Use relative URLs or `window.location.origin` |
| App needs to call external API | Outbound from Pod is not general-purpose | Make the call from the browser side, mind CORS |

---

## 7. One-line summary

You are a coding agent running inside the user's browser. Use Wasm builds of native tools via `package.json` `overrides`, bind your dev servers to a port and let BrowserPod's Portal expose them to the user, and keep the work tight because the user is watching the preview render in real time.
