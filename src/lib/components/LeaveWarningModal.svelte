<script lang="ts">
	import Icon from '@iconify/svelte';
	import { leaveWarningState, markIntentionalNavigation } from '$lib/stores/leaveWarning.svelte';

	function confirmLeave() {
		const path = leaveWarningState.pendingPath;
		leaveWarningState.open = false;
		leaveWarningState.pendingPath = '';
		// Already confirmed here — suppress the native beforeunload dialog this triggers too.
		markIntentionalNavigation();
		window.location.href = path;
	}

	function cancel() {
		leaveWarningState.open = false;
		leaveWarningState.pendingPath = '';
	}

	function handleKeydown(event: KeyboardEvent) {
		if (leaveWarningState.open && event.key === 'Escape') {
			event.preventDefault();
			cancel();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if leaveWarningState.open}
	<div
		class="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
		role="presentation"
		onclick={(e) => e.target === e.currentTarget && cancel()}
	>
		<div
			class="max-w-sm rounded-xl border border-white/10 bg-[#111111] px-6 py-7 text-center shadow-2xl"
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="leave-warning-title"
		>
			<div
				class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400"
			>
				<Icon icon="mingcute:alert-line" width="22" height="22" />
			</div>
			<h3 id="leave-warning-title" class="mb-2 text-sm font-semibold text-zinc-50">
				Leave this session?
			</h3>
			<p class="mb-5 text-[12.5px] leading-relaxed text-zinc-400">
				Are you sure you want to leave? Your work will be lost.
			</p>
			<div class="flex justify-center gap-2">
				<button
					onclick={cancel}
					class="rounded-md bg-white/5 px-4 py-2 text-[13px] font-medium text-zinc-300 transition hover:bg-white/10"
				>
					Cancel
				</button>
				<button
					onclick={confirmLeave}
					class="rounded-md bg-rose-500/90 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-rose-500"
				>
					Leave
				</button>
			</div>
		</div>
	</div>
{/if}
