import adapter from '@sveltejs/adapter-static';
/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			pages: 'dist',
			assets: 'dist',
			fallback: '200.html'
		}),
		// Absolute asset URLs so module scripts load on nested SPA-fallback routes (/agents/[tool]).
		paths: { relative: false },
		prerender: {
			handleUnseenRoutes: 'ignore'
		}
	}
};

export default config;
