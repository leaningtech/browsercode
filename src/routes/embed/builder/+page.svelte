<script lang="ts">
	import EmbedBuilder from '$lib/components/embed/EmbedBuilder.svelte';
</script>

<div class="bc-page-bg h-full w-full overflow-y-auto text-bc-mist">
	<div class="mx-auto max-w-3xl px-4 pt-16 pb-24 sm:px-8">
		<h1 class="mb-2 font-display text-3xl font-bold tracking-tight text-bc-text sm:text-4xl">
			Embed BrowserCode
		</h1>
		<p class="mb-10 max-w-2xl text-[13px] leading-relaxed text-bc-text-muted">
			Put a running project, a GitHub repo or a coding agent in your own page. Pick what to embed
			and which panes to show, then copy the snippet. The
			<!-- External docs, so resolve() does not apply. -->
			<!-- eslint-disable svelte/no-navigation-without-resolve -->
			<a
				href="https://github.com/leaningtech/browsercode/blob/main/docs/embedding.md"
				target="_blank"
				rel="noopener noreferrer"
				class="text-bc-text underline decoration-bc-tint/30 underline-offset-2 hover:text-bc-link-hover"
				>embedding guide</a
			>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
			lists every option.
		</p>
		<EmbedBuilder />
	</div>
</div>
