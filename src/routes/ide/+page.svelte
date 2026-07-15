<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import IdeShell from '$lib/components/ide/IdeShell.svelte';
	import IdeLanding from '$lib/components/ide/IdeLanding.svelte';
	import WavyGridBackground from '$lib/components/WavyGridBackground.svelte';
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

	// Landing (pre-boot) fades the glass panel in over the wavy grid, full coverage from the
	// start. Once booted, IdeShell keeps the sheet-slide-up entrance instead (see below).
	let entered = $state(false);
	onMount(() => {
		requestAnimationFrame(() => {
			entered = true;
		});
	});
</script>

{#if showLanding}
	<div class="relative h-full w-full overflow-hidden">
		<WavyGridBackground />

		<!-- vignette to keep text legible over the grid, matching the landing page's hero -->
		<div
			class="pointer-events-none absolute inset-0 z-[1]"
			style="background: radial-gradient(closest-side at 50% 46%, rgba(2,9,20,0.55), rgba(2,9,20,0) 78%);"
		></div>

		<div
			class="panel-sheet absolute inset-0 z-[2] flex flex-col overflow-hidden"
			style="background-color: transparent; background-image: none; backdrop-filter: blur(1.5px);
				-webkit-backdrop-filter: blur(1.5px); opacity: {entered ? 1 : 0}; transition: opacity 0.5s ease;"
		>
			<IdeLanding />
		</div>
	</div>
{:else}
	<div
		class="panel-sheet flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-t-[20px] border-t border-bc-mist/15"
		style="transform: translateY({entered
			? '0%'
			: '101%'}); transition: transform 0.62s cubic-bezier(0.22,1,0.36,1);"
	>
		<IdeShell {session} {boot} />
	</div>
{/if}
