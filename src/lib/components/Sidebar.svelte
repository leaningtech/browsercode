<script lang="ts">
	import { resolve } from '$app/paths';
	import favicon from '$lib/assets/favicon.svg';
	import Icon from '@iconify/svelte';

	interface Props {
		activePanel?: string;
		onPanelToggle?: (panel: string) => void;
	}

	let { activePanel = '', onPanelToggle }: Props = $props();

	const navItems = [
		{ id: 'terminal', icon: 'mingcute:terminal-line', label: 'Terminal' },
		{ id: 'models', icon: 'mingcute:ai-line', label: 'Models' },
		{ id: 'sessions', icon: 'mingcute:history-line', label: 'Sessions' }
	];

	const bottomItems = [{ id: 'settings', icon: 'mingcute:settings-3-line', label: 'Settings' }];
</script>

{#snippet navButton(item: { id: string; icon: string; label: string })}
	<button
		onclick={() => onPanelToggle?.(item.id)}
		class="group relative flex items-center justify-center rounded-md p-2 transition-colors
			{activePanel === item.id
			? 'bg-white/10 text-white'
			: 'text-gray-500 hover:bg-white/5 hover:text-gray-300'}"
	>
		<Icon icon={item.icon} width="20" height="20" />

		<!-- Side Labels which appear next to the icon-->
		<span
			class="pointer-events-none absolute left-full ml-2 flex items-center opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
		>
			<span class="h-2 w-2 rotate-45 bg-gray-800"></span>
			<span class="-ml-1 rounded bg-gray-800 px-2 py-1 text-xs whitespace-nowrap text-gray-100">
				{item.label}
			</span>
		</span>
	</button>
{/snippet}

<aside class="flex h-full w-sidebar flex-col border-r border-white/10 bg-bc-sidebar">
	<div class="flex items-center justify-center py-3">
		<a href={resolve('/')} title="BrowserCode">
			<img src={favicon} alt="BrowserCode" class="h-7 w-7 brightness-0 invert" />
		</a>
	</div>

	<nav class="flex flex-1 flex-col gap-1 px-1.5 pt-3">
		{#each navItems as item (item.id)}
			{@render navButton(item)}
		{/each}
	</nav>

	<div class="flex flex-col gap-1 px-1.5 pb-3">
		{#each bottomItems as item (item.id)}
			{@render navButton(item)}
		{/each}
	</div>
</aside>
