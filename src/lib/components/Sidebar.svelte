<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import opencodeLogoSrc from '$lib/assets/opencode-logo.svg';
	import Icon from '@iconify/svelte';
	import { page } from '$app/stores';
	import { toolItems } from '$lib/config/tools';
	import { frameworkRailItems } from '$lib/config/frameworks';
	import { trackEvent } from '$lib/utils/useLazyTracking';
	import { stepperState } from '$lib/stores/stepper.svelte';
	import { navigateWithLeaveGuard } from '$lib/stores/leaveWarning.svelte';

	let isActiveAgentSession = $derived($page.route.id === '/agents/[tool]');

	// Full reloads are deliberate here: they're the teardown mechanism for a running pod
	// (see CLAUDE.md). Every cross-section navigation in this file goes through them. Leaving an
	// active agent session asks for confirmation first, since it would tear down a live terminal.
	function navigate(path: string) {
		navigateWithLeaveGuard(path, isActiveAgentSession);
	}

	let isHome = $derived($page.route.id === '/');
	let isAgentsSection = $derived($page.route.id?.startsWith('/agents') ?? false);
	let isIdeSection = $derived($page.route.id?.startsWith('/ide') ?? false);

	// Which agent is currently booted, if any — drives the status dot and the flyout's "active" badge.
	let activeTool = $derived(
		$page.route.id === '/agents/[tool]'
			? toolItems.find((t) => t.id === $page.params.tool)
			: undefined
	);

	// True once an actual session is booting (a framework picked or a GitHub repo cloned) — the
	// bare /ide landing is just a picker, not a running pod, so it doesn't count.
	let isIdeBooted = $derived(
		($page.route.id === '/ide' && $page.url.searchParams.has('framework')) ||
			($page.route.id?.startsWith('/ide/github') ?? false)
	);
</script>

