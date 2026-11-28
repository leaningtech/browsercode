<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import { page } from '$app/stores';
	import { replaceState } from '$app/navigation';
	import Modal from '$lib/components/Modal.svelte';

	/**
	 * The redirect rule on javafiddle.leaningtech.com tags every visitor it sends here with this,
	 * except embeds, which get /embed?runtime=cheerpj with no tag.
	 */
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

	const tagged = $page.url.searchParams.get('from') === FROM;
	let open = $state(tagged && !readSeen());

	function close(): void {
		open = false;
		try {
			localStorage.setItem(STORAGE_KEY, '1');
		} catch (error) {
			console.warn('Could not persist the retired-site notice flag:', error);
		}
	}

	// Dropped so a copied link doesn't show the notice to someone who never used JavaFiddle. Deferred
	// a tick: replaceState throws until the router starts, which is after the root layout mounts.
	onMount(() => {
		if (!tagged) return;
		const timer = setTimeout(() => {
			const url = new URL(location.href);
			url.searchParams.delete('from');
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			replaceState(url.href, $page.state);
		});
		return () => clearTimeout(timer);
	});
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
