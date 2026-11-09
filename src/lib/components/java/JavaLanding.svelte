<script lang="ts">
	import Icon from '@iconify/svelte';
	import { javaRailItems } from '$lib/config/frameworks';
	import JavaExamples from './JavaExamples.svelte';

	let {
		unknownExample,
		unreadableLink = false
	}: {
		/** Set when ?example= carried something we couldn't resolve, so the picker can say so. */
		unknownExample?: string;
		/** Set when the hash held no project we could read, often a link cut short in copying. */
		unreadableLink?: boolean;
	} = $props();

	const exampleNames = javaRailItems.map((item) => item.example).join(', ');

	// A hand-built query string can carry anything; keep a long one from stretching the callout.
	let shownExample = $derived(
		unknownExample && unknownExample.length > 32
			? `${unknownExample.slice(0, 32)}…`
			: unknownExample
	);
</script>

<div class="flex h-full w-full items-center justify-center overflow-auto p-6 text-bc-mist">
	<div class="w-full max-w-lg">
		<h1 class="mb-1 font-display text-[18px] font-semibold text-bc-text">Java Playground</h1>
		<p class="mb-4 text-[13px] text-bc-text-muted">
			Start from an example, or open a link someone shared with you.
		</p>

		{#if unreadableLink || unknownExample}
			<div
				class="mb-4 flex items-start gap-2.5 rounded-lg border border-bc-gold/25 bg-bc-gold/6 px-3 py-2.5 text-left"
			>
				<span
					class="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-bc-gold/12 text-bc-gold"
				>
					<Icon icon="mingcute:alert-line" width="14" height="14" />
				</span>
				<span class="text-[12px] leading-relaxed text-bc-text-muted">
					{#if unreadableLink}
						This link's project couldn't be read. It may have been cut short when it was copied.
						Pick an example below instead.
					{:else}
						There's no example called <span class="font-mono text-bc-text">{shownExample}</span>.
						Pick one below, or use <span class="font-mono text-bc-text">?example=</span> with one
						of: <span class="font-mono text-bc-text">{exampleNames}</span>.
					{/if}
				</span>
			</div>
		{/if}

		<JavaExamples />
	</div>
</div>
