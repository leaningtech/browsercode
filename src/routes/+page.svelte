<script lang="ts">
	import Terminal from '$lib/components/Terminal.svelte';
	import Portal from '$lib/components/Portal.svelte';

	import { onMount } from 'svelte';
	import { bootCLI } from '$lib/utils/main';

	let portalUrl: string | '' = '';
	let portalDebug = true;

	let containerEl: HTMLDivElement | null = null;
	let isDragging = false;
	let portalWidthPercent = 50;

	const MIN_PORTAL_PERCENT = 20;
	const MAX_PORTAL_PERCENT = 80;

	function clamp(value: number, min: number, max: number) {
		return Math.min(max, Math.max(min, value));
	}

	function setPortalWidthFromClientX(clientX: number) {
		if (!containerEl) return;

		const rect = containerEl.getBoundingClientRect();
		if (rect.width <= 0) return;

		const leftWidth = clientX - rect.left;
		const leftPercent = (leftWidth / rect.width) * 100;
		const nextPortalPercent = 100 - leftPercent;

		portalWidthPercent = clamp(nextPortalPercent, MIN_PORTAL_PERCENT, MAX_PORTAL_PERCENT);
	}

	function onDividerPointerDown(event: PointerEvent) {
		if (!portalUrl && !portalDebug) return;
		event.preventDefault();
		isDragging = true;
		(event.currentTarget as HTMLElement)?.setPointerCapture?.(event.pointerId);
		setPortalWidthFromClientX(event.clientX);
	}

	function onWindowPointerMove(event: PointerEvent) {
		if (!isDragging) return;
		setPortalWidthFromClientX(event.clientX);
	}

	function stopDragging() {
		isDragging = false;
	}

	onMount(() => {
		bootCLI((url) => {
			portalUrl = url;
		});

		window.addEventListener('pointermove', onWindowPointerMove);
		window.addEventListener('pointerup', stopDragging);
		window.addEventListener('pointercancel', stopDragging);

		return () => {
			window.removeEventListener('pointermove', onWindowPointerMove);
			window.removeEventListener('pointerup', stopDragging);
			window.removeEventListener('pointercancel', stopDragging);
		};
	});
</script>

<div bind:this={containerEl} class="flex h-full min-h-0 w-full min-w-0 flex-row">
	<div
		class="min-h-0 min-w-0 overflow-hidden bg-black"
		style={`width: ${portalUrl || portalDebug ? 100 - portalWidthPercent : 100}%`}
	>
		<Terminal />
	</div>

	<div
		class="relative min-h-0 min-w-0 overflow-hidden border-l border-zinc-700 transition-opacity duration-300 ease-in-out"
		class:opacity-100={!!portalUrl || portalDebug}
		class:opacity-0={!portalUrl && !portalDebug}
		class:pointer-events-none={!portalUrl && !portalDebug}
		style={`width: ${portalUrl || portalDebug ? portalWidthPercent : 0}%`}
	>
		<div
			class="absolute top-0 -left-1 z-20 h-full w-2 transition-all duration-200 ease-out select-none"
			class:cursor-col-resize={!!portalUrl || portalDebug}
			class:pointer-events-auto={!!portalUrl || portalDebug}
			class:pointer-events-none={!portalUrl && !portalDebug}
			on:pointerdown={onDividerPointerDown}
			role="separator"
			aria-label="Resize terminal and portal panels"
			aria-orientation="vertical"
			tabindex="-1"
		></div>

		{#if portalUrl}
			<Portal src={portalUrl} />
		{:else if portalDebug}
			<div class="flex h-full w-full items-center justify-center text-xs text-zinc-400">
				Portal debug mode (no URL)
			</div>
		{/if}
	</div>
</div>
