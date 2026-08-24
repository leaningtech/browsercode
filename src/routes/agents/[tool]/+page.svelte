<script lang="ts">
	import Terminal from '$lib/components/Terminal.svelte';
	import Portal from '$lib/components/Portal.svelte';
	import Icon from '@iconify/svelte';
	import opencodeLogoSrc from '$lib/assets/opencode-logo.svg';

	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { bootCLI, describeError, type CLIBootHooks } from '$lib/agents/boot';
	import { getCodexApiKey, setCodexApiKey } from '$lib/agents/codex';
	import CodexErrorCard from '$lib/components/agents/CodexErrorCard.svelte';
	import CodexLoadingCard from '$lib/components/agents/CodexLoadingCard.svelte';
	import CodexSignInCard from '$lib/components/agents/CodexSignInCard.svelte';
	import { openTour } from '$lib/stores/stepper.svelte';
	import { toolItems } from '$lib/config/tools';
	import { requestSingleTabLock } from '$lib/utils/tabLock';
	import { watchIsMobile } from '$lib/utils/viewport';
	import {
		navigateWithLeaveGuard,
		installLeaveGuard,
		markIntentionalNavigation
	} from '$lib/stores/leaveWarning.svelte';
	import { PortalState } from '$lib/stores/portals.svelte';
	import ZenToggle from '$lib/components/ZenToggle.svelte';
	import { zenState } from '$lib/stores/zen.svelte';

	let isPortalVisible = $state(true);
	/** The div the pod's terminal attaches to, rendered by Terminal.svelte. */
	let consoleEl = $state<HTMLElement | null>(null);

	let portalFraction = $state(0.5);
	let isDragging = $state(false);
	let containerEl = $state<HTMLElement | null>(null);

	function startDrag(e: MouseEvent) {
		e.preventDefault();
		isDragging = true;
		document.body.style.cursor = 'col-resize';
		document.body.style.userSelect = 'none';

		const startX = e.clientX;
		const startFrac = portalFraction;
		const totalW = containerEl?.clientWidth ?? 1;

		function onMove(ev: MouseEvent) {
			const dx = ev.clientX - startX;
			portalFraction = Math.max(0.2, Math.min(0.8, startFrac - dx / totalW));
		}

		function onUp() {
			isDragging = false;
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('mouseup', onUp);
		}

		window.addEventListener('mousemove', onMove);
		window.addEventListener('mouseup', onUp);
	}

	let isMobile = $state(false);
	let activeMobileView = $state<'terminal' | 'preview'>('terminal');

	// Auto-show the preview on desktop, switch to it on mobile (first portal only), and hide
	// the pane again when the last portal goes away; the IDE shell instead pins its preview
	// to the framework's declared app port.
	const portal = new PortalState({
		onActivate: (count) => {
			if (!isMobile) isPortalVisible = true;
			else if (count === 1) activeMobileView = 'preview';
		},
		onEmpty: () => (isPortalVisible = false)
	});
	let showToolMenu = $state(false);
	let showDuplicateTabWarning = $state(false);
	let closeFallback = $state(false);
	// Deliberately not state: assigned once at boot and only called from the unmount cleanup.
	let releaseTabLock: () => void = () => {};
	let disposeLeaveGuard: () => void = () => {};
	let showTerminalTip = $state(false);

	// Same reveal treatment as the landing page's About panel: starts closed so the transition
	// actually animates in on arrival, rather than snapping straight to open.
	let entered = $state(false);

	function dismissTerminalTip() {
		showTerminalTip = false;
	}

	// Any keypress means they've already found the terminal; no need to keep the tip up.
	function handleAnyKeydown() {
		if (showTerminalTip) dismissTerminalTip();
	}

	function attemptCloseTab() {
		window.close();
		// Browsers only let scripts close tabs they themselves opened; If we're still here
		// shortly after, that didn't work, so tell the user to close it manually instead.
		setTimeout(() => {
			closeFallback = true;
		}, 400);
	}

	const validToolIds = new Set<string>(toolItems.filter((t) => !t.disabled).map((t) => t.id));
	const defaultTool = toolItems.find((t) => !t.disabled)?.id ?? 'claude';

	function getActiveTool() {
		const tool = $page.params.tool;
		return tool && validToolIds.has(tool) ? tool : defaultTool;
	}

	// Tool switching is a full page load, so the active tool is fixed for this page's lifetime
	const activeTool = getActiveTool();

	let codexStage = $state<'idle' | 'loading' | 'signin' | 'error'>('idle');
	let codexError = $state('');
	let codexHasKey = $state(true);
	let codexChangeKeyOpen = $state(false);
	let resolveSignIn: ((key: string) => void) | null = null;

	// The loading card covers the terminal, so a boot that dies behind it would otherwise just
	// spin forever. Swap it for the failure instead.
	function reportCodexBootFailure(error: unknown) {
		codexError = describeError(error);
		codexStage = 'error';
	}

	function retryBoot() {
		markIntentionalNavigation();
		window.location.reload();
	}

	// OPENAI_API_KEY is fixed at process launch, so boot blocks here rather than overlaying a CLI
	// already running without a key.
	const codexBootHooks: CLIBootHooks = {
		beforeLaunch: async () => {
			if (!getCodexApiKey()) {
				codexStage = 'signin';
				setCodexApiKey(await new Promise<string>((resolve) => (resolveSignIn = resolve)));
				codexHasKey = true;
			}
			codexStage = 'idle';
		}
	};

	// A changed key only applies to a fresh launch, so saving restarts the whole session.
	function saveKeyAndRestart(key: string) {
		setCodexApiKey(key);
		retryBoot();
	}

	function toggleToolMenu() {
		showToolMenu = !showToolMenu;
	}

	function selectTool(id: string) {
		if (validToolIds.has(id)) {
			// Already an active agent session here — always confirm before tearing it down.
			navigateWithLeaveGuard(`/agents/${id}`, true);
		}
		showToolMenu = false;
	}

	onMount(() => {
		const unwatchIsMobile = watchIsMobile((mobile) => (isMobile = mobile));
		requestAnimationFrame(() => {
			entered = true;
		});

		// Two tabs booting the same agent would both write to the same BrowserPod storage key;
		// Claim an exclusive, tab-lifetime lock first and only boot if we actually got it.
		const tool = getActiveTool();
		const lock = requestSingleTabLock(`agent-session:${tool}`);
		releaseTabLock = lock.release;

		lock.acquired.then((acquired) => {
			if (!acquired) {
				showDuplicateTabWarning = true;
				return;
			}

			// Only warn on tab close/refresh/back-button once a session is actually running here;
			// The duplicate-tab case above has nothing booted, so there's no work to lose.
			disposeLeaveGuard = installLeaveGuard();

			// Shown on every boot, not just the first ever visit.
			showTerminalTip = true;

			if (!consoleEl) {
				console.error('Terminal container is not ready yet');
				return;
			}

			// Covers pod boot, the image streaming in, and the warm-up probe.
			if (tool === 'codex') {
				codexHasKey = getCodexApiKey() !== null;
				codexStage = 'loading';
			}

			// bootCLI already logs and writes the failure into the terminal; Codex additionally needs
			// its overlay taken down, since it hides that terminal.
			bootCLI(tool, consoleEl, portal.apply, tool === 'codex' ? codexBootHooks : undefined).catch(
				(error) => {
					if (tool === 'codex') reportCodexBootFailure(error);
				}
			);
		});

		return () => {
			// Never leave the global chrome hidden after navigating away from an agent session.
			zenState.on = false;
			unwatchIsMobile();
			disposeLeaveGuard();
			portal.dispose();
			releaseTabLock();
		};
	});
