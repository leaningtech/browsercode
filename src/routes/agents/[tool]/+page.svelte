<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { AgentSession } from '$lib/agents/session.svelte';
	import AgentShell from '$lib/components/agents/AgentShell.svelte';
	import DuplicateTabDialog from '$lib/components/agents/DuplicateTabDialog.svelte';

	const session = new AgentSession($page.params.tool);

	// Same reveal treatment as the landing page's About panel: starts closed so the transition
	// actually animates in on arrival, rather than snapping straight to open.
	let entered = $state(false);
	onMount(() => {
		requestAnimationFrame(() => {
			entered = true;
		});
	});
</script>

<div class="flex h-full min-h-0 w-full min-w-0 flex-col">
	<!-- Kept outside the sheet: its transform would make it the containing block for a fixed child. -->
	{#if session.lock === 'taken'}
		<DuplicateTabDialog />
	{/if}

	<div
		class="panel-sheet flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[20px] border-t border-bc-mist/15"
		style="transform: translateY({entered
			? '0%'
			: '101%'}); transition: transform 0.62s cubic-bezier(0.22,1,0.36,1);"
	>
		<AgentShell {session} />
	</div>
</div>
