<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<p>
	BrowserCode runs unmodified coding CLIs inside a browser MicroVM. The agent gets a real shell, a
	real filesystem and a real Node.js, but all of it is inside your browser tab: it cannot see your
	machine, your files, or anything on the network beyond the hosts BrowserCode allows. That makes it
	a reasonable way to try an agent you have not installed, or to let one work unsupervised on
	something throwaway.
</p>

<p>
	What you get is a terminal, and it behaves like one: click into it and type. Clicking around with
	the mouse will not do much, which catches people out on the first screen.
</p>

<h2>What the agent knows about the sandbox</h2>

<p>
	Each agent starts with an instructions file already in place, covering what it could not guess:
	that native packages will not run and what to use instead, that servers must listen on
	<code>0.0.0.0</code> to be reachable, and which hosts it can connect to. They live in the
	repository, so you can read exactly what your agent was told:
	<a
		href="https://github.com/leaningtech/browsercode/blob/main/static/project/claude/CLAUDE.md"
		target="_blank"
		rel="noopener noreferrer">CLAUDE.md</a
	>
	for Claude Code,
	<a
		href="https://github.com/leaningtech/browsercode/blob/main/static/project/codex/AGENTS.md"
		target="_blank"
		rel="noopener noreferrer">AGENTS.md</a
	>
	for Codex CLI, and
	<a
		href="https://github.com/leaningtech/browsercode/blob/main/static/project/pi/AGENTS.md"
		target="_blank"
		rel="noopener noreferrer">AGENTS.md</a
	> for Pi.
</p>

<div class="docs-note">
	<p>
		An agent may try its usual approach before reading that file. If it reaches for a native package
		or a host that is not allowed, telling it to read the instructions file is usually enough.
	</p>
</div>

<h2>One copy of each agent at a time</h2>

<p>
	Two tabs of the same agent would be two sessions writing to one set of files, so the second one
	offers to take the session over instead of starting its own: a dialog with a <strong
		>Use here</strong
	>
	button, which closes the session in the first tab and loses anything unsaved there. Different agents
	do not collide, so Claude Code in one tab and Codex CLI in another is fine.
</p>

<h2>Signing in</h2>

<p>
	Every agent expects to sign in on a normal machine, and a browser sandbox is not one, so each has
	its own way around that. This is where people get stuck: read the page for the one you are using
	first. <a href={resolve('/docs/agents/claude')}>Claude Code</a>,
	<a href={resolve('/docs/agents/codex')}>Codex CLI</a>,
	<a href={resolve('/docs/agents/pi')}>Pi</a>.
</p>

<div class="docs-note">
	<p>
		Whatever you sign in with is stored in your browser, not on our servers, and anyone who can use
		your browser profile can read it. Think twice on a shared computer.
	</p>
</div>

<h2>Getting good results</h2>

<p>
	Two habits save most of the frustration, whichever agent you use. Ask it to start dev servers in
	the background, because a server that never exits will otherwise block its turn until something
	times out. And if a server starts but no preview appears, remind it to bind
	<code>0.0.0.0</code>: the logs look fine either way, so an agent rarely works this out alone.
</p>

<h2>Keeping what the agent builds</h2>

<p>
	Its work lives in the browser's storage until you take it out: download the project as a zip, or
	use Share to put it in a link. Clearing site data removes the MicroVM and everything in it,
	sign-in included.
</p>
