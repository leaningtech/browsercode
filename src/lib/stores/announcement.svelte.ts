// The dismissable announcement bar at the top of the page (AnnouncementBar.svelte). Module-level
// $state singleton (same pattern as theme.svelte.ts) so the root layout reads it without prop
// threading. `ssr` is off for this app (see +layout.ts), so `localStorage` is always available
// here, since this module only ever runs in the browser.

/** Bump this when the bar starts announcing something new: the stored value is matched against
 *  it, so a previous dismissal doesn't silently hide the next announcement. */
export const ANNOUNCEMENT_ID = 'announcing-browsercode';

const STORAGE_KEY = 'bc-announcement-dismissed';

/** Falls back to "not dismissed" when storage is blocked (privacy modes, sandboxed /embed
 *  iframes). This runs at module-import time, so an uncaught throw here would take down every
 *  importer. */
function readDismissed(): boolean {
	try {
		return localStorage.getItem(STORAGE_KEY) === ANNOUNCEMENT_ID;
	} catch (error) {
		console.warn('Could not read the dismissed announcement:', error);
		return false;
	}
}

export const announcementState = $state({ dismissed: readDismissed() });

/** Persisting is best-effort: same storage-blocked cases as readDismissed() above. */
export function dismissAnnouncement(): void {
	announcementState.dismissed = true;
	try {
		localStorage.setItem(STORAGE_KEY, ANNOUNCEMENT_ID);
	} catch (error) {
		console.warn('Could not persist the dismissed announcement:', error);
	}
}
