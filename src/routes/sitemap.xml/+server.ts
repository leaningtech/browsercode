import { INDEXABLE_PATHS, ORIGIN } from '$lib/config/seo';

export const prerender = true;

export function GET() {
	const urls = INDEXABLE_PATHS.map(
		(path) => `\t<url>\n\t\t<loc>${ORIGIN}${path}</loc>\n\t</url>`
	).join('\n');
	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
	return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
