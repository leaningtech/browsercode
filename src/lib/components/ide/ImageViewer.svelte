<script lang="ts">
	import Icon from '@iconify/svelte';
	import { formatBytes, type ImagePayload } from '$lib/ide/media';

	let { path, image }: { path: string; image: ImagePayload } = $props();

	const ZOOM_STEPS = [0.05, 0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8, 12, 16];
	/** The frame's `p-6`, both sides; the fit scale has to leave room for it. */
	const FRAME_PADDING = 48;

	let natural = $state<{ width: number; height: number } | null>(null);
	let failed = $state(false);
	/** Explicit zoom factor; null means fit-to-frame. */
	let zoom = $state<number | null>(null);
	let frameWidth = $state(0);
	let frameHeight = $state(0);

	// One instance serves every image tab, so a new blob must not inherit the last one's readout.
	$effect(() => {
		void image.url;
		natural = null;
		failed = false;
		zoom = null;
	});

	// Shrinks to fit but never upscales, so a favicon stays its own size until zoomed.
	let fitScale = $derived(
		natural && frameWidth && frameHeight
			? Math.min(
					1,
					(frameWidth - FRAME_PADDING) / natural.width,
					(frameHeight - FRAME_PADDING) / natural.height
				)
			: 1
	);
	let scale = $derived(zoom ?? fitScale);
	let canZoomIn = $derived(scale < ZOOM_STEPS[ZOOM_STEPS.length - 1]);
	let canZoomOut = $derived(scale > ZOOM_STEPS[0]);

	function onLoad(event: Event): void {
		const img = event.currentTarget as HTMLImageElement;
		natural = { width: img.naturalWidth, height: img.naturalHeight };
	}

	/** Steps to the next ladder rung past the current scale, so zooming works out of fit too. */
	function stepZoom(direction: 1 | -1): void {
		const next =
			direction > 0
				? ZOOM_STEPS.find((step) => step > scale + 0.001)
				: ZOOM_STEPS.findLast((step) => step < scale - 0.001);
		if (next !== undefined) zoom = next;
	}
</script>

<div class="flex h-full min-h-0 flex-col bg-bc-abyss">
	<div
		class="checkerboard relative min-h-0 flex-1 overflow-auto"
		bind:clientWidth={frameWidth}
		bind:clientHeight={frameHeight}
	>
		{#if failed}
			<div class="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
				<Icon icon="mingcute:pic-line" width="20" height="20" class="text-white/20" />
				<span class="text-[11px] text-white/35">This image could not be displayed</span>
			</div>
		{:else}
			<!-- `w-max` keeps the far padding inside the scroll area; auto margins centre the image
			     while there is room and collapse to 0 once it overflows, so nothing is unreachable. -->
			<div class="flex min-h-full w-max min-w-full p-6">
				<img
					src={image.url}
					alt={path}
					onload={onLoad}
					onerror={() => (failed = true)}
					class:pixelated={scale > 1}
					class={natural ? 'm-auto' : 'm-auto max-h-full max-w-full object-contain'}
					style={natural
						? `width: ${Math.round(natural.width * scale)}px; height: ${Math.round(natural.height * scale)}px;`
						: ''}
				/>
			</div>
		{/if}
	</div>
	<footer
		class="flex h-7 shrink-0 items-center gap-3 border-t border-bc-mist/10 bg-bc-navy px-3 text-[10px] text-white/40"
	>
		{#if natural}
			<span class="tabular-nums">{natural.width} &times; {natural.height}</span>
		{/if}
		<span class="tabular-nums">{formatBytes(image.bytes)}</span>
		{#if natural && !failed}
			<div class="ml-auto flex items-center gap-0.5">
				<button
					type="button"
					onclick={() => stepZoom(-1)}
					disabled={!canZoomOut}
					title="Zoom out"
					aria-label="Zoom out"
					class="zoom-btn"
				>
					<Icon icon="mingcute:zoom-out-line" width="12" height="12" />
				</button>
				<button
					type="button"
					onclick={() => (zoom = null)}
					title="Fit to window"
					class="zoom-btn w-11 justify-center tabular-nums"
				>
					{Math.round(scale * 100)}%
				</button>
				<button
					type="button"
					onclick={() => stepZoom(1)}
					disabled={!canZoomIn}
					title="Zoom in"
					aria-label="Zoom in"
					class="zoom-btn"
				>
					<Icon icon="mingcute:zoom-in-line" width="12" height="12" />
				</button>
			</div>
		{/if}
	</footer>
</div>

<style>
	/* So alpha reads as transparent rather than as black. */
	.checkerboard {
		background-image:
			linear-gradient(45deg, rgba(255, 255, 255, 0.03) 25%, transparent 25%),
			linear-gradient(-45deg, rgba(255, 255, 255, 0.03) 25%, transparent 25%),
			linear-gradient(45deg, transparent 75%, rgba(255, 255, 255, 0.03) 75%),
			linear-gradient(-45deg, transparent 75%, rgba(255, 255, 255, 0.03) 75%);
		background-size: 16px 16px;
		background-position:
			0 0,
			0 8px,
			8px -8px,
			-8px 0;
	}

	.zoom-btn {
		display: inline-flex;
		align-items: center;
		border: none;
		border-radius: 4px;
		background: transparent;
		padding: 2px 5px;
		font: inherit;
		color: inherit;
		cursor: pointer;
		transition:
			color 0.15s ease,
			background 0.15s ease;
	}
	.zoom-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.05);
		color: rgba(255, 255, 255, 0.7);
	}
	.zoom-btn:disabled {
		opacity: 0.35;
		cursor: default;
	}

	/* Past 1:1 the interpolation is the thing being inspected, so show real pixels. */
	.pixelated {
		image-rendering: pixelated;
	}
</style>
