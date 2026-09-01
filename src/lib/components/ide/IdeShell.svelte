<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import Icon from '@iconify/svelte';
	import Portal from '$lib/components/Portal.svelte';
	import EditorPane from '$lib/components/ide/EditorPane.svelte';
	import FileTreePanel from '$lib/components/ide/FileTreePanel.svelte';
	import SearchPanel from '$lib/components/ide/SearchPanel.svelte';
	import TerminalTabs from '$lib/components/ide/TerminalTabs.svelte';
	import LoadingScene from '$lib/components/ide/LoadingScene.svelte';
	import SettingsMenu from '$lib/components/ide/SettingsMenu.svelte';
	import { fade } from 'svelte/transition';
	import type { BootStage, IdeSession } from '$lib/ide/session.svelte';
	import { downloadProject } from '$lib/ide/download';
	import { PortalState } from '$lib/stores/portals.svelte';
	import type { PortalUpdate } from '$lib/pod/portals';
	import { installLeaveGuard } from '$lib/stores/leaveWarning.svelte';
	import { watchIsMobile } from '$lib/utils/viewport';
	import { bugReportUrl } from '$lib/utils/bug-report';
	import { trackEvent } from '$lib/utils/useLazyTracking';
	import ZenToggle from '$lib/components/ZenToggle.svelte';
	import { zenState } from '$lib/stores/zen.svelte';

	// Boot-log lines the preview loader streams, per boot mode.
	const BOOT_LOG: Record<'framework' | 'github', string[]> = {
		framework: [
			'booting BrowserPod',
			'copying project files',
			'installing dependencies',
			'starting dev server'
		],
		github: [
			'booting BrowserPod',
			'cloning repository',
			'installing dependencies',
			'starting dev server'
		]
	};
	// Which boot-log line is the *active* (spinning) one for each real stage.
	const STAGE_LINE: Record<BootStage, number> = {
		booting: 0,
		copying: 1,
		cloning: 1,
		installing: 2,
		starting: 3
	};

	// The route owns the session and decides how it boots (curated framework vs GitHub clone);
	// the shell is mode-agnostic — it just drives `boot` once the terminals are mounted and
	// renders from session state. Switching projects happens by navigating away (the sidebar's
	// Ide flyout or an /ide/github URL), not from here.
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
	let downloading = $state(false);

	async function handleDownload() {
		if (downloading || !session.podReady) return;
		downloading = true;
		try {
			await downloadProject(session);
		} catch (error) {
			console.error('Failed to download project:', error);
		} finally {
			downloading = false;
		}
	}

	let activePanel = $state<'files' | 'search' | null>('files');
	let fileTree = $state<{ startCreate: (kind: 'file' | 'folder') => void } | null>(null);

	// ── Mobile state ──────────────────────────────────────────────────────────
	let isMobile = $state(false);
	let activeMobileView = $state<'editor' | 'terminal' | 'preview'>('editor');

	// Frameworks with a declared app port keep the preview pinned to it; other
	// ports stay reachable through the toolbar's port menu.
	const portal = new PortalState({ preferredPort: () => session.appPort });

	let isPreviewVisible = $state(true);
	let previewCollapsed = $derived(!isPreviewVisible && !isMobile);

	/** Collapses to the stub without unmounting: a remount would lose the previewed app's route. */
	function togglePreview(): void {
		isPreviewVisible = !isPreviewVisible;
		// xterm only refits on a resize event.
		setTimeout(() => fitTerminals(), 0);
	}

	// Recomputed as the preview moves ports, so a report always carries the live portal URL.
	let bugReportHref = $derived(bugReportUrl({ repo: session.repo, previewUrl: portal.url }));

	// Live once the framed document loaded, so the loader covers the server's start and first paint.
	let previewLive = $derived(portal.frameStatus === 'ready');
	let loaderVisible = $state(true);
	$effect(() => {
		if (!previewLive) loaderVisible = true;
	});

	let bootLines = $derived(BOOT_LOG[session.mode]);
	let activeLine = $derived(STAGE_LINE[session.bootStage]);

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

	// ── Mobile detection ──────────────────────────────────────────────────────
	onMount(() =>
		watchIsMobile((mobile) => {
			isMobile = mobile;
			// Close the side panel by default on mobile so it doesn't cover the view
			if (isMobile && activePanel) activePanel = null;
		})
	);

	$effect(() => {
		if (activeMobileView === 'terminal') {
			setTimeout(() => fitTerminals(), 0);
		}
	});

	// ── Boot ──────────────────────────────────────────────────────────────────
	// Catches tab close/refresh/back-forward while a pod is running here.
	onMount(() => installLeaveGuard());

	onMount(async () => {
		if (typeof Atomics?.waitAsync !== 'function') {
			isCompatibleBrowser = false;
			session.loading = false;
			return;
		}
		await tick();
		if (!outputEl) throw new Error('Terminal container is not ready yet');
		try {
			await boot(outputEl, portal.apply);
		} catch (error) {
			console.error('Failed initializing BrowserPod:', error);
			session.loading = false;
		}
	});

	onDestroy(() => {
		// Never leave the global chrome hidden after navigating away from /ide.
		zenState.on = false;
		portal.dispose();
		session.shutdown();
	});
