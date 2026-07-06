<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { IdeSession } from '$lib/ide/session.svelte';

	let {
		session,
		outputEl = $bindable(null)
	}: {
		session: IdeSession;
		outputEl?: HTMLElement | null;
	} = $props();

	type BashTab = { id: number; label: string };

	// Tab MAIN is the boot/dev-server terminal; extra bash tabs are spawned on demand.
	const MAIN = 0;
	let bashTabs = $state<BashTab[]>([]);
	let activeTab = $state(MAIN);
	let nextId = 1;

	function selectTab(id: number) {
		activeTab = id;
		// xterm's FitAddon listens to window resize — nudge it after the tab swap
		setTimeout(() => window.dispatchEvent(new Event('resize')), 0);
	}

	function addTerminal() {
		if (!session.podReady) return;
		const id = nextId++;
		bashTabs.push({ id, label: 'Terminal' });
		selectTab(id);
	}

	function closeTerminal(id: number) {
		bashTabs = bashTabs.filter((tab) => tab.id !== id);
		if (activeTab === id) selectTab(bashTabs.at(-1)?.id ?? MAIN);
	}

	// Runs once when a bash pane mounts. Closing a tab only unmounts the xterm UI
	function bashPane(node: HTMLElement) {
		void session.startBash(node);
	}
</script>

<div class="flex h-full min-h-0 flex-col overflow-hidden">
	<div
		class="flex h-8 shrink-0 items-center overflow-x-auto border-b border-white/[0.06] bg-[#111111]"
	>
		<button
			onclick={() => selectTab(MAIN)}
			class="inline-flex h-8 shrink-0 items-center gap-1 border-none bg-transparent px-3 text-[11px] font-medium transition {activeTab ===
			MAIN
				? 'bg-white/[0.04] text-white/80'
				: 'text-white/30 hover:text-white/55'}"
		>
			<Icon icon="mingcute:terminal-line" width="11" height="11" />
			Terminal
		</button>
		{#each bashTabs as tab (tab.id)}
			<div
				class="flex h-8 shrink-0 items-center transition {activeTab === tab.id
					? 'bg-white/[0.04] text-white/80'
					: 'text-white/30 hover:text-white/55'}"
			>
				<button
					onclick={() => selectTab(tab.id)}
					class="inline-flex h-8 items-center gap-1 border-none bg-transparent pl-3 text-[11px] font-medium"
				>
					<Icon icon="mingcute:terminal-box-line" width="11" height="11" />
					{tab.label}
				</button>
				<button
					onclick={() => closeTerminal(tab.id)}
					aria-label="Close {tab.label}"
					class="inline-flex h-8 items-center border-none bg-transparent px-1.5 text-white/25 transition hover:text-white/70"
				>
					<Icon icon="mingcute:close-line" width="10" height="10" />
				</button>
			</div>
		{/each}
		<button
			onclick={addTerminal}
			disabled={!session.podReady}
			title="New terminal"
			aria-label="New terminal"
			class="inline-flex h-8 shrink-0 items-center border-none bg-transparent px-2.5 transition {session.podReady
				? 'text-white/30 hover:text-white/70'
				: 'cursor-not-allowed text-white/10'}"
		>
			<Icon icon="mingcute:add-line" width="12" height="12" />
		</button>
	</div>
	<div class="relative min-h-0 flex-1 overflow-hidden bg-black">
		<div
			bind:this={outputEl}
			class="terminal-pane absolute inset-0 overflow-hidden pl-2"
			class:invisible={activeTab !== MAIN}
		></div>
		{#each bashTabs as tab (tab.id)}
			<div
				use:bashPane
				class="terminal-pane absolute inset-0 overflow-hidden pl-2"
				class:invisible={activeTab !== tab.id}
			></div>
		{/each}
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
