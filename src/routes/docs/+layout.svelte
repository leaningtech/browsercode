<script lang="ts">
	import Icon from '@iconify/svelte';
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import { docsNav, findDocsEntry, nextDocsEntry } from '$lib/config/docs';

	let { children } = $props();

	// Prerendered output can be served with or without a trailing slash; the registry holds one
	// spelling, so normalise before looking a page up rather than failing to find it.
	let path = $derived($page.url.pathname.replace(/\/+$/, '') || '/');
	let current = $derived(findDocsEntry(path));
	let next = $derived(nextDocsEntry(path));

	// Closed by default on a phone, where the full tree would push the page itself off screen.
	let navOpen = $state(false);

	// The pane that scrolls is this layout's own element, not the window, so it survives a
	// navigation between docs pages and SvelteKit's scroll handling never touches it. Without
	// this, following a link from halfway down one page opens the next one halfway down too.
	let scroller = $state<HTMLElement | null>(null);
	$effect(() => {
		// Reading `path` is what subscribes this effect to it; it is never empty.
		if (path) scroller?.scrollTo({ top: 0 });
	});

	// Read off the rendered headings rather than declared per page, so a page's contents list
	// cannot fall out of step with its own headings. Ids are assigned here too, for the same
	// reason: one place decides what a section's anchor is.
	let article = $state<HTMLElement | null>(null);
	let sections = $state<{ id: string; label: string }[]>([]);
	let activeId = $state('');

	function slug(text: string): string {
		return text
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}

	/**
	 * The last heading to have reached the top band of the viewport, so it is the one being read.
	 *
	 * Deliberately reads the headings from the DOM rather than from `sections`: the effect below
	 * calls this immediately after assigning `sections`, so reading that state here would make the
	 * effect depend on what it had just written, and since each run builds a fresh array it would
	 * retrigger itself until Svelte aborted with effect_update_depth_exceeded.
	 */
	function syncActive(): void {
		if (!article) return;
		const headings = [...article.querySelectorAll('h2')];
		if (headings.length === 0) {
			activeId = '';
			return;
		}
		// At the bottom of the page there is no scrolling left to bring the final heading up past
		// the band, so the last section would never highlight on its own.
		if (scroller && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2) {
			activeId = headings[headings.length - 1].id;
			return;
		}
		let current = '';
		for (const heading of headings) {
			if (heading.getBoundingClientRect().top > 140) break;
			current = heading.id;
		}
		// Before the first heading scrolls up, the first section is still the one in view.
		activeId = current || headings[0].id;
	}

	// Coalesced into a frame: scroll fires far more often than the highlight can change, and each
	// run reads layout.
	let queued = false;
	function onScroll(): void {
		if (queued) return;
		queued = true;
		requestAnimationFrame(() => {
			queued = false;
			syncActive();
		});
	}

	$effect(() => {
		if (!path || !article) return;
		sections = [...article.querySelectorAll('h2')].map((heading) => {
			const label = heading.textContent?.trim() ?? '';
			heading.id ||= slug(label);
			return { id: heading.id, label };
		});
		syncActive();
	});
</script>

