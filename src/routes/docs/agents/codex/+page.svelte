<p>
	Codex CLI installs itself the first time you open it, which takes a moment. After that it is kept
	and starts straight away.
</p>

<h2>Signing in</h2>

<p>
	Codex needs an <strong>OpenAI API key</strong>. Signing in with a ChatGPT account is not possible
	here, so there is no way around it, and BrowserCode asks for the key before Codex starts rather
	than letting it fail later.
</p>
<p>
	You will not see Codex's own login screen at all. BrowserCode points it at a provider that reads
	the key from its environment, because the built-in one insists on showing that screen even when a
	key is already set.
</p>
<p>
	Create one at <a
		href="https://platform.openai.com/api-keys"
		target="_blank"
		rel="noopener noreferrer">platform.openai.com/api-keys</a
	>
	with <strong>Create new secret key</strong>, then paste it into the panel.
</p>

<div class="docs-note">
	<p>
		The key is saved in your browser and sent to OpenAI when Codex runs; it is not stored on our
		servers. Usage is billed per token to your OpenAI account, and a ChatGPT subscription does not
		cover it.
	</p>
</div>

<p>
	To use a different key, for instance after a typo, press the key button in the bottom-left corner
	of the terminal: it saves the new one and restarts Codex.
</p>
<p>
	To remove the key, clear site data for browsercode.io. If you would rather it had never been used
	at all, revoke it in the OpenAI console as well.
</p>
