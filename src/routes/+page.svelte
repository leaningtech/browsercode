<script lang="ts">
	import Terminal from '$lib/components/Terminal.svelte';
	import Portal from '$lib/components/Portal.svelte';
	import Icon from '@iconify/svelte';

	import { onMount, tick } from 'svelte';
	import { bootCLI } from '$lib/utils/main';

	type PortalItem = { port: number; url: string };
	type PortalUpdate = { port: number; url: string | null; active: boolean };

	let portalUrl: string | '' = '';
	let portalDebug = false;
	let portals: PortalItem[] = [];
	let selectedPort: number | null = null;
	let showPortalMenu = false;
	let showPortalInfo = false;
	let copied = false;
	let qrCodeCanvas: HTMLCanvasElement | null = null;
	let qrError = '';
	let copiedTimeout: ReturnType<typeof setTimeout>;
	let terminalComponent: any;
	let isPortalVisible = true;

	// ── Drag-to-resize ────────────────────────────────────────────────────────
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
			terminalComponent?.triggerResize();
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

	// ── Mobile ────────────────────────────────────────────────────────────────
	let isMobile = false;
	let activeMobileView: 'terminal' | 'preview' = 'terminal';

	function updateIsMobile() {
		isMobile = window.matchMedia('(max-width: 768px)').matches;
	}

	// ── Portal state ──────────────────────────────────────────────────────────
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

			tick().then(() => {
				terminalComponent?.triggerResize();
			});
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
		tick().then(() => {
			terminalComponent?.triggerResize();
		});
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
		});

		return () => {
			mql.removeEventListener('change', updateIsMobile);
			clearTimeout(copiedTimeout);
		};
	});
</script>

<div class="flex h-full min-h-0 w-full min-w-0 flex-col" bind:this={containerEl}>
	<!-- ── Main panes ─────────────────────────────────────────────────────────── -->
	<div class="flex min-h-0 flex-1 overflow-hidden">
		<!-- Terminal -->
		<div
			class="min-h-0 min-w-0 overflow-hidden bg-black"
			class:hidden={isMobile && activeMobileView !== 'terminal'}
			style={isMobile || portals.length === 0 || !isPortalVisible
				? 'flex: 1 1 0;'
				: `width: ${terminalFraction * 100}%; flex-shrink: 0;`}
		>
			<Terminal
				bind:this={terminalComponent}
				portalAvailable={portals.length > 0}
				{isPortalVisible}
				onTogglePortal={togglePortal}
			/>
		</div>

		<!-- Drag divider (desktop, portal active) -->
		{#if !isMobile && portals.length > 0 && isPortalVisible}
			<!-- svelte-ignore a11y_interactive_supports_focus -->
			<div
				class="group relative z-10 w-[5px] shrink-0 cursor-col-resize"
				onmousedown={startDrag}
				role="separator"
				aria-orientation="vertical"
			>
				<div
					class="absolute top-0 bottom-0 left-[2px] w-px rounded-full transition-[background] duration-150 {isDragging
						? 'bg-white/25'
						: 'bg-white/[0.07] group-hover:bg-white/25'}"
				></div>
			</div>
		{/if}

		<!-- Portal -->
		{#if portals.length > 0 && isPortalVisible}
			<div
				class="min-h-0 min-w-0 overflow-hidden border-l border-white/[0.06]"
				class:hidden={isMobile && activeMobileView !== 'preview'}
				class:pointer-events-none={isDragging}
				style={isMobile
					? 'flex: 1 1 0;'
					: `width: ${(1 - terminalFraction) * 100}%; flex-shrink: 0;`}
			>
				<Portal
					src={portalUrl}
					debug={portalDebug}
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

	<!-- ── Mobile tab bar ────────────────────────────────────────────────────── -->
	{#if isMobile}
		<nav class="flex h-12 shrink-0 items-stretch border-t border-white/[0.06] bg-[#111111]">
			<button
				onclick={() => (activeMobileView = 'terminal')}
				class="flex flex-1 cursor-pointer flex-col items-center justify-center gap-[2px] border-none text-[11px] font-medium transition-colors {activeMobileView ===
				'terminal'
					? 'bg-white/[0.04] text-white/90'
					: 'bg-transparent text-white/30 hover:text-white/60'}"
			>
				<Icon icon="mingcute:terminal-line" width="18" height="18" />
				<span>Terminal</span>
			</button>
			{#if portals.length > 0}
				<button
					onclick={() => (activeMobileView = 'preview')}
					class="flex flex-1 cursor-pointer flex-col items-center justify-center gap-[2px] border-none text-[11px] font-medium transition-colors {activeMobileView ===
					'preview'
						? 'bg-white/[0.04] text-white/90'
						: 'bg-transparent text-white/30 hover:text-white/60'}"
				>
					<Icon icon="mingcute:eye-2-line" width="18" height="18" />
					<span>Preview</span>
				</button>
			{/if}
		</nav>
	{/if}
</div>
