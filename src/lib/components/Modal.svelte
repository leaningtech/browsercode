<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		onClose,
		role = 'dialog',
		labelledby,
		layer = 'z-70',
		class: panelClass = '',
		children
	}: {
		/** Absent for a dialog that can't be dismissed. */
		onClose?: () => void;
		role?: 'dialog' | 'alertdialog';
		labelledby?: string;
		layer?: string;
		class?: string;
		children: Snippet;
	} = $props();

	function onKeyDown(event: KeyboardEvent): void {
		if (!onClose || event.key !== 'Escape') return;
		event.preventDefault();
		onClose();
	}
</script>

<svelte:window onkeydown={onKeyDown} />

<div
	class="fixed inset-0 {layer} flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
	role="presentation"
	onclick={(event) => event.target === event.currentTarget && onClose?.()}
>
	<div class={panelClass} {role} aria-modal="true" aria-labelledby={labelledby}>
		{@render children()}
	</div>
</div>
