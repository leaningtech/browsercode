<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<p>
	Three things are stacked here and they are not licensed alike: the BrowserCode application, the
	BrowserPod sandbox that runs Node.js projects and agents, and the CheerpJ JVM that runs Java.
	Which one you are relying on decides which terms apply.
</p>

<h2>BrowserCode itself</h2>

<p>
	The application, meaning this site, the playground, the embeddable view and the templates, is open
	source under the <strong>Apache License 2.0</strong>. The text is in
	<a
		href="https://github.com/leaningtech/browsercode/blob/main/LICENSE.txt"
		target="_blank"
		rel="noopener noreferrer">LICENSE.txt</a
	>.
</p>
<p>
	So you can clone it, run your own copy, change it and ship your changes on those terms. Running
	your own copy against BrowserPod needs your own API key, since the hosted site runs on ours;
	<a href={resolve('/docs/self-hosting')}>Making it your own</a> walks through it.
</p>

<h2>BrowserPod and CheerpJ</h2>

<p>
	<a href="https://browserpod.io" target="_blank" rel="noopener noreferrer">BrowserPod</a> and
	<a href="https://cheerpj.com" target="_blank" rel="noopener noreferrer">CheerpJ</a> are Leaning Technologies
	products and are not covered by that Apache licence. Each has its own terms, and the grant on the BrowserCode
	repository does not extend to either.
</p>
<p>
	If you are planning to build on one of them rather than just trying BrowserCode, read the terms on
	its own site first, and ask Leaning Technologies directly about anything commercial rather than
	inferring an answer from this page.
</p>

<h2>What you write</h2>

<p>
	Yours. BrowserCode claims nothing over what you write, run or generate, and none of it is stored
	on our servers; it sits in your browser until you export it. The
	<a href={resolve('/privacy')}>Privacy Policy</a> covers the limited usage data we do see, which does
	not include your code.
</p>
<p>
	Anything an AI agent produces falls under that provider's terms, since the agent running in your
	browser sends its requests to the provider you signed in to, not to us.
</p>

<h2>Dependencies</h2>

<p>
	Packages you install come from the npm registry under their own licences, exactly as they would on
	your own machine, and the same goes for a repo you clone. The WebAssembly replacements BrowserCode
	substitutes for native packages are separate packages with their own licences too.
</p>

<div class="docs-note">
	<p>
		This page is orientation, not legal advice. Where it and an actual licence disagree, the licence
		is what counts.
	</p>
</div>
