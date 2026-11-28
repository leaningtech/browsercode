<script lang="ts">
	import { marked } from 'marked';
	import DOMPurify from 'dompurify';
	import { loadEmbeddedImage, releaseImage, type ImagePayload } from '$lib/ide/media';
	import type { IdeSession } from '$lib/ide/session.svelte';

	let { session, path, content }: { session: IdeSession; path: string; content: string } = $props();

	let article = $state<HTMLElement | null>(null);

	/** Object URLs of the workspace images the current render shows; revoked on every re-render. */
	let images: ImagePayload[] = [];

	/** Matches a URL with a scheme (`https:`, `mailto:`, `data:`) or a protocol-relative one. */
	const ABSOLUTE = /^([a-z][a-z\d+.-]*:|\/\/)/i;

	/**
	 * Resolves a relative link in the file at `from` to a project path: `/` is the project root,
	 * as on GitHub. Null when the link climbs out of the project.
	 */
	function resolvePath(from: string, href: string): string | null {
		const target = decodeURIComponent(href.split(/[?#]/)[0]);
		const parts = target.startsWith('/') ? [] : from.split('/').slice(0, -1);
		for (const segment of target.split('/')) {
			if (segment === '' || segment === '.') continue;
			if (segment === '..') {
				if (parts.length === 0) return null;
				parts.pop();
			} else parts.push(segment);
		}
		return parts.join('/');
	}

	/** GitHub's heading anchors: lowercase, punctuation dropped, spaces as hyphens. */
	function slug(text: string): string {
		return text
			.trim()
			.toLowerCase()
			.replace(/[^\p{L}\p{N}\s_-]/gu, '')
			.replace(/\s/g, '-');
	}

	function releaseAll(): void {
		for (const image of images) releaseImage(image);
		images = [];
	}

	// A README comes from an arbitrary repo, so its HTML is sanitized before it reaches the page.
	$effect(() => {
		const el = article;
		if (!el) return;
		const html = marked.parse(content, { async: false, gfm: true });
		const fragment = DOMPurify.sanitize(html, { RETURN_DOM_FRAGMENT: true });

		const seen: Record<string, number> = {};
		for (const heading of fragment.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
			const base = slug(heading.textContent ?? '');
			const count = seen[base] ?? 0;
			seen[base] = count + 1;
			heading.id = count ? `${base}-${count}` : base;
		}

		// A relative image lives in the workspace, not on this site: hold its src back so the
		// browser never fetches it from here, and fill it in from the project's files.
		const pending: { img: HTMLImageElement; file: string }[] = [];
		for (const img of fragment.querySelectorAll('img')) {
			const src = img.getAttribute('src') ?? '';
			if (!src || ABSOLUTE.test(src)) continue;
			img.removeAttribute('src');
			const file = resolvePath(path, src);
			if (file) pending.push({ img, file });
		}

		releaseAll();
		el.replaceChildren(fragment);

		let stale = false;
		const loaded: ImagePayload[] = [];
		void Promise.all(
			pending.map(async ({ img, file }) => {
				try {
					const image = await loadEmbeddedImage(session.fs, `${session.workdir}/${file}`);
					if (!image) return;
					if (stale) return releaseImage(image);
					loaded.push(image);
					img.src = image.url!;
				} catch {
					// A missing image stays a broken one, as it would on GitHub.
				}
			})
		);
		images = loaded;
		return () => {
			stale = true;
		};
	});

	$effect(() => releaseAll);

	/** Relative links open the project file in a tab; anchors scroll; the rest leave in a new tab. */
	function onClick(event: MouseEvent): void {
		const link = (event.target as Element | null)?.closest('a');
		const href = link?.getAttribute('href');
		if (!link || !href) return;
		event.preventDefault();
		if (href.startsWith('#')) {
			const id = decodeURIComponent(href.slice(1));
			article?.querySelector(`[id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'start' });
			return;
		}
		if (ABSOLUTE.test(href)) {
			window.open(href, '_blank', 'noopener,noreferrer');
			return;
		}
		const file = resolvePath(path, href);
		if (file && session.projectFiles.includes(file)) void session.openFile(file, true);
	}
</script>

<div class="h-full overflow-auto bg-bc-abyss">
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<article
		bind:this={article}
		onclick={onClick}
		class="markdown mx-auto max-w-4xl px-8 py-6"
	></article>
</div>

<style>
	.markdown {
		color: var(--color-bc-text);
		font-size: 14px;
		line-height: 1.6;
		overflow-wrap: break-word;
	}
	.markdown :global(> :first-child) {
		margin-top: 0;
	}
	.markdown :global(:is(p, ul, ol, blockquote, pre, table, details, hr)) {
		margin: 0 0 1rem;
	}
	.markdown :global(:is(h1, h2, h3, h4, h5, h6)) {
		margin: 1.5rem 0 1rem;
		font-weight: 600;
		line-height: 1.25;
		scroll-margin-top: 1rem;
	}
	.markdown :global(:is(h1, h2)) {
		padding-bottom: 0.3em;
		border-bottom: 1px solid var(--color-bc-border);
	}
	.markdown :global(h1) {
		font-size: 2em;
	}
	.markdown :global(h2) {
		font-size: 1.5em;
	}
	.markdown :global(h3) {
		font-size: 1.25em;
	}
	.markdown :global(h4) {
		font-size: 1em;
	}
	.markdown :global(:is(h5, h6)) {
		font-size: 0.875em;
	}
	.markdown :global(h6) {
		color: var(--color-bc-text-muted);
	}
	.markdown :global(a) {
		color: var(--color-bc-azure);
		text-decoration: none;
	}
	.markdown :global(a:hover) {
		text-decoration: underline;
	}
	.markdown :global(:is(ul, ol)) {
		padding-left: 2em;
	}
	.markdown :global(ul) {
		list-style: disc;
	}
	.markdown :global(ol) {
		list-style: decimal;
	}
	.markdown :global(li + li) {
		margin-top: 0.25em;
	}
	.markdown :global(li > :is(ul, ol)) {
		margin: 0.25em 0 0;
	}
	.markdown :global(li:has(> input[type='checkbox'])) {
		list-style: none;
	}
	.markdown :global(li > input[type='checkbox']) {
		margin: 0 0.35em 0.2em -1.4em;
		vertical-align: middle;
	}
	.markdown :global(blockquote) {
		padding: 0 1em;
		color: var(--color-bc-text-muted);
		border-left: 0.25em solid var(--color-bc-border);
	}
	.markdown :global(hr) {
		height: 0.25em;
		border: 0;
		background: var(--color-bc-border);
	}
	.markdown :global(:is(code, pre)) {
		font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace, monospace;
		font-size: 85%;
	}
	.markdown :global(code) {
		padding: 0.2em 0.4em;
		border-radius: 6px;
		background: color-mix(in srgb, var(--color-bc-mist) 15%, transparent);
	}
	.markdown :global(pre) {
		padding: 1rem;
		overflow: auto;
		line-height: 1.45;
		border-radius: 6px;
		background: var(--color-bc-surface);
	}
	.markdown :global(pre code) {
		padding: 0;
		font-size: 100%;
		background: transparent;
	}
	.markdown :global(table) {
		display: block;
		width: max-content;
		max-width: 100%;
		overflow: auto;
		border-collapse: collapse;
	}
	.markdown :global(:is(th, td)) {
		padding: 6px 13px;
		border: 1px solid var(--color-bc-border);
	}
	.markdown :global(th) {
		font-weight: 600;
	}
	.markdown :global(img) {
		display: inline;
		max-width: 100%;
		box-sizing: content-box;
	}
	.markdown :global(summary) {
		cursor: pointer;
	}
</style>
