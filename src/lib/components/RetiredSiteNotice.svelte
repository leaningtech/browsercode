<script lang="ts">
	import Icon from '@iconify/svelte';
	import { page } from '$app/stores';

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

	function handleKeydown(event: KeyboardEvent): void {
		if (open && event.key === 'Escape') close();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div
		class="fixed inset-0 z-80 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
		role="presentation"
		onclick={(e) => e.target === e.currentTarget && close()}
	>
		<div
			class="glass-panel glass-panel-solid max-w-md rounded-xl border border-bc-mist/15 px-6 py-7 text-center shadow-2xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="retired-site-title"
		>
			<div
				class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-bc-azure/10 text-bc-azure"
			>
				<Icon icon="mingcute:information-line" width="22" height="22" />
			</div>
			<h3 id="retired-site-title" class="mb-2 text-[14px] font-semibold text-bc-text">
				JavaFiddle is now part of BrowserCode
			</h3>
			<p class="mb-5 text-[12.5px] leading-relaxed text-bc-text-muted">
				JavaFiddle is being retired. This is the same Java playground: your links still open,
				everything JavaFiddle did works here, and there is more, from Java 8 to 25 to compiler
				errors marked in the editor.
			</p>
			<button
				onclick={close}
				class="rounded-md bg-bc-azure/90 px-4 py-2 text-[13px] font-medium text-bc-abyss transition hover:bg-bc-azure"
			>
				Close
			</button>
		</div>
	</div>
{/if}
