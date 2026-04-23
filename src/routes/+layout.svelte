<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import UtilityBar from '$lib/components/UtilityBar.svelte';
	import Stepper from '$lib/components/Stepper.svelte';

	let { children } = $props();

	let activePanel = $state('');

	function handlePanelToggle(panel: string) {
		activePanel = activePanel === panel ? '' : panel;
	}
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="flex h-screen w-screen overflow-hidden">
	<Stepper />
	<Sidebar {activePanel} onPanelToggle={handlePanelToggle} />

	<div class="flex flex-1 flex-col overflow-hidden">
		<div class="flex flex-1 overflow-hidden">
			<!-- {#if activePanel === 'panel'}

			{/if} -->

			<main class="flex min-h-0 min-w-0 flex-1 overflow-hidden">
				{@render children()}
			</main>
		</div>

		<UtilityBar />
	</div>
</div>
