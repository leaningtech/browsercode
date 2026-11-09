<script lang="ts">
	import Icon from '@iconify/svelte';
	import { javaRailItems } from '$lib/config/frameworks';

	function openExample(example: string) {
		window.location.href = `/java?example=${example}`;
	}

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

		<div
			class="mb-6 flex items-start gap-2.5 rounded-lg border border-bc-orchid/18 bg-bc-orchid/6 px-3 py-2.5 text-left"
		>
			<span
				class="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-bc-orchid/12 text-bc-orchid"
			>
				<Icon icon="mingcute:cube-3d-line" width="14" height="14" />
			</span>
			<span class="text-[12px] leading-relaxed text-bc-text-muted">
				Compiled and run in this tab by <a
					href="https://cheerpj.com"
					target="_blank"
					rel="noopener noreferrer"
					class="font-medium text-bc-text underline decoration-bc-orchid/40 underline-offset-2 transition-colors hover:text-bc-link-hover hover:decoration-bc-link-hover"
					>CheerpJ</a
				>, a full JVM and <span class="font-mono">javac</span> in WebAssembly. Swing and AWT windows draw
				in the Display. Nothing installs on your machine.
			</span>
		</div>

		<div class="mb-2 text-[11px] font-medium tracking-widest text-bc-mist/40 uppercase">
			Examples
		</div>
		<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
			{#each javaRailItems as item (item.id)}
				<button
					onclick={() => openExample(item.example)}
					class="glass-panel flex items-center gap-2 rounded-lg border border-bc-border px-3 py-2 text-left text-[13px] text-bc-mist transition hover:border-bc-tint/30"
				>
					<Icon icon={item.icon} width="16" height="16" class="shrink-0" />
					<span class="truncate">{item.label}</span>
				</button>
			{/each}
		</div>
	</div>
</div>
