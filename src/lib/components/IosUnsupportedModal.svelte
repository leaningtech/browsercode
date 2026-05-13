<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';

	let isIos = $state(false);
	let dismissed = $state(false);

	onMount(() => {
		const ua = navigator.userAgent;
		// iPad in desktop mode reports MacIntel with touch points
		isIos =
			/iPad|iPhone|iPod/.test(ua) ||
			(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
	});
</script>

{#if isIos && !dismissed}
	<div
		class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/80 px-6 backdrop-blur-md"
		role="dialog"
		aria-modal="true"
		aria-labelledby="ios-modal-title"
		style="padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom);"
	>
		<div class="flex w-full max-w-lg flex-col items-center rounded-2xl bg-zinc-900 p-10 text-center shadow-2xl">
			<div class="mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
				<Icon icon="mingcute:warning-line" width="32" height="32" class="text-zinc-400" />
			</div>

			<h2 id="ios-modal-title" class="mb-3 text-2xl font-semibold text-white">
				iOS is not supported
			</h2>
			<p class="mb-10 text-base leading-relaxed text-zinc-400">
				BrowserCode relies on WebAssembly features that have known issues on iOS. Please open this
				page on a desktop browser for the best experience.
			</p>

			<button
				onclick={() => (dismissed = true)}
				class="w-full rounded-lg bg-zinc-700 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-600"
			>
				Dismiss
			</button>
		</div>
	</div>
{/if}
