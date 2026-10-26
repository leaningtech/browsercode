<script lang="ts">
	import Icon from '@iconify/svelte';
	import { trackEvent } from '$lib/utils/useLazyTracking';
	import { announcementState, dismissAnnouncement } from '$lib/stores/announcement.svelte';

	const POST_URL = 'https://labs.leaningtech.com/blog/announcing-browsercode';
</script>

<!-- Announcement stripe, the first row of the app shell (see +layout.svelte), above the sidebar
     and main so it spans the full viewport width. Dismissing unmounts it, which hands the row's
     height straight back to the shell below (stores/announcement.svelte.ts holds the state).

     Solid lilac fill with near-black ink, both from their own palette tokens
     (--color-bc-stripe / --color-bc-stripe-ink in layout.css) since the ink has to stay dark in
     both themes: it sits on the lilac rather than on the page, so --color-bc-abyss and
     --color-bc-text would both flip to near-white underneath it. No border, the fill alone
     separates the stripe from the page.

     Spacing is in px rather than Tailwind's rem steps: under 850px layout.css scales the root
     font size with the viewport, which would shrink the gap between the centred copy and the
     Dismiss button exactly where the copy is widest relative to the stripe. -->
{#if !announcementState.dismissed}
	<div class="relative z-10 flex shrink-0 items-center bg-bc-stripe text-bc-stripe-ink">
		<a
			href={POST_URL}
			target="_blank"
			rel="noopener noreferrer"
			onclick={() => trackEvent('Clicked Announcement')}
			class="group flex min-w-0 flex-1 items-center gap-[8px] py-[9px] leading-none no-underline max-sm:justify-start max-sm:pr-[76px] max-sm:pl-[14px] max-sm:text-[11.5px] sm:justify-center sm:px-[86px] sm:text-[12.5px]"
		>
			<!-- Dark badge: the stripe's two colours swapped, so it reads as a cutout rather than a
			     third colour on the row. Held back to sm, since at phone width the badge and the
			     sentence together overrun the stripe. -->
			<span
				class="hidden shrink-0 rounded-full bg-bc-stripe-ink px-[7px] py-[3px] text-[10.5px] font-semibold tracking-wide text-bc-stripe uppercase sm:inline"
				>New</span
			>
			<!-- min-w-0 here and on the <a>: a flex child defaults to min-width:auto, so without it
			     both grow to fit this copy and push it past the stripe (and under the Dismiss button)
			     at narrow widths instead of letting truncate bite. The phone layout above left-aligns
			     rather than centring for the same reason: centring the full sentence needs matching
			     padding on both sides, and two Dismiss-widths of it don't leave the sentence room on a
			     phone. Left-aligned, with the arrow below dropped, it fits uncut down to ~350px, which
			     covers the common phone widths; truncate only bites under that. -->
			<span class="min-w-0 truncate font-medium">Read the BrowserCode release announcement!</span>
			<Icon
				icon="mingcute:arrow-right-line"
				width="13"
				height="13"
				class="shrink-0 transition-transform duration-150 group-hover:translate-x-[2px] max-sm:hidden"
			/>
		</a>

		<!-- Absolute rather than a third flex item, so the copy above stays centred on the viewport
		     instead of on the space this button leaves over. Tinted with the ink itself rather than
		     --color-bc-tint, which flips to white on dark and would wash out against the lilac. The
		     /80 is the floor: /70 blends to 4.49:1 on the light theme's fill, a hair under AA. -->
		<button
			type="button"
			onclick={dismissAnnouncement}
			class="absolute top-1/2 right-[12px] -translate-y-1/2 rounded px-[8px] py-[4px] text-[11.5px] leading-none font-medium text-bc-stripe-ink/80 transition-colors duration-150 hover:bg-bc-stripe-ink/10 hover:text-bc-stripe-ink"
		>
			Dismiss
		</button>
	</div>
{/if}
