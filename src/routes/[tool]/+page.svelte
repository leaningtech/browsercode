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

	let podAlreadyRunning = false;
	let stopHeartbeat: (() => void) | null = null;

	const HEARTBEAT_INTERVAL = 3000;
	const HEARTBEAT_EXPIRY = 8000;

	function getTabId(): string {
		let id = sessionStorage.getItem('browserpod_tab_id');
		if (!id) {
			id = Math.random().toString(36).slice(2);
			sessionStorage.setItem('browserpod_tab_id', id);
		}
		return id;
	}

	function isPodRunningElsewhere(tool: string): boolean {
		const stored = localStorage.getItem(`pod_heartbeat_${tool}`);
		if (!stored) return false;
		try {
			const data = JSON.parse(stored);
			if (data.tabId === getTabId()) return false;
			return Date.now() - data.time < HEARTBEAT_EXPIRY;
		} catch {
			return false;
		}
	}

	function startPodHeartbeat(tool: string): () => void {
		const key = `pod_heartbeat_${tool}`;
		const tabId = getTabId();
		const write = () => localStorage.setItem(key, JSON.stringify({ time: Date.now(), tabId }));
		write();
		const interval = setInterval(write, HEARTBEAT_INTERVAL);
		return () => {
			clearInterval(interval);
			localStorage.removeItem(key);
		};
	}

	function bootPod() {
		const tool = getActiveTool();
		stopHeartbeat = startPodHeartbeat(tool);
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
	}

	let terminalFraction = 0.5;
	let isDragging = false;
	let containerEl: HTMLElement | null = null;

	function startDrag(e: MouseEvent) {
		e.preventDefault();
		isDragging = true;
		document.body.style.cursor = 'col-resize';
		document.body.style.userSelect = 'none';

		const startX = e.clientX;
		const startFrac = terminalFraction;
		const totalW = containerEl?.clientWidth ?? 1;

		function onMove(ev: MouseEvent) {
			const dx = ev.clientX - startX;
			terminalFraction = Math.max(0.2, Math.min(0.8, startFrac + dx / totalW));
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

	const validToolIds = new Set(toolItems.filter((t) => !t.disabled).map((t) => t.id));
	const defaultTool = toolItems.find((t) => !t.disabled)?.id ?? 'claude';

	function getActiveTool() {
		const tool = $page.params.tool;
		return validToolIds.has(tool) ? tool : defaultTool;
	}

	$: activeTool = getActiveTool();

	function toggleToolMenu() {
		showToolMenu = !showToolMenu;
	}

	function selectTool(id: string) {
		if (validToolIds.has(id)) {
			window.open(`/${id}`, '_blank', 'noopener,noreferrer');
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

	function togglePortal() {
		if (portals.length === 0) return;
		isPortalVisible = !isPortalVisible;
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

	onMount(() => {
		updateIsMobile();
		const mql = window.matchMedia('(max-width: 768px)');
		mql.addEventListener('change', updateIsMobile);

		if (isPodRunningElsewhere(getActiveTool())) {
			podAlreadyRunning = true;
		} else {
			bootPod();
		}

		return () => {
			stopHeartbeat?.();
			mql.removeEventListener('change', updateIsMobile);
			clearTimeout(copiedTimeout);
		};
	});
</script>

{#if podAlreadyRunning}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
		<div class="mx-4 w-full max-w-sm rounded-xl border border-white/10 bg-[#1a1a1c] p-6 shadow-2xl">
			<div class="mb-3 flex items-center gap-2.5">
				<Icon
					icon="mingcute:warning-line"
					width="22"
					height="22"
					class="shrink-0 text-yellow-400"
				/>
				<h2 class="text-[15px] font-semibold text-white">Pod Already Running</h2>
			</div>
			<p class="mb-5 text-[13px] leading-relaxed text-white/55">
				{toolItems.find((t) => t.id === activeTool)?.label ?? activeTool} is already open in another tab.
				Only one instance can run at a time. close the other tab first.
			</p>
			<button
				onclick={() => window.history.back()}
				class="w-full rounded-lg border border-white/10 px-4 py-2 text-[13px] font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white/80"
			>
				Go Back
			</button>
		</div>
	</div>
{/if}

<div class="flex h-full min-h-0 w-full min-w-0 flex-col" bind:this={containerEl}>
	<div class="relative flex min-h-0 flex-1 overflow-hidden">
		<!-- Terminal (always full width) -->
		<div
			class="min-h-0 min-w-0 overflow-hidden bg-black"
			class:hidden={isMobile && activeMobileView !== 'terminal'}
			style="flex: 1 1 0;"
		>
			<Terminal
				portalAvailable={portals.length > 0}
				{isPortalVisible}
				onTogglePortal={togglePortal}
			/>
		</div>

		<!-- Drag divider (desktop, portal active) -->
		{#if !isMobile && portals.length > 0 && isPortalVisible}
			<button
				class="group absolute top-0 bottom-0 z-20 w-1.25 shrink-0 cursor-col-resize"
				style={`left: calc(${terminalFraction * 100}% - 0.3125rem);`}
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
		{/if}

		<!-- Portal (overlay on top of terminal) -->
		{#if portals.length > 0 && isPortalVisible}
			<div
				class="overflow-hidden border-l border-white/6"
				class:hidden={isMobile && activeMobileView !== 'preview'}
				class:pointer-events-none={isDragging}
				style={isMobile
					? 'position: absolute; inset: 0;'
					: `position: absolute; top: 0; right: 0; bottom: 0; width: ${(1 - terminalFraction) * 100}%;`}
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
		{/if}
	</div>

	<!-- Mobile Bottom Navigator -->
	{#if isMobile}
		<!-- Tool menu sheet -->
		{#if showToolMenu}
			<button
				class="fixed inset-0 z-40 bg-black/50"
				onclick={() => (showToolMenu = false)}
				aria-label="Close menu"
			></button>
			<div
				class="fixed right-0 left-0 z-50 rounded-t-xl border-t border-white/10 bg-[#111111] pb-2 shadow-[0_-8px_32px_rgba(0,0,0,0.6)]"
				style="bottom: calc(48px + env(safe-area-inset-bottom));"
			>
				<div class="flex items-center justify-between px-4 py-3">
					<span class="text-[13px] font-semibold text-white/60">CLI Tool</span>
					<button
						onclick={() => (showToolMenu = false)}
						class="rounded p-1 text-white/40 hover:text-white/70"
					>
						<Icon icon="mingcute:close-line" width="16" height="16" />
					</button>
				</div>
				<div class="px-2">
					{#each toolItems as item (item.id)}
						<button
							onclick={() => !item.disabled && selectTool(item.id)}
							disabled={item.disabled}
							class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors
								{activeTool === item.id
								? 'bg-white/10 text-white'
								: item.disabled
									? 'cursor-not-allowed text-white/20'
									: 'text-white/60 hover:bg-white/6 hover:text-white/90'}"
						>
							{#if item.icon}
								<Icon icon={item.icon} width="20" height="20" />
							{:else}
								<img src={opencodeLogoSrc} alt={item.label} class="h-5 w-5 opacity-20" />
							{/if}
							<span class="flex-1 text-[14px] font-medium">{item.label}</span>
							{#if activeTool === item.id}
								<Icon icon="mingcute:check-line" width="14" height="14" class="text-white/60" />
							{:else if item.disabled}
								<span class="text-[11px] text-white/25">Coming soon</span>
							{/if}
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<nav
			class="flex shrink-0 items-stretch border-t border-white/6 bg-[#111111]"
			style="height: calc(48px + env(safe-area-inset-bottom)); padding-bottom: env(safe-area-inset-bottom);"
		>
			<button
				onclick={toggleToolMenu}
				class="flex w-25 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 border-none text-[11px] font-medium transition-colors {showToolMenu
					? 'bg-white/4 text-white/90'
					: 'bg-transparent text-white/30 hover:text-white/60'}"
			>
				<Icon icon="mingcute:menu-line" width="20" height="20" />
				<span>Tools</span>
			</button>
			<button
				onclick={() => (activeMobileView = 'terminal')}
				class="flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 border-none text-[11px] font-medium transition-colors {activeMobileView ===
				'terminal'
					? 'bg-white/4 text-white/90'
					: 'bg-transparent text-white/30 hover:text-white/60'}"
			>
				<Icon icon="mingcute:terminal-line" width="20" height="20" />
				<span>Terminal</span>
			</button>
			{#if portals.length > 0}
				<button
					onclick={() => (activeMobileView = 'preview')}
					class="flex flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 border-none text-[11px] font-medium transition-colors {activeMobileView ===
					'preview'
						? 'bg-white/4 text-white/90'
						: 'bg-transparent text-white/30 hover:text-white/60'}"
				>
					<Icon icon="mingcute:eye-2-line" width="20" height="20" />
					<span>Preview</span>
				</button>
			{/if}
			<button
				onclick={() => (stepperState.open = true)}
				class="flex w-25 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 border-none text-[11px] font-medium text-white/30 transition-colors hover:text-white/60"
			>
				<Icon icon="mingcute:question-line" width="20" height="20" />
				<span>Help</span>
			</button>
		</nav>
	{/if}
</div>
