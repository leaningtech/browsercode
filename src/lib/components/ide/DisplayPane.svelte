<script lang="ts">
	import Icon from '@iconify/svelte';

	let {
		mount
	}: {
		/** Hands the runtime the element its program's windows draw into. */
		mount: (el: HTMLElement, onWindows: (open: boolean) => void) => Promise<void>;
	} = $props();

	let hasWindows = $state(false);

	function display(node: HTMLElement): void {
		mount(node, (open) => (hasWindows = open)).catch((error) =>
			console.error('Failed to mount the display:', error)
		);
	}
</script>

<div class="flex h-full min-h-0 w-full min-w-0 flex-col">
	<div
		class="flex h-8 shrink-0 items-center gap-1.5 border-b border-bc-border bg-bc-navy px-3 text-[11px] text-bc-text-muted"
	>
		<Icon icon="mingcute:display-line" width="12" height="12" class="shrink-0" />
		<span class="font-medium tracking-wide">Display</span>
	</div>
	<!-- Isolated, so a z-index inside the program's windows can't rise over this pane's header. -->
	<div class="relative isolate min-h-0 flex-1 overflow-hidden bg-bc-abyss">
		<div use:display class="absolute inset-0"></div>
		{#if !hasWindows}
			<div
				class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center"
			>
				<Icon icon="mingcute:display-line" width="20" height="20" class="text-bc-icon" />
				<span class="text-[11px] text-bc-text-muted">
					Windows your program opens with AWT or Swing show up here
				</span>
			</div>
		{/if}
	</div>
</div>
