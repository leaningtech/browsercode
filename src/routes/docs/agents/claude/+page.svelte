<p>
	Claude Code runs from a prepared disk image, so there is nothing to install and it starts quickly.
</p>

<h2>Signing in</h2>

<p>
	Claude Code finishes signing in by redirecting to a local address on whatever machine it is
	running on. Here that machine is the MicroVM in your tab, which your browser cannot open, so
	BrowserCode rewrites the redirect to Anthropic's code-based flow and opens the sign-in page for
	you.
</p>

<ol>
	<li>Start Claude Code and pick a login method.</li>
	<li>
		Approve the sign-in in the tab that opens. If your browser blocked it, the terminal shows the
		same URL for you to open yourself.
	</li>
	<li>The page gives you a code instead of redirecting anywhere.</li>
	<li>Paste that code back at the prompt in the terminal.</li>
</ol>

<p>
	The credential stays in your browser, so you are still signed in next time, and clearing site data
	signs you out.
</p>
