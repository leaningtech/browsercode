<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import IdeShell from '$lib/components/ide/IdeShell.svelte';
	import IdeLanding from '$lib/components/ide/IdeLanding.svelte';
	import { IdeSession, type PortalUpdate } from '$lib/ide/session.svelte';
	import { defaultFrameworkId, isFrameworkId, type FrameworkId } from '$lib/config/frameworks';

	// Bare /ide (no ?framework=) shows the landing instead of auto-booting a template.
	const requested = $page.url.searchParams.get('framework');
	const showLanding = !requested;
	const framework: FrameworkId = isFrameworkId(requested) ? requested : defaultFrameworkId;

	const session = new IdeSession();

	function boot(terminalEl: HTMLElement, onPortalUpdate: (update: PortalUpdate) => void) {
		return session.boot(framework, terminalEl, onPortalUpdate);
	}

	// Same reveal treatment as the landing page's About panel: starts closed so the transition
	// actually animates in on arrival, rather than snapping straight to open.
	let entered = $state(false);
	onMount(() => {
		requestAnimationFrame(() => {
			entered = true;
		});
	});
</script>

<div
	class="panel-sheet flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-t-[20px] border-t border-bc-mist/15"
	style="transform: translateY({entered
		? '0%'
		: '101%'}); transition: transform 0.62s cubic-bezier(0.22,1,0.36,1);"
>
	{#if showLanding}
		<IdeLanding />
	{:else}
		<IdeShell {session} {boot} />
	{/if}
</div>
