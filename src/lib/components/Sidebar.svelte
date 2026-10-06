<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import opencodeLogoSrc from '$lib/assets/opencode-logo.svg';
	import Icon from '@iconify/svelte';
	import { page } from '$app/stores';
	import { toolItems } from '$lib/config/tools';
	import { frameworkRailItems } from '$lib/config/frameworks';
	import { trackEvent } from '$lib/utils/useLazyTracking';
	import { openTour } from '$lib/stores/stepper.svelte';
	import { NEW_ISSUE_URL } from '$lib/utils/bug-report';
	import { navigateWithLeaveGuard } from '$lib/stores/leaveWarning.svelte';
	import { themeState, toggleTheme } from '$lib/stores/theme.svelte';
	import CloneRepoDialog from '$lib/components/ide/CloneRepoDialog.svelte';

	let showCloneDialog = $state(false);

	let isHome = $derived($page.route.id === '/');
	let isAgentsSection = $derived($page.route.id?.startsWith('/agents') ?? false);
	let isIdeSection = $derived($page.route.id?.startsWith('/ide') ?? false);

	// Which agent is currently booted, if any — drives the flyout's "active" row badge only;
	// the main button's color stays the same regardless of which one (or whether any) is running.
	let activeTool = $derived(
		$page.route.id === '/agents/[tool]'
			? toolItems.find((t) => t.id === $page.params.tool)
			: undefined
	);

	// The bare pickers (/agents index, /ide landing) already show the same choices inline, so the
	// sidebar flyout stays hidden there; once something is actually running, it becomes a handy
	// shortcut to switch without leaving the session.
	let isAgentsIndexOnly = $derived($page.route.id === '/agents');
	let isIdeLandingOnly = $derived(
		$page.route.id === '/ide' && !$page.url.searchParams.has('framework')
	);

	let isActiveAgentSession = $derived($page.route.id === '/agents/[tool]');
	// A booted framework (/ide?framework=...) or cloned GitHub repo (/ide/github/...) — the bare
	// landing picker has nothing running yet, so it's excluded.
	let isActiveIdeSession = $derived(isIdeSection && !isIdeLandingOnly);

	// Full reloads are deliberate here: they're the teardown mechanism for a running pod
	// (see CLAUDE.md). Every cross-section navigation in this file goes through them. Leaving an
	// active agent or IDE session asks for confirmation first, since it would tear down a live
	// terminal/dev server.
	function navigate(path: string) {
		navigateWithLeaveGuard(path, isActiveAgentSession || isActiveIdeSession);
	}

	// Flyout visibility is tracked explicitly (rather than relying on CSS :hover + a bridging
	// gap) so a brief, imperfect mouse path from the icon into a tall menu doesn't close it —
	// mouseenter/mouseleave fire on this whole wrapper (button + menu together), and closing
	// waits a beat in case the pointer re-enters.
	let openFlyout = $state<'agents' | 'ide' | 'help' | null>(null);
	let closeTimer: ReturnType<typeof setTimeout> | null = null;

	function openFlyoutNow(id: 'agents' | 'ide' | 'help') {
		if (closeTimer) clearTimeout(closeTimer);
		openFlyout = id;
	}

	function scheduleCloseFlyout() {
		if (closeTimer) clearTimeout(closeTimer);
		closeTimer = setTimeout(() => {
			openFlyout = null;
		}, 400);
	}
</script>

