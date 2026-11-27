<script lang="ts">
	import { resolve } from '$app/paths';
	import { NEW_ISSUE_URL } from '$lib/utils/bug-report';
</script>

<p>
	JavaScript projects run on BrowserPod, which gives each one a browser MicroVM: Node.js 22 with a
	real shell, npm and pnpm, and a live preview. Start from a template, or clone a public GitHub
	repo.
</p>

<h2>Templates</h2>

<p>
	<a href="{resolve('/ide')}?framework=vite">Vite</a> on its own, or with
	<a href="{resolve('/ide')}?framework=react">React</a>,
	<a href="{resolve('/ide')}?framework=svelte">Svelte</a> or
	<a href="{resolve('/ide')}?framework=vue">Vue</a>, plus
	<a href="{resolve('/ide')}?framework=nextjs">Next.js</a>,
	<a href="{resolve('/ide')}?framework=nuxt">Nuxt</a> and
	<a href="{resolve('/ide')}?framework=express">Express</a>. They are set up to run here already, so
	there is nothing to configure before you start editing.
</p>

<div class="docs-note">
	<p>
		The React, Svelte and Vue templates are plain Vite starters, not Create React App or SvelteKit.
		For one of those, clone a starter repo; BrowserCode will not quietly hand you a different
		framework. Next.js and Nuxt have templates of their own.
	</p>
</div>

<h2>Cloning a repo</h2>

<p>
	Paste a GitHub URL into the box on <a href={resolve('/ide')}>the picker</a>. BrowserCode clones
	it, works out whether the project uses npm or pnpm, installs, and runs its <code>dev</code>
	script, or <code>start</code> if there is no <code>dev</code>. With neither it stops and says so
	rather than guessing.
</p>
<p>
	You can also skip the form and link straight to a clone, which is how an "Open in BrowserCode"
	link in a README works: the URL mirrors GitHub's own. See
	<a href={resolve('/docs/linking')}>Linking to BrowserCode</a>, which also covers the one branch
	name that cannot be used, anything with a slash in it like <code>release/1.0</code>.
</p>

<h2>The native binary problem</h2>

<p>
	This is the thing most likely to stop a project working, so it is worth understanding rather than
	reacting to. Your code runs as WebAssembly, not on x64 or arm64, so any npm package shipping a
	prebuilt binary for a real CPU has nothing to execute. Most popular build tools do exactly that.
</p>
<p>
	The fix is an override pointing the package name at a WebAssembly build of the same thing.
	BrowserCode applies the common ones when it clones a repo and prints each change in the Output
	tab: esbuild and rollup are swapped for their Wasm builds, newer Vite and Nuxt get the Rolldown
	Wasm binding, and Next.js has Turbopack turned off, since Turbopack is native-only.
</p>

<div class="docs-note">
	<p>
		The one it cannot do for you is Next.js itself, which needs
		<code>@next/swc-wasm-nodejs</code> added by hand, at exactly the version of
		<code>next</code> the project uses.
	</p>
</div>

<p>
	If you add overrides yourself, where they go depends on the package manager, and getting it wrong
	costs an afternoon. npm reads <code>overrides</code> in <code>package.json</code>; pnpm ignores
	that field entirely and reads its own in <code>pnpm-workspace.yaml</code>. If an override seems to
	do nothing, that is usually why.
</p>
<p>
	Some native packages will not work here at all, <code>sharp</code> and <code>bcrypt</code> among them,
	because they ship native binaries and BrowserCode has no WebAssembly build to swap in for them. Pure
	JavaScript alternatives generally exist.
</p>

<h2>Seeing your app</h2>

<p>
	For a template, nothing: its dev server is already set up to be reachable, and the preview fills
	in on its own once the server is up.
</p>
<p>
	A cloned repo runs exactly as its own <code>dev</code> script says, and that is the one place you
	may have to change something. A dev server listening only on localhost cannot be reached from
	outside the MicroVM, so the preview stays empty even though the terminal looks perfectly healthy.
	If that happens, make the server listen on <code>0.0.0.0</code>: Vite takes
	<code>--host 0.0.0.0</code>, and Express takes the host as a second argument to
	<code>listen</code>.
</p>
<p>
	After that it is automatic. Every port your project listens on gets its own preview URL, so an API
	and a frontend give you two. The one thing to avoid is hardcoding
	<code>http://localhost:3000</code> into client code, since that address exists inside the MicroVM but
	not in the browser showing your app; use a relative path. From the terminal, localhost is fine, so you
	can still curl your own server.
</p>

<h2>When something fails</h2>

<p>
	Most failures are your project asking for something the MicroVM cannot provide, and you fix them
	in the project:
</p>

<ul>
	<li>
		An error naming a platform, like <code>@esbuild/linux-x64</code>, is the native binary problem
		and wants an override.
	</li>
	<li>
		An override that appears ignored usually means the project is on pnpm and it is in the wrong
		file.
	</li>
	<li>A dev server that starts but never shows up is listening only on localhost.</li>
	<li>
		Anything that cannot resolve a hostname is the network allowlist, in the
		<a href={resolve('/docs')}>overview</a>.
	</li>
</ul>

<p>
	If none of those fit, it may well be ours rather than yours, and we would rather know:
	<!-- The tracker is an external URL, so resolve() does not apply here. -->
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
	<a href={NEW_ISSUE_URL} target="_blank" rel="noopener noreferrer">open an issue</a> with the repo
	you were booting. BrowserCode is open source, so you can also dig into the code or
	<a href={resolve('/docs/self-hosting')}>run a modified copy yourself</a>.
</p>
