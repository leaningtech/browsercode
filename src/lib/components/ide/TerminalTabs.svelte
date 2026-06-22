<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { IdeSession } from '$lib/ide/session.svelte';

	let {
		session,
		outputEl = $bindable(null),
		bashEl = $bindable(null)
	}: {
		session: IdeSession;
		outputEl?: HTMLElement | null;
		bashEl?: HTMLElement | null;
	} = $props();

	let activeTab = $state<'output' | 'bash'>('output');

	function selectTab(tab: 'output' | 'bash') {
		activeTab = tab;
		if (tab === 'bash') session.startBash();
		// xterm's FitAddon listens to window resize — nudge it after the tab swap
		setTimeout(() => window.dispatchEvent(new Event('resize')), 0);
	}
</script>

<div class="flex h-full min-h-0 flex-col overflow-hidden">
	<div class="flex h-8 shrink-0 items-center border-b border-white/[0.06] bg-[#111111]">
		<button
			onclick={() => selectTab('output')}
			class="inline-flex h-8 items-center gap-1 border-none bg-transparent px-3 text-[11px] font-medium transition {activeTab ===
			'output'
				? 'bg-white/[0.04] text-white/80'
				: 'text-white/30 hover:text-white/55'}"
		>
			<Icon icon="mingcute:terminal-line" width="11" height="11" />
			Output
		</button>
		<button
			onclick={() => selectTab('bash')}
			class="inline-flex h-8 items-center gap-1 border-none bg-transparent px-3 text-[11px] font-medium transition {activeTab ===
			'bash'
				? 'bg-white/[0.04] text-white/80'
				: 'text-white/30 hover:text-white/55'}"
		>
			<Icon icon="mingcute:terminal-box-line" width="11" height="11" />
			Bash
		</button>
	</div>
	<div class="relative min-h-0 flex-1 overflow-hidden bg-black">
		<div
			bind:this={outputEl}
			class="terminal-pane absolute inset-0 overflow-hidden pl-2"
			class:invisible={activeTab !== 'output'}
		></div>
		<div
			bind:this={bashEl}
			class="terminal-pane absolute inset-0 overflow-hidden pl-2"
			class:invisible={activeTab !== 'bash'}
		></div>
	</div>
</div>

<style>
	.terminal-pane :global(.xterm-rows) {
		font-size: 0.7rem !important;
	}
	@media (min-width: 640px) {
		.terminal-pane :global(.xterm-rows) {
			font-size: 0.75rem !important;
		}
	}
</style>