{#snippet tooltip(label: string)}
	<span
		class="pointer-events-none absolute left-full z-50 ml-3 flex items-center opacity-0 transition-opacity duration-100 group-hover:opacity-100"
	>
		<span class="h-1.5 w-1.5 rotate-45 border-b border-l border-bc-border bg-bc-navy"></span>
		<span
			class="-ml-px flex items-center gap-1.5 rounded-md border border-bc-border bg-bc-navy px-2.5 py-1.5 text-[11.5px] leading-none font-medium whitespace-nowrap text-bc-mist shadow-lg shadow-black/40"
		>
			{label}
		</span>
	</span>
{/snippet}

<aside
	style="background-color: var(--color-bc-abyss)"
	class="glass-panel relative z-30 my-2.5 ml-2.5 hidden h-[calc(100%-20px)] w-sidebar flex-col rounded-[18px] border border-[rgb(var(--bc-tint)/11%)] md:flex"
>
	<!-- Home: not expandable, always takes you back to the landing page -->
	<div class="group relative flex items-center justify-center py-3.5">
		<button
			onclick={() => navigate('/')}
			title="BrowserCode"
			class="rounded-md p-1 transition-opacity duration-150 {isHome ? '' : 'hover:opacity-80'}"
		>
			<img src={favicon} alt="BrowserCode" class="bc-logo-mark h-[31px] w-[31px]" />
		</button>
		{@render tooltip('Home')}
	</div>

	<div class="mx-3 h-px bg-bc-border"></div>

	<nav class="flex flex-1 flex-col gap-0.5 px-1.5 pt-2">
		<!-- Ide: expands on hover with the curated framework list; the flyout is suppressed on the
		     bare /ide landing, which already shows the same choices inline -->
		<div
			class="group relative flex items-center justify-center"
			role="group"
			onmouseenter={() => openFlyoutNow('ide')}
			onmouseleave={scheduleCloseFlyout}
		>
			<button
				onclick={() => navigate('/ide')}
				data-tour-target="ide"
				class="relative flex w-full items-center justify-center rounded-md p-2.5 transition-all duration-150
					{isIdeSection
					? 'bg-bc-azure/15 text-bc-azure'
					: 'text-bc-icon hover:bg-[rgb(var(--bc-tint)/12%)] hover:text-bc-text'}"
			>
				<Icon icon="mingcute:code-line" width="26" height="26" />
			</button>

			{#if isIdeLandingOnly}
				{@render tooltip('Playground IDE')}
			{:else}
				<div
					class="absolute top-0 left-full z-50 w-56 pl-2 opacity-0 transition-opacity duration-100 {openFlyout ===
					'ide'
						? 'visible opacity-100'
						: 'invisible'}"
				>
					<div
						class="solid-panel rounded-lg border border-bc-border p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
					>
						<div
							class="px-2 pt-1 pb-1.5 text-[10px] font-medium tracking-widest text-bc-mist/50 uppercase"
						>
							Frameworks
						</div>
						{#each frameworkRailItems as fw (fw.id)}
							<button
								type="button"
								onclick={() => navigate(`/ide?framework=${fw.id}`)}
								class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[12.5px] text-bc-mist transition hover:bg-bc-border hover:text-bc-text"
							>
								<span
									class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[rgb(var(--bc-tint)/5%)]"
								>
									<Icon icon={fw.icon} width="14" height="14" />
								</span>
								<span class="flex-1 truncate">{fw.label}</span>
							</button>
						{/each}
						<div class="my-1 h-px bg-bc-border"></div>
						<button
							type="button"
							onclick={() => {
								showCloneDialog = true;
								openFlyout = null;
							}}
							class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[12.5px] text-bc-text-muted transition hover:bg-bc-border hover:text-bc-text"
						>
							<span class="flex h-6 w-6 shrink-0 items-center justify-center">
								<Icon icon="simple-icons:github" width="14" height="14" />
							</span>
							<span class="flex-1 truncate">Clone from GitHub</span>
						</button>
						<button
							type="button"
							onclick={() => navigate('/ide')}
							class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[12.5px] text-bc-text-muted transition hover:bg-bc-border hover:text-bc-text"
						>
							<span class="flex h-6 w-6 shrink-0 items-center justify-center">
								<Icon icon="mingcute:arrow-right-line" width="14" height="14" />
							</span>
							<span class="flex-1 truncate">See all frameworks</span>
						</button>
					</div>
				</div>
			{/if}
		</div>

		<!-- Agents: hidden while on the bare picker (it already shows the same choices inline);
		     shows on hover everywhere else, including once a specific agent is running. -->
		<div
			class="group relative flex items-center justify-center"
			role="group"
			onmouseenter={() => openFlyoutNow('agents')}
			onmouseleave={scheduleCloseFlyout}
		>
			<button
				onclick={() => navigate('/agents')}
				data-tour-target="agents"
				class="relative flex w-full items-center justify-center rounded-md p-2.5 transition-all duration-150
					{isAgentsSection
					? 'bg-bc-azure/15 text-bc-azure'
					: 'text-bc-icon hover:bg-[rgb(var(--bc-tint)/12%)] hover:text-bc-text'}"
			>
				<Icon icon="mingcute:robot-line" width="26" height="26" />
			</button>

			{#if isAgentsIndexOnly}
				{@render tooltip('Agents')}
			{:else}
				<div
					class="absolute top-0 left-full z-50 w-56 pl-2 opacity-0 transition-opacity duration-100 {openFlyout ===
					'agents'
						? 'visible opacity-100'
						: 'invisible'}"
				>
					<div
						class="solid-panel rounded-lg border border-bc-border p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
					>
						<div
							class="px-2 pt-1 pb-1.5 text-[10px] font-medium tracking-widest text-bc-mist/50 uppercase"
						>
							Agents
						</div>
						{#each toolItems as item (item.id)}
							{@const isRunning = activeTool?.id === item.id}
							<button
								type="button"
								onclick={() => !item.disabled && navigate(`/agents/${item.id}`)}
								disabled={item.disabled}
								class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[12.5px] transition
									{item.disabled
									? 'cursor-not-allowed text-bc-icon'
									: isRunning
										? 'bg-bc-azure/10 text-bc-text'
										: 'text-bc-mist hover:bg-bc-border hover:text-bc-text'}"
							>
								<span
									class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md {item.disabled
										? 'bg-[rgb(var(--bc-tint)/5%)] text-bc-icon'
										: item.accentClass}"
								>
									{#if item.icon}
										<Icon icon={item.icon} width="14" height="14" />
									{:else}
										<img
											src={opencodeLogoSrc}
											alt=""
											class="h-3.5 w-3.5 {item.disabled ? 'opacity-20' : 'opacity-90'}"
										/>
									{/if}
								</span>
								<span class="flex-1 truncate">{item.label}</span>
								{#if isRunning}
									<span class="h-1.5 w-1.5 shrink-0 rounded-full {item.dotClass}"></span>
								{:else if item.disabled}
									<span class="text-[10px] text-bc-icon">Soon</span>
								{/if}
							</button>
						{/each}
						<div class="my-1 h-px bg-bc-border"></div>
						<button
							type="button"
							onclick={() => navigate('/agents')}
							class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[12.5px] text-bc-text-muted transition hover:bg-bc-border hover:text-bc-text"
						>
							<span class="flex h-6 w-6 shrink-0 items-center justify-center">
								<Icon icon="mingcute:arrow-right-line" width="14" height="14" />
							</span>
							<span class="flex-1 truncate">See all agents</span>
						</button>
					</div>
				</div>
			{/if}
		</div>
	</nav>

	<div class="mx-3 h-px bg-bc-border"></div>

	<div class="flex flex-col items-center justify-center gap-0.5 px-1.5 py-2">
		<div class="group relative flex items-center justify-center">
			<button
				type="button"
				onclick={toggleTheme}
				aria-label={themeState.current === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
				class="relative flex items-center justify-center rounded-md p-2.5 text-bc-icon transition-all duration-150 hover:bg-[rgb(var(--bc-tint)/10%)] hover:text-bc-mist"
			>
				<Icon
					icon={themeState.current === 'dark' ? 'mingcute:sun-line' : 'mingcute:moon-line'}
					width="26"
					height="26"
				/>
			</button>
			{@render tooltip(themeState.current === 'dark' ? 'Light mode' : 'Dark mode')}
		</div>
		<div class="group relative flex items-center justify-center">
			<a
				href="https://github.com/leaningtech/browsercode"
				target="_blank"
				rel="noopener noreferrer"
				data-tour-target="github"
				class="relative flex items-center justify-center rounded-md p-2.5 text-bc-icon transition-all duration-150 hover:bg-[rgb(var(--bc-tint)/10%)] hover:text-bc-mist"
			>
				<Icon icon="simple-icons:github" width="26" height="26" />
			</a>
			{@render tooltip('GitHub repository')}
		</div>
		<div class="group relative flex items-center justify-center">
			<a
				href="https://discord.leaningtech.com"
				target="_blank"
				rel="noopener noreferrer"
				class="relative flex items-center justify-center rounded-md p-2.5 text-bc-icon transition-all duration-150 hover:bg-[rgb(var(--bc-tint)/10%)] hover:text-bc-mist"
			>
				<Icon icon="simple-icons:discord" width="26" height="26" />
			</a>
			{@render tooltip('Join Discord')}
		</div>
		<div
			class="group relative flex items-center justify-center"
			role="group"
			onmouseenter={() => openFlyoutNow('help')}
			onmouseleave={scheduleCloseFlyout}
		>
			<button
				onclick={() => {
					openTour();
					trackEvent('Clicked Help', { action: 'tour-direct' });
				}}
				data-tour-target="help"
				class="relative flex w-full cursor-pointer items-center justify-center rounded-md p-2.5 text-bc-icon transition-all duration-150 hover:bg-[rgb(var(--bc-tint)/10%)] hover:text-bc-mist"
			>
				<Icon icon="mingcute:question-line" width="26" height="26" />
			</button>

			<!-- Anchored to the bottom (not top), since this button sits near the sidebar's bottom
			     edge — a top-anchored flyout could overflow past the viewport. -->
			<div
				class="absolute bottom-0 left-full z-50 w-52 pl-2 opacity-0 transition-opacity duration-100 {openFlyout ===
				'help'
					? 'visible opacity-100'
					: 'invisible'}"
			>
				<div
					class="solid-panel rounded-lg border border-bc-border p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
				>
					<button
						type="button"
						onclick={() => {
							openTour();
							trackEvent('Clicked Help', { action: 'tour' });
						}}
						class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[12.5px] text-bc-mist transition hover:bg-bc-border hover:text-bc-text"
					>
						<span
							class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-bc-azure/10 text-bc-azure"
						>
							<Icon icon="mingcute:route-line" width="14" height="14" />
						</span>
						<span class="flex-1 truncate">UI tour</span>
					</button>
					<!-- The tracker is an external URL, so resolve() does not apply here. -->
					<!-- eslint-disable svelte/no-navigation-without-resolve -->
					<a
						href={NEW_ISSUE_URL}
						target="_blank"
						rel="noopener noreferrer"
						onclick={() => trackEvent('Clicked Help', { action: 'report-bug' })}
						class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[12.5px] text-bc-mist transition hover:bg-bc-coral/10 hover:text-bc-text"
					>
						<span
							class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-bc-coral/10 text-bc-coral"
						>
							<Icon icon="mingcute:bug-line" width="14" height="14" />
						</span>
						<span class="flex-1 truncate">Report a bug</span>
					</a>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				</div>
			</div>
		</div>
	</div>
</aside>

{#if showCloneDialog}
	<CloneRepoDialog onClose={() => (showCloneDialog = false)} />
{/if}
