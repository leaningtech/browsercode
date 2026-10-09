<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { ToolItem } from '$lib/config/tools';

	/**
	 * Renders a tool's Iconify glyph, or its fixed-color brand SVG when it has no Iconify icon
	 * (see `ToolItem.logoSrc`). Sizing and opacity vary per call site, so callers pass them in
	 * rather than this component guessing a one-size-fits-all look.
	 */
	type Props = {
		item: ToolItem;
		/** Pixel size passed to the Iconify `<Icon>`. */
		iconSize: number;
		/** Tailwind size + opacity classes for the `<img>` fallback. */
		imgClass: string;
		alt?: string;
	};

	let { item, iconSize, imgClass, alt = '' }: Props = $props();
</script>

{#if item.icon}
	<Icon icon={item.icon} width={iconSize} height={iconSize} />
{:else if item.logoSrc}
	<img src={item.logoSrc} {alt} class={imgClass} />
{/if}
