import type { Handle } from '@sveltejs/kit';
import { INDEXABLE_PATHS, ORIGIN, pageMeta } from '$lib/config/seo';

const AGENTS_CSP =
	"frame-ancestors 'self' https://browserpod.io https://*.browserpod.io https://*.browserpod.pages.dev";

const escapeAttr = (s: string) =>
	s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/**
 * Fills app.html's `%bc.<name>%` placeholders. With `ssr = false` this is the only per-page head a
 * client that doesn't run JavaScript ever sees, so it runs for every prerendered page and for the
 * SPA fallback (200.html), whose pathname is `/[fallback]`. That one isn't a real URL: it gets the
 * home page's title and og:url and, like every page outside INDEXABLE_PATHS, `noindex`.
 */
function fillHead(html: string, routeId: string | null, tool: string | undefined, path: string) {
	const { title, description } = pageMeta(routeId, tool);
	const indexable = INDEXABLE_PATHS.includes(path);
	const url = `${ORIGIN}${indexable ? path : '/'}`;
	const robots = indexable
		? `<link rel="canonical" href="${url}" />`
		: '<meta name="robots" content="noindex" />';
	return html
		.replaceAll('%bc.title%', escapeAttr(title))
		.replaceAll('%bc.description%', escapeAttr(description))
		.replaceAll('%bc.url%', url)
		.replaceAll('%bc.robots%', robots);
}

/** Dev mirror of `static/_headers`; the static build has no server, so keep the two in step. */
export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event, {
		transformPageChunk: ({ html }) =>
			fillHead(html, event.route.id, event.params.tool, event.url.pathname)
	});
	response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
	response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
	response.headers.set('Cross-Origin-Resource-Policy', 'cross-origin');

	// Clears the blanket frame-ancestors vite.config.ts sets, so only /agents stays unframable.
	if (event.url.pathname.startsWith('/agents')) {
		response.headers.set('Content-Security-Policy', AGENTS_CSP);
	} else {
		response.headers.delete('Content-Security-Policy');
	}

	return response;
};
