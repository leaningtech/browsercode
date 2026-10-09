// Light/dark theme. Module-level $state singleton (same pattern as zen.svelte.ts) so the
// Sidebar toggle and the root layout's `data-theme` attribute share it without prop threading.
// `ssr` is off for this app (see +layout.ts), so `localStorage`/`document` are always available
// here — this module only ever runs in the browser.

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'bc-theme';

/** Falls back to dark when storage is blocked (privacy modes, sandboxed /embed iframes) — this
 *  runs at module-import time, so an uncaught throw here would take down every importer. */
function readStored(): Theme {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored === 'light' ? 'light' : 'dark';
	} catch (error) {
		console.warn('Could not read the stored theme:', error);
		return 'dark';
	}
}

export const themeState = $state({ current: readStored() });

/** Persisting is best-effort — same storage-blocked cases as readStored() above. */
function apply(theme: Theme) {
	document.documentElement.dataset.theme = theme;
	try {
		localStorage.setItem(STORAGE_KEY, theme);
	} catch (error) {
		console.warn('Could not persist the theme:', error);
	}
}

apply(themeState.current);

export function toggleTheme() {
	themeState.current = themeState.current === 'dark' ? 'light' : 'dark';
	apply(themeState.current);
}
