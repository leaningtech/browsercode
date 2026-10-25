<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { PodBlocker } from '$lib/utils/platform';

	let { blocker }: { blocker: PodBlocker } = $props();

	const DOCS_URL = 'https://github.com/leaningtech/browsercode/blob/main/docs/embedding.md';
</script>

<div
	class="absolute inset-0 z-50 flex items-center justify-center bg-bc-abyss/80 p-4 backdrop-blur-md"
>
	<div
		class="glass-panel glass-panel-solid w-full max-w-85 rounded-xl border border-bc-border px-6 py-8 text-center"
	>
		<div
			class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-bc-coral/10 text-bc-coral"
		>
			<Icon icon="mingcute:alert-line" width="22" height="22" />
		</div>
		{#if blocker === 'not-isolated'}
			<h3 class="mb-2 text-[14px] font-semibold text-bc-text">Isolation headers missing</h3>
			<p class="text-[12px] leading-relaxed break-words text-bc-text-muted">
				The page embedding this frame must send
				<code class="text-bc-text">Cross-Origin-Opener-Policy: same-origin</code>
				and
				<code class="text-bc-text">Cross-Origin-Embedder-Policy: require-corp</code>, and set
				<code class="text-bc-text">allow="cross-origin-isolated"</code> on the iframe.
			</p>
			<a
				href={DOCS_URL}
				target="_blank"
				rel="noopener noreferrer"
				class="mt-3 inline-block text-[12px] text-bc-mist hover:text-bc-link-hover">Learn more</a
			>
		{:else if blocker === 'unsupported-platform'}
			<h3 class="mb-2 text-[14px] font-semibold text-bc-text">iOS is not supported yet</h3>
			<p class="text-[12px] leading-relaxed text-bc-text-muted">
				Agents and Node.js projects need a desktop browser. Java projects run here.
			</p>
		{:else}
			<h3 class="mb-2 text-[14px] font-semibold text-bc-text">Incompatible Browser</h3>
			<p class="text-[12px] leading-relaxed text-bc-text-muted">
				Requires <strong class="text-bc-text">WebAssembly JSPI</strong> (Chrome and Edge 137+, Firefox
				153+, Safari 27+).
			</p>
		{/if}
	</div>
</div>
