<script lang="ts">
	import Icon from '@iconify/svelte';
	import Modal from '$lib/components/Modal.svelte';
	import CloneRepoForm from './CloneRepoForm.svelte';

	let { onClose, onNavigate }: { onClose: () => void; onNavigate?: (path: string) => void } =
		$props();
</script>

<Modal
	{onClose}
	labelledby="clone-repo-title"
	class="glass-panel glass-panel-solid w-full max-w-sm rounded-xl border border-bc-border p-6 shadow-2xl"
>
	<div class="mb-4 flex items-start justify-between gap-3">
		<div>
			<h3 id="clone-repo-title" class="mb-1 text-[14px] font-semibold text-bc-text">
				Clone from GitHub
			</h3>
			<p class="text-[12px] leading-relaxed text-bc-text-muted">
				Paste a repo URL, optionally with a branch and subdirectory, to open it in the IDE.
			</p>
		</div>
		<button
			onclick={onClose}
			aria-label="Close"
			class="shrink-0 rounded-md p-1 text-bc-icon transition hover:bg-bc-tint/10 hover:text-bc-mist"
		>
			<Icon icon="mingcute:close-line" width="16" height="16" />
		</button>
	</div>
	<CloneRepoForm autofocus {onNavigate} />
</Modal>
