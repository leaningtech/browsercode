<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import UtilityBar from '$lib/components/UtilityBar.svelte';
	import Stepper from '$lib/components/Stepper.svelte';
	import { page } from '$app/stores';
	import { toolItems } from '$lib/config/tools';

	let { children } = $props();

	const validToolIds = new Set(toolItems.filter((t) => !t.disabled).map((t) => t.id));
	const defaultTool = toolItems.find((t) => !t.disabled)?.id ?? 'claude';

	let activePanel = $derived(
		validToolIds.has($page.params.tool as string) ? $page.params.tool : defaultTool
	);

	let activeTool = $derived(toolItems.find((t) => t.id === activePanel));

	let pageTitle = $derived(activeTool ? `${activeTool.label} — BrowserCode` : 'BrowserCode');

	let pageDescription = $derived(
		activeTool
			? `Run ${activeTool.label} in your browser, on BrowserCode.`
			: 'Run AI coding CLIs in your browser.'
	);

	let pageUrl = $derived(
		activeTool ? `https://browsercode.io/${activeTool.id}` : 'https://browsercode.io'
	);

	function handlePanelToggle(panel: string) {
		if (validToolIds.has(panel)) {
			window.location.href = `/${panel}`;
		}
	}
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<link rel="icon" href={favicon} />
	<meta name="description" content={pageDescription} />
	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={pageDescription} />
	<meta property="og:image" content="https://browsercode.io/og.png" />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={pageUrl} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={pageTitle} />
	<meta name="twitter:description" content={pageDescription} />
	<meta name="twitter:image" content="https://browsercode.io/og.png" />
	<meta property="twitter:domain" content="browsercode.io" />
	<meta property="twitter:url" content={pageUrl} />
</svelte:head>

<div class="flex h-dvh w-screen overflow-hidden">
	<Stepper />
	<Sidebar {activePanel} onPanelToggle={handlePanelToggle} />

	<!-- GitHub Ribbon -->
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
