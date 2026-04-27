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

	// ── Drag-to-resize ────────────────────────────────────────────────────────
	let terminalFraction = 0.5;
	let isDragging = false;
	let containerEl: HTMLElement | null = null;

	function startDrag(e: MouseEvent) {
		e.preventDefault();
		isDragging = true;
		document.body.classList.add('col-dragging');

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
			document.body.classList.remove('col-dragging');
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

			// On mobile, auto-switch to preview when portal first comes online
			if (isMobile && next.length === 1) {
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
			class:mobile-hidden={isMobile && activeMobileView !== 'terminal'}
			style={isMobile || portals.length === 0
				? 'flex: 1 1 0;'
				: `width: ${terminalFraction * 100}%; flex-shrink: 0;`}
		>
			<Terminal bind:this={terminalComponent} />
		</div>

		<!-- Drag divider (desktop, portal active) -->
		{#if !isMobile && portals.length > 0}
			<!-- svelte-ignore a11y_interactive_supports_focus -->
			<div
				class="divider-col"
				class:active={isDragging}
				onmousedown={startDrag}
				role="separator"
				aria-orientation="vertical"
			>
				<div class="divider-line"></div>
			</div>
		{/if}

		<!-- Portal -->
		{#if portals.length > 0}
			<div
				class="min-h-0 min-w-0 overflow-hidden border-l border-white/[0.06]"
				class:mobile-hidden={isMobile && activeMobileView !== 'preview'}
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
		<nav class="flex h-11 shrink-0 items-stretch border-t border-white/[0.06] bg-[#111111]">
			<button
				onclick={() => (activeMobileView = 'terminal')}
				class="mobile-tab-btn"
				class:active={activeMobileView === 'terminal'}
			>
				<Icon icon="mingcute:terminal-line" width="16" height="16" />
				<span>Terminal</span>
			</button>
			{#if portals.length > 0}
				<button
					onclick={() => (activeMobileView = 'preview')}
					class="mobile-tab-btn"
					class:active={activeMobileView === 'preview'}
				>
					<Icon icon="mingcute:eye-2-line" width="16" height="16" />
					<span>Preview</span>
				</button>
			{/if}
		</nav>
	{/if}
</div>

<style>
	/* Keep hidden panes mounted (terminal/iframe need persistent DOM) */
	.mobile-hidden {
		display: none !important;
	}

	/* Cursor + pointer-event lockout while dragging */
	:global(body.col-dragging) {
		cursor: col-resize;
		user-select: none;
	}
	:global(body.col-dragging) :global(iframe) {
		pointer-events: none;
	}

	/* Drag divider */
	.divider-col {
		position: relative;
		width: 5px;
		flex-shrink: 0;
		cursor: col-resize;
		z-index: 10;
	}
	.divider-line {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 2px;
		width: 1px;
		border-radius: 9999px;
		background: rgba(255, 255, 255, 0.07);
		transition: background 0.15s;
	}
	.divider-col:hover .divider-line,
	.divider-col.active .divider-line {
		background: rgba(255, 255, 255, 0.25);
	}

	/* Mobile tab bar buttons */
	.mobile-tab-btn {
		display: flex;
		flex: 1 1 0;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		border: none;
		background: transparent;
		color: rgba(255, 255, 255, 0.3);
		font-size: 10px;
		font-weight: 500;
		cursor: pointer;
		transition: color 0.15s, background 0.15s;
	}
	.mobile-tab-btn:hover {
		color: rgba(255, 255, 255, 0.6);
	}
	.mobile-tab-btn.active {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.04);
	}
</style>
