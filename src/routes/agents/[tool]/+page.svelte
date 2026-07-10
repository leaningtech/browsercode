<script lang="ts">
	import Terminal from '$lib/components/Terminal.svelte';
	import Portal from '$lib/components/Portal.svelte';
	import Icon from '@iconify/svelte';
	import opencodeLogoSrc from '$lib/assets/opencode-logo.svg';

	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { bootCLI } from '$lib/utils/main';
	import { stepperState } from '$lib/stores/stepper.svelte';
	import { toolItems } from '$lib/config/tools';
	import { requestSingleTabLock } from '$lib/utils/tabLock';
	import {
		navigateWithLeaveGuard,
		consumeIntentionalNavigation
	} from '$lib/stores/leaveWarning.svelte';

	type PortalItem = { port: number; url: string };
	type PortalUpdate = { port: number; url: string | null; active: boolean };

	let portalUrl: string | '' = '';
	let portals: PortalItem[] = [];
	let selectedPort: number | null = null;
	let showPortalMenu = false;
	let showPortalInfo = false;
	let copied = false;
	let qrCodeCanvas: HTMLCanvasElement | null = null;
	let qrError = '';
	let copiedTimeout: ReturnType<typeof setTimeout>;
	let isPortalVisible = true;

	let portalFraction = 0.5;
	let isDragging = false;
	let containerEl: HTMLElement | null = null;

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

	let isMobile = false;
	let activeMobileView: 'terminal' | 'preview' = 'terminal';
	let showToolMenu = false;
	let showDuplicateTabWarning = false;
	let closeFallback = false;
	let releaseTabLock: () => void = () => {};
	let showTerminalTip = false;

	function dismissTerminalTip() {
		showTerminalTip = false;
	}

	// Any keypress means they've already found the terminal — no need to keep the tip up.
	function handleAnyKeydown() {
		if (showTerminalTip) dismissTerminalTip();
	}

	function attemptCloseTab() {
		window.close();
		// Browsers only let scripts close tabs they themselves opened — if we're still here
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

	function updateIsMobile() {
		isMobile = window.matchMedia('(max-width: 768px)').matches;
	}

	function applyPortalUpdate(update: PortalUpdate) {
		const next = [...portals];
		const idx = next.findIndex((item) => item.port === update.port);

		if (update.active && update.url) {
			if (idx >= 0) {
				next[idx] = { port: update.port, url: update.url };
			} else {
				next.push({ port: update.port, url: update.url });
			}

			next.sort((a, b) => a.port - b.port);
			portals = next;

			selectedPort = update.port;
			portalUrl = update.url;

			// Auto-show portal on desktop, auto-switch on mobile
			if (!isMobile) {
				isPortalVisible = true;
			} else if (next.length === 1) {
				activeMobileView = 'preview';
			}
			return;
		}

		if (idx >= 0) {
			next.splice(idx, 1);
		}
		portals = next;

		if (selectedPort === update.port || !next.some((item) => item.port === selectedPort)) {
			const fallback = next[0];
			selectedPort = fallback?.port ?? null;
			portalUrl = fallback?.url ?? '';
		}

		// Auto-hide portal if all portals are gone
		if (next.length === 0) {
			isPortalVisible = false;
		}
	}

	function onPortChange(event: Event) {
		const value = Number((event.currentTarget as HTMLSelectElement).value);
		if (!Number.isInteger(value)) return;

		selectedPort = value;
		const selected = portals.find((item) => item.port === value);
		portalUrl = selected?.url ?? '';
		closePortalOverlays();
	}

	function togglePortalMenu() {
		showPortalMenu = !showPortalMenu;
		if (showPortalMenu) showPortalInfo = false;
	}

	function closePortalOverlays() {
		showPortalMenu = false;
		showPortalInfo = false;
		qrError = '';
	}

	async function showQRCodePanel() {
		if (!portalUrl) return;
		showPortalMenu = false;
		showPortalInfo = true;
	}

	function openPortalInNewTab() {
		if (!portalUrl) return;
		showPortalMenu = false;
		window.open(portalUrl, '_blank', 'noopener,noreferrer');
	}

	async function copyPortalURL() {
		if (!portalUrl) return;
		showPortalMenu = false;
		await navigator.clipboard.writeText(portalUrl);
		copied = true;
		clearTimeout(copiedTimeout);
		copiedTimeout = setTimeout(() => (copied = false), 1200);
	}

	// Only browsers get to show text here, and only their own generic wording — the custom
	// "your work will be lost" copy is reserved for in-app navigation via the leave-warning modal.
	// A `window.location.href` assignment fires this same event, so navigation we already
	// confirmed in-app is marked "intentional" and skipped here to avoid a duplicate prompt —
	// this only fires for real browser-driven unloads: tab close, refresh, back/forward, or a
	// typed URL.
	function handleBeforeUnload(event: BeforeUnloadEvent) {
		if (consumeIntentionalNavigation()) return;
		event.preventDefault();
		event.returnValue = '';
	}

	onMount(() => {
		updateIsMobile();
		const mql = window.matchMedia('(max-width: 768px)');
		mql.addEventListener('change', updateIsMobile);

		// Two tabs booting the same agent would both write to the same BrowserPod storage key —
		// claim an exclusive, tab-lifetime lock first and only boot if we actually got it.
		const tool = getActiveTool();
		const lock = requestSingleTabLock(`agent-session:${tool}`);
		releaseTabLock = lock.release;

		lock.acquired.then((acquired) => {
			if (!acquired) {
				showDuplicateTabWarning = true;
				return;
			}

			// Only warn on tab close/refresh/back-button once a session is actually running here —
			// the duplicate-tab case above has nothing booted, so there's no work to lose.
			window.addEventListener('beforeunload', handleBeforeUnload);

			// Shown on every boot, not just the first ever visit — it's an easy thing to miss.
			showTerminalTip = true;

			bootCLI((update: PortalUpdate | string) => {
				if (typeof update === 'string') {
					let parsed: URL;
					try {
						parsed = new URL(update);
					} catch {
						return;
					}
					const port = Number(parsed.port);
					if (!Number.isInteger(port) || port <= 0) return;
					applyPortalUpdate({ port, url: update, active: true });
					return;
				}

				applyPortalUpdate(update);
			}, tool);
		});

		return () => {
			mql.removeEventListener('change', updateIsMobile);
			window.removeEventListener('beforeunload', handleBeforeUnload);
			clearTimeout(copiedTimeout);
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

	<div class="relative min-h-0 flex-1 overflow-hidden">
		<!-- Terminal (always full size) -->
		<div
			class="absolute inset-0 bg-black"
			class:hidden={isMobile && activeMobileView !== 'terminal'}
		>
			<Terminal />
		</div>

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
						Click into it and use your keyboard — mouse clicks alone won't do much here.
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
		{#if !isMobile && portals.length > 0 && isPortalVisible}
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
					src={portalUrl}
					{portals}
					{selectedPort}
					showMenu={showPortalMenu}
					showInfo={showPortalInfo}
					{copied}
					{qrError}
					{qrCodeCanvas}
					{onPortChange}
					onToggleMenu={togglePortalMenu}
					onCopyLink={copyPortalURL}
					onOpenNewTab={openPortalInNewTab}
					onShowQrCode={showQRCodePanel}
					onCloseOverlays={closePortalOverlays}
				/>
			</div>
		{:else if isMobile && portals.length > 0 && activeMobileView === 'preview'}
			<!-- Mobile portal (full screen overlay) -->
			<div class="absolute inset-0 overflow-hidden">
				<Portal
					src={portalUrl}
					{portals}
					{selectedPort}
					showMenu={showPortalMenu}
					showInfo={showPortalInfo}
					{copied}
					{qrError}
					{qrCodeCanvas}
					{onPortChange}
					onToggleMenu={togglePortalMenu}
					onCopyLink={copyPortalURL}
					onOpenNewTab={openPortalInNewTab}
					onShowQrCode={showQRCodePanel}
					onCloseOverlays={closePortalOverlays}
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
			{#if portals.length > 0}
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
				onclick={() => (stepperState.open = true)}
				class="flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 border-none text-white/35 transition-colors hover:text-white/60"
			>
				<Icon icon="mingcute:question-line" width="20" height="20" />
				<span class="text-[10px] font-medium tracking-wide">Help</span>
			</button>
		</nav>
	{/if}
</div>
