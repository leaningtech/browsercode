<script lang="ts">
	import { resolve } from '$app/paths';
	import EmbedDemo from '$lib/components/docs/EmbedDemo.svelte';
</script>

<p>
	An embed puts a working BrowserCode into someone else's page: a template, a cloned repo, a coding
	agent or a Java project, with whichever panes you want. It is how you drop a runnable example into
	a tutorial or a blog post instead of a screenshot.
</p>

<div class="docs-note">
	<p>
		An embed needs a page you control and, for everything but Java, two response headers. If that is
		not where you are putting it, a plain link needs none of it and works in a README or a chat
		message: <a href={resolve('/docs/linking')}>Linking to BrowserCode</a>.
	</p>
</div>

<h2>The quickest way to get one</h2>

<p>
	You do not have to write any of this by hand. The
	<a href={resolve('/embed/builder')}>embed builder</a> walks through it: pick a template, a GitHub
	repo, an agent, Java or a shared link, tick the panes you want, and it gives you the snippet with
	a live preview of how it will look. The IDE has an <strong>Embed</strong> button that does the same
	for the project already open in front of you. The rest of this page is what the builder is doing for
	you, which is worth knowing when something needs hand-tuning or will not run on your page.
</p>

<h2>The one decision that matters</h2>

<p>
	Before anything else, work out which runtime your embed uses, because it decides whether your page
	needs changing at all.
</p>
<p>
	A <strong>Java embed</strong> runs on CheerpJ and asks nothing of the host page. It is a plain iframe,
	and it works on a hosted blog or a CMS where you cannot touch response headers:
</p>

<pre><code
		>&lt;iframe
  src="https://browsercode.io/embed?runtime=cheerpj"
  style="width: 100%; height: 600px; border: 0"
&gt;&lt;/iframe&gt;</code
	></pre>

<p>
	<strong>Everything else</strong> runs on BrowserPod, which needs <code>SharedArrayBuffer</code>.
	Browsers only hand that out on a cross-origin isolated page, and isolation is inherited from the
	top-level document, so your page has to send both headers itself and the iframe has to ask for the
	capability:
</p>

<pre><code
		>Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp</code
	></pre>

<pre><code
		>&lt;iframe
  src="https://browsercode.io/embed?framework=vite&amp;view=preview"
  allow="cross-origin-isolated"
  style="width: 100%; height: 600px; border: 0"
&gt;&lt;/iframe&gt;</code
	></pre>

<p>All three are needed; with any missing, the embed tells you what it needs.</p>

<div class="docs-note">
	<p>
		<code>require-corp</code> has a cost beyond the embed: it blocks cross-origin images, fonts and scripts
		elsewhere on your page unless they opt in. Test the whole page, not just the iframe. If you cannot
		live with that, a Java embed is the one that still works.
	</p>
</div>

<h2>Choosing what appears</h2>

<p>
	The embed is composed entirely from the query string: what to boot, and which panes to show. You
	can give it a template, a GitHub repo, an agent, or Java, and then narrow the panes to just the
	preview, or the editor and terminal, or whatever suits the point you are making. The full list of
	parameters is in <a
		href="https://browsercode.io/llms.txt"
		target="_blank"
		rel="noopener noreferrer">llms.txt</a
	>.
</p>
<p>
	In a narrow column, which is most blog layouts, the panes turn into tabs and the embed opens on
	the preview, because a running app explains itself better than an editor does. A Java embed opens
	on its Output tab instead, since its Display stays empty until the program opens a window. Every
	embed carries a small BrowserCode badge linking back.
</p>

<h2>See them running</h2>

<p>
	These are real embeds, in this page, built from the query strings shown on each one. Nothing
	starts until you ask it to, since every embed is a live sandbox.
</p>

<EmbedDemo
	title="Just the preview"
	description="The app and nothing else. Good for showing a finished result in a tutorial."
	query="framework=vite&view=preview"
	height={380}
/>

<EmbedDemo
	title="Editor and preview"
	description="Edit on the left, watch it update on the right. The usual shape for teaching something."
	query="framework=vite&view=editor,preview"
	height={440}
/>

<EmbedDemo
	title="Just the terminal"
	description="A real shell, with no editor in the way."
	query="framework=vite&view=terminal"
	height={360}
/>

<EmbedDemo
	title="The whole IDE"
	description="Every pane: files, search, editor, terminal and preview."
	query="framework=vite"
	height={480}
/>

<EmbedDemo
	title="A Java project"
	description="Runs on CheerpJ, so this one needs nothing at all from the page around it."
	query="runtime=cheerpj"
	height={440}
	note="Starts a real sandbox here. Java runs one at a time per site, so close any other BrowserCode tab running Java first."
/>

<EmbedDemo
	title="A coding agent"
	description="Terminal-first, with the agent already installed and pointed at a project."
	query="agent=claude&view=terminal"
	height={440}
	note="Starts a real sandbox here, and takes this browser's one Claude Code session. If you have Claude Code open in another tab, close it first. You will need to sign in."
/>

<h2>Embedding something you built</h2>

<p>
	The Share button in the playground puts a whole project into a link, and that link embeds
	directly: put its hash on <code>/embed</code> and you get your own files running rather than a stock
	template. It is the shortest path from making something to showing it running in your post, with nothing
	stored on a server at either end.
</p>

<div class="docs-note">
	<p>
		If you leave the editor visible in an embed, readers get a Share button of their own. Chrome and
		Edge only allow copying from inside an iframe that carries
		<code>allow="clipboard-write"</code>, so without it Share will report that the copy failed. That
		attribute is unrelated to isolation, and you only need it if Share is reachable.
	</p>
</div>

<h2>Running without a key</h2>

<p>
	By default an embed runs on BrowserCode's own BrowserPod key. You can ask for a keyless embed
	instead, which costs you the live preview: a template still installs and runs, but cloned repos
	and agents need a key and will say so rather than booting. Embeds cannot supply their own key yet,
	so never put one in a URL.
</p>

<p>
	One last thing before you publish a Java embed: only one can run per site at a time, for the
	reasons in <a href={resolve('/docs/ide/java')}>Running Java projects</a>.
</p>
