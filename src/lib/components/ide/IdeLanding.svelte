<!--
	The picker both language pages share, one language at a time.

	These used to be tabs on /ide, with `?lang=` naming the open one. They are routes now — /ide is
	JavaScript, /java is Java — so each language has an address worth sharing, its own nested
	sidebar entry and its own title in search results. The switcher below is the same control the
	tabs were; it navigates instead of filtering. See `languages` for why the axis is the language
	rather than the runtime.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { languages, type LanguageId } from '$lib/config/frameworks';
	import JavaExamples from '$lib/components/java/JavaExamples.svelte';
	import JsTemplates from './JsTemplates.svelte';

	let {
		lang,
		unknownFramework,
		unknownExample,
		unreadableLink = false
	}: {
		/** Which language's page this is. */
		lang: LanguageId;
		/** Set when ?framework= carried something we couldn't resolve, so the picker can say so. */
		unknownFramework?: string;
		/** Set when ?example= carried something we couldn't resolve. */
		unknownExample?: string;
		/** Set when a shared link's hash held no project we could read. */
		unreadableLink?: boolean;
	} = $props();
</script>

<!-- `m-auto` rather than centring the flex row: the page outgrows short screens, and a centred
     child that overflows can't scroll back to its top. -->
<div class="flex h-full w-full overflow-auto p-6 text-bc-mist">
	<div class="m-auto w-full max-w-lg py-4">
		<!-- "IDE playground" is the umbrella the sidebar entry and the landing card use; these two
		     pages under it are named for their language, as their titles in search results are. -->
		<h1 class="mb-1 font-display text-[18px] font-semibold text-bc-text">
			{lang === 'java' ? 'Java Playground' : 'JavaScript Playground'}
		</h1>
		<p class="mb-5 text-[13px] text-bc-text-muted">
			{lang === 'java'
				? 'Compiled and run in this tab. Switch to JavaScript any time.'
				: 'Pick a template. Each language runs on its own runtime, right in this browser tab.'}
		</p>

		<!-- A full page load, not a client-side one: these pages each boot their own runtime, and
		     the rest of the app tears a session down the same way (see CLAUDE.md). -->
		<nav
			aria-label="Language"
			class="mb-6 flex gap-1 rounded-lg border border-bc-border bg-bc-tint/4 p-1"
		>
			{#each languages as item (item.id)}
				<a
					href={resolve(item.path)}
					aria-current={lang === item.id ? 'page' : undefined}
					data-sveltekit-reload
					class="lang flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-medium transition"
				>
					<Icon icon={item.icon} width="15" height="15" class="shrink-0" />
					{item.label}
				</a>
			{/each}
		</nav>

		{#if lang === 'java'}
			<JavaExamples {unknownExample} {unreadableLink} />
		{:else}
			<JsTemplates {unknownFramework} {unreadableLink} />
		{/if}

		<!-- The sidebar's own Embed button is desktop-only; this is the one that survives a narrow
		     screen. -->
		<p class="mt-5 text-center text-[12px] text-bc-text-muted">
			Want one of these running in your own page?
			<a
				href={resolve('/embed/builder')}
				class="text-bc-text underline decoration-bc-tint/30 underline-offset-2 hover:text-bc-link-hover"
				>Embed BrowserCode</a
			>.
		</p>
	</div>
</div>

<style>
	.lang {
		color: var(--color-bc-text-muted);
	}
	.lang:not([aria-current]):hover {
		color: var(--color-bc-text);
	}
	.lang[aria-current='page'] {
		background: var(--color-bc-navy);
		color: var(--color-bc-text);
		box-shadow: 0 1px 3px rgb(0 0 0 / 25%);
	}
	.lang:focus-visible {
		outline: 1px solid var(--color-bc-azure);
		outline-offset: -1px;
	}
</style>
