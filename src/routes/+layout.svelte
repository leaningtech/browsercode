<script lang="ts">
	import './layout.css';
	import Icon from '@iconify/svelte';
	import favicon from '$lib/assets/favicon.svg';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import UtilityBar from '$lib/components/UtilityBar.svelte';
	import Stepper from '$lib/components/Stepper.svelte';
	import AnnouncementBar from '$lib/components/AnnouncementBar.svelte';
	import LeaveWarningModal from '$lib/components/LeaveWarningModal.svelte';
	import { page } from '$app/stores';
	import { isEnabledTool, toolItems } from '$lib/config/tools';
	import { stepperState } from '$lib/stores/stepper.svelte';
	import { zenState } from '$lib/stores/zen.svelte';
	import { aboutPanelState } from '$lib/stores/aboutPanel.svelte';
	import { announcementState } from '$lib/stores/announcement.svelte';

	let { children } = $props();

	// The tour's "star us" slide (step 5) points at this ribbon, so it needs to sit above the
	// tour's backdrop for that one step only — back below it (its normal spot, under the sidebar
	// flyouts) the rest of the time.
	let ribbonAboveTour = $derived(stepperState.open && stepperState.step === 5);

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

	// A booted session, i.e. something live in a pod: a running agent, or an IDE session backed by
	// a framework template or a cloned repo. The bare pickers (/agents, /ide with no framework)
	// aren't booted yet. Mirrors Sidebar.svelte's isActiveAgentSession / isActiveIdeSession, which
	// gate the leave-session warning off the same distinction.
	let isBootedSession = $derived(
		$page.route.id === '/agents/[tool]' ||
			($page.route.id === '/ide' && $page.url.searchParams.has('framework')) ||
			($page.route.id?.startsWith('/ide/') ?? false)
	);

	// Everywhere but a booted session (whose vertical space belongs to the terminal and editor),
	// zen mode and embeds, until dismissed.
	let showAnnouncement = $derived(
		!zenState.on && !isEmbed && !isBootedSession && !announcementState.dismissed
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
					: $page.route.id === '/privacy'
						? 'Privacy Policy — BrowserCode'
						: 'BrowserCode: Start coding on your browser tab'
	);

	let pageDescription = $derived(
		activeTool
			? `Run ${activeTool.label} in your browser, on BrowserCode.`
			: $page.route.id?.startsWith('/ide')
				? 'Build and preview web apps right in your browser, on BrowserCode.'
				: $page.route.id === '/agents'
					? 'Use your favorite CLI agents without any installations, sandboxed.'
					: $page.route.id === '/privacy'
						? 'How Leaning Technologies handles your data when you use BrowserCode.'
						: 'BrowserCode runs a multi-language WebAssembly sandbox in your browser tab. No installs, no servers, no cloud compute.'
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

<div class="flex h-dvh w-screen flex-col overflow-hidden bg-bc-abyss">
	<!-- First row of the shell, so it spans the full viewport width above the sidebar rather than
	     starting at the sidebar's right edge. Everything below sizes off its flex parent (nothing
	     else in the app sets its own viewport height), so the shell simply gets shorter by the
	     stripe's height, and snaps back to the original full-height layout once it unmounts. -->
	{#if showAnnouncement}
		<AnnouncementBar />
	{/if}

	<div class="flex min-h-0 flex-1 overflow-hidden">
		<!-- Mounted everywhere: it only auto-opens on a first-ever visit to Home, but the sidebar's
		     Help flyout and the Home page both need to trigger it from anywhere via stepperState. -->
		{#if !isEmbed}
			<Stepper />
			<LeaveWarningModal />
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
				data-tour-target="github-ribbon"
				class="fixed right-5 hidden items-center gap-2 rounded-full border border-bc-border bg-bc-navy px-3.5 py-1.5 text-xs font-medium text-bc-mist no-underline shadow-lg shadow-black/20 transition-colors duration-150 hover:border-bc-ribbon-hover hover:text-bc-ribbon-hover md:flex {showAnnouncement
					? 'top-[52px]'
					: 'top-4'} {ribbonAboveTour ? 'z-[60]' : 'z-40'}"
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
	</div>

	<!-- About panel scrim: one overlay for the whole viewport (not just the hero), so the dimmed
	     tone behind the sidebar's margins and behind the panel are the exact same pixels, not two
	     separately-computed colors that can drift apart. Low z-index (and no stacking context of
	     its own) means the sidebar card (z-30), ribbon (z-40), footer and announcement bar (z-10)
	     and the panel itself (z-20, inside <main>) all still render above it, undimmed — only the plain background
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
