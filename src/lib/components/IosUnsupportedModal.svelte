<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import { isIos } from '$lib/utils/platform';

	let unsupported = $state(false);
	let dismissed = $state(false);

	onMount(() => {
		unsupported = isIos();
	});
</script>

{#if unsupported && !dismissed}
	<div
		class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bc-abyss/80 px-6 backdrop-blur-md"
		role="dialog"
		aria-modal="true"
		aria-labelledby="ios-modal-title"
		style="padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom);"
	>
		<div
			class="glass-panel glass-panel-solid flex w-full max-w-lg flex-col items-center rounded-2xl border border-bc-mist/15 p-10 text-center shadow-2xl"
		>
			<div
				class="mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-bc-coral/10 text-bc-coral"
			>
				<Icon icon="mingcute:warning-line" width="32" height="32" />
			</div>

			<h2 id="ios-modal-title" class="mb-3 text-2xl font-semibold text-bc-text">
				iOS is not supported
			</h2>
			<p class="mb-10 text-base leading-relaxed text-bc-text-muted">
				BrowserCode relies on WebAssembly features that have known issues on iOS. Please open this
				page on a desktop browser for the best experience.
			</p>

			<button
				onclick={() => (dismissed = true)}
				class="w-full rounded-lg bg-bc-azure/90 py-3 text-sm font-medium text-bc-abyss transition-colors hover:bg-bc-azure"
			>
				Dismiss
			</button>
		</div>
	</div>
{/if}
