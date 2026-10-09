<script lang="ts">
	import layerBottom from '$lib/assets/logo-layer-bottom.png';
	import layerMiddle from '$lib/assets/logo-layer-middle.png';
	import layerTop from '$lib/assets/logo-layer-top.png';

	let {
		size = 92,
		playIntro = true,
		class: className = ''
	}: {
		size?: number;
		playIntro?: boolean;
		class?: string;
	} = $props();

	// Two identically-defined animation variants so toggling between them (see `replay`) swaps
	// the element to a class it didn't already have, which is what restarts a CSS animation —
	// re-applying the same class name is a no-op.
	let run = $state<'ra' | 'rb'>('ra');
	let everPlayed = $state(false);

	export function replay() {
		run = run === 'ra' ? 'rb' : 'ra';
		everPlayed = true;
	}

	let animClass = $derived(playIntro || everPlayed ? run : 'still');
	// Aspect ratio of the source artwork (557:600) so callers only need to pass a width.
	let height = $derived((size * 600) / 557);
</script>

<span class="bclogo {animClass} {className}" style="width: {size}px; height: {height}px">
	<span
		class="ly ly-b"
		style="-webkit-mask-image: url({layerBottom}); mask-image: url({layerBottom})"
	></span>
	<span
		class="ly ly-m"
		style="-webkit-mask-image: url({layerMiddle}); mask-image: url({layerMiddle})"
	></span>
	<span class="ly ly-t" style="-webkit-mask-image: url({layerTop}); mask-image: url({layerTop})"
	></span>
	<span class="dot d0"></span>
	<span class="dot d1"></span>
	<span class="dot d2"></span>
</span>
