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
		{ id: 'gemini', icon: 'simple-icons:googlegemini', label: 'Gemini', disabled: false },
		{ id: 'claude', icon: 'mingcute:claude-line', label: 'Claude Code', disabled: true },
		{ id: 'codex', icon: 'hugeicons:chat-gpt', label: 'Codex CLI', disabled: true }
	];
</script>

{#snippet navButton(item: { id: string; icon: string; label: string; disabled: boolean })}
	<button
		onclick={() => !item.disabled && onPanelToggle?.(item.id)}
		class="group relative flex items-center justify-center rounded p-2 transition
			{activePanel === item.id
			? 'bg-white/10 text-white'
			: item.disabled
				? 'cursor-not-allowed text-zinc-700'
				: 'text-zinc-600 hover:bg-white/5 hover:text-zinc-300'}"
		disabled={item.disabled}
	>
		<Icon icon={item.icon} width="20" height="20" />

		<span
			class="pointer-events-none absolute left-full z-10 ml-2.5 flex items-center opacity-0 transition-opacity group-hover:opacity-100"
		>
			<span class="h-1.5 w-1.5 rotate-45 bg-zinc-800"></span>
			<span
				class="-ml-0.5 flex items-center gap-1.5 rounded bg-zinc-800 px-2 py-1 text-[12px] whitespace-nowrap text-zinc-200"
			>
				<span>{item.label}</span>
				{#if item.disabled}
					<span class="text-zinc-500">· Coming soon</span>
				{/if}
			</span>
		</span>
	</button>
{/snippet}

<aside class="relative hidden h-full w-sidebar flex-col border-r border-white/[0.06] bg-[#111111] md:flex">
	<div class="flex items-center justify-center py-3">
		<a href={resolve('/')} title="BrowserCode">
			<img src={favicon} alt="BrowserCode" class="h-7 w-7 brightness-0 invert opacity-70" />
		</a>
	</div>

	<nav class="flex flex-1 flex-col gap-1 px-1 pt-2">
		{#each navItems as item (item.id)}
			{@render navButton(item)}
		{/each}
	</nav>
</aside>
