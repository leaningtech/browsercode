// Light/dark theme. Module-level $state singleton (same pattern as zen.svelte.ts) so the
// Sidebar toggle and the root layout's `data-theme` attribute share it without prop threading.
// `ssr` is off for this app (see +layout.ts), so `localStorage`/`document` are always available
// here — this module only ever runs in the browser.

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'bc-theme';

function readStored(): Theme {
	const stored = localStorage.getItem(STORAGE_KEY);
	return stored === 'light' ? 'light' : 'dark';
}

export const themeState = $state({ current: readStored() });

function apply(theme: Theme) {
	document.documentElement.dataset.theme = theme;
	localStorage.setItem(STORAGE_KEY, theme);
}

apply(themeState.current);

export function toggleTheme() {
	themeState.current = themeState.current === 'dark' ? 'light' : 'dark';
	apply(themeState.current);
}
