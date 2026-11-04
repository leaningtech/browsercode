import { toolItems } from '$lib/config/tools';

export const prerender = true;

const ORIGIN = 'https://browsercode.io';

// Public, indexable pages. Left out on purpose: /embed (an iframe widget for host pages),
// /ide/github/… (one URL per repo, not content of ours), and the legacy /<tool> redirects.
// Agent pages come from the registry, so enabling or dropping a tool updates the sitemap.
const paths = [
	'/',
	'/agents',
	...toolItems.filter((item) => !item.disabled).map((item) => `/agents/${item.id}`),
	'/ide',
	'/privacy'
];

export function GET() {
	const urls = paths.map((path) => `\t<url>\n\t\t<loc>${ORIGIN}${path}</loc>\n\t</url>`).join('\n');
	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
	return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
