import { error, redirect } from '@sveltejs/kit';
import { toolItems } from '$lib/config/tools';

// Legacy URLs: the agent pages lived at /claude, /gemini, … before the IDE
// moved in at the top level. Keep them working permanently.
export function load({ params }: { params: { tool: string } }) {
	if (toolItems.some((item) => item.id === params.tool)) {
		redirect(308, `/agents/${params.tool}`);
	}
	error(404, 'Not found');
}
