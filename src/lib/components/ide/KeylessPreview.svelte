<script lang="ts">
	import Icon from '@iconify/svelte';

	// Takes the preview's place once the loader hands over: a pod without an API key serves no
	// portals, so there is no app to frame.
	const DOCS_URL =
		'https://github.com/leaningtech/browsercode/blob/main/docs/embedding.md#keyless-mode';
</script>

<div class="bc-page-bg flex h-full w-full items-center justify-center p-4">
	<div
		class="glass-panel glass-panel-solid w-full max-w-85 rounded-xl border border-bc-border px-6 py-8 text-center"
	>
		<div
			class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-bc-gold/10 text-bc-gold"
		>
			<Icon icon="mingcute:key-2-line" width="22" height="22" />
		</div>
		<h3 class="mb-2 text-[14px] font-semibold text-bc-text">No live preview in keyless mode</h3>
		<p class="text-[12px] leading-relaxed break-words text-bc-text-muted">
			Your project is running; its output is in the terminal. Showing it here needs a BrowserPod API
			key, which this embed runs without.
		</p>
		<!-- eslint-disable svelte/no-navigation-without-resolve -->
		<a
			href={DOCS_URL}
			target="_blank"
			rel="noopener noreferrer"
			class="mt-3 inline-block text-[12px] text-bc-mist hover:text-bc-link-hover">Learn more</a
		>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	</div>
</div>