{#snippet tooltip(label: string)}
	<span
		class="pointer-events-none absolute left-full z-50 ml-3 flex items-center opacity-0 transition-opacity duration-100 group-hover:opacity-100"
	>
		<span class="h-1.5 w-1.5 rotate-45 border-b border-l border-white/8 bg-zinc-900"></span>
		<span
			class="-ml-px flex items-center gap-1.5 rounded-md border border-white/8 bg-zinc-900 px-2.5 py-1.5 text-[11.5px] leading-none font-medium whitespace-nowrap text-white/80 shadow-lg shadow-black/40"
		>
			{label}
		</span>
	</span>
{/snippet}

<aside
	class="relative hidden h-full w-sidebar flex-col border-r border-white/[0.05] bg-[#0f0f10] md:flex"
>
	<!-- Home: not expandable, always takes you back to the landing page -->
	<div class="group relative flex items-center justify-center py-3.5">
		<button
			onclick={() => navigate('/')}
			title="BrowserCode"
			class="rounded-md p-1 transition-opacity duration-150 {isHome ? '' : 'hover:opacity-80'}"
		>
			<img src={favicon} alt="BrowserCode" class="h-[31px] w-[31px]" />
		</button>
		{@render tooltip('Home')}
	</div>

	<div class="mx-3 h-px bg-white/[0.05]"></div>

	<nav class="flex flex-1 flex-col gap-0.5 px-1.5 pt-2">
		<!-- Agents: always expands on hover — while an agent is booted, the icon carries a status
		     dot and the flyout badges the running one, so the menu stays useful even on /agents -->
		<div class="group relative flex items-center justify-center">
			<button
				onclick={() => navigate('/agents')}
				data-tour-target="agents"
				class="relative flex w-full items-center justify-center rounded-md p-2.5 transition-all duration-150
					{activeTool
					? activeTool.accentClass
					: isAgentsSection
						? 'bg-white/8 text-white'
						: 'text-white/35 hover:bg-white/5 hover:text-white/70'}"
			>
				<Icon icon="mingcute:robot-line" width="26" height="26" />
			</button>

			<!-- The left padding (not margin) keeps the gap to the button part of this element's
			     own hit-box, so the pointer never crosses dead space while moving from the icon
			     into the menu — a margin gap would drop :hover mid-transit and close the menu. -->
			<div
				class="invisible absolute top-0 left-full z-50 w-56 pl-2 opacity-0 transition-opacity duration-100 group-hover:visible group-hover:opacity-100"
			>
				<div
					class="rounded-lg border border-white/8 bg-[#0e0e0e] p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
				>
					<div
						class="px-2 pt-1 pb-1.5 text-[10px] font-medium tracking-widest text-zinc-600 uppercase"
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
								? 'cursor-not-allowed text-white/20'
								: isRunning
									? 'bg-white/8 text-zinc-100'
									: 'text-zinc-300 hover:bg-white/6 hover:text-zinc-100'}"
						>
							<span
								class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md {item.disabled
									? 'bg-white/5 text-white/20'
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
								<span class="text-[10px] text-white/25">Soon</span>
							{/if}
						</button>
					{/each}
					<div class="my-1 h-px bg-white/[0.06]"></div>
					<button
						type="button"
						onclick={() => navigate('/agents')}
						class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[12.5px] text-zinc-400 transition hover:bg-white/6 hover:text-zinc-100"
					>
						<span class="flex h-6 w-6 shrink-0 items-center justify-center">
							<Icon icon="mingcute:arrow-right-line" width="14" height="14" />
						</span>
						<span class="flex-1 truncate">See all agents</span>
					</button>
				</div>
			</div>
		</div>

		<!-- Ide: expands on hover with curated frameworks + GitHub; non-expandable while on /ide -->
		<div class="group relative flex items-center justify-center">
			<button
				onclick={() => navigate('/ide')}
				data-tour-target="ide"
				class="relative flex w-full items-center justify-center rounded-md p-2.5 transition-all duration-150
					{isIdeBooted
					? 'bg-emerald-500/10 text-emerald-400'
					: isIdeSection
						? 'bg-white/8 text-white'
						: 'text-white/35 hover:bg-white/5 hover:text-white/70'}"
			>
				<Icon icon="mingcute:code-line" width="26" height="26" />
			</button>

			{#if isIdeSection}
				{@render tooltip('Playground IDE')}
			{:else}
				<!-- The left padding (not margin) keeps the gap to the button part of this element's
				     own hit-box, so the pointer never crosses dead space while moving from the icon
				     into the menu — a margin gap would drop :hover mid-transit and close the menu. -->
				<div
					class="invisible absolute top-0 left-full z-50 w-56 pl-2 opacity-0 transition-opacity duration-100 group-hover:visible group-hover:opacity-100"
				>
					<div
						class="rounded-lg border border-white/8 bg-[#0e0e0e] p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
					>
						<div
							class="px-2 pt-1 pb-1.5 text-[10px] font-medium tracking-widest text-zinc-600 uppercase"
						>
							Frameworks
						</div>
						{#each frameworkRailItems as fw (fw.id)}
							<button
								type="button"
								onclick={() => navigate(`/ide?framework=${fw.id}`)}
								class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[12.5px] text-zinc-300 transition hover:bg-white/6 hover:text-zinc-100"
							>
								<span
									class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/5"
								>
									<Icon icon={fw.icon} width="14" height="14" />
								</span>
								<span class="flex-1 truncate">{fw.label}</span>
							</button>
						{/each}
						<div class="my-1 h-px bg-white/[0.06]"></div>
						<button
							type="button"
							onclick={() => navigate('/ide')}
							class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[12.5px] text-zinc-400 transition hover:bg-white/6 hover:text-zinc-100"
						>
							<span class="flex h-6 w-6 shrink-0 items-center justify-center">
								<Icon icon="mingcute:github-line" width="14" height="14" />
							</span>
							<span class="flex-1 truncate">Clone from GitHub…</span>
						</button>
					</div>
				</div>
			{/if}
		</div>
	</nav>

	<div class="mx-3 h-px bg-white/[0.05]"></div>

	<div class="flex flex-col items-center justify-center gap-0.5 px-1.5 py-2">
		<div class="group relative flex items-center justify-center">
			<a
				href="https://github.com/leaningtech/browsercode"
				target="_blank"
				rel="noopener noreferrer"
				data-tour-target="github"
				class="relative flex items-center justify-center rounded-md p-2.5 text-white/30 transition-all duration-150 hover:bg-white/5 hover:text-white/65"
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
				class="relative flex items-center justify-center rounded-md p-2.5 text-white/30 transition-all duration-150 hover:bg-white/5 hover:text-white/65"
			>
				<Icon icon="simple-icons:discord" width="26" height="26" />
			</a>
			{@render tooltip('Join Discord')}
		</div>
		<div class="group relative flex items-center justify-center">
			<button
				onclick={() => {
					stepperState.open = true;
					trackEvent('Clicked Help', { action: 'tour-direct' });
				}}
				data-tour-target="help"
				class="relative flex w-full cursor-pointer items-center justify-center rounded-md p-2.5 text-white/30 transition-all duration-150 hover:bg-white/5 hover:text-white/65"
			>
				<Icon icon="mingcute:question-line" width="26" height="26" />
			</button>

			<!-- Anchored to the bottom (not top), since this button sits near the sidebar's bottom
			     edge — a top-anchored flyout could overflow past the viewport. Left padding (not
			     margin) keeps the gap to the button part of this element's own hit-box, so the
			     pointer never crosses dead space while moving from the icon into the menu. -->
			<div
				class="invisible absolute bottom-0 left-full z-50 w-52 pl-2 opacity-0 transition-opacity duration-100 group-hover:visible group-hover:opacity-100"
			>
				<div
					class="rounded-lg border border-white/8 bg-[#0e0e0e] p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
				>
					<button
						type="button"
						onclick={() => {
							stepperState.open = true;
							trackEvent('Clicked Help', { action: 'tour' });
						}}
						class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[12.5px] text-zinc-300 transition hover:bg-white/6 hover:text-zinc-100"
					>
						<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/5">
							<Icon icon="mingcute:route-line" width="14" height="14" />
						</span>
						<span class="flex-1 truncate">UI tour</span>
					</button>
					<a
						href="https://github.com/leaningtech/browsercode/issues/new"
						target="_blank"
						rel="noopener noreferrer"
						onclick={() => trackEvent('Clicked Help', { action: 'report-bug' })}
						class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[12.5px] text-zinc-300 transition hover:bg-white/6 hover:text-zinc-100"
					>
						<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/5">
							<Icon icon="mingcute:bug-line" width="14" height="14" />
						</span>
						<span class="flex-1 truncate">Report a bug</span>
					</a>
				</div>
			</div>
		</div>
	</div>
</aside>
