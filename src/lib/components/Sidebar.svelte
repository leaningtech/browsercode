<script lang="ts">
	import { resolve } from '$app/paths';
	import favicon from '$lib/assets/favicon.svg';
	import Icon from '@iconify/svelte';

	interface Props {
		activePanel?: string;
		onPanelToggle?: (panel: string) => void;
	}

	let { activePanel = 'terminal', onPanelToggle }: Props = $props();

	const navItems = [
		{ id: 'terminal', icon: 'mingcute:terminal-line', label: 'Terminal' },
		{ id: 'models', icon: 'mingcute:ai-line', label: 'Models' },
		{ id: 'sessions', icon: 'mingcute:history-line', label: 'Sessions' }
	];

	const bottomItems = [{ id: 'settings', icon: 'mingcute:settings-3-line', label: 'Settings' }];
</script>

<aside class="flex h-full w-sidebar flex-col border-r border-white/10">
	<div class="flex items-center justify-center py-3">
		<a href={resolve('/')} title="BrowserCode">
			<img src={favicon} alt="BrowserCode" class="h-7 w-7" />
		</a>
	</div>

	<nav class="flex flex-1 flex-col gap-1 px-1.5 pt-3">
		{#each navItems as item (item.id)}
			<button
				onclick={() => onPanelToggle?.(item.id)}
				class="group flex items-center justify-center rounded-md p-2 transition-colors
					{activePanel === item.id
					? 'bg-white/10 text-white'
					: 'text-gray-500 hover:bg-white/5 hover:text-gray-300'}"
				title={item.label}
			>
				<Icon icon={item.icon} width="20" height="20" />
			</button>
		{/each}
	</nav>

	<div class="flex flex-col gap-1 px-1.5 pb-3">
		{#each bottomItems as item (item.id)}
			<button
				onclick={() => onPanelToggle?.(item.id)}
				class="group flex items-center justify-center rounded-md p-2 transition-colors
					{activePanel === item.id
					? 'bg-white/10 text-white'
					: 'text-gray-500 hover:bg-white/5 hover:text-gray-300'}"
				title={item.label}
			>
				<Icon icon={item.icon} width="20" height="20" />
			</button>
		{/each}
	</div>
</aside>
