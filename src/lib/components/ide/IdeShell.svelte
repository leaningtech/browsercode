<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import Icon from '@iconify/svelte';
	import Portal from '$lib/components/Portal.svelte';
	import EditorPane from '$lib/components/ide/EditorPane.svelte';
	import FileTreePanel from '$lib/components/ide/FileTreePanel.svelte';
	import TerminalTabs from '$lib/components/ide/TerminalTabs.svelte';
	import PreviewLoader from '$lib/components/ide/PreviewLoader.svelte';
	import { fade } from 'svelte/transition';
	import { cubicIn } from 'svelte/easing';
	import type { IdeSession, PortalUpdate } from '$lib/ide/session.svelte';
	import { consumeIntentionalNavigation } from '$lib/stores/leaveWarning.svelte';

	type PortalItem = { port: number; url: string };

	// The route owns the session and decides how it boots (curated framework vs GitHub clone);
	// the shell is mode-agnostic — it just drives `boot` once the terminals are mounted and
	// renders from session state. Switching frameworks/GitHub repos happens from the sidebar's
	// Ide flyout, not from here.
	let {
		session,
		boot
	}: {
		session: IdeSession;
		boot: (
			terminalEl: HTMLElement,
			onPortalUpdate: (update: PortalUpdate) => void
		) => Promise<void>;
	} = $props();

	let isCompatibleBrowser = $state(true);
	let activePanel = $state<'files' | null>('files');
	let fileTree = $state<{ startCreate: (kind: 'file' | 'folder') => void } | null>(null);

	// ── Portal state (same shape as the agents page; Portal.svelte renders it) ──
	let portals = $state<PortalItem[]>([]);
	let selectedPort = $state<number | null>(null);
	let portalUrl = $state('');
	let showPortalMenu = $state(false);
	let showPortalInfo = $state(false);
	let copied = $state(false);
	let qrError = $state('');
	let copiedTimeout: ReturnType<typeof setTimeout>;

	let previewLive = $derived(portals.length > 0);
	// Keep the loader mounted for a beat after the preview goes live so its "step through"
	let loaderVisible = $state(true);
	$effect(() => {
		if (!previewLive) {
			loaderVisible = true;
			return;
		}
		const id = setTimeout(() => (loaderVisible = false), 220);
		return () => clearTimeout(id);
	});

	// ── Mobile state ──────────────────────────────────────────────────────────
	let isMobile = $state(false);
	let activeMobileView = $state<'editor' | 'terminal' | 'preview'>('editor');

	// ── Resize state ──────────────────────────────────────────────────────────
	let filePanelWidth = $state(208);
	let leftColFraction = $state(0.6);
	let editorFraction = $state(0.8);
	let dragging = $state<'file' | 'col' | 'row' | null>(null);
	let bodyEl = $state<HTMLElement | null>(null);
	let leftColEl = $state<HTMLElement | null>(null);

	let outputEl = $state<HTMLElement | null>(null);

	function fitTerminals() {
		window.dispatchEvent(new Event('resize'));
	}

	function startDrag(which: 'file' | 'col' | 'row', e: MouseEvent) {
		e.preventDefault();
		dragging = which;
		document.body.classList.add('dragging');
		document.body.style.cursor = which === 'row' ? 'row-resize' : 'col-resize';

		const startX = e.clientX;
		const startY = e.clientY;
		const startFileW = filePanelWidth;
		const startEditorFrac = editorFraction;
		const startLeftW = leftColEl?.clientWidth ?? 0;
		const startLeftH = leftColEl?.clientHeight ?? 0;
		// 40px = icon rail width
		const startTotalW = bodyEl ? bodyEl.clientWidth - 40 - (activePanel ? filePanelWidth : 0) : 1;

		function onMove(ev: MouseEvent) {
			const dx = ev.clientX - startX;
			const dy = ev.clientY - startY;

			if (which === 'file') {
				const requested = startFileW + dx;
				if (requested < 100) {
					// Dragged shut — collapse the panel instead of pinning to min width
					activePanel = null;
					onUp();
					return;
				}
				filePanelWidth = Math.max(140, Math.min(480, requested));
			} else if (which === 'col') {
				leftColFraction = Math.max(0.25, Math.min(0.8, (startLeftW + dx) / startTotalW));
			} else if (which === 'row') {
				// Cap the terminal at 600px by bumping the editor's minimum fraction
				const maxTerminalPx = 600;
				const minEditorFrac = startLeftH > 0 ? Math.max(0.2, 1 - maxTerminalPx / startLeftH) : 0.2;
				editorFraction = Math.max(
					minEditorFrac,
					Math.min(0.85, (startLeftH * startEditorFrac + dy) / startLeftH)
				);
			}
			fitTerminals();
		}

		function onUp() {
			dragging = null;
			document.body.classList.remove('dragging');
			document.body.style.cursor = '';
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('mouseup', onUp);
		}

		window.addEventListener('mousemove', onMove);
		window.addEventListener('mouseup', onUp);
	}

	// ── Portal handling ─────────────────────────────────────────────────────────
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

			// Frameworks with a declared app port keep the preview pinned to it;
			// other ports stay reachable through the port selector.
			const preferred = session.appPort;
			if (preferred === undefined || update.port === preferred || selectedPort === null) {
				selectedPort = update.port;
				portalUrl = update.url;
			}
			return;
		}

		if (idx >= 0) next.splice(idx, 1);
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
		portalUrl = portals.find((item) => item.port === value)?.url ?? '';
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

	function showQRCodePanel() {
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

	// ── Mobile detection ──────────────────────────────────────────────────────
	function updateIsMobile() {
		isMobile = window.matchMedia('(max-width: 768px)').matches;
		// Close the side panel by default on mobile so it doesn't cover the view
		if (isMobile && activePanel) activePanel = null;
	}

	$effect(() => {
		if (activeMobileView === 'terminal') {
			setTimeout(() => fitTerminals(), 0);
		}
	});

	// ── Boot ──────────────────────────────────────────────────────────────────
	onMount(() => {
		updateIsMobile();
		const mql = window.matchMedia('(max-width: 768px)');
		const onChange = () => updateIsMobile();
		mql.addEventListener('change', onChange);
		return () => mql.removeEventListener('change', onChange);
	});

	// Catches tab close/refresh/back-forward while a pod is running here — the in-app leave-warning
	// modal (triggered via the sidebar) already asks and marks the navigation intentional, so this
	// only fires for real browser-driven unloads.
	function handleBeforeUnload(event: BeforeUnloadEvent) {
		if (consumeIntentionalNavigation()) return;
		event.preventDefault();
		event.returnValue = '';
	}

	onMount(() => {
		window.addEventListener('beforeunload', handleBeforeUnload);
		return () => window.removeEventListener('beforeunload', handleBeforeUnload);
	});

	onMount(async () => {
		if (typeof Atomics?.waitAsync !== 'function') {
			isCompatibleBrowser = false;
			session.loading = false;
			return;
		}
		await tick();
		if (!outputEl) throw new Error('Terminal container is not ready yet');
		try {
			await boot(outputEl, (update) => applyPortalUpdate(update));
		} catch (error) {
			console.error('Failed initializing BrowserPod:', error);
			session.loading = false;
		}
	});

	onDestroy(() => {
		clearTimeout(copiedTimeout);
		session.shutdown();
	});
</script>

<div class="bc-page-bg flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden text-zinc-300">
	<!-- ── Top bar ─────────────────────────────────────────────────────────── -->
	<header
		class="flex h-10 shrink-0 items-center justify-between border-b border-bc-mist/10 bg-[#050c1a] px-3"
	>
		<div class="flex min-w-0 items-center gap-2 text-[11px] text-white/40">
			<!-- Switching frameworks or cloning a repo happens from the sidebar's Ide flyout. -->
			<span class="truncate text-white/60">{session.displayLabel}</span>
			{#if session.selectedFile}
				<span class="text-white/20">/</span>
				<span class="truncate text-white/60">{session.selectedFile}</span>
			{/if}
			{#if session.isSaving}
				<span class="ml-1 shrink-0 text-bc-mist/70">saving…</span>
			{/if}
		</div>
	</header>

	<!-- ── Body ────────────────────────────────────────────────────────────── -->
	<div
		class="body-wrap flex min-h-0 flex-1 overflow-hidden"
		class:is-mobile={isMobile}
		bind:this={bodyEl}
	>
		<!-- Icon rail -->
		<aside class="flex w-10 shrink-0 flex-col border-r border-bc-mist/10 bg-[#050c1a]">
			<div class="flex flex-col gap-0.5 p-1 pt-2">
				<button
					onclick={() => (activePanel = activePanel === 'files' ? null : 'files')}
					class="flex items-center justify-center rounded p-1.5 transition {activePanel === 'files'
						? 'bg-bc-azure/15 text-bc-azure'
						: 'text-zinc-600 hover:bg-white/5 hover:text-zinc-300'}"
					title="Files"
				>
					<Icon icon="mingcute:file-line" width="18" height="18" />
				</button>
			</div>
		</aside>

		<!-- Mobile backdrop to dismiss the panel by tapping outside -->
		{#if isMobile && activePanel}
			<button
				type="button"
				aria-label="Close panel"
				class="fixed inset-0 z-20 bg-black/50"
				onclick={() => (activePanel = null)}
			></button>
		{/if}

		<!-- Side panel: files or frameworks -->
		{#if activePanel}
			<div
				class="side-panel flex shrink-0 flex-col bg-[#050c1a]"
				style="width: {isMobile ? 240 : filePanelWidth}px;"
			>
				<div class="flex items-center justify-between border-b border-bc-mist/10 px-3 py-1.5">
					<span class="text-[10px] font-medium tracking-widest text-zinc-600 uppercase">
						Files
					</span>
					<div class="flex items-center gap-0.5">
						<button
							type="button"
							title="New file"
							disabled={!session.podReady}
							onclick={() => fileTree?.startCreate('file')}
							class="rounded p-1 text-zinc-600 transition hover:bg-white/5 hover:text-zinc-300 disabled:pointer-events-none disabled:opacity-40"
						>
							<Icon icon="mingcute:file-new-line" width="13" height="13" />
						</button>
						<button
							type="button"
							title="New folder"
							disabled={!session.podReady}
							onclick={() => fileTree?.startCreate('folder')}
							class="rounded p-1 text-zinc-600 transition hover:bg-white/5 hover:text-zinc-300 disabled:pointer-events-none disabled:opacity-40"
						>
							<Icon icon="mingcute:new-folder-line" width="13" height="13" />
						</button>
					</div>
				</div>
				<div class="flex-1 overflow-y-auto p-1.5">
					<FileTreePanel
						bind:this={fileTree}
						{session}
						onFileOpen={() => isMobile && (activePanel = null)}
					/>
				</div>
			</div>

			<!-- Divider: side panel / editor -->
			<button
				type="button"
				class="divider divider-col"
				class:active={dragging === 'file'}
				onmousedown={(e) => startDrag('file', e)}
				aria-label="Resize side panel"
			>
				<div class="divider-line"></div>
			</button>
		{/if}

		<!-- ── Main: editor + terminal + preview ──────────────────────────────── -->
		<div class="flex h-full min-w-0 flex-1 overflow-hidden">
			<!-- Left column: editor + terminal -->
			<div
				class="flex h-full min-h-0 flex-col overflow-hidden"
				class:mobile-hidden={isMobile &&
					activeMobileView !== 'editor' &&
					activeMobileView !== 'terminal'}
				bind:this={leftColEl}
				style={isMobile ? 'width: 100%;' : `width: ${leftColFraction * 100}%;`}
			>
				<div
					class:mobile-hidden={isMobile && activeMobileView !== 'editor'}
					style={isMobile ? 'height: 100%; flex-shrink: 0;' : 'flex: 1 1 0; min-height: 0;'}
				>
					<EditorPane {session} />
				</div>

				<!-- Divider: editor / terminal -->
				{#if !isMobile}
					<button
						type="button"
						class="divider divider-row"
						class:active={dragging === 'row'}
						onmousedown={(e) => startDrag('row', e)}
						aria-label="Resize terminal panel"
					>
						<div class="divider-line"></div>
					</button>
				{/if}

				<div
					class:mobile-hidden={isMobile && activeMobileView !== 'terminal'}
					style={isMobile
						? 'flex: 1 1 0; min-height: 0; height: 100%;'
						: `flex: 0 0 auto; height: ${(1 - editorFraction) * 100}%; max-height: 600px; min-height: 0;`}
				>
					<TerminalTabs {session} bind:outputEl />
				</div>
			</div>

			<!-- Divider: editor column / preview -->
			{#if !isMobile}
				<button
					type="button"
					class="divider divider-col"
					class:active={dragging === 'col'}
					onmousedown={(e) => startDrag('col', e)}
					aria-label="Resize preview panel"
				>
					<div class="divider-line"></div>
				</button>
			{/if}

			<!-- Right column: preview -->
			<div
				class="relative flex min-h-0 min-w-0 flex-1 flex-col"
				class:mobile-hidden={isMobile && activeMobileView !== 'preview'}
				class:pointer-events-none={dragging !== null}
				style={isMobile ? 'width: 100%; height: 100%;' : ''}
			>
				{#if !isCompatibleBrowser}
					<div
						class="absolute inset-0 z-50 flex items-center justify-center bg-bc-abyss/80 p-4 backdrop-blur-md"
					>
						<div
							class="glass-panel max-w-85 rounded-xl border border-bc-mist/15 px-6 py-8 text-center"
						>
							<div
								class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-bc-coral/10 text-bc-coral"
							>
								<Icon icon="mingcute:alert-line" width="22" height="22" />
							</div>
							<h3 class="mb-2 text-sm font-semibold text-zinc-50">Incompatible Browser</h3>
							<p class="text-[12px] leading-relaxed text-zinc-400">
								Requires <strong class="text-zinc-200">Atomics.waitAsync</strong> (Chrome, Edge, Safari
								16.4+).
							</p>
						</div>
					</div>
				{:else}
					{#if portals.length > 0}
						<Portal
							src={portalUrl}
							{portals}
							{selectedPort}
							showMenu={showPortalMenu}
							showInfo={showPortalInfo}
							{copied}
							{qrError}
							{onPortChange}
							onToggleMenu={togglePortalMenu}
							onCopyLink={copyPortalURL}
							onOpenNewTab={openPortalInNewTab}
							onShowQrCode={showQRCodePanel}
							onCloseOverlays={closePortalOverlays}
						/>
					{/if}
					<!-- Loader overlays the column until the preview is live. -->
					{#if loaderVisible}
						<div class="absolute inset-0 z-30" out:fade={{ duration: 550, easing: cubicIn }}>
							<PreviewLoader label={session.displayLabel} active={!previewLive} />
						</div>
					{/if}
				{/if}
			</div>
		</div>
	</div>

	<!-- ── Mobile tab bar ──────────────────────────────────────────────────── -->
	{#if isMobile}
		<nav
			class="flex shrink-0 items-stretch border-t border-bc-mist/10 bg-[#050c1a]"
			style="height: calc(44px + env(safe-area-inset-bottom)); padding-bottom: env(safe-area-inset-bottom);"
		>
			<button
				onclick={() => (activeMobileView = 'editor')}
				class="mobile-tab-btn"
				class:active={activeMobileView === 'editor'}
			>
				<Icon icon="mingcute:code-line" width="16" height="16" />
				<span>Editor</span>
			</button>
			<button
				onclick={() => (activeMobileView = 'terminal')}
				class="mobile-tab-btn"
				class:active={activeMobileView === 'terminal'}
			>
				<Icon icon="mingcute:terminal-line" width="16" height="16" />
				<span>Terminal</span>
			</button>
			<button
				onclick={() => (activeMobileView = 'preview')}
				class="mobile-tab-btn"
				class:active={activeMobileView === 'preview'}
			>
				<Icon icon="mingcute:eye-2-line" width="16" height="16" />
				<span>Preview</span>
			</button>
		</nav>
	{/if}
</div>

<style>
	:global(body.dragging) {
		cursor: col-resize;
		user-select: none;
	}
	:global(body.dragging) :global(iframe) {
		pointer-events: none;
	}

	/* ── Dividers ──────────────────────────────────────────────────────────── */
	.divider {
		position: relative;
		flex-shrink: 0;
		z-index: 10;
		border: none;
		background: transparent;
		padding: 0;
	}
	.divider-col {
		width: 5px;
		cursor: col-resize;
	}
	.divider-row {
		height: 5px;
		cursor: row-resize;
	}
	.divider-line {
		position: absolute;
		border-radius: 9999px;
		background: rgba(183, 205, 255, 0.1);
		transition:
			background 0.15s,
			box-shadow 0.15s;
	}
	.divider-col .divider-line {
		top: 0;
		bottom: 0;
		left: 2px;
		width: 1px;
	}
	.divider-row .divider-line {
		left: 0;
		right: 0;
		top: 2px;
		height: 1px;
	}
	.divider-col:hover .divider-line,
	.divider-col.active .divider-line,
	.divider-row:hover .divider-line,
	.divider-row.active .divider-line {
		background: rgba(74, 125, 255, 0.5);
	}

	/* ── Mobile ────────────────────────────────────────────────────────────── */
	/* Keep hidden panes mounted (terminals/iframes need persistent DOM) but
	   take them out of layout so the active pane fills the viewport. */
	.mobile-hidden {
		display: none !important;
	}

	.mobile-tab-btn {
		display: flex;
		flex: 1 1 0;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		border: none;
		background: transparent;
		color: rgba(255, 255, 255, 0.35);
		font-size: 10px;
		font-weight: 500;
		cursor: pointer;
		transition:
			color 0.15s,
			background 0.15s;
	}
	.mobile-tab-btn:hover {
		color: rgba(255, 255, 255, 0.7);
	}
	.mobile-tab-btn.active {
		color: #b7cdff;
		background: rgba(74, 125, 255, 0.1);
	}

	/* On mobile, overlay the files/frameworks side panel so it doesn't squeeze
	   the active pane. Offsets match the page header (h-10), icon rail (w-10)
	   and mobile tab bar below. */
	@media (max-width: 768px) {
		.body-wrap.is-mobile .side-panel {
			position: fixed;
			top: 2.5rem;
			bottom: calc(44px + env(safe-area-inset-bottom));
			left: 2.5rem;
			z-index: 30;
			box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
		}
		/* Hide the now-meaningless drag divider next to the floating panel */
		.body-wrap.is-mobile .side-panel + .divider {
			display: none;
		}
	}
</style>
