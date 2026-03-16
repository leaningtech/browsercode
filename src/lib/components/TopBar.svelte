<script lang="ts">
	import Icon from '@iconify/svelte';

	interface Props {
		sessionName?: string;
	}

	let { sessionName = 'Untitled Session' }: Props = $props();
</script>

<header class="flex h-14 items-center justify-between border-b border-white/10 bg-bc-sidebar px-4">
	<div class="flex items-center gap-3">
		<span class="text-xs font-medium text-gray-400">{sessionName}</span>
	</div>

	<div class="flex items-center gap-1">
		<button
			class="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-200"
			title="New Session"
		>
			<Icon icon="mingcute:add-circle-line" width="14" height="14" />
			<span>New</span>
		</button>
		<button
			class="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-200"
			title="Reset Environment"
		>
			<Icon icon="mingcute:refresh-2-line" width="14" height="14" />
			<span>Reset</span>
		</button>
	</div>
</header>
