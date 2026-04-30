import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
	response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
	response.headers.set('Cross-Origin-Resource-Policy', 'cross-origin');	
	response.headers.set('Content-Security-Policy', "frame-ancestors 'self' https://browserpod.io https://*.browserpod.io https://*.browserpod.pages.dev");
	return response;
};