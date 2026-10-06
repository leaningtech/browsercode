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

	// Runs once when a bash pane mounts. Closing a tab only unmounts the xterm UI.
	// The shell itself runs until pod teardown.
	function bashPane(node: HTMLElement) {
		void session.startBash(node);
	}
</script>

<div class="flex h-full min-h-0 flex-col overflow-hidden">
	<div
		class="flex h-9 shrink-0 items-center overflow-x-auto border-b border-bc-border bg-bc-statusbar"
	>
		<button
			onclick={() => selectTab(MAIN)}
			class="vrh-tab shrink-0"
			class:vrh-tab-active={activeTab === MAIN}
		>
			<Icon icon="mingcute:terminal-line" width="11" height="11" />
			Output
		</button>
		{#each bashTabs as tab (tab.id)}
			<div class="vrh-tab vrh-tab--closeable shrink-0" class:vrh-tab-active={activeTab === tab.id}>
				<button onclick={() => selectTab(tab.id)} class="vrh-tab-btn">
					<Icon icon="mingcute:terminal-box-line" width="11" height="11" />
					{tab.label}
				</button>
				<button
					onclick={() => closeTerminal(tab.id)}
					aria-label="Close {tab.label}"
					class="vrh-tab-x"
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
			class="vrh-tab vrh-tab--add shrink-0"
		>
			<Icon icon="mingcute:add-line" width="12" height="12" />
		</button>
	</div>
	<div class="relative min-h-0 flex-1 overflow-hidden bg-bc-terminal">
		<div
			bind:this={outputEl}
			class="absolute inset-0 overflow-hidden p-2"
			class:invisible={activeTab !== MAIN}
		></div>
		{#each bashTabs as tab (tab.id)}
			<div
				use:bashPane
				class="absolute inset-0 overflow-hidden p-2"
				class:invisible={activeTab !== tab.id}
			></div>
		{/each}
	</div>
</div>

<style>
	.vrh-tab {
		display: inline-flex;
		height: 100%;
		align-items: center;
		gap: 5px;
		padding: 0 14px;
		font-family: monospace;
		font-size: 11px;
		font-weight: 500;
		color: rgb(var(--bc-tint) / 30%);
		background: transparent;
		border: none;
		border-bottom: 2px solid transparent;
		white-space: nowrap;
		cursor: pointer;
		transition:
			color 0.15s ease,
			border-color 0.15s ease;
	}
	.vrh-tab:hover {
		color: rgb(var(--bc-tint) / 60%);
	}
	.vrh-tab-active {
		color: rgb(var(--bc-tint) / 80%);
		border-bottom-color: rgb(var(--bc-tint) / 50%);
	}

	/* Closeable tabs wrap two buttons; the group carries the tab color/underline, children inherit it. */
	.vrh-tab--closeable {
		padding-right: 8px;
	}
	.vrh-tab-btn,
	.vrh-tab-x {
		display: inline-flex;
		align-items: center;
		padding: 0;
		font: inherit;
		color: inherit;
		background: transparent;
		border: none;
		cursor: pointer;
	}
	.vrh-tab-btn {
		gap: 5px;
	}
	.vrh-tab-x {
		opacity: 0.6;
		transition: opacity 0.15s ease;
	}
	.vrh-tab-x:hover {
		opacity: 1;
	}

	.vrh-tab--add:disabled {
		color: rgb(var(--bc-tint) / 10%);
		cursor: not-allowed;
	}
</style>
