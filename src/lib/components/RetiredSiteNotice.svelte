<script lang="ts">
	import Icon from '@iconify/svelte';
	import { page } from '$app/stores';
	import Modal from '$lib/components/Modal.svelte';

	/** The redirect rule on javafiddle.leaningtech.com tags every visitor it sends here with this. */
	const FROM = 'javafiddle';
	const STORAGE_KEY = 'bc-retired-site-notice-seen';

	function readSeen(): boolean {
		try {
			return localStorage.getItem(STORAGE_KEY) !== null;
		} catch (error) {
			console.warn('Could not read the retired-site notice flag:', error);
			return false;
		}
	}

	let open = $state($page.url.searchParams.get('from') === FROM && !readSeen());

	function close(): void {
		open = false;
		try {
			localStorage.setItem(STORAGE_KEY, '1');
		} catch (error) {
			console.warn('Could not persist the retired-site notice flag:', error);
		}
	}
</script>

{#if open}
	<Modal
		onClose={close}
		labelledby="retired-site-title"
		layer="z-[80]"
		class="glass-panel glass-panel-solid max-w-md rounded-xl border border-bc-mist/15 px-6 py-7 text-center shadow-2xl"
	>
		<div
			class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-bc-azure/10 text-bc-azure"
		>
			<Icon icon="mingcute:information-line" width="22" height="22" />
		</div>
		<h3 id="retired-site-title" class="mb-2 text-[14px] font-semibold text-bc-text">
			JavaFiddle has grown into BrowserCode
		</h3>
		<p class="mb-5 text-[12.5px] leading-relaxed text-bc-text-muted">
			Same Java playground, new home. Your old links still open and nothing you used has gone away.
			What’s new: Java 8 to 25, compiler errors marked in the editor, and a redesigned UI.
		</p>
		<button
			onclick={close}
			class="rounded-md bg-bc-azure/90 px-4 py-2 text-[13px] font-medium text-bc-abyss transition hover:bg-bc-azure"
		>
			Start coding
		</button>
	</Modal>
{/if}
