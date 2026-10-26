<script lang="ts">
	import Icon from '@iconify/svelte';
	import { trackEvent } from '$lib/utils/useLazyTracking';
	import { dismissAnnouncement } from '$lib/stores/announcement.svelte';

	const POST_URL = 'https://labs.leaningtech.com/blog/announcing-browsercode';
</script>

<!-- The ink has its own token (--color-bc-stripe-ink) because it sits on the lilac, not the page:
     --color-bc-abyss and --color-bc-text both flip to near-white on light and would vanish.

     Spacing is in px, not rem: under 850px layout.css scales the root font size with the
     viewport, which would squeeze the copy against Dismiss exactly where it is tightest. -->
<div class="relative z-10 flex shrink-0 items-center bg-bc-stripe text-bc-stripe-ink">
	<a
		href={POST_URL}
		target="_blank"
		rel="noopener noreferrer"
		onclick={() => trackEvent('Clicked Announcement')}
		class="group flex min-w-0 flex-1 items-center gap-[8px] py-[9px] leading-none no-underline max-sm:justify-start max-sm:pr-[76px] max-sm:pl-[14px] max-sm:text-[11.5px] sm:justify-center sm:px-[86px] sm:text-[12.5px]"
	>
		<!-- Hidden on phones, where the badge and the sentence together overrun the stripe. -->
		<span
			class="hidden shrink-0 rounded-full bg-bc-stripe-ink px-[7px] py-[3px] text-[10.5px] font-semibold tracking-wide text-bc-stripe uppercase sm:inline"
			>New</span
		>
		<!-- min-w-0 here and on the <a>, or flex's min-width:auto grows both past the stripe instead
		     of letting truncate bite. Phones left-align because centring would need Dismiss-width
		     padding on both sides; left-aligned, the copy fits uncut down to ~350px. -->
		<span class="min-w-0 truncate font-medium">Read the BrowserCode release announcement!</span>
		<Icon
			icon="mingcute:arrow-right-line"
			width="13"
			height="13"
			class="shrink-0 transition-transform duration-150 group-hover:translate-x-[2px] max-sm:hidden"
		/>
	</a>

	<!-- Absolute so the copy centres on the viewport, not on the space left beside the button.
	     /80 is the floor: /70 blends to 4.49:1 on the light theme's fill, a hair under AA. -->
	<button
		type="button"
		onclick={dismissAnnouncement}
		class="absolute top-1/2 right-[12px] -translate-y-1/2 rounded px-[8px] py-[4px] text-[11.5px] leading-none font-medium text-bc-stripe-ink/80 transition-colors duration-150 hover:bg-bc-stripe-ink/10 hover:text-bc-stripe-ink"
	>
		Dismiss
	</button>
</div>
