<script lang="ts">
	import { resolve } from '$app/paths';
	import { NEW_ISSUE_URL } from '$lib/utils/bug-report';
</script>

<p>
	BrowserCode is open source under the Apache License 2.0, so you can clone it, change it and run
	your own copy. People do this to add or remove agents, or to swap the templates for their own
	starters. What that licence covers, and where BrowserPod and CheerpJ differ, is on the
	<a href={resolve('/docs/licensing')}>licensing page</a>.
</p>

<h2>Getting it running</h2>

<p>
	You need a current Node. The build tooling asks for 20.19 or newer, or 22.12 or newer; nothing in
	the repo enforces that, so an older Node fails in less obvious ways.
</p>

<pre><code
		>git clone https://github.com/leaningtech/browsercode.git
cd browsercode
npm install</code
	></pre>

<p>
	Then get a BrowserPod API key from
	<a href="https://browserpod.io" target="_blank" rel="noopener noreferrer">browserpod.io</a> and
	put it in a <code>.env</code> file, which is what the app reads at build time. The key ends up in the
	built JavaScript, so anyone who opens your copy can read it:
</p>

<pre><code
		>echo "VITE_API_KEY=your-key-here" &gt; .env
npm run dev</code
	></pre>

<p>
	Open the URL it prints, in a browser that supports BrowserPod. The dev server sends the
	cross-origin isolation headers for you, so local development works without any extra setup.
</p>

<div class="docs-note">
	<p>
		<strong>Stay on port 5173 if you can.</strong> Two things BrowserCode downloads at runtime, the
		Codex binary and a faster copy of pnpm, come from a host that only allows
		<code>browsercode.io</code> and <code>localhost:5173</code>. On another port Codex fails to
		install with "Failed to fetch", and pnpm quietly falls back to the slower copy already on the
		disk. The <code>PORT</code> environment variable moves the dev server, so it is easy to trip over
		by accident.
	</p>
</div>

<h2>Running without a BrowserPod key</h2>

<p>
	You can start the app with no key at all, and some of it still works. A template installs and
	runs, but has no live preview, because previews are served through BrowserPod's portals. Cloning a
	repo and running an agent both need a key and will say so instead of booting. Java is unaffected
	either way, since it runs on CheerpJ rather than BrowserPod.
</p>

<h2>Changing things</h2>

<p>
	Two files cover most of what people want to change. Agents live in
	<code>src/lib/config/tools.ts</code>: which ones appear, what each one runs, and how it signs in.
	Templates live in <code>src/lib/config/frameworks.ts</code>, with their actual files under
	<code>static/templates/</code>.
</p>

<div class="docs-note">
	<p>
		If you edit a template, note that each one carries its own copy of the WebAssembly overrides
		that cloned repos get automatically. The build checks those copies still match and fails loudly
		if one has drifted, rather than letting you ship a template that cannot install.
	</p>
</div>

<h2>Deploying your copy</h2>

<p>
	<code>npm run build</code> produces a static site in <code>dist/</code>, so it can go on any
	static host. Two things about the host matter, and both are easy to miss:
</p>

<ul>
	<li>
		It has to send <code>Cross-Origin-Opener-Policy: same-origin</code> and
		<code>Cross-Origin-Embedder-Policy: require-corp</code>. Without them BrowserPod has no
		<code>SharedArrayBuffer</code> and nothing but Java will run. The repo ships a
		<code>static/_headers</code> file, which Cloudflare Pages reads; any other host needs the equivalent
		in its own configuration.
	</li>
	<li>
		It has to serve the SPA fallback for URLs it does not recognise, or links that clone a repo will
		404, since those paths exist only at runtime.
	</li>
</ul>

<p>
	The other scripts are the usual ones: <code>npm run preview</code> serves the built site,
	<code>npm run check</code> type-checks, and <code>npm run lint</code> and
	<code>npm run format</code> run ESLint and Prettier.
</p>

<h2>Contributing back</h2>

<p>
	Bugs and ideas are welcome at
	<!-- The tracker is an external URL, so resolve() does not apply here. -->
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
	<a href={NEW_ISSUE_URL} target="_blank" rel="noopener noreferrer">the issue tracker</a>. If you
	are fixing something you hit while running your own copy, say which part you changed, since a
	modified build and the hosted one can fail in quite different ways.
</p>
