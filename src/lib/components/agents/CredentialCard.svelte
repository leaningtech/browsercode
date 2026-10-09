<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { CredentialSpec, ToolItem } from '$lib/config/tools';

	let {
		tool,
		credential,
		mode,
		onSubmit,
		onCancel
	}: {
		tool: ToolItem;
		credential: CredentialSpec;
		/** 'boot' gates the first launch; 'change' swaps the stored value and restarts the session. */
		mode: 'boot' | 'change';
		onSubmit: (value: string) => void;
		onCancel?: () => void;
	} = $props();

	let secret = $state('');
	let revealed = $state(false);

	/** The bare host reads better as link text than the full URL. */
	let consoleLabel = $derived(credential.consoleUrl.replace(/^https?:\/\//, ''));

	function submit(event: SubmitEvent) {
		event.preventDefault();
		const value = secret.trim();
		if (value) onSubmit(value);
	}
</script>

<form
	onsubmit={submit}
	class="glass-panel glass-panel-solid w-full max-w-[520px] rounded-[14px] border border-bc-border p-8 shadow-2xl"
>
	<div class="mb-5 flex items-center gap-3.5">
		<span class="flex h-12 w-12 items-center justify-center rounded-xl {tool.accentClass}">
			<Icon icon="mingcute:key-2-line" width="24" height="24" />
		</span>
		<div class="flex flex-col gap-1">
			<span class="text-[15px] font-semibold text-bc-text">
				{mode === 'boot' ? `Sign in to ${tool.label}` : `Change your ${credential.label}`}
			</span>
			<span class="text-[12.5px] text-bc-text-muted">
				{mode === 'boot'
					? credential.signInReason
					: `${tool.label} reads it at launch, so saving a new one restarts your session. Anything running in the terminal stops.`}
			</span>
		</div>
	</div>

	<div class="flex flex-col gap-3 rounded-[11px] border border-bc-border bg-bc-tint/2 px-4 py-4">
		<label for="agent-credential" class="text-[11px] tracking-widest text-bc-mist/55 uppercase">
			{credential.label}
		</label>
		<div class="relative">
			<!-- No bind:value: Svelte requires a static type when two-way bound, and this one toggles. -->
			<input
				id="agent-credential"
				type={revealed ? 'text' : 'password'}
				placeholder={credential.placeholder}
				autocomplete="off"
				spellcheck="false"
				value={secret}
				oninput={(event) => (secret = event.currentTarget.value)}
				class="w-full rounded-lg border border-bc-border bg-bc-navy/55 py-2.5 pr-11 pl-3 font-mono text-[13px] tracking-tight text-bc-text outline-none focus:border-bc-azure/65"
			/>
			<button
				type="button"
				onclick={() => (revealed = !revealed)}
				aria-label={revealed ? 'Hide value' : 'Show value'}
				class="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-bc-icon transition hover:bg-bc-tint/8 hover:text-bc-mist"
			>
				<Icon
					icon={revealed ? 'mingcute:eye-close-line' : 'mingcute:eye-line'}
					width="16"
					height="16"
				/>
			</button>
		</div>
		<div class="text-xs leading-relaxed text-bc-text-muted">
			Create one at
			<!-- The provider's console is an external URL, so resolve() does not apply here. -->
			<!-- eslint-disable svelte/no-navigation-without-resolve -->
			<a
				href={credential.consoleUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="text-bc-mist hover:text-bc-link-hover">{consoleLabel}</a
			>
			under <span class="text-bc-text">{credential.createLabel}</span>, then paste it here.
			{credential.rationale}
		</div>
	</div>

	<div class="mt-5 flex items-center justify-end gap-3">
		{#if onCancel}
			<button
				type="button"
				onclick={onCancel}
				class="rounded-md bg-bc-tint/5 px-4.5 py-2 text-[13px] font-medium text-bc-mist transition hover:bg-bc-tint/10"
			>
				Cancel
			</button>
		{/if}
		<button
			type="submit"
			disabled={secret.trim().length === 0}
			class="rounded-[7px] bg-bc-azure/90 px-5 py-2 text-[13px] font-medium text-bc-abyss transition hover:bg-bc-azure disabled:cursor-not-allowed disabled:opacity-40"
		>
			{mode === 'boot' ? 'Continue' : 'Save & restart'}
		</button>
	</div>
</form>
