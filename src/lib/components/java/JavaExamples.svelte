<script lang="ts">
	import Icon from '@iconify/svelte';
	import { javaRailItems } from '$lib/config/frameworks';

	function openExample(example: string) {
		window.location.href = `/java?example=${example}`;
	}
</script>

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

<div class="mb-2 text-[11px] font-medium tracking-widest text-bc-mist/40 uppercase">Examples</div>
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
