<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/stores';
	import { replaceState } from '$app/navigation';
	import Icon from '@iconify/svelte';
	import JavaExamples from '$lib/components/java/JavaExamples.svelte';
	import JsTemplates from './JsTemplates.svelte';

	/**
	 * One tab per language, not per runtime: a runtime doesn't line up with what you write, so the
	 * axis wouldn't survive growth (Python and Rust would both be BrowserPod, and nobody wants a
	 * tab called CheerpJ). Side by side the lists also invite a comparison of things that aren't
	 * comparable, hence tabs over sections. `?lang=` names the tab, and is deliberately distinct
	 * from the embed's `?runtime=`, which names the machine and boots a project.
	 */
	type Lang = 'js' | 'java';

	let {
		unknownFramework,
		unknownExample,
		unreadableLink = false,
		lang
	}: {
		/** Set when ?framework= carried something we couldn't resolve, so the picker can say so. */
		unknownFramework?: string;
		/** Set when ?example= carried something we couldn't resolve. */
		unknownExample?: string;
		/** Set when a shared link's hash held no project we could read. */
		unreadableLink?: boolean;
		/** Opens on this tab, for a route that isn't /ide and so carries no `?lang=`. */
		lang?: Lang;
	} = $props();

	const TABS: { id: Lang; label: string; icon: string }[] = [
		{ id: 'js', label: 'JavaScript', icon: 'simple-icons:nodedotjs' },
		{ id: 'java', label: 'Java', icon: 'simple-icons:openjdk' }
	];

	function parseLang(value: string | null): Lang | undefined {
		return TABS.find((tab) => tab.id === value)?.id;
	}

	// Seeded once: the tab is this component's own state from here on, and `?lang=` only sets where
	// it opens. Deep links from the sidebar and a shared /java link land on the right one.
	let active = $state<Lang>(
		untrack(() => lang ?? parseLang($page.url.searchParams.get('lang')) ?? 'js')
	);

	/**
	 * Mirrored into the URL so a tab can be linked to and survives a reload. `replaceState`, not
	 * `push`: the tab filters one page rather than being a place of its own, so Back should leave
	 * the landing instead of walking the tabs.
	 */
	function select(tab: Lang): void {
		active = tab;
		// Only on /ide; the Java route renders this picker at its own URL, which ignores `?lang=`.
		if ($page.route.id !== '/ide') return;
		const url = new URL(location.href);
		url.searchParams.set('lang', tab);
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		replaceState(url.href, {});
	}
</script>

<!-- `m-auto` rather than centring the flex row: the page outgrows short screens, and a centred
     child that overflows can't scroll back to its top. -->
<div class="flex h-full w-full overflow-auto p-6 text-bc-mist">
	<div class="m-auto w-full max-w-lg py-4">
		<h1 class="mb-1 font-display text-[18px] font-semibold text-bc-text">IDE Playground</h1>
		<p class="mb-5 text-[13px] text-bc-text-muted">
			Pick a language. Each runs on its own runtime, right in this browser tab.
		</p>

		<div
			role="tablist"
			aria-label="Language"
			class="mb-6 flex gap-1 rounded-lg border border-bc-border bg-bc-tint/4 p-1"
		>
			{#each TABS as tab (tab.id)}
				<button
					role="tab"
					id="lang-tab-{tab.id}"
					aria-selected={active === tab.id}
					aria-controls="lang-panel-{tab.id}"
					onclick={() => select(tab.id)}
					class="tab flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-medium transition"
				>
					<Icon icon={tab.icon} width="15" height="15" class="shrink-0" />
					{tab.label}
				</button>
			{/each}
		</div>

		<!-- Held to the taller panel's height, so switching tabs doesn't bounce the heading and tabs
		     up and down. `min-height` only ever adds space, so a panel that outgrows it still fits. -->
		<div class="panels">
			{#if active === 'js'}
				<div id="lang-panel-js" role="tabpanel" aria-labelledby="lang-tab-js">
					<JsTemplates {unknownFramework} />
				</div>
			{:else}
				<div id="lang-panel-java" role="tabpanel" aria-labelledby="lang-tab-java">
					<JavaExamples {unknownExample} {unreadableLink} />
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.tab {
		color: var(--color-bc-text-muted);
		cursor: pointer;
	}
	.tab[aria-selected='false']:hover {
		color: var(--color-bc-text);
	}
	.tab[aria-selected='true'] {
		background: var(--color-bc-navy);
		color: var(--color-bc-text);
		box-shadow: 0 1px 3px rgb(0 0 0 / 25%);
	}
	.tab:focus-visible {
		outline: 1px solid var(--color-bc-azure);
		outline-offset: -1px;
	}

	/* Only where the grids are three across and both panels fit on screen; below that the page
	   scrolls anyway and the reserved space would just be a gap under the Java examples. */
	@media (min-width: 640px) {
		.panels {
			min-height: 22.5rem;
		}
	}
</style>
