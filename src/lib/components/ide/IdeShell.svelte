<script lang="ts">
	import { onDestroy, onMount, tick, untrack } from 'svelte';
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
	import { installLeaveGuard } from '$lib/stores/leaveWarning.svelte';
	import { startDrag } from '$lib/utils/drag';
	import { podBlocker, type PodBlocker } from '$lib/utils/platform';
	import PodBlockerOverlay from '$lib/components/PodBlockerOverlay.svelte';
	import { FULL_SHELL, type ShellOptions } from '$lib/ide/shell-options';
	import { watchIsMobile } from '$lib/utils/viewport';
	import { bugReportUrl } from '$lib/utils/bug-report';
	import { trackEvent } from '$lib/utils/useLazyTracking';
	import ZenToggle from '$lib/components/ZenToggle.svelte';
	import { zenState } from '$lib/stores/zen.svelte';

	// Which boot-log line is the *active* (spinning) one for each real stage.
	const STAGE_LINE: Record<BootStage, number> = {
		booting: 0,
		hydrating: 1,
		installing: 2,
		starting: 3
	};

	// The route picks the project source, so the shell never learns how the project arrived.
	// `shell` narrows which parts render; the playground omits it and gets the lot.
	let { session, shell = FULL_SHELL }: { session: IdeSession; shell?: ShellOptions } = $props();

	let hasRail = $derived(shell.fileTree || shell.search || shell.tools);
	let hasLeftColumn = $derived(shell.editor || shell.terminal);
	/** Nothing to collapse into when the preview is the only pane. */
	let collapsiblePreview = $derived(shell.preview && hasLeftColumn);

	// Only the hydrate step differs per source.
	let bootLines = $derived([
		'booting BrowserPod',
		session.source.hydrateLabel,
		'installing dependencies',
		'starting dev server'
	]);

	let blocker = $state<PodBlocker | null>(null);
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

	// Seeded once, deliberately: the route builds `shell` before mount and never swaps it.
	let activePanel = $state<'files' | 'search' | null>(
		untrack(() => (shell.fileTree ? 'files' : shell.search ? 'search' : null))
	);
	let fileTree = $state<{ startCreate: (kind: 'file' | 'folder') => void } | null>(null);

	// ── Mobile state ──────────────────────────────────────────────────────────
	let isMobile = $state(false);
	let activeMobileView = $state<'editor' | 'terminal' | 'preview'>(
		untrack(() => (shell.editor ? 'editor' : shell.terminal ? 'terminal' : 'preview'))
	);
	// One pane needs no tab bar.
	let mobileTabs = $derived(
		[
			{ id: 'editor', label: 'Editor', icon: 'mingcute:code-line', shown: shell.editor },
			{ id: 'terminal', label: 'Terminal', icon: 'mingcute:terminal-line', shown: shell.terminal },
			{ id: 'preview', label: 'Preview', icon: 'mingcute:eye-2-line', shown: shell.preview }
		].filter((tab) => tab.shown)
	);

	// A source with a declared app port keeps the preview pinned to it; other
	// ports stay reachable through the toolbar's port menu.
	const portal = new PortalState({ preferredPort: () => session.source.appPort });

	let isPreviewVisible = $state(true);
	let previewCollapsed = $derived(!isPreviewVisible && !isMobile);

	/** Collapses to the stub without unmounting: a remount would lose the previewed app's route. */
	function togglePreview(): void {
		isPreviewVisible = !isPreviewVisible;
		// xterm only refits on a resize event.
		setTimeout(() => fitTerminals(), 0);
	}

	// Recomputed as the preview moves ports, so a report always carries the live portal URL.
	let bugReportHref = $derived(bugReportUrl({ repo: session.source.repo, previewUrl: portal.url }));

	// Live once the framed document loaded, so the loader covers the server's start and first paint.
	let previewLive = $derived(portal.frameStatus === 'ready');
	let loaderVisible = $state(true);
	$effect(() => {
		if (!previewLive) loaderVisible = true;
	});

	let activeLine = $derived(STAGE_LINE[session.bootStage]);

	/** Editor floor, so dragging the terminal up leaves a usable strip of it. */
	const MIN_EDITOR_FRACTION = 0.1;
	const MAX_EDITOR_FRACTION = 0.85;

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

	function startPaneDrag(which: 'file' | 'col' | 'row', event: MouseEvent) {
		dragging = which;
		const startFileW = filePanelWidth;
		const startEditorFrac = editorFraction;
		const startLeftW = leftColEl?.clientWidth ?? 0;
		const startLeftH = leftColEl?.clientHeight ?? 0;
		// 40px = icon rail width
		const startTotalW = bodyEl
			? bodyEl.clientWidth - (hasRail ? 40 : 0) - (activePanel ? filePanelWidth : 0)
			: 1;

		startDrag(event, {
			cursor: which === 'row' ? 'row-resize' : 'col-resize',
			move: (dx, dy, stop) => {
				if (which === 'file') {
					const requested = startFileW + dx;
					if (requested < 100) {
						// Dragged shut — collapse the panel instead of pinning to min width
						activePanel = null;
						stop();
						return;
					}
					filePanelWidth = Math.max(140, Math.min(480, requested));
				} else if (which === 'col') {
					leftColFraction = Math.max(0.25, Math.min(0.8, (startLeftW + dx) / startTotalW));
				} else if (which === 'row') {
					editorFraction = Math.max(
						MIN_EDITOR_FRACTION,
						Math.min(MAX_EDITOR_FRACTION, (startLeftH * startEditorFrac + dy) / startLeftH)
					);
				}
				fitTerminals();
			},
			end: () => (dragging = null)
		});
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
	onMount(() => (shell.leaveGuard ? installLeaveGuard() : undefined));

	onMount(async () => {
		blocker = podBlocker();
		if (blocker) {
			session.loading = false;
			return;
		}
		await tick();
		if (!outputEl) throw new Error('Terminal container is not ready yet');
		try {
			await session.boot(outputEl, portal.apply);
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

<div
	class="bc-page-bg relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden text-bc-mist"
>
	<!-- Covers the shell, not the preview pane, which an embed may not render. -->
	{#if blocker}
		<PodBlockerOverlay {blocker} />
	{/if}

	<!-- ── Top bar ─────────────────────────────────────────────────────────── -->
	{#if shell.header}
		<header
			class="flex h-10 shrink-0 items-center justify-between border-b border-bc-border bg-bc-navy px-3"
		>
			<div class="flex min-w-0 items-center gap-2 text-[11px] text-bc-text-muted">
				<!-- Switching projects happens by navigating away (sidebar Ide flyout or an /ide/github URL). -->
				<span class="truncate text-bc-text">{session.source.label}</span>
				{#if session.selectedFile}
					<span class="text-bc-icon">/</span>
					<span class="truncate text-bc-text">{session.selectedFile}</span>
				{/if}
				{#if session.isSaving}
					<span class="ml-1 shrink-0 text-bc-mist/70">saving…</span>
				{/if}
			</div>
		</header>
	{/if}

	<!-- ── Body ────────────────────────────────────────────────────────────── -->
	<div
		class="body-wrap flex min-h-0 flex-1 overflow-hidden"
		class:is-mobile={isMobile}
		bind:this={bodyEl}
	>
		<!-- Icon rail: panel navigators anchor to the top, global view toggles to the bottom. -->
		{#if hasRail}
			<aside class="flex w-10 shrink-0 flex-col border-r border-bc-border bg-bc-navy">
				<div class="flex flex-col gap-0.5 p-1 pt-2">
					{#if shell.fileTree}
						<button
							onclick={() => (activePanel = activePanel === 'files' ? null : 'files')}
							class="flex items-center justify-center rounded p-1.5 transition {activePanel ===
							'files'
								? 'bg-bc-azure/15 text-bc-azure'
								: 'text-bc-icon hover:bg-bc-tint/5 hover:text-bc-text'}"
							title="Files"
						>
							<Icon icon="mingcute:file-line" width="18" height="18" />
						</button>
					{/if}
					{#if shell.search}
						<button
							onclick={() => (activePanel = activePanel === 'search' ? null : 'search')}
							class="flex items-center justify-center rounded p-1.5 transition {activePanel ===
							'search'
								? 'bg-bc-azure/15 text-bc-azure'
								: 'text-bc-icon hover:bg-bc-tint/5 hover:text-bc-text'}"
							title="Search"
						>
							<Icon icon="mingcute:search-line" width="18" height="18" />
						</button>
					{/if}
				</div>
				{#if shell.tools}
					<div class="mt-auto flex flex-col gap-0.5 p-1 pb-2">
						<SettingsMenu
							baseClass="flex w-full items-center justify-center rounded p-1.5 transition"
							activeClass="bg-bc-azure/15 text-bc-azure"
							idleClass="text-bc-icon hover:bg-bc-tint/5 hover:text-bc-text"
						/>
						<!-- The tracker is an external URL, so resolve() does not apply here. -->
						<!-- eslint-disable svelte/no-navigation-without-resolve -->
						<a
							href={bugReportHref}
							target="_blank"
							rel="noopener noreferrer"
							title="Report a bug"
							aria-label="Report a bug"
							onclick={() => trackEvent('Clicked Report Bug', { mode: session.source.id })}
							class="flex items-center justify-center rounded p-1.5 text-bc-icon transition hover:bg-bc-coral/10 hover:text-bc-coral"
						>
							<Icon icon="mingcute:bug-line" width="18" height="18" />
						</a>
						<!-- eslint-enable svelte/no-navigation-without-resolve -->
						<ZenToggle
							baseClass="flex items-center justify-center rounded p-1.5 transition"
							activeClass="bg-bc-azure/15 text-bc-azure"
							idleClass="text-bc-icon hover:bg-bc-tint/5 hover:text-bc-text"
						/>
					</div>
				{/if}
			</aside>
		{/if}

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
					<div class="flex items-center justify-between border-b border-bc-border px-3 py-1.5">
						<span class="text-[10px] font-medium tracking-widest text-bc-icon uppercase">
							Project files
						</span>
						<div class="flex items-center gap-0.5">
							<button
								type="button"
								title="New file"
								disabled={!session.podReady}
								onclick={() => fileTree?.startCreate('file')}
								class="rounded p-1 text-bc-icon transition hover:bg-bc-tint/5 hover:text-bc-text disabled:pointer-events-none disabled:opacity-40"
							>
								<Icon icon="mingcute:file-new-line" width="13" height="13" />
							</button>
							<button
								type="button"
								title="New folder"
								disabled={!session.podReady}
								onclick={() => fileTree?.startCreate('folder')}
								class="rounded p-1 text-bc-icon transition hover:bg-bc-tint/5 hover:text-bc-text disabled:pointer-events-none disabled:opacity-40"
							>
								<Icon icon="mingcute:new-folder-line" width="13" height="13" />
							</button>
							<button
								type="button"
								title={downloading ? 'Zipping project…' : 'Download this project as a zip'}
								disabled={!session.podReady || downloading}
								onclick={handleDownload}
								class="rounded p-1 text-bc-icon transition hover:bg-bc-tint/5 hover:text-bc-text disabled:pointer-events-none disabled:opacity-40"
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
					<div class="flex items-center border-b border-bc-border px-3 py-1.5">
						<span class="text-[10px] font-medium tracking-widest text-bc-icon uppercase">
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
				onmousedown={(e) => startPaneDrag('file', e)}
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
				class:pane-hidden={!hasLeftColumn ||
					(isMobile && activeMobileView !== 'editor' && activeMobileView !== 'terminal')}
				bind:this={leftColEl}
				style={isMobile
					? 'width: 100%;'
					: previewCollapsed || !shell.preview
						? 'flex: 1 1 0; min-width: 0;'
						: `width: ${leftColFraction * 100}%;`}
			>
				<div
					class:pane-hidden={!shell.editor || (isMobile && activeMobileView !== 'editor')}
					style={isMobile ? 'height: 100%; flex-shrink: 0;' : 'flex: 1 1 0; min-height: 0;'}
				>
					<EditorPane {session} />
				</div>

				<!-- Divider: editor / terminal -->
				{#if !isMobile && shell.editor && shell.terminal}
					<button
						type="button"
						class="divider divider-row"
						class:active={dragging === 'row'}
						onmousedown={(e) => startPaneDrag('row', e)}
						aria-label="Resize terminal panel"
					>
						<div class="divider-line"></div>
					</button>
				{/if}

				<!-- Kept mounted when hidden: the boot attaches the pod's terminal to `outputEl`. -->
				<div
					class:pane-hidden={!shell.terminal || (isMobile && activeMobileView !== 'terminal')}
					style={isMobile
						? 'flex: 1 1 0; min-height: 0; height: 100%;'
						: shell.editor
							? `flex: 0 0 auto; height: ${(1 - editorFraction) * 100}%; min-height: 0;`
							: 'flex: 1 1 0; min-height: 0;'}
				>
					<TerminalTabs {session} bind:outputEl />
				</div>
			</div>

			<!-- Divider: editor column / preview -->
			{#if !isMobile && isPreviewVisible && collapsiblePreview}
				<button
					type="button"
					class="divider divider-col"
					class:active={dragging === 'col'}
					onmousedown={(e) => startPaneDrag('col', e)}
					aria-label="Resize preview panel"
				>
					<div class="divider-line"></div>
				</button>
			{/if}

			<!-- Right column: preview -->
			{#if shell.preview}
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
							class="flex h-full w-7 shrink-0 flex-col items-center gap-2.5 border-l border-bc-border bg-bc-navy py-1.5 text-bc-text-muted transition hover:bg-bc-tint/5 hover:text-bc-text"
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
						{#if portal.portals.length > 0}
							<Portal
								{portal}
								onBeforeReload={() => session.saveAll()}
								onCollapse={isMobile || !collapsiblePreview ? undefined : togglePreview}
								showPort={hasLeftColumn}
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
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- ── Mobile tab bar ──────────────────────────────────────────────────── -->
	{#if isMobile && mobileTabs.length > 1}
		<nav
			class="flex shrink-0 items-stretch border-t border-bc-border bg-bc-navy"
			style="height: calc(44px + env(safe-area-inset-bottom)); padding-bottom: env(safe-area-inset-bottom);"
		>
			{#each mobileTabs as tab (tab.id)}
				<button
					onclick={() => (activeMobileView = tab.id as 'editor' | 'terminal' | 'preview')}
					class="mobile-tab-btn"
					class:active={activeMobileView === tab.id}
				>
					<Icon icon={tab.icon} width="16" height="16" />
					<span>{tab.label}</span>
				</button>
			{/each}
		</nav>
	{/if}
</div>

<style>
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
		color: var(--color-bc-icon);
		font-size: 10px;
		font-weight: 500;
		cursor: pointer;
		transition:
			color 0.15s,
			background 0.15s;
	}
	.mobile-tab-btn:hover {
		color: var(--color-bc-text);
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
