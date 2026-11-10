import { toolItems } from '$lib/config/tools';

// Prerender one page per enabled tool, so each gets its own static head (title, description,
// canonical — see hooks.server.ts) instead of falling through to the SPA fallback, which
// serves every non-prerendered URL the same HTML as `/`. Disabled tools still fall back.
export function entries() {
	return toolItems.filter((item) => !item.disabled).map((item) => ({ tool: item.id }));
}
