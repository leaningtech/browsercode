<script lang="ts">
	import Icon from '@iconify/svelte';

	let {
		shortcuts,
		baseClass = '',
		activeClass = '',
		idleClass = ''
	}: {
		shortcuts: { label: string; keys: string }[];
		baseClass?: string;
		activeClass?: string;
		idleClass?: string;
	} = $props();

	let open = $state(false);
	let rootEl = $state<HTMLElement | null>(null);

	// As in SettingsMenu: `blur` catches clicks into the preview iframe.
	$effect(() => {
		if (!open) return;
		const dismiss = (event: PointerEvent): void => {
			if (!rootEl?.contains(event.target as Node)) open = false;
		};
		const onKey = (event: KeyboardEvent): void => {
			if (event.key === 'Escape') open = false;
		};
		const onBlur = (): void => {
			open = false;
		};
		window.addEventListener('pointerdown', dismiss);
		window.addEventListener('keydown', onKey);
		window.addEventListener('blur', onBlur);
		return () => {
			window.removeEventListener('pointerdown', dismiss);
			window.removeEventListener('keydown', onKey);
			window.removeEventListener('blur', onBlur);
		};
	});
</script>

<div bind:this={rootEl} class="relative">
	<button
		type="button"
		onclick={() => (open = !open)}
		aria-expanded={open}
		aria-haspopup="dialog"
		class="{baseClass} {open ? activeClass : idleClass}"
		title="Keyboard shortcuts"
		aria-label="Keyboard shortcuts"
	>
		<Icon icon="mingcute:keyboard-line" width="18" height="18" />
	</button>

	{#if open}
		<div
			role="dialog"
			aria-label="Keyboard shortcuts"
			class="absolute bottom-0 left-[calc(100%+6px)] z-40 w-64 rounded-lg border border-bc-border bg-bc-statusbar p-1 shadow-[0_12px_26px_rgba(0,0,0,0.55)]"
		>
			<p class="px-2 pt-1 pb-1.5 text-[10px] font-medium tracking-widest text-bc-icon uppercase">
				Keyboard shortcuts
			</p>
			{#each shortcuts as shortcut (shortcut.label)}
				<div class="flex items-center justify-between gap-3 px-2 py-1 text-[12px] text-bc-mist">
					<span>{shortcut.label}</span>
					<kbd class="font-mono text-[11px] text-bc-text-muted">{shortcut.keys}</kbd>
				</div>
			{/each}
			<p class="mt-1 border-t border-bc-border px-2 pt-1.5 pb-1 text-[11px] text-bc-text-muted">
				F1 in the editor lists every editor command.
			</p>
		</div>
	{/if}
</div>
