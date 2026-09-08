<script lang="ts">
	import './layout.css';
	import Icon from '@iconify/svelte';
	import favicon from '$lib/assets/favicon.svg';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import UtilityBar from '$lib/components/UtilityBar.svelte';
	import Stepper from '$lib/components/Stepper.svelte';
	import LeaveWarningModal from '$lib/components/LeaveWarningModal.svelte';
	import IosUnsupportedModal from '$lib/components/IosUnsupportedModal.svelte';
	import { page } from '$app/stores';
	import { isEnabledTool, toolItems } from '$lib/config/tools';
	import { stepperState } from '$lib/stores/stepper.svelte';
	import { zenState } from '$lib/stores/zen.svelte';

	let { children } = $props();

	// The tour's "star us" slide (step 6) points at this ribbon, so it needs to sit above the
	// tour's backdrop for that one step only — back below it (its normal spot, under the sidebar
	// flyouts) the rest of the time.
	let ribbonAboveTour = $derived(stepperState.open && stepperState.step === 6);

	// Show on the landing surfaces (Home, /agents, bare /ide) and during tour step 6.
	let showRibbon = $derived(
		!zenState.on &&
			(ribbonAboveTour ||
				$page.route.id === '/' ||
				$page.route.id === '/agents' ||
				($page.route.id === '/ide' && !$page.url.searchParams.has('framework')))
	);

	let activeTool = $derived(
		$page.route.id === '/agents/[tool]' && isEnabledTool($page.params.tool)
			? toolItems.find((t) => t.id === $page.params.tool)
			: undefined
	);

	let pageTitle = $derived(
		activeTool
			? `${activeTool.label} — BrowserCode`
			: $page.route.id?.startsWith('/ide')
				? 'Playground IDE — BrowserCode'
				: $page.route.id === '/agents'
					? 'Agents — BrowserCode'
					: 'BrowserCode — Start coding on your browser tab'
	);

	let pageDescription = $derived(
		activeTool
			? `Run ${activeTool.label} in your browser, on BrowserCode.`
			: $page.route.id?.startsWith('/ide')
				? 'Build and preview web apps right in your browser, on BrowserCode.'
				: $page.route.id === '/agents'
					? 'Use your favorite CLI agents without any installations, sandboxed.'
					: 'BrowserCode runs a full Node.js sandbox in WebAssembly — no installs, no servers.'
	);

	let pageUrl = $derived(`https://browsercode.io${$page.url.pathname}`);
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

<svelte:window
	onkeydown={(e) => {
		if (zenState.on && e.key === 'Escape') zenState.on = false;
	}}
/>

<IosUnsupportedModal />

<div class="flex h-dvh w-screen overflow-hidden">
	<!-- Mounted everywhere: it only auto-opens on a first-ever visit to Home, but the sidebar's
	     Help flyout and the Home page both need to trigger it from anywhere via stepperState. -->
	<Stepper />
	<LeaveWarningModal />
	{#if !zenState.on}
		<Sidebar />
	{/if}

	<!-- GitHub Ribbon — landing surfaces only (Home, /agents, bare /ide — see showRibbon above);
	     the sidebar carries the GitHub link on the app surfaces. -->
	{#if showRibbon}
		<div
			class="pointer-events-none fixed top-0 right-0 hidden overflow-hidden md:block {ribbonAboveTour
				? 'z-[60]'
				: 'z-40'}"
			style="width: 150px; height: 175px;"
		>
			<a
				href="https://github.com/leaningtech/browsercode"
				target="_blank"
				rel="noopener noreferrer"
				aria-label="Star this project on GitHub"
				class="pointer-events-auto absolute flex items-center justify-center gap-1.5 bg-bc-azure py-1.5 text-xs font-semibold text-white shadow-[0_4px_14px_rgba(74,125,255,0.45)] transition-colors duration-150 hover:bg-bc-mist hover:text-bc-abyss"
				style="top: 38px; right: -42px; width: 190px; transform: rotate(45deg);"
			>
				<Icon icon="simple-icons:github" width="13" height="13" />
				Star us on GitHub
			</a>
		</div>
	{/if}

	<div class="flex flex-1 flex-col overflow-hidden">
		<div class="flex flex-1 overflow-hidden">
			<main class="flex min-h-0 min-w-0 flex-1 overflow-hidden">
				{@render children()}
			</main>
		</div>

		{#if !zenState.on}
			<UtilityBar />
		{/if}
	</div>
</div>
