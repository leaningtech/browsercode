<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { trackEvent } from '$lib/utils/useLazyTracking';

	// Attribution inside a host page: the one piece of BrowserCode chrome an embed keeps, and the
	// only way back to the app from it. `floating` lifts it onto a pill over the panes for embeds
	// whose shell has no header to sit in.
	let { floating = false, class: className = '' }: { floating?: boolean; class?: string } =
		$props();
</script>

<!-- Leaves the host page, so resolve() does not apply here. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<a
	href="https://browsercode.io"
	target="_blank"
	rel="noopener noreferrer"
	title="Built with BrowserCode — open browsercode.io"
	onclick={() => trackEvent('Clicked Embed Badge')}
	class="group flex shrink-0 items-center gap-1.5 no-underline transition {floating
		? 'rounded-full border border-bc-tint/12 bg-bc-navy/70 px-2.5 py-1 shadow-lg shadow-black/25 backdrop-blur-sm hover:border-bc-tint/25 hover:bg-bc-navy/90'
		: 'rounded px-1 py-0.5 hover:bg-bc-tint/5'} {className}"
>
	<img
		src={favicon}
		alt=""
		class="bc-logo-mark h-3.5 w-3.5 opacity-70 transition group-hover:opacity-100"
	/>
	<span
		class="font-display text-[10.5px] leading-none font-medium tracking-wide text-bc-text-muted transition group-hover:text-bc-text"
	>
		BrowserCode
	</span>
</a>
<!-- eslint-enable svelte/no-navigation-without-resolve -->
