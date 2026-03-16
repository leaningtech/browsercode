<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		children: Snippet;
	}

	let { title, children }: Props = $props();
</script>

<div class="h-full shrink-0 overflow-hidden">
	<aside
		class="flex h-full w-75 flex-col border-r border-white/10 bg-bc-sidebar text-gray-300"
	>
		<div class="flex items-center justify-between border-b border-white/5 px-3 py-2">
			<span class="text-xs font-medium tracking-wider text-gray-500 uppercase">{title}</span>
		</div>
		<div class="flex-1 overflow-y-auto p-2">
			{@render children()}
		</div>
	</aside>
</div>
