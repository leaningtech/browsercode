<script lang="ts">
	import Icon from '@iconify/svelte';

	let { onDismiss }: { onDismiss: () => void } = $props();
</script>

<div class="pointer-events-none absolute inset-x-0 top-4 z-30 flex justify-center px-4">
	<div
		class="glass-panel pointer-events-auto flex max-w-md items-start gap-3 rounded-lg border border-bc-mist/15 px-4 py-3 shadow-2xl"
	>
		<span
			class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-bc-azure/10 text-bc-azure"
		>
			<Icon icon="mingcute:keyboard-line" width="18" height="18" />
		</span>
		<div class="flex-1 text-[12.5px] leading-relaxed text-zinc-300">
			<span class="font-medium text-zinc-100">This is a real terminal.</span>
			Click into it and use your keyboard. Mouse clicks alone won't do much here.
		</div>
		<button
			onclick={onDismiss}
			aria-label="Dismiss"
			class="shrink-0 rounded-md p-1 text-white/30 transition hover:bg-white/10 hover:text-white/70"
		>
			<Icon icon="mingcute:close-line" width="14" height="14" />
		</button>
	</div>
</div>
