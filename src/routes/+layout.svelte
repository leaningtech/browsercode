<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import UtilityBar from '$lib/components/UtilityBar.svelte';
	import Stepper from '$lib/components/Stepper.svelte';

	let { children } = $props();

	let activePanel = $state('gemini');

	function handlePanelToggle(panel: string) {
		if (panel !== 'gemini') {
			activePanel = activePanel === panel ? 'gemini' : panel;
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<script
		defer
		data-domain="browsercode.io"
		src="https://plausible.leaningtech.com/js/script.js"
	></script>
</svelte:head>

<div class="flex h-screen w-screen overflow-hidden">
	<Stepper />
	<Sidebar {activePanel} onPanelToggle={handlePanelToggle} />

	<div class="flex flex-1 flex-col overflow-hidden">
		<div class="flex flex-1 overflow-hidden">
			<main class="flex min-h-0 min-w-0 flex-1 overflow-hidden">
				{@render children()}
			</main>
		</div>

		<UtilityBar />
	</div>
</div>
