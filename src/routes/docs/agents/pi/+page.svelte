<p>
	Pi installs from the npm registry the first time you open it, so the first launch takes a little
	longer than the ones after it.
</p>

<h2>Signing in</h2>

<p>
	Pi signs in through its own <code>/login</code>, and works with Anthropic, OpenAI, Gemini or
	OpenRouter. An API key works for any of them.
</p>

<div class="docs-note">
	<p>
		For an account sign-in, pick <strong>Copy code login</strong> rather than the default browser option.
		The browser one redirects to a local address on the machine running Pi, which here is the MicroVM
		in your tab, so your browser cannot complete it. BrowserCode shows this as a tip when Pi starts, because
		it catches almost everyone.
	</p>
</div>

<h2>Other providers</h2>

<p>
	Only those four are reachable from the sandbox today. If <code>/login</code> or a model call to a different
	provider fails to resolve, that is the allowlist rather than anything wrong with your key, and the fix
	is to pick one of the four until it is extended.
</p>

<h2>Updates</h2>

<p>
	Pi's version is pinned here, and <code>pi update</code> cannot replace a copy it did not install, so
	its update check is switched off rather than left to offer something it cannot do.
</p>
