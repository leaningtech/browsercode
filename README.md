<a id="readme-top"></a>

<div align="center">
  <img
    src="./static/readme/browsercode-white-transp.svg"
    alt="BrowserCode logo"
    width="400"
  />

<br>

[![Discord server](https://img.shields.io/discord/988743885121548329?color=%235865F2&logo=discord&logoColor=%23fff)](https://discord.gg/8ySMrQv6X)
[![Issues](https://img.shields.io/github/issues/leaningtech/browsercode)](https://github.com/leaningtech/browsercode/issues)
![Version](https://img.shields.io/badge/version-0.5.1-blue)

  <h1>Run AI coding CLIs and frameworks in the browser</h1>

  <p>
 BrowserCode is a browser-based playground for fast-prototyping full-stack apps and sharing them instantly. It runs on BrowserPod, a multi-language WebAssembly sandbox (Node.js, Python, and more), with no installs, no servers, and no cloud compute.
  </p>
</div>

<h2 id="table-of-contents">Table of contents</h2>

- [What is BrowserCode?](#about)
- [Quickstart](#quickstart)
- [Make it your own](#make-it-your-own)
- [Breaking BrowserCode](#breaking-browsercode)
- [Roadmap](#roadmap)

<h2 id="about">What is BrowserCode?</h2>

BrowserCode is a browser-based coding sandbox. It's a working example of [BrowserPod](https://browserpod.io/), and includes:

- Node.js v22 running in the browser via WebAssembly
- A browser-contained, POSIX-like filesystem
- Command line tools: bash, git, npm
- Browser sandbox isolation from the user's operating system
- Restricted outbound networking
- Instant previews over URL via BrowserPod's portal function
- Support for Express.js, Svelte, Next, Nuxt and React (with Wasm overrides)

BrowserCode started out as a way to run AI coding CLIs entirely client-side. It's since grown into a full IDE: alongside the CLIs, it can boot and preview web frameworks directly in the browser, so you can prototype an agent's output without ever leaving the tab.

BrowserCode 0.5.1 is our second beta release. This preview launches with an unmodified version of Claude Code, running completely client-side. Gemini CLI is available as well.

<h2 id="quickstart">Quickstart</h2>

Want to try BrowserCode without installing anything? Use the hosted app.

1. Go to [browsercode.io](https://browsercode.io)
2. BrowserCode will boot instantly, opening with a quick modal tutorial to guide you
3. Claude Code will launch instantly
4. Depending on your log-in option, you may be asked to authenticate your account by copying a code from a separate tab

<h2 id="make-it-your-own">Make it your own</h2>

Want to run your own copy, customize the CLIs, or contribute? Clone the repo and run it locally.

1. Clone the repository and install dependencies

   ```bash
   git clone https://github.com/leaningtech/browsercode.git
   cd browsercode
   npm install
   ```

2. Get a BrowserPod API key at [browserpod.io](https://browserpod.io/) and expose it to the app as `VITE_API_KEY`

   ```bash
   echo "VITE_API_KEY=your-key-here" > .env
   ```

3. Start the dev server

   ```bash
   npm run dev
   ```

4. Open the printed local URL in a Chromium-based browser

Other useful scripts:

- `npm run build` — build a production bundle
- `npm run preview` — preview the production build locally
- `npm run check` — type-check the project
- `npm run lint` / `npm run format` — lint and format with Prettier + ESLint

CLI availability and behavior are configured in [`src/lib/config/tools.ts`](src/lib/config/tools.ts) — this is the place to start if you want to add or tweak a CLI.

<h2 id="breaking-browsercode">Breaking BrowserCode</h2>

This is BrowserCode beta. Don't be kind to it. Stretch it, bend it, find out what breaks. Here are a few walls you might hit:

- At launch, Claude is prompted using a custom skill to help it understand that it is running in a custom environment. However, it may first attempt its default behavior before referencing the file
- BrowserCode doesn't yet support native binaries. For more information, see the [BrowserPod documentation](https://browserpod.io/docs/guides/native-binaries)
- Networking over TCP isn't available
- For maximum compatibility, please use a Chromium browser. Safari currently isn't supported

<h2 id="roadmap">Roadmap</h2>

| | CLI | Status |
| :---: | --- | --- |
| <img src="./static/readme/gemini.webp" alt="Gemini CLI" width="32" height="32" /> | **Gemini CLI** | ✅ Beta open now |
| <img src="./static/readme/claude.webp" alt="Claude Code" width="32" height="32" /> | **Claude Code** | ✅ Beta open now |
| <img src="./static/readme/codex.webp" alt="Codex" width="32" height="32" /> | **Codex** | 🚧 Coming soon |
| <img src="./static/readme/opencode.webp" alt="OpenCode" width="32" height="32" /> | **OpenCode** | 🚧 Coming soon |

Also coming up: cloning GitHub repos directly into your BrowserCode workspace.

<p align="right">(<a href="#readme-top">back to top</a>)</p>
