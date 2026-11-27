<script lang="ts">
	import { fade } from 'svelte/transition';
	import favicon from '$lib/assets/favicon.svg';
	import Icon from '@iconify/svelte';
	import ToolIcon from '$lib/components/ToolIcon.svelte';
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import { toolItems } from '$lib/config/tools';
	import {
		frameworkRailItems,
		javaGroups,
		languageById,
		type Language,
		type RailGroup,
		type RailItem
	} from '$lib/config/frameworks';
	import { trackEvent } from '$lib/utils/useLazyTracking';
	import { openTour } from '$lib/stores/stepper.svelte';
	import { NEW_ISSUE_URL } from '$lib/utils/bug-report';
	import { navigateWithLeaveGuard } from '$lib/stores/leaveWarning.svelte';
	import { opensProject } from '$lib/ide/route-project';
	import { themeState, toggleTheme } from '$lib/stores/theme.svelte';
	import CloneRepoDialog from '$lib/components/ide/CloneRepoDialog.svelte';

	let showCloneDialog = $state(false);

	let isHome = $derived($page.route.id === '/');
	let isAgentsSection = $derived($page.route.id?.startsWith('/agents') ?? false);
	// /ide is JavaScript, /java is Java, and /ide/github/… is a cloned repo — three destinations
	// under one IDE entry, which the rail nested beneath it lights one of.
	let isJavaSection = $derived($page.route.id === '/java');
	let isJsSection = $derived($page.route.id?.startsWith('/ide') ?? false);
	let isRepoSection = $derived($page.route.id?.startsWith('/ide/github') ?? false);
	let isIdeSection = $derived(isJsSection || isJavaSection);

	// Which agent is currently booted, if any — drives the flyout's "active" row badge only;
	// the main button's color stays the same regardless of which one (or whether any) is running.
	let activeTool = $derived(
		$page.route.id === '/agents/[tool]'
			? toolItems.find((t) => t.id === $page.params.tool)
			: undefined
	);

	// Does this URL open a project? A template, a cloned repo or a shared Java link does; a bare
	// picker doesn't, and neither does a URL naming something we can't resolve, which lands on
	// the picker too. See route-project.ts.
	let opensAProject = $derived(opensProject($page.route.id, $page.url));

	// A bare picker (the /agents index, the /ide or /java landing) already lists its own choices on
	// the page, so the matching sidebar menu stays hidden there and shows a plain tooltip instead;
	// once something is running, it becomes a handy shortcut to switch without leaving the session.
	let isAgentsIndexOnly = $derived($page.route.id === '/agents');
	let isIdeLandingOnly = $derived($page.route.id === '/ide' && !opensAProject);
	let isJavaLandingOnly = $derived(isJavaSection && !opensAProject);

	let isActiveAgentSession = $derived($page.route.id === '/agents/[tool]');
	// A booted framework (/ide?framework=...) or cloned GitHub repo (/ide/github/...) — the bare
	// landing picker has nothing running yet, so it's excluded.
	let isActiveIdeSession = $derived(isJsSection && opensAProject);
	let isActiveJavaSession = $derived(isJavaSection && opensAProject);

	// Full reloads are deliberate here: they're the teardown mechanism for a running pod
	// (see CLAUDE.md). Every cross-section navigation in this file goes through them. Leaving an
	// active agent or IDE session asks for confirmation first, since it would tear down a live
	// terminal/dev server.
	function navigate(path: string) {
		navigateWithLeaveGuard(path, isActiveAgentSession || isActiveIdeSession || isActiveJavaSession);
	}

	// Flyout visibility is tracked explicitly (rather than relying on CSS :hover + a bridging
	// gap) so a brief, imperfect mouse path from the icon into a tall menu doesn't close it —
	// mouseenter/mouseleave fire on this whole wrapper (button + menu together), and closing
	// waits a beat in case the pointer re-enters.
	type FlyoutId = 'agents' | 'ide-js' | 'ide-java' | 'help';

	/** Grace period before a hovered-open rail or menu folds away, shared by both. */
	const CLOSE_DELAY_MS = 400;

	/**
	 * The registry's languages, with what this rail needs on top of them: which menu each entry
	 * owns, what fills it, and where it points. `current` and `landingOnly` are functions rather
	 * than values because the `$derived` flags above are read at render time, once per language.
	 */
	const LANGUAGES: (Language & {
		flyout: FlyoutId;
		groups: RailGroup[];
		open: (item: RailItem) => string;
		current: () => boolean;
		landingOnly: () => boolean;
	})[] = [
		{
			...languageById.js,
			flyout: 'ide-js',
			// A single heading's worth: the frameworks are one list, where Java's examples are four.
			groups: [{ id: 'frameworks', label: 'Frameworks', items: frameworkRailItems }],
			open: (item) => `/ide?framework=${item.id}`,
			// A cloned repo also lives under /ide, but it lights the rail's GitHub entry instead.
			current: () => isJsSection && !isRepoSection,
			landingOnly: () => isIdeLandingOnly
		},
		{
			...languageById.java,
			flyout: 'ide-java',
			groups: javaGroups,
			open: (item) => `/java?example=${item.example}`,
			current: () => isJavaSection,
			landingOnly: () => isJavaLandingOnly
		}
	];

	/**
	 * The nested language rail stays put while you are inside the IDE section, and otherwise
	 * unfolds on hover, so reaching a language never costs a click first.
	 *
	 * It opens from the IDE entry but closes on leaving the whole rail, not that entry: unfolding
	 * pushes everything below it down, so collapsing it the moment the pointer moved on would
	 * yank Agents back up from under a cursor on its way there. Leaving waits a beat besides, as
	 * the flyouts do, in case the pointer strays and comes back.
	 */
	let railHovered = $state(false);
	let railTimer: ReturnType<typeof setTimeout> | null = null;
	let showLanguageRail = $derived(isIdeSection || railHovered);

	function openRail() {
		if (railTimer) clearTimeout(railTimer);
		railHovered = true;
	}

	function scheduleCloseRail() {
		if (railTimer) clearTimeout(railTimer);
		railTimer = setTimeout(() => {
			railHovered = false;
		}, CLOSE_DELAY_MS);
	}

	let openFlyout = $state<FlyoutId | null>(null);

	/** The rail's one menu is drawn from whichever language owns the open flyout. */
	let activeLang = $derived(LANGUAGES.find((lang) => lang.flyout === openFlyout));
	let closeTimer: ReturnType<typeof setTimeout> | null = null;

	function openFlyoutNow(id: FlyoutId) {
		if (closeTimer) clearTimeout(closeTimer);
		openFlyout = id;
	}

	/** For an entry with no menu of its own, which would otherwise sit under the last one. */
	function closeFlyoutNow() {
		if (closeTimer) clearTimeout(closeTimer);
		openFlyout = null;
	}

	function scheduleCloseFlyout() {
		if (closeTimer) clearTimeout(closeTimer);
		closeTimer = setTimeout(() => {
			openFlyout = null;
		}, CLOSE_DELAY_MS);
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
	data-tour-target="sidebar"
	class="glass-panel relative z-30 my-2.5 ml-2.5 hidden h-[calc(100%-20px)] w-sidebar flex-col rounded-[18px] border border-bc-tint/11 md:flex"
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

	<nav
		class="flex flex-1 flex-col gap-0.5 px-1.5 pt-2"
		onmouseleave={scheduleCloseRail}
		onfocusout={scheduleCloseRail}
	>
		<!-- IDE: one entry, because the landing offers one door and the rail should agree. Its three
		     destinations — the two languages and a repo clone — nest *under* it rather than hanging
		     off it in a menu: nested, they also say which one you are in, which a menu can't, and
		     each language carries its own templates on hover, which is how you get from one example
		     to the next. A labelled menu beside all that would be the same three things twice, from
		     one gesture. The button and the rail share a hover group; see `openRail`. -->
		<div class="flex flex-col gap-0.5" role="group" onmouseenter={openRail} onfocusin={openRail}>
			<div class="group relative flex items-center justify-center">
				<button
					onclick={() => navigate('/ide')}
					data-tour-target="ide"
					aria-label="IDE playground"
					class="relative flex w-full items-center justify-center rounded-md p-2.5 transition-all duration-150
						{isIdeSection
						? 'bg-bc-azure/15 text-bc-azure'
						: 'text-bc-icon hover:bg-bc-tint/12 hover:text-bc-text'}"
				>
					<Icon icon="mingcute:code-line" width="26" height="26" />
				</button>

				{@render tooltip('IDE playground')}
			</div>

			<!-- Drawn as a tree, on a rail only 52px wide inside its padding: a spine down x=9px, an
			     elbow from there to the entries' x=18px indent, and 28px rows. The spine stops half a
			     row short of the bottom, which is exactly where the last entry's elbow leaves it,
			     whatever the count. These four figures are what the arbitrary values below are. -->
			{#if showLanguageRail}
				<div class="relative flex flex-col gap-0.5 pt-0.5">
					<span
						class="pointer-events-none absolute top-0 bottom-[14px] left-[9px] w-px bg-bc-border"
						aria-hidden="true"
					></span>
					{#each LANGUAGES as lang (lang.id)}
						<div
							class="group relative flex pl-[18px]"
							role="group"
							onmouseenter={() =>
								lang.landingOnly() ? closeFlyoutNow() : openFlyoutNow(lang.flyout)}
							onmouseleave={scheduleCloseFlyout}
						>
							<span
								class="pointer-events-none absolute top-1/2 left-[9px] h-px w-[9px] bg-bc-border"
								aria-hidden="true"
							></span>
							<button
								onclick={() => navigate(lang.path)}
								aria-label="{lang.label} {lang.noun}"
								aria-current={lang.current() ? 'page' : undefined}
								class="flex h-7 w-7 items-center justify-center rounded-md transition-all duration-150
									{lang.current()
									? 'bg-bc-azure/15 text-bc-azure'
									: 'text-bc-icon hover:bg-bc-tint/12 hover:text-bc-text'}"
							>
								<Icon icon={lang.icon} width="15" height="15" />
							</button>

							{#if lang.landingOnly()}
								{@render tooltip(`${lang.label} ${lang.noun}`)}
							{/if}
						</div>
					{/each}

					<!-- The third destination. It opens a dialog rather than a page, so it gets a plain
					     tooltip where the languages get a menu — and dismisses theirs on the way in,
					     which would otherwise hang beside it for the grace period. A cloned repo,
					     once open, is what lights it. -->
					<div class="group relative flex pl-[18px]" role="group" onmouseenter={closeFlyoutNow}>
						<span
							class="pointer-events-none absolute top-1/2 left-[9px] h-px w-[9px] bg-bc-border"
							aria-hidden="true"
						></span>
						<button
							type="button"
							onclick={() => (showCloneDialog = true)}
							aria-label="Clone from GitHub"
							aria-current={isRepoSection ? 'page' : undefined}
							class="flex h-7 w-7 items-center justify-center rounded-md transition-all duration-150
								{isRepoSection
								? 'bg-bc-azure/15 text-bc-azure'
								: 'text-bc-icon hover:bg-bc-tint/12 hover:text-bc-text'}"
						>
							<Icon icon="simple-icons:github" width="15" height="15" />
						</button>
						{@render tooltip('Clone from GitHub')}
					</div>

					<!-- One menu for the rail rather than one per entry, anchored to the rail's own top
					     rather than to the entry you are pointing at. Moving between the languages then
					     only swaps the rows inside a panel that never leaves the screen: a menu per
					     entry meant a different box, at a different height, in a different place, all
					     replaced at once — nothing carried over, so it read as a flicker. The fade is
					     for arriving and leaving only; this block stays mounted in between. -->
					{#if activeLang}
						{@const lang = activeLang}
						<div
							class="absolute top-0 left-full z-50 w-56 pl-2"
							role="group"
							onmouseenter={() => openFlyoutNow(lang.flyout)}
							onmouseleave={scheduleCloseFlyout}
							transition:fade={{ duration: 110 }}
						>
							<!-- Java's four headings and twelve rows outgrow a short window, so the list
							     scrolls rather than running off the bottom of it. The cap leaves room for
							     the rail's own offset down the sidebar, so the menu ends clear of the edge. -->
							<div
								class="solid-panel max-h-[min(34rem,calc(100vh-13rem))] overflow-y-auto rounded-lg border border-bc-border p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
							>
								{#each lang.groups as group (group.id)}
									<div
										class="px-2 pt-1 pb-1.5 text-[10px] font-medium tracking-widest text-bc-mist/50 uppercase not-first:pt-2.5"
									>
										{group.label}
									</div>
									{#each group.items as item (item.id)}
										<button
											type="button"
											onclick={() => navigate(lang.open(item))}
											class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[12.5px] text-bc-mist transition hover:bg-bc-border hover:text-bc-text"
										>
											<span
												class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-bc-tint/5"
											>
												<Icon icon={item.icon} width="14" height="14" />
											</span>
											<span class="flex-1 truncate">{item.label}</span>
										</button>
									{/each}
								{/each}
								<div class="my-1 h-px bg-bc-border"></div>
								<button
									type="button"
									onclick={() => navigate(lang.path)}
									class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[12.5px] text-bc-text-muted transition hover:bg-bc-border hover:text-bc-text"
								>
									<span class="flex h-6 w-6 shrink-0 items-center justify-center">
										<Icon icon="mingcute:arrow-right-line" width="14" height="14" />
									</span>
									<span class="flex-1 truncate">See all {lang.noun}</span>
								</button>
							</div>
						</div>
					{/if}
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
				aria-label="Agents"
				class="relative flex w-full items-center justify-center rounded-md p-2.5 transition-all duration-150
					{isAgentsSection
					? 'bg-bc-azure/15 text-bc-azure'
					: 'text-bc-icon hover:bg-bc-tint/12 hover:text-bc-text'}"
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
										? 'bg-bc-tint/5 text-bc-icon'
										: item.accentClass}"
								>
									<ToolIcon
										{item}
										iconSize={14}
										imgClass="h-3.5 w-3.5 {item.disabled ? 'opacity-20' : 'opacity-90'}"
									/>
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

		<!-- Embeds cover the IDE and the agents alike, so this sits apart from either group:
		     pushed to the foot of the nav, above the divider the utilities start under. -->
		<div class="group relative mt-auto flex items-center justify-center">
			<button
				type="button"
				onclick={() => {
					trackEvent('Clicked Embed', { from: 'sidebar' });
					navigate('/embed/builder');
				}}
				aria-label="Embed on your site"
				class="relative flex items-center justify-center rounded-md p-2.5 text-bc-icon transition-all duration-150 hover:bg-bc-tint/10 hover:text-bc-mist"
			>
				<Icon icon="mingcute:layout-line" width="26" height="26" />
			</button>
			{@render tooltip('Embed on your site')}
		</div>
		<div class="group relative flex items-center justify-center">
			<button
				type="button"
				onclick={toggleTheme}
				aria-label={themeState.current === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
				class="relative flex items-center justify-center rounded-md p-2.5 text-bc-icon transition-all duration-150 hover:bg-bc-tint/10 hover:text-bc-mist"
			>
				<Icon
					icon={themeState.current === 'dark' ? 'mingcute:sun-line' : 'mingcute:moon-line'}
					width="26"
					height="26"
				/>
			</button>
			{@render tooltip(themeState.current === 'dark' ? 'Light mode' : 'Dark mode')}
		</div>
	</nav>

	<div class="mx-3 h-px bg-bc-border"></div>

	<div class="flex flex-col items-center justify-center gap-0.5 px-1.5 py-2">
		<!-- No repo link here: the "Star on GitHub" ribbon already points at it on every landing
		     surface, and a GitHub mark in this rail now reads as the clone entry in the IDE's own
		     rail, which is a different thing entirely. It lives in the help menu instead, which is
		     where the rest of the meta links are. -->
		<div class="group relative flex items-center justify-center">
			<a
				href="https://discord.leaningtech.com"
				target="_blank"
				rel="noopener noreferrer"
				class="relative flex items-center justify-center rounded-md p-2.5 text-bc-icon transition-all duration-150 hover:bg-bc-tint/10 hover:text-bc-mist"
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
				class="relative flex w-full cursor-pointer items-center justify-center rounded-md p-2.5 text-bc-icon transition-all duration-150 hover:bg-bc-tint/10 hover:text-bc-mist"
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
					<!-- These are external URLs, so resolve() does not apply here. -->
					<!-- eslint-disable svelte/no-navigation-without-resolve -->
					<a
						href="https://github.com/leaningtech/browsercode"
						target="_blank"
						rel="noopener noreferrer"
						onclick={() => trackEvent('Clicked Help', { action: 'github' })}
						class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[12.5px] text-bc-mist transition hover:bg-bc-border hover:text-bc-text"
					>
						<span
							class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-bc-tint/10 text-bc-mist"
						>
							<Icon icon="simple-icons:github" width="14" height="14" />
						</span>
						<span class="flex-1 truncate">GitHub repository</span>
					</a>
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
					<a
						href={resolve('/privacy')}
						onclick={() => trackEvent('Clicked Help', { action: 'privacy' })}
						class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[12.5px] text-bc-mist transition hover:bg-bc-border hover:text-bc-text"
					>
						<span
							class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-bc-tint/10 text-bc-mist"
						>
							<Icon icon="mingcute:shield-line" width="14" height="14" />
						</span>
						<span class="flex-1 truncate">Privacy Policy</span>
					</a>
				</div>
			</div>
		</div>
	</div>
</aside>

{#if showCloneDialog}
	<CloneRepoDialog onClose={() => (showCloneDialog = false)} onNavigate={navigate} />
{/if}
