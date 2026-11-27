<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<p>
	The <a href={resolve('/ide')}>playground</a> opens on a picker with two tabs, JavaScript and Java, and
	a box for pasting a GitHub repo URL. Pick a starting point and it boots: installs dependencies, starts
	the dev server and shows the result, with the commands it ran visible in the terminal so nothing is
	hidden from you.
</p>
<p>
	The two languages work differently underneath, so each has its own page:
	<a href={resolve('/docs/ide/javascript')}>Running JavaScript projects</a> and
	<a href={resolve('/docs/ide/java')}>Running Java projects</a>, with more coming for Rust and
	Python.
</p>

<h2>Where to start</h2>

<ul>
	<li>
		A <a href="{resolve('/ide')}?lang=js">JavaScript template</a>: Vite on its own or with
		<a href="{resolve('/ide')}?framework=react">React</a>,
		<a href="{resolve('/ide')}?framework=svelte">Svelte</a> or
		<a href="{resolve('/ide')}?framework=vue">Vue</a>, plus
		<a href="{resolve('/ide')}?framework=nextjs">Next.js</a>,
		<a href="{resolve('/ide')}?framework=nuxt">Nuxt</a> and
		<a href="{resolve('/ide')}?framework=express">Express</a>.
	</li>
	<li>
		A <a href="{resolve('/ide')}?lang=java">Java example</a>, either
		<a href="{resolve('/java')}?example=helloworld">Hello World</a> or
		<a href="{resolve('/java')}?example=swing">Swing</a>.
	</li>
	<li>
		A <a href={resolve('/ide')}>public GitHub repo</a>, by pasting its URL into the clone box on the
		picker.
	</li>
</ul>

<h2>Finding your way around</h2>

<ul>
	<li><strong>Files</strong> and <strong>Search</strong> work the way you would expect.</li>
	<li>
		<strong>Editor</strong> is Monaco, the editor from VS Code, with a few themes in the settings menu.
		Your edits save as you type.
	</li>
	<li>
		<strong>Terminal</strong> opens on an Output tab showing what BrowserCode ran to boot your project.
		On a JavaScript project you can open more tabs, each a real shell. Java projects use the tab for the
		program's own input and output.
	</li>
	<li>
		<strong>Preview</strong> is your app, running. For Java it becomes a Display, where Swing windows
		draw.
	</li>
</ul>

<p>
	In a narrow window the panes become tabs, and a tab marks itself when something happens in it that
	you cannot see from where you are.
</p>

<h2>Getting your work out</h2>

<p>
	Your project lives in the browser's storage, so take a copy of anything you want to keep. The
	Files pane header has a button that downloads the whole project as a zip, and single files can be
	downloaded from their own menu in the tree.
</p>

<div class="docs-note">
	<p>
		The zip holds the files the editor knows about. Anything you created in the terminal is not in
		that list, so copy those out of the shell yourself.
	</p>
</div>

<p>
	There is also a <strong>Share</strong> button, which puts the whole project into a link: the files themselves
	travel in the URL, so no server stores anything and the link keeps working for whoever you send it to.
	Lockfiles are left out and images come through empty, which keeps the link to a sane length.
</p>
<p>
	Next to it, <strong>Embed</strong> turns the project you are looking at into an iframe snippet for
	your own page, with a preview of how it will look. See
	<a href={resolve('/docs/embedding')}>Embedding BrowserCode</a>, or
	<a href={resolve('/docs/linking')}>Linking to BrowserCode</a> for sending someone a URL instead of hosting
	anything.
</p>
