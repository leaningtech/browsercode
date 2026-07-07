<script lang="ts">
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
</script>

{#if showLanding}
	<IdeLanding />
{:else}
	<IdeShell {session} {boot} />
{/if}