{#snippet navLinks(onNavigate: () => void)}
	<ul class="flex flex-col gap-0.5">
		{#each docsNav as entry (entry.path)}
			<li>
				<a
					href={resolve(entry.path)}
					onclick={onNavigate}
					aria-current={path === entry.path ? 'page' : undefined}
					class="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] no-underline transition
						{path === entry.path
						? 'bg-bc-azure/12 font-medium text-bc-azure'
						: 'text-bc-mist hover:bg-bc-tint/10 hover:text-bc-text'}"
				>
					<span class="flex-1">{entry.label}</span>
					{#if entry.path === '/privacy'}
						<Icon icon="mingcute:arrow-right-up-line" width="13" height="13" />
					{/if}
				</a>
				{#if entry.children}
					<ul class="mt-0.5 ml-3 flex flex-col gap-0.5 border-l border-bc-border pl-2">
						{#each entry.children as child (child.path)}
							<li>
								<a
									href={resolve(child.path)}
									onclick={onNavigate}
									aria-current={path === child.path ? 'page' : undefined}
									class="block rounded-md px-2.5 py-1.5 text-[12.5px] no-underline transition
										{path === child.path
										? 'bg-bc-azure/12 font-medium text-bc-azure'
										: 'text-bc-text-muted hover:bg-bc-tint/10 hover:text-bc-text'}"
								>
									{child.label}
								</a>
							</li>
						{/each}
					</ul>
				{/if}
			</li>
		{/each}
	</ul>
{/snippet}

<div
	bind:this={scroller}
	onscroll={onScroll}
	class="bc-page-bg h-full w-full overflow-y-auto text-bc-mist"
>
	<!-- Three columns, sized so the middle one is centred on the viewport rather than on this
	     scroller; see .docs-shell in layout.css for the arithmetic. -->
	<div class="docs-shell">
		<nav aria-label="Documentation" class="docs-rail">
			<div class="docs-sticky">
				<a
					href={resolve('/')}
					class="mb-5 inline-flex items-center gap-1.5 text-[12.5px] text-bc-text-muted no-underline transition hover:text-bc-link-hover"
				>
					<Icon icon="mingcute:arrow-left-line" width="13" height="13" />
					Back to BrowserCode
				</a>
				<div class="mb-2 px-2.5 text-[10px] font-medium tracking-widest text-bc-mist/50 uppercase">
					Documentation
				</div>
				{@render navLinks(() => {})}
			</div>
		</nav>

		<div class="docs-main">
			<!-- Phone: the same tree behind a disclosure, so the page itself stays at the top. -->
			<div class="docs-compact-nav mb-6">
				<a
					href={resolve('/')}
					class="mb-3 inline-flex items-center gap-1.5 text-[12.5px] text-bc-text-muted no-underline"
				>
					<Icon icon="mingcute:arrow-left-line" width="13" height="13" />
					Back to BrowserCode
				</a>
				<button
					type="button"
					onclick={() => (navOpen = !navOpen)}
					aria-expanded={navOpen}
					class="flex w-full items-center gap-2 rounded-lg border border-bc-border px-3 py-2 text-left text-[13px] text-bc-text"
				>
					<Icon icon="mingcute:book-2-line" width="15" height="15" />
					<span class="flex-1">{current?.label ?? 'Documentation'}</span>
					<Icon icon={navOpen ? 'mingcute:up-line' : 'mingcute:down-line'} width="15" height="15" />
				</button>
				{#if navOpen}
					<div class="mt-2 rounded-lg border border-bc-border p-1.5">
						{@render navLinks(() => (navOpen = false))}
					</div>
				{/if}
			</div>

			<article bind:this={article} class="docs-prose">
				{#if current}
					<h1
						class="mb-3 font-display text-3xl font-bold tracking-tight text-bc-text sm:text-[2.35rem]"
					>
						{current.label}
					</h1>
					<p class="mb-10 text-[15px] leading-relaxed text-bc-text-muted">
						{current.description}
					</p>
				{/if}

				{@render children()}

				{#if next}
					<a
						href={resolve(next.path)}
						class="mt-14 flex items-center gap-3 rounded-xl border border-bc-border px-4 py-3.5 no-underline transition hover:border-bc-azure/40"
					>
						<div class="min-w-0 flex-1">
							<div class="text-[11px] tracking-wide text-bc-text-muted uppercase">Next</div>
							<div class="truncate text-[14px] font-medium text-bc-text">{next.label}</div>
						</div>
						<Icon icon="mingcute:arrow-right-line" width="16" height="16" />
					</a>
				{/if}
			</article>
		</div>

		<!-- Right column: only worth its width once there is space for it, and only when the page
		     has more than one section to jump between. -->
		{#if sections.length > 1}
			<aside aria-label="On this page" class="docs-toc">
				<div class="docs-sticky">
					<div class="mb-2 text-[10px] font-medium tracking-widest text-bc-mist/50 uppercase">
						On this page
					</div>
					<ul class="flex flex-col gap-0.5 border-l border-bc-border">
						{#each sections as section (section.id)}
							<li>
								<a
									href="#{section.id}"
									aria-current={activeId === section.id ? 'location' : undefined}
									class="-ml-px block border-l py-1 pl-3 text-[12.5px] no-underline transition
										{activeId === section.id
										? 'border-bc-azure font-medium text-bc-azure'
										: 'border-transparent text-bc-text-muted hover:text-bc-text'}"
								>
									{section.label}
								</a>
							</li>
						{/each}
					</ul>
				</div>
			</aside>
		{/if}
	</div>
</div>
