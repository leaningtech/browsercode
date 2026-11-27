<script lang="ts">
	import Icon from '@iconify/svelte';

	let {
		title,
		description,
		query,
		height = 420,
		note
	}: {
		title: string;
		description: string;
		/** The `/embed` query string, without the leading `?`. */
		query: string;
		height?: number;
		/** A caveat shown before the embed is started, where it can still change someone's mind. */
		note?: string;
	} = $props();

	// Nothing boots until asked. Each live embed is a real pod, and a page of them starting at once
	// would be slow for everyone and pointless for the reader, who only wants to see one at a time.
	let running = $state(false);

	const src = $derived(`/embed?${query}`);
</script>

<figure class="my-6 overflow-hidden rounded-xl border border-bc-border">
	<figcaption
		class="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-bc-border px-4 py-3"
	>
		<div class="min-w-0 flex-1">
			<div class="text-[13.5px] font-medium text-bc-text">{title}</div>
			<div class="mt-0.5 text-[12.5px] text-bc-text-muted">{description}</div>
		</div>
		<code class="shrink-0 text-[11.5px] text-bc-mist">?{query}</code>
		{#if running}
			<button
				type="button"
				onclick={() => (running = false)}
				class="flex shrink-0 items-center gap-1.5 rounded-md border border-bc-border px-2.5 py-1.5 text-[12px] text-bc-text-muted transition hover:text-bc-text"
			>
				<Icon icon="mingcute:stop-circle-line" width="14" height="14" />
				Stop
			</button>
		{:else}
			<button
				type="button"
				onclick={() => (running = true)}
				class="flex shrink-0 items-center gap-1.5 rounded-md bg-bc-azure/15 px-2.5 py-1.5 text-[12px] font-medium text-bc-azure transition hover:bg-bc-azure/25"
			>
				<Icon icon="mingcute:play-circle-line" width="14" height="14" />
				Run it
			</button>
		{/if}
	</figcaption>

	{#if running}
		<!-- The same attributes the docs tell embedders to set. -->
		<iframe
			{src}
			{title}
			allow="cross-origin-isolated; clipboard-write"
			style="height: {height}px"
			class="block w-full border-0 bg-bc-abyss"
		></iframe>
	{:else}
		<!-- Fixed, and deliberately short: a stack of placeholders scaled to the embeds they would
		     become would turn this section into a very long page of nothing. -->
		<div class="flex flex-col items-center justify-center gap-2 px-4 py-7 text-center">
			<Icon icon="mingcute:play-circle-line" width="26" height="26" class="text-bc-icon" />
			<p class="max-w-sm text-[12.5px] text-bc-text-muted">
				{note ?? 'Starts a real sandbox in this page, the same as it would in yours.'}
			</p>
		</div>
	{/if}
</figure>
