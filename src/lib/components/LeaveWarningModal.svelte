<script lang="ts">
	import Icon from '@iconify/svelte';
	import Modal from '$lib/components/Modal.svelte';
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
</script>

{#if leaveWarningState.open}
	<!-- Above the z-70 dialogs: leaving can be asked while one of them is still open. -->
	<Modal
		onClose={cancel}
		role="alertdialog"
		labelledby="leave-warning-title"
		layer="z-[80]"
		class="glass-panel glass-panel-solid max-w-sm rounded-xl border border-bc-mist/15 px-6 py-7 text-center shadow-2xl"
	>
		<div
			class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-bc-gold/10 text-bc-gold"
		>
			<Icon icon="mingcute:alert-line" width="22" height="22" />
		</div>
		<h3 id="leave-warning-title" class="mb-2 text-[14px] font-semibold text-bc-text">
			Leave this session?
		</h3>
		<p class="mb-5 text-[12.5px] leading-relaxed text-bc-text-muted">
			Are you sure you want to leave? Your work will be lost.
		</p>
		<div class="flex justify-center gap-2">
			<button
				onclick={cancel}
				class="rounded-md bg-bc-tint/5 px-4 py-2 text-[13px] font-medium text-bc-mist transition hover:bg-bc-tint/10"
			>
				Cancel
			</button>
			<button
				onclick={confirmLeave}
				class="rounded-md bg-bc-coral/90 px-4 py-2 text-[13px] font-medium text-bc-abyss transition hover:bg-bc-coral"
			>
				Leave
			</button>
		</div>
	</Modal>
{/if}
