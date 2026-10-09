<script lang="ts">
	import Icon from '@iconify/svelte';

	let closeFallback = $state(false);

	function attemptCloseTab(): void {
		window.close();
		// Browsers only let scripts close tabs they themselves opened; If we're still here
		// shortly after, that didn't work, so tell the user to close it manually instead.
		setTimeout(() => {
			closeFallback = true;
		}, 400);
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
		<h3 class="mb-2 text-sm font-semibold text-bc-text">Already open in another tab</h3>
		<p class="mb-5 text-[12.5px] leading-relaxed text-bc-text-muted">
			Sorry, you can only open one tab of the same agent.
		</p>
		{#if closeFallback}
			<p class="text-[12px] text-bc-text-muted">You can close this tab.</p>
		{:else}
			<button
				onclick={attemptCloseTab}
				class="rounded-md bg-bc-azure/90 px-4 py-2 text-[13px] font-medium text-bc-abyss transition hover:bg-bc-azure"
			>
				Close
			</button>
		{/if}
	</div>
</div>
