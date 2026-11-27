<script lang="ts">
	import { resolve } from '$app/paths';
	import { NEW_ISSUE_URL } from '$lib/utils/bug-report';
</script>

<p>
	BrowserCode is a development environment that runs inside a browser tab: an editor, a terminal,
	npm, git and a live preview. Nothing installs on your machine, there is no server, and your code
	never leaves your browser.
</p>

<h2>Two runtimes, and why it matters</h2>

<p>
	Node.js projects, GitHub clones and coding agents run on
	<a href="https://browserpod.io" target="_blank" rel="noopener noreferrer">BrowserPod</a>, which
	gives each one a browser MicroVM: a Linux-like virtual machine compiled to WebAssembly, running
	entirely in the tab. Java is the exception and runs on
	<a href="https://cheerpj.com" target="_blank" rel="noopener noreferrer">CheerpJ</a>, a JVM in the
	browser.
</p>
<p>
	That decides what works where. BrowserPod needs a recent browser (Chrome or Edge 137+, Firefox
	153+, Safari 27+) and does not run on iOS or iPadOS yet. CheerpJ needs none of that, so Java works
	on phones and older browsers, and a Java embed runs on pages where nothing else would.
</p>

<h2>What you get</h2>

<p>
	Node.js 22 with npm and pnpm, a POSIX filesystem, and the usual command line tools including git,
	curl, ripgrep and fd. There is a <code>python3</code>, but with its standard library only: no
	<code>pip</code>, and PyPI is unreachable for now. Rust programs run if you bring them already
	built, since no toolchain ships yet.
</p>

<div class="docs-note">
	<p>
		<strong>Native binaries do not run.</strong> A MicroVM executes WebAssembly, so an npm package
		shipping a prebuilt binary for a real CPU will fail. It is the most common thing to go wrong,
		and <a href={resolve('/docs/ide/javascript')}>Running JavaScript projects</a> explains the way around
		it.
	</p>
</div>

<h2>What it can reach</h2>

<p>
	Not the whole internet. A pod reaches the npm registry, GitHub and the major AI provider APIs;
	anything else fails to resolve, which is usually the answer when a download will not work.
</p>
<p>
	Incoming traffic works through portals: when your app listens on a port, BrowserCode gives it a
	URL and shows it in the preview pane.
</p>

<h2>Where your work lives</h2>

<p>
	In the browser's own storage. Nobody else can reach it, and clearing site data for browsercode.io
	deletes it, so take anything worth keeping out of the browser: the Files pane downloads the
	project as a zip, and Share puts the whole thing into a link you can reopen or send to someone.
</p>

<h2>When something goes wrong</h2>

<p>
	Two different things can be at fault, and it is worth knowing which you are looking at. Some
	failures are your project asking for something a MicroVM cannot give it, usually a package with a
	native binary, and those are fixed in the project itself. Others are BrowserCode's problem, and we
	would rather hear about them:
	<!-- The tracker is an external URL, so resolve() does not apply here. -->
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
	<a href={NEW_ISSUE_URL} target="_blank" rel="noopener noreferrer">open an issue</a>. BrowserCode
	is open source, so you can also read the code, or
	<a href={resolve('/docs/self-hosting')}>run your own copy</a>.
</p>

<h2>Looking something up</h2>

<p>
	These pages cover how BrowserCode works and how to get going. For the exhaustive reference, with
	every URL, template id and embed parameter, see
	<a href="https://browsercode.io/llms.txt" target="_blank" rel="noopener noreferrer">llms.txt</a>,
	which is also the page to hand an AI assistant.
</p>
