<script lang="ts">
	import Icon from '@iconify/svelte';
	import { gridAnimationState, toggleGridAnimation } from '$lib/stores/grid-animation.svelte';
</script>

<!-- Floats over the wavy grid's own container, so it's only ever used inside one
     (`position: relative`, matching WavyGridBackground's own requirement). -->
<button
	type="button"
	onclick={toggleGridAnimation}
	class="absolute top-4 left-4 z-[3] flex items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-[11.5px] text-white/50 backdrop-blur-md transition-colors duration-150 hover:border-white/20 hover:bg-black/35 hover:text-white/80"
	aria-pressed={!gridAnimationState.enabled}
	title={gridAnimationState.enabled
		? 'Pause the background animation'
		: 'Resume the background animation'}
>
	<Icon
		icon={gridAnimationState.enabled ? 'mingcute:pause-circle-line' : 'mingcute:play-circle-line'}
		width="14"
		height="14"
	/>
	<span class="hidden sm:inline"
		>{gridAnimationState.enabled ? 'Pause animation' : 'Resume animation'}</span
	>
</button>
