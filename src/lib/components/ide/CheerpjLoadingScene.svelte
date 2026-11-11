<script lang="ts">
	import wordmark from '$lib/assets/cheerpj-wordmark.svg';
	import { themeState } from '$lib/stores/theme.svelte';
	import BootLog from './BootLog.svelte';
	import type { LoadingSceneProps } from './loading-scenes';

	let { lines, activeLine, flash, onFlashComplete }: LoadingSceneProps = $props();

	/** Matches the bar's fill transition, so it reaches the end before the handover. */
	const FILL_MS = 200;

	// Loading CheerpJ, the first and longest stage, reports nothing to measure, so the bar slides
	// through it and fills by stage after.
	let progress = $derived(flash ? 1 : activeLine < 1 ? null : activeLine / lines.length);

	$effect(() => {
		if (!flash) return;
		const id = setTimeout(onFlashComplete, FILL_MS);
		return () => clearTimeout(id);
	});
</script>

<!-- The loader from the live demos on cheerpj.com, on the Display's own background. -->
<div class="absolute inset-0 overflow-hidden bg-bc-abyss">
	<div class="flex h-full flex-col items-center justify-center gap-4 px-6" aria-hidden="true">
		<span class="wordmark" style:mask-image="url({wordmark})"></span>
		<div class="track">
			<div
				class="fill"
				class:indeterminate={progress === null}
				style:transform={progress === null ? null : `scaleX(${progress})`}
			></div>
		</div>
		<p class="text-[12px] text-bc-text-muted">Starting Java</p>
	</div>
	<BootLog
		{lines}
		{activeLine}
		hidden={flash}
		surface={themeState.current === 'light' ? 'light' : 'dark'}
	/>
</div>

<style>
	/* The wordmark is drawn in cream; as a mask it takes the theme's text colour instead. */
	.wordmark {
		width: 168px;
		aspect-ratio: 1337 / 380;
		background-color: var(--color-bc-text);
		mask-size: contain;
		mask-repeat: no-repeat;
		mask-position: center;
	}

	.track {
		position: relative;
		width: 168px;
		height: 4px;
		overflow: hidden;
		border-radius: 2px;
		background: rgb(var(--bc-tint) / 12%);
	}
	/* CheerpJ's orange, as on its site. */
	.fill {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: #ff7c00;
		transform: scaleX(0);
		transform-origin: left;
		transition: transform 200ms ease-out;
	}
	/* Until a stage starts: a short segment sliding across. */
	.fill.indeterminate {
		width: 30%;
		transition: none;
		animation: slide 1.1s ease-in-out infinite;
	}
	@keyframes slide {
		from {
			transform: translateX(-100%);
		}
		to {
			transform: translateX(340%);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.fill {
			transition: none;
		}
		/* `transform: none` undoes the base rule's scaleX(0), which the slide animation would
		   otherwise be overriding: without it the dim full-width bar paints at zero width. */
		.fill.indeterminate {
			width: 100%;
			opacity: 0.35;
			animation: none;
			transform: none;
		}
	}
</style>
