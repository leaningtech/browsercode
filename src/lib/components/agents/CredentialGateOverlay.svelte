<script lang="ts">
	import type { CredentialGate } from '$lib/agents/credential-gate.svelte';
	import type { CredentialSpec, ToolItem } from '$lib/config/tools';
	import AgentErrorCard from './AgentErrorCard.svelte';
	import AgentLoadingCard from './AgentLoadingCard.svelte';
	import CredentialCard from './CredentialCard.svelte';

	type Props = {
		gate: CredentialGate;
		tool: ToolItem;
		credential: CredentialSpec;
		/** Relaunches the CLI, which is the only way a retry or a new secret takes effect. */
		onRestart: () => void;
		/** Abandons the boot; every stage here is reached before the CLI has started. */
		onCancel: () => void;
	};

	let { gate, tool, credential, onRestart, onCancel }: Props = $props();
</script>

<div
	class="absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
>
	{#if gate.stage === 'loading'}
		<AgentLoadingCard {tool} {credential} willAskForCredential={!gate.hasCredential} {onCancel} />
	{:else if gate.stage === 'error'}
		<AgentErrorCard {tool} message={gate.error} onRetry={onRestart} {onCancel} />
	{:else if gate.stage === 'signin'}
		<CredentialCard {tool} {credential} mode="boot" onSubmit={gate.submit} {onCancel} />
	{:else}
		<CredentialCard
			{tool}
			{credential}
			mode="change"
			onSubmit={gate.saveAndRestart}
			onCancel={gate.closeChange}
		/>
	{/if}
</div>
