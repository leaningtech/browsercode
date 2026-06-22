<script lang="ts">
	import Icon from '@iconify/svelte';
	import { frameworkRailItems, type FrameworkId } from '$lib/config/frameworks';

	let {
		selected,
		onSelect
	}: { selected: FrameworkId; onSelect: (framework: FrameworkId) => void } = $props();
</script>

<div class="space-y-1">
	{#each frameworkRailItems as framework (framework.id)}
		<button
			onclick={() => onSelect(framework.id)}
			class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[11px] transition {selected ===
			framework.id
				? 'bg-white/10 text-zinc-100'
				: 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}"
		>
			<Icon icon={framework.icon} width="14" height="14" class="shrink-0" />
			<span class="truncate">{framework.label}</span>
		</button>
	{/each}
</div>
