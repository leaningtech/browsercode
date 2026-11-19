<script lang="ts">
	import Icon from '@iconify/svelte';

	let {
		message = 'Sorry, you can only open one tab of the same agent.',
		onTakeOver
	}: { message?: string; onTakeOver: () => void } = $props();

	let takingOver = $state(false);

	function takeOver(): void {
		takingOver = true;
		onTakeOver();
	}
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
	<div
		class="glass-panel glass-panel-solid max-w-sm rounded-xl border border-bc-border px-6 py-7 text-center shadow-2xl"
	>
		<div
			class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-bc-gold/10 text-bc-gold"
		>
			<Icon icon="mingcute:alert-line" width="22" height="22" />
		</div>
		<h3 class="mb-2 text-[14px] font-semibold text-bc-text">Open in another tab</h3>
		<p class="mb-2 text-[12.5px] leading-relaxed text-bc-text-muted">
			{message}
		</p>
		<p class="mb-5 text-[12.5px] leading-relaxed text-bc-text-muted">
			Using it here closes the session in the other one, and anything unsaved there is lost.
		</p>
		<button
			onclick={takeOver}
			disabled={takingOver}
			class="rounded-md bg-bc-azure/90 px-4 py-2 text-[13px] font-medium text-bc-abyss transition hover:bg-bc-azure disabled:opacity-60"
		>
			{takingOver ? 'Switching…' : 'Use here'}
		</button>
	</div>
</div>
