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
	import { aboutPanelState } from '$lib/stores/aboutPanel.svelte';

	let { children } = $props();

	// The tour's "star us" slide (step 6) points at this ribbon, so it needs to sit above the
	// tour's backdrop for that one step only — back below it (its normal spot, under the sidebar
	// flyouts) the rest of the time.
	let ribbonAboveTour = $derived(stepperState.open && stepperState.step === 6);

	// Embeds render inside a host page, where none of the app chrome belongs.
	let isEmbed = $derived($page.route.id?.startsWith('/embed') ?? false);

	// Show on the landing surfaces (Home, /agents, bare /ide) and during tour step 6.
	let showRibbon = $derived(
		!zenState.on &&
			!isEmbed &&
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

<!-- `contents`: scopes these always-dark overlays' CSS variables without adding a layout box —
     they aren't part of this pass's light-mode re-theme (see layout.css's .bc-dark-scope). -->
<div class="bc-dark-scope contents">
	<IosUnsupportedModal />
</div>

<div class="flex h-dvh w-screen overflow-hidden bg-bc-abyss">
	<!-- Mounted everywhere: it only auto-opens on a first-ever visit to Home, but the sidebar's
	     Help flyout and the Home page both need to trigger it from anywhere via stepperState. -->
	{#if !isEmbed}
		<div class="bc-dark-scope contents">
			<Stepper />
			<LeaveWarningModal />
		</div>
	{/if}
	{#if !zenState.on && !isEmbed}
		<Sidebar />
	{/if}

	<!-- GitHub Ribbon — landing surfaces only (Home, /agents, bare /ide — see showRibbon above);
	     the sidebar carries the GitHub link on the app surfaces. -->
	{#if showRibbon}
		<a
			href="https://github.com/leaningtech/browsercode"
			target="_blank"
			rel="noopener noreferrer"
			aria-label="Star this project on GitHub"
			class="fixed top-4 right-5 hidden items-center gap-2 rounded-full border border-bc-border bg-bc-navy px-3.5 py-1.5 text-xs font-medium text-bc-mist no-underline shadow-lg shadow-black/20 transition-colors duration-150 hover:border-bc-ribbon-hover hover:text-bc-ribbon-hover md:flex {ribbonAboveTour
				? 'z-[60]'
				: 'z-40'}"
		>
			<Icon icon="simple-icons:github" width="14" height="14" />
			Star on GitHub
		</a>
	{/if}

	<div class="flex flex-1 flex-col overflow-hidden">
		<div class="flex flex-1 overflow-hidden">
			<main class="flex min-h-0 min-w-0 flex-1 overflow-hidden">
				{@render children()}
			</main>
		</div>

		{#if !zenState.on && !isEmbed}
			<UtilityBar />
		{/if}
	</div>

	<!-- About panel scrim: one overlay for the whole viewport (not just the hero), so the dimmed
	     tone behind the sidebar's margins and behind the panel are the exact same pixels, not two
	     separately-computed colors that can drift apart. Low z-index (and no stacking context of
	     its own) means the sidebar card (z-30), ribbon (z-40), footer (z-10) and the panel itself
	     (z-20, inside <main>) all still render above it, undimmed — only the plain background
	     between them shows the overlay. Clicking anywhere on it closes the panel. -->
	<div
		class="fixed inset-0 z-[5] transition-opacity duration-500 ease-out"
		style="background: rgba(4,5,6,0.35); opacity: {aboutPanelState.open
			? 1
			: 0}; pointer-events: {aboutPanelState.open ? 'auto' : 'none'};"
		onclick={() => (aboutPanelState.open = false)}
		role="presentation"
	></div>
</div>
