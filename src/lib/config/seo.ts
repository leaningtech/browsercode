import { isEnabledTool, toolItems } from '$lib/config/tools';

export const ORIGIN = 'https://browsercode.io';

/** Static page routes kept out of search. /embed is an iframe widget for host pages. */
const NOINDEX_ROUTES = ['/embed'];

/**
 * The pages we want in search results: listed in /sitemap.xml and given a canonical link, while
 * every other HTML response gets `noindex` (hooks.server.ts). That covers NOINDEX_ROUTES and all
 * the SPA fallback (200.html) serves: /ide/github/… repo views, disabled tools, the legacy
 * /<tool> redirects and unknown URLs.
 *
 * Static routes are found on disk, so a new page is indexed unless it opts out above; only the
 * glob's keys are used, nothing is imported. Dynamic routes are skipped, except agent pages,
 * which come from the registry so enabling or dropping a tool updates the list.
 */
export const INDEXABLE_PATHS: readonly string[] = [
	...Object.keys(import.meta.glob('/src/routes/**/+page.svelte'))
		.map(
			(file) =>
				file.slice('/src/routes'.length, -'/+page.svelte'.length).replace(/\/\([^)]+\)/g, '') || '/' // route groups don't appear in the URL
		)
		.filter((route) => !route.includes('[') && !NOINDEX_ROUTES.includes(route)),
	...toolItems.filter((item) => !item.disabled).map((item) => `/agents/${item.id}`)
].sort();

export type PageMeta = { title: string; description: string };

const HOME: PageMeta = {
	title: 'BrowserCode: Start coding on your browser tab',
	description:
		'BrowserCode runs a multi-language WebAssembly sandbox in your browser tab. No installs, no servers, no cloud compute.'
};

/**
 * Title and description for a route. The single source for both the static head written at
 * prerender time (hooks.server.ts) and the one +layout.svelte keeps current on client-side
 * navigation, so the two can't drift.
 */
export function pageMeta(routeId: string | null, tool?: string): PageMeta {
	if (routeId === '/agents/[tool]' && isEnabledTool(tool)) {
		const { label } = toolItems.find((t) => t.id === tool)!;
		return {
			title: `${label} — BrowserCode`,
			description: `Run ${label} in your browser, on BrowserCode.`
		};
	}
	if (routeId?.startsWith('/ide')) {
		return {
			title: 'Playground IDE — BrowserCode',
			description: 'Build and preview web apps right in your browser, on BrowserCode.'
		};
	}
	if (routeId === '/agents') {
		return {
			title: 'Agents — BrowserCode',
			description: 'Use your favorite CLI agents without any installations, sandboxed.'
		};
	}
	if (routeId === '/privacy') {
		return {
			title: 'Privacy Policy — BrowserCode',
			description: 'How Leaning Technologies handles your data when you use BrowserCode.'
		};
	}
	return HOME;
}