</script>

<svelte:window onkeydown={handleAnyKeydown} />

<div class="flex h-full min-h-0 w-full min-w-0 flex-col" bind:this={containerEl}>
	{#if showDuplicateTabWarning}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
		>
			<div
				class="glass-panel max-w-sm rounded-xl border border-bc-mist/15 px-6 py-7 text-center shadow-2xl"
			>
				<div
					class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-bc-gold/10 text-bc-gold"
				>
					<Icon icon="mingcute:alert-line" width="22" height="22" />
				</div>
				<h3 class="mb-2 text-sm font-semibold text-zinc-50">Already open in another tab</h3>
				<p class="mb-5 text-[12.5px] leading-relaxed text-zinc-400">
					Sorry, you can only open one tab of the same agent.
				</p>
				{#if closeFallback}
					<p class="text-[12px] text-zinc-500">You can close this tab.</p>
				{:else}
					<button
						onclick={attemptCloseTab}
						class="rounded-md bg-bc-azure/90 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-bc-azure"
					>
						Close
					</button>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Same reveal treatment as the landing page's About panel: slides up from below on arrival. -->
	<div
		class="panel-sheet flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[20px] border-t border-bc-mist/15"
		style="transform: translateY({entered
			? '0%'
			: '101%'}); transition: transform 0.62s cubic-bezier(0.22,1,0.36,1);"
	>
		<div class="relative min-h-0 flex-1 overflow-hidden">
			<!-- Terminal (always full size) -->
			<div
				class="absolute inset-0 bg-black"
				class:hidden={isMobile && activeMobileView !== 'terminal'}
			>
				<Terminal bind:consoleEl />
			</div>

			<!-- Zen toggle: the agents view has no icon rail, so this floating control is the
			     always-visible way in and out. Desktop only. -->
			{#if !isMobile}
				<ZenToggle
					baseClass="absolute bottom-4 left-4 z-30 flex items-center justify-center rounded-lg border p-2 backdrop-blur-sm transition"
					activeClass="border-bc-azure/40 bg-bc-azure/20 text-bc-azure"
					idleClass="border-white/10 bg-black/40 text-white/40 hover:bg-black/60 hover:text-white/70"
				/>
			{/if}

			<!-- The env-bound API key can only change via a relaunch, so the way in is always here. -->
			{#if activeTool === 'codex'}
				<button
					onclick={() => (codexChangeKeyOpen = true)}
					aria-label="OpenAI API key"
					title="OpenAI API key"
					class="absolute bottom-4 z-30 flex items-center justify-center rounded-lg border border-white/10 bg-black/40 p-2 text-white/40 backdrop-blur-sm transition hover:bg-black/60 hover:text-white/70 {isMobile
						? 'left-4'
						: 'left-16'}"
				>
					<Icon icon="mingcute:key-2-line" width="18" height="18" />
				</button>
			{/if}

			{#if codexStage !== 'idle' || codexChangeKeyOpen}
				<div
					class="absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
				>
					{#if codexStage === 'loading'}
						<CodexLoadingCard
							willAskForKey={!codexHasKey}
							onCancel={() => navigateWithLeaveGuard('/agents', false)}
						/>
					{:else if codexStage === 'error'}
						<CodexErrorCard
							message={codexError}
							onRetry={retryBoot}
							onCancel={() => navigateWithLeaveGuard('/agents', false)}
						/>
					{:else if codexStage === 'signin'}
						<CodexSignInCard
							mode="boot"
							onSubmit={(key) => resolveSignIn?.(key)}
							onCancel={() => navigateWithLeaveGuard('/agents', false)}
						/>
					{:else}
						<CodexSignInCard
							mode="change"
							onSubmit={saveKeyAndRestart}
							onCancel={() => (codexChangeKeyOpen = false)}
						/>
					{/if}
				</div>
			{/if}

			<!-- Non-blocking tip: this is a real terminal, not a GUI — clicks alone won't do much. -->
			{#if showTerminalTip && !(isMobile && activeMobileView !== 'terminal')}
				<div class="pointer-events-none absolute inset-x-0 top-4 z-30 flex justify-center px-4">
					<div
						class="glass-panel pointer-events-auto flex max-w-md items-start gap-3 rounded-lg border border-bc-mist/15 px-4 py-3 shadow-2xl"
					>
						<span
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-bc-azure/10 text-bc-azure"
						>
							<Icon icon="mingcute:keyboard-line" width="18" height="18" />
						</span>
						<div class="flex-1 text-[12.5px] leading-relaxed text-zinc-300">
							<span class="font-medium text-zinc-100">This is a real terminal.</span>
							Click into it and use your keyboard. Mouse clicks alone won't do much here.
						</div>
						<button
							onclick={dismissTerminalTip}
							aria-label="Dismiss"
							class="shrink-0 rounded-md p-1 text-white/30 transition hover:bg-white/10 hover:text-white/70"
						>
							<Icon icon="mingcute:close-line" width="14" height="14" />
						</button>
					</div>
				</div>
			{/if}

			<!-- Portal overlay (desktop, portal active) -->
			{#if !isMobile && portal.portals.length > 0 && isPortalVisible}
				<!-- Drag divider -->
				<button
					class="group absolute top-0 bottom-0 z-20 w-1.25 cursor-col-resize"
					style="right: calc({portalFraction * 100}% - 0.625rem);"
					onmousedown={startDrag}
					tabindex="0"
					aria-label="Resize preview panel"
				>
					<div
						class="absolute top-0 bottom-0 left-0.5 w-px rounded-full transition-[background] duration-150 {isDragging
							? 'bg-white/25'
							: 'bg-white/[0.07] group-hover:bg-white/25'}"
					></div>
				</button>

				<div
					class="absolute top-0 right-0 bottom-0 min-w-0 overflow-hidden border-l border-white/6"
					class:pointer-events-none={isDragging}
					style="width: {portalFraction * 100}%;"
				>
					<Portal
						src={portal.url}
						frameStatus={portal.frameStatus}
						onFrameLoad={portal.reportFrameLoaded}
						portals={portal.portals}
						selectedPort={portal.selectedPort}
						showMenu={portal.showMenu}
						showPorts={portal.showPorts}
						showInfo={portal.showInfo}
						copied={portal.copied}
						qrError={portal.qrError}
						onSelectPort={portal.selectPort}
						onTogglePorts={portal.togglePorts}
						onToggleMenu={portal.toggleMenu}
						onCopyLink={portal.copyUrl}
						onOpenNewTab={portal.openInNewTab}
						onShowQrCode={portal.showQRCode}
						onCloseOverlays={portal.closeOverlays}
						onQrResult={portal.reportQrResult}
					/>
				</div>
			{:else if isMobile && portal.portals.length > 0 && activeMobileView === 'preview'}
				<!-- Mobile portal (full screen overlay) -->
				<div class="absolute inset-0 overflow-hidden">
					<Portal
						src={portal.url}
						frameStatus={portal.frameStatus}
						onFrameLoad={portal.reportFrameLoaded}
						portals={portal.portals}
						selectedPort={portal.selectedPort}
						showMenu={portal.showMenu}
						showPorts={portal.showPorts}
						showInfo={portal.showInfo}
						copied={portal.copied}
						qrError={portal.qrError}
						onSelectPort={portal.selectPort}
						onTogglePorts={portal.togglePorts}
						onToggleMenu={portal.toggleMenu}
						onCopyLink={portal.copyUrl}
						onOpenNewTab={portal.openInNewTab}
						onShowQrCode={portal.showQRCode}
						onCloseOverlays={portal.closeOverlays}
						onQrResult={portal.reportQrResult}
					/>
				</div>
			{/if}
		</div>

		<!-- Mobile Bottom Navigator -->
		{#if isMobile}
			<!-- Tool menu sheet -->
			{#if showToolMenu}
				<button
					class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
					onclick={() => (showToolMenu = false)}
					aria-label="Close menu"
				></button>
				<div
					class="fixed right-0 left-0 z-50 rounded-t-2xl border-t border-white/8 bg-[#0e0e0e] shadow-[0_-12px_40px_rgba(0,0,0,0.7)]"
					style="bottom: calc(48px + env(safe-area-inset-bottom));"
				>
					<!-- Drag handle -->
					<div class="flex justify-center pt-3 pb-1">
						<div class="h-1 w-10 rounded-full bg-white/15"></div>
					</div>
					<div class="flex items-center justify-between px-4 py-2">
						<span class="text-[12px] font-semibold tracking-wide text-white/40 uppercase"
							>CLI Tool</span
						>
						<button
							onclick={() => (showToolMenu = false)}
							class="rounded-md p-1.5 text-white/30 transition-colors hover:bg-white/6 hover:text-white/60"
						>
							<Icon icon="mingcute:close-line" width="15" height="15" />
						</button>
					</div>
					<div class="px-3 pb-3">
						{#each toolItems as item (item.id)}
							<button
								onclick={() => !item.disabled && selectTool(item.id)}
								disabled={item.disabled}
								class="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors
								{activeTool === item.id
									? 'bg-white/8 text-white'
									: item.disabled
										? 'cursor-not-allowed text-white/20'
										: 'text-white/50 hover:bg-white/5 hover:text-white/80'}"
							>
								<div
									class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg {activeTool ===
									item.id
										? 'bg-white/10'
										: 'bg-white/5'}"
								>
									{#if item.icon}
										<Icon icon={item.icon} width="18" height="18" />
									{:else}
										<img
											src={opencodeLogoSrc}
											alt={item.label}
											class="h-4.5 w-4.5 {item.disabled
												? 'opacity-20'
												: activeTool === item.id
													? 'opacity-90'
													: 'opacity-40'}"
										/>
									{/if}
								</div>
								<span class="flex-1 text-[14px] font-medium">{item.label}</span>
								{#if activeTool === item.id}
									<div class="flex h-5 w-5 items-center justify-center rounded-full bg-white/15">
										<Icon icon="mingcute:check-line" width="12" height="12" class="text-white/80" />
									</div>
								{:else if item.disabled}
									<span
										class="rounded-md bg-white/6 px-2 py-0.5 text-[10px] font-medium text-white/25"
										>Soon</span
									>
								{/if}
							</button>
						{/each}
						<div class="my-2 h-px bg-white/[0.06]"></div>
						<button
							onclick={() => navigateWithLeaveGuard('/ide', true)}
							class="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-white/50 transition-colors hover:bg-white/5 hover:text-white/80"
						>
							<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
								<Icon icon="mingcute:code-line" width="18" height="18" />
							</div>
							<span class="flex-1 text-[14px] font-medium">Open Playground IDE</span>
							<Icon icon="mingcute:arrow-right-line" width="16" height="16" class="text-white/30" />
						</button>
					</div>
				</div>
			{/if}

			<nav
				class="flex shrink-0 items-stretch border-t border-white/8 bg-[#0e0e0e]"
				style="height: calc(52px + env(safe-area-inset-bottom)); padding-bottom: env(safe-area-inset-bottom);"
			>
				<button
					onclick={toggleToolMenu}
					class="flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 border-none transition-colors {showToolMenu
						? 'text-white'
						: 'text-white/35 hover:text-white/60'}"
				>
					<Icon icon="mingcute:menu-line" width="20" height="20" />
					<span class="text-[10px] font-medium tracking-wide">Tools</span>
				</button>
				<button
					onclick={() => (activeMobileView = 'terminal')}
					class="flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 border-none transition-colors {activeMobileView ===
					'terminal'
						? 'text-white'
						: 'text-white/35 hover:text-white/60'}"
				>
					<Icon icon="mingcute:terminal-line" width="20" height="20" />
					<span class="text-[10px] font-medium tracking-wide">Terminal</span>
				</button>
				{#if portal.portals.length > 0}
					<button
						onclick={() => (activeMobileView = 'preview')}
						class="flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 border-none transition-colors {activeMobileView ===
						'preview'
							? 'text-white'
							: 'text-white/35 hover:text-white/60'}"
					>
						<Icon icon="mingcute:eye-2-line" width="20" height="20" />
						<span class="text-[10px] font-medium tracking-wide">Preview</span>
					</button>
				{/if}
				<button
					onclick={openTour}
					class="flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 border-none text-white/35 transition-colors hover:text-white/60"
				>
					<Icon icon="mingcute:question-line" width="20" height="20" />
					<span class="text-[10px] font-medium tracking-wide">Help</span>
				</button>
			</nav>
		{/if}
	</div>
</div>
