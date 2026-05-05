<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import UtilityBar from '$lib/components/UtilityBar.svelte';
	import Stepper from '$lib/components/Stepper.svelte';
	import { onMount } from 'svelte';

	let { children } = $props();

	let activePanel = $state('claude');

	function getToolFromURL(): 'claude' | 'gemini' {
		if (typeof window === 'undefined') return 'claude';
		const params = new URLSearchParams(window.location.search);
		const tool = params.get('');
		return tool === 'gemini' ? 'gemini' : 'claude';
	}

	onMount(() => {
		activePanel = getToolFromURL();
	});

	function handlePanelToggle(panel: string) {
		if (panel === 'claude' || panel === 'gemini') {
			window.location.href = `?=${panel}`;
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta property="og:title" content="BrowserCode" />
	<meta
		property="og:description"
		content="Run AI coding CLIs in-browser."
	/>
	<meta property="og:image" content="https://browsercode.io/og.png" />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://browsercode.io" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:image" content="https://browsercode.io/og.png" />
	<script
		defer
		data-domain="browsercode.io"
		src="https://plausible.leaningtech.com/js/script.js"
	></script>
</svelte:head>

<div class="flex h-dvh w-screen overflow-hidden">
	<Stepper />
	<Sidebar {activePanel} onPanelToggle={handlePanelToggle} />

	<!-- GitHub Fork Ribbon -->
	<div
		class="pointer-events-none fixed top-0 right-0 z-40 hidden overflow-hidden md:block"
		style="width: 150px; height: 175px;"
	>
		<a
			href="https://github.com/leaningtech/browsercode"
			target="_blank"
			rel="noopener noreferrer"
			aria-label="Star this project on GitHub"
			class="pointer-events-auto absolute flex items-center justify-center gap-1.5 bg-[#333] py-1.5 text-xs font-semibold text-white shadow-md"
			style="top: 38px; right: -42px; width: 190px; transform: rotate(45deg);"
		>
			Star me on GitHub
		</a>
	</div>

	<div class="flex flex-1 flex-col overflow-hidden">
		<div class="flex flex-1 overflow-hidden">
			<main class="flex min-h-0 min-w-0 flex-1 overflow-hidden">
				{@render children()}
			</main>
		</div>

		<UtilityBar />
	</div>
</div>