</script>

<div class="bc-page-bg flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden text-zinc-300">
	<!-- ── Top bar ─────────────────────────────────────────────────────────── -->
	<header
		class="flex h-10 shrink-0 items-center justify-between border-b border-bc-mist/10 bg-bc-navy px-3"
	>
		<div class="flex min-w-0 items-center gap-2 text-[11px] text-white/40">
			<!-- Switching projects happens by navigating away (sidebar Ide flyout or an /ide/github URL). -->
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
		<!-- Icon rail: panel navigators anchor to the top, global view toggles to the bottom. -->
		<aside class="flex w-10 shrink-0 flex-col border-r border-bc-mist/10 bg-bc-navy">
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
				<button
					onclick={() => (activePanel = activePanel === 'search' ? null : 'search')}
					class="flex items-center justify-center rounded p-1.5 transition {activePanel === 'search'
						? 'bg-bc-azure/15 text-bc-azure'
						: 'text-zinc-600 hover:bg-white/5 hover:text-zinc-300'}"
					title="Search"
				>
					<Icon icon="mingcute:search-line" width="18" height="18" />
				</button>
			</div>
			<div class="mt-auto flex flex-col gap-0.5 p-1 pb-2">
				<SettingsMenu
					baseClass="flex w-full items-center justify-center rounded p-1.5 transition"
					activeClass="bg-bc-azure/15 text-bc-azure"
					idleClass="text-zinc-600 hover:bg-white/5 hover:text-zinc-300"
				/>
				<!-- The tracker is an external URL, so resolve() does not apply here. -->
				<!-- eslint-disable svelte/no-navigation-without-resolve -->
				<a
					href={bugReportHref}
					target="_blank"
					rel="noopener noreferrer"
					title="Report a bug"
					aria-label="Report a bug"
					onclick={() => trackEvent('Clicked Report Bug', { mode: session.mode })}
					class="flex items-center justify-center rounded p-1.5 text-zinc-600 transition hover:bg-bc-coral/10 hover:text-bc-coral"
				>
					<Icon icon="mingcute:bug-line" width="18" height="18" />
				</a>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
				<ZenToggle
					baseClass="flex items-center justify-center rounded p-1.5 transition"
					activeClass="bg-bc-azure/15 text-bc-azure"
					idleClass="text-zinc-600 hover:bg-white/5 hover:text-zinc-300"
				/>
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

		<!-- Side panel: files or search -->
		{#if activePanel}
			<div
				class="side-panel flex shrink-0 flex-col bg-bc-navy"
				style="width: {isMobile ? 240 : filePanelWidth}px;"
			>
				{#if activePanel === 'files'}
					<div class="flex items-center justify-between border-b border-bc-mist/10 px-3 py-1.5">
						<span class="text-[10px] font-medium tracking-widest text-zinc-600 uppercase">
							Project files
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
							<button
								type="button"
								title={downloading ? 'Zipping project…' : 'Download this project as a zip'}
								disabled={!session.podReady || downloading}
								onclick={handleDownload}
								class="rounded p-1 text-zinc-600 transition hover:bg-white/5 hover:text-zinc-300 disabled:pointer-events-none disabled:opacity-40"
							>
								<Icon
									icon={downloading ? 'mingcute:loading-line' : 'mingcute:download-line'}
									class={downloading ? 'animate-spin' : ''}
									width="13"
									height="13"
								/>
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
				{:else if activePanel === 'search'}
					<div class="flex items-center border-b border-bc-mist/10 px-3 py-1.5">
						<span class="text-[10px] font-medium tracking-widest text-zinc-600 uppercase">
							Search
						</span>
					</div>
					<div class="min-h-0 flex-1">
						<SearchPanel {session} onFileOpen={() => isMobile && (activePanel = null)} />
					</div>
				{/if}
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
				class:pane-hidden={isMobile &&
					activeMobileView !== 'editor' &&
					activeMobileView !== 'terminal'}
				bind:this={leftColEl}
				style={isMobile
					? 'width: 100%;'
					: previewCollapsed
						? 'flex: 1 1 0; min-width: 0;'
						: `width: ${leftColFraction * 100}%;`}
			>
				<div
					class:pane-hidden={isMobile && activeMobileView !== 'editor'}
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
					class:pane-hidden={isMobile && activeMobileView !== 'terminal'}
					style={isMobile
						? 'flex: 1 1 0; min-height: 0; height: 100%;'
						: `flex: 0 0 auto; height: ${(1 - editorFraction) * 100}%; max-height: 600px; min-height: 0;`}
				>
					<TerminalTabs {session} bind:outputEl />
				</div>
			</div>

			<!-- Divider: editor column / preview -->
			{#if !isMobile && isPreviewVisible}
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
				class="relative flex min-h-0 min-w-0 flex-col"
				class:pane-hidden={isMobile && activeMobileView !== 'preview'}
				class:pointer-events-none={dragging !== null}
				style={isMobile
					? 'width: 100%; height: 100%;'
					: previewCollapsed
						? 'flex: 0 0 1.75rem;'
						: 'flex: 1 1 0;'}
			>
				{#if previewCollapsed}
					<button
						onclick={togglePreview}
						title="Show preview"
						aria-label="Show preview"
						class="flex h-full w-7 shrink-0 flex-col items-center gap-2.5 border-l border-bc-mist/10 bg-bc-navy py-1.5 text-white/40 transition hover:bg-white/5 hover:text-white/80"
					>
						<Icon icon="mingcute:left-line" width="13" height="13" />
						{#if portal.selectedPort !== null}
							<span
								class="font-mono text-[10px] tracking-wider tabular-nums [writing-mode:vertical-rl]"
								>port {portal.selectedPort}</span
							>
						{/if}
					</button>
				{/if}

				<div class="relative flex min-h-0 flex-1 flex-col" class:pane-hidden={previewCollapsed}>
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
						{#if portal.portals.length > 0}
							<Portal
								{portal}
								onBeforeReload={() => session.saveAll()}
								onCollapse={isMobile ? undefined : togglePreview}
							/>
						{/if}
						<!-- Loader overlays the preview column, then cross-dissolves out into the iframe. -->
						{#if loaderVisible}
							<div class="absolute inset-0 z-30" out:fade={{ duration: 460 }}>
								<LoadingScene
									lines={bootLines}
									{activeLine}
									flash={previewLive}
									onFlashComplete={() => (loaderVisible = false)}
								/>
							</div>
						{/if}
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- ── Mobile tab bar ──────────────────────────────────────────────────── -->
	{#if isMobile}
		<nav
			class="flex shrink-0 items-stretch border-t border-bc-mist/10 bg-bc-navy"
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
		background: color-mix(in srgb, var(--color-bc-mist) 10%, transparent);
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
		background: color-mix(in srgb, var(--color-bc-azure) 50%, transparent);
	}

	/* ── Mobile ────────────────────────────────────────────────────────────── */
	/* Keep hidden panes mounted (terminals/iframes need persistent DOM) but
	   take them out of layout so the visible panes fill the space. */
	.pane-hidden {
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
		color: var(--color-bc-mist);
		background: color-mix(in srgb, var(--color-bc-azure) 10%, transparent);
	}

	/* On mobile, overlay the files side panel so it doesn't squeeze
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
