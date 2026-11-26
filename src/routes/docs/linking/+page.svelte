<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<p>
	A link is the lightest way to put BrowserCode in front of someone. It needs nothing from the page
	it sits on, so it works where an iframe cannot: a GitHub README, a chat message, a changelog,
	documentation on a site you do not control. No headers, no API key, nothing to configure.
</p>
<p>
	If you want BrowserCode running inside your own page instead, that is
	<a href={resolve('/docs/embedding')}>Embedding BrowserCode</a>.
</p>

<h2>What you can link to</h2>

<ul>
	<li>
		A template, ready to edit:
		<a href="{resolve('/ide')}?framework=vite">browsercode.io/ide?framework=vite</a>
	</li>
	<li>A public GitHub repo, cloned and booted. See below.</li>
	<li>
		A Java example: <a href="{resolve('/java')}?example=swing">browsercode.io/java?example=swing</a>
	</li>
	<li>
		A coding agent: <a href={resolve('/agents/claude')}>browsercode.io/agents/claude</a>, though
		whoever opens it will have to sign in before it is useful
	</li>
	<li>
		A project you built and shared, which travels inside the link itself. Press Share in the
		playground and send what it copies.
	</li>
</ul>

<h2>Linking to a repo</h2>

<p>The URL mirrors GitHub's own, so most of the time you can derive one from the other:</p>

<pre><code
		>https://github.com/leaningtech/browsercode/tree/main/static
https://browsercode.io/ide/github/leaningtech/browsercode/tree/main/static</code
	></pre>

<p>
	Swap <code>github.com</code> for <code>browsercode.io/ide/github</code> and the rest of the path carries
	over unchanged, including a folder deeper in the repo. BrowserCode clones it, installs, and starts the
	project's dev script.
</p>

<div class="docs-note">
	<p>
		That swap only works on a GitHub URL that already names a branch, tag or commit, which is what
		you get from GitHub's own branch dropdown. A link to a bare repo has no
		<code>/tree/&lt;ref&gt;/</code> in it, and BrowserCode needs one, so add the branch yourself:
		<code>/tree/main/</code>.
	</p>
</div>

<h2>Links you publish and then forget about</h2>

<p>
	A link in a README outlives the afternoon you wrote it, so it is worth knowing what BrowserCode
	promises about these URLs.
</p>

<ul>
	<li>They are stable. The shapes above are not going to be rearranged under you.</li>
	<li>
		A name BrowserCode cannot resolve lands on the picker and says what it rejected. It never boots
		a different project instead, so a link that goes stale fails visibly rather than quietly showing
		the wrong thing.
	</li>
	<li>
		Pin a tag or a commit rather than a branch if you want the reader to see what you saw. A branch
		keeps moving.
	</li>
	<li>
		A ref with a slash in it, like <code>release/1.0</code>, cannot be used. Use a tag or a commit
		SHA for those branches.
	</li>
</ul>

<h2>Putting one in a README</h2>

<p>Nothing special, just a link:</p>

<pre><code>[Open in BrowserCode](https://browsercode.io/ide/github/you/your-repo/tree/main/)</code
	></pre>

<p>Or as HTML, for a page rather than a README:</p>

<pre><code
		>&lt;a href="https://browsercode.io/ide/github/you/your-repo/tree/main/"&gt;
  Open in BrowserCode
&lt;/a&gt;</code
	></pre>

<p>
	If you would rather have a button than a text link, wrap an image in that same link. There is no
	official badge to point you at yet, so the image is yours to choose.
</p>

<h2>The full grammar</h2>

<p>
	Every URL BrowserCode answers to, with each parameter and the ids they accept, is listed in
	<a href="https://browsercode.io/llms.txt" target="_blank" rel="noopener noreferrer">llms.txt</a>.
	It is worth handing to an AI assistant that is writing links for you.
</p>
