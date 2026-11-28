import { error } from '@sveltejs/kit';
import { toolItems } from '$lib/config/tools';

// Prerender one page per tool in the registry, so each gets its own static head from
// hooks.server.ts instead of falling through to the SPA fallback, which answers every unmatched
// URL with the same HTML as `/`. Enabled tools get a title, description and canonical; disabled
// ones sit outside INDEXABLE_PATHS and so get `noindex`, which the fallback could never carry.
export function entries() {
	return toolItems.map((item) => ({ tool: item.id }));
}

// Any other name would otherwise render the agent page and start a session for a tool that
// does not exist; send it to the 404 page instead.
export function load({ params }: { params: { tool: string } }) {
	if (!toolItems.some((item) => item.id === params.tool)) {
		error(404, 'Not found');
	}
}
