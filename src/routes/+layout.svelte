<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import TopBar from '$lib/components/TopBar.svelte';

	let { children } = $props();

	let activePanel = $state('terminal');

	function handlePanelToggle(panel: string) {
		activePanel = activePanel === panel ? 'terminal' : panel;
	}
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="flex h-screen w-screen overflow-hidden">
	<Sidebar {activePanel} onPanelToggle={handlePanelToggle} />

	<div class="flex flex-1 flex-col overflow-hidden">
		<TopBar />

		<main class="flex-1 overflow-hidden">
			{@render children()}
		</main>
	</div>
</div>
