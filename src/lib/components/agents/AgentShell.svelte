<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import type { AgentSession } from '$lib/agents/session.svelte';
	import Portal from '$lib/components/Portal.svelte';
	import Terminal from '$lib/components/Terminal.svelte';
	import ZenToggle from '$lib/components/ZenToggle.svelte';
	import { openTour } from '$lib/stores/stepper.svelte';
	import { PortalState } from '$lib/stores/portals.svelte';
	import { zenState } from '$lib/stores/zen.svelte';
	import { startDrag } from '$lib/utils/drag';
	import { watchIsMobile } from '$lib/utils/viewport';
	import CredentialGateOverlay from './CredentialGateOverlay.svelte';
	import TerminalTip from './TerminalTip.svelte';
	import ToolMenuSheet from './ToolMenuSheet.svelte';

	let { session }: { session: AgentSession } = $props();

	/** The div the pod's terminal attaches to, rendered by Terminal.svelte. */
	let consoleEl = $state<HTMLElement | null>(null);
	let containerEl = $state<HTMLElement | null>(null);

	let isPortalVisible = $state(true);
	let portalFraction = $state(0.5);
	let isDragging = $state(false);

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
	let tipDismissed = $state(false);
	// Shown on every boot, not just the first ever visit, but not in a tab that booted nothing.
	let showTerminalTip = $derived(session.lock === 'held' && !tipDismissed);

	function startPortalDrag(event: MouseEvent): void {
		isDragging = true;
		const startFrac = portalFraction;
		const totalW = containerEl?.clientWidth ?? 1;

		startDrag(event, {
			cursor: 'col-resize',
			// The pane is anchored right, so a rightward drag shrinks it.
			move: (dx) => {
				portalFraction = Math.max(0.2, Math.min(0.8, startFrac - dx / totalW));
			},
			end: () => (isDragging = false)
		});
	}

	// Any keypress means they've already found the terminal. Guarded, so one that lands while the
	// tab lock is still pending does not dismiss a tip that has yet to appear.
	function dismissTerminalTip(): void {
		if (showTerminalTip) tipDismissed = true;
	}

	function selectTool(id: string): void {
		session.switchTo(id);
		showToolMenu = false;
	}

	onMount(() => {
		const unwatchIsMobile = watchIsMobile((mobile) => (isMobile = mobile));

		if (consoleEl) session.boot(consoleEl, portal.apply);
		else console.error('Terminal container is not ready yet');

		return () => {
			// Never leave the global chrome hidden after navigating away from an agent session.
			zenState.on = false;
			unwatchIsMobile();
			portal.dispose();
			session.shutdown();
		};
	});
</script>

<svelte:window onkeydown={dismissTerminalTip} />

<div class="relative min-h-0 flex-1 overflow-hidden" bind:this={containerEl}>
	<!-- Hidden, never unmounted: the pod attaches its terminal to this div for the session's life. -->
	<div class="absolute inset-0 bg-black" class:hidden={isMobile && activeMobileView !== 'terminal'}>
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

	<!-- The env-bound secret can only change via a relaunch, so the way in is always here. -->
	{#if session.gate && session.credential}
		<button
			onclick={session.gate.openChange}
			aria-label={session.credential.label}
			title={session.credential.label}
			class="absolute bottom-4 z-30 flex items-center justify-center rounded-lg border border-white/10 bg-black/40 p-2 text-white/40 backdrop-blur-sm transition hover:bg-black/60 hover:text-white/70 {isMobile
				? 'left-4'
				: 'left-16'}"
		>
			<Icon icon="mingcute:key-2-line" width="18" height="18" />
		</button>

		{#if session.gate.overlayVisible}
			<CredentialGateOverlay
				gate={session.gate}
				tool={session.tool}
				credential={session.credential}
				onRestart={session.restart}
				onCancel={session.leave}
			/>
		{/if}
	{/if}

	<!-- Non-blocking tip -->
	{#if showTerminalTip && !(isMobile && activeMobileView !== 'terminal')}
		<TerminalTip onDismiss={dismissTerminalTip} />
	{/if}

	{#if !isMobile && portal.portals.length > 0 && isPortalVisible}
		<button
			class="group absolute top-0 bottom-0 z-20 w-1.25 cursor-col-resize"
			style="right: calc({portalFraction * 100}% - 0.625rem);"
			onmousedown={startPortalDrag}
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
			<Portal {portal} />
		</div>
	{:else if isMobile && portal.portals.length > 0 && activeMobileView === 'preview'}
		<div class="absolute inset-0 overflow-hidden">
			<Portal {portal} />
		</div>
	{/if}
</div>

{#if isMobile}
	{#if showToolMenu}
		<ToolMenuSheet
			activeId={session.id}
			onSelect={selectTool}
			onClose={() => (showToolMenu = false)}
		/>
	{/if}

	<nav
		class="flex shrink-0 items-stretch border-t border-white/8 bg-[#0e0e0e]"
		style="height: calc(52px + env(safe-area-inset-bottom)); padding-bottom: env(safe-area-inset-bottom);"
	>
		<button
			onclick={() => (showToolMenu = !showToolMenu)}
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
