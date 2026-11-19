export const leaveWarningState = $state<{ open: boolean; pendingPath: string }>({
	open: false,
	pendingPath: ''
});

// A `window.location.href` assignment triggers the browser's own `beforeunload` event just like
// a refresh or a closed tab does. `installLeaveGuard()` below consumes this flag to skip the
// native prompt for navigations we triggered ourselves — the in-app leave-warning modal already
// asked, so a second native prompt right after would just be a confusing duplicate.
let intentionalNavigation = false;

export function markIntentionalNavigation() {
	intentionalNavigation = true;
}

/**
 * Browsers only let a script close a tab it opened or one with no history, and never an embed's
 * frame, so a refused close falls back to a reload once an allowed one would have happened.
 */
export function closeOrReloadTab(): void {
	markIntentionalNavigation();
	window.close();
	setTimeout(() => window.location.reload(), 400);
}

function consumeIntentionalNavigation(): boolean {
	const wasIntentional = intentionalNavigation;
	intentionalNavigation = false;
	return wasIntentional;
}

/**
 * Installs the native unload prompt for a page with a live session, and returns a disposer.
 * Only browsers get to show text here, and only their own generic wording; The custom
 * "your work will be lost" copy is reserved for in-app navigation via the leave-warning modal.
 * A `window.location.href` assignment fires this same event, so navigation we already
 * confirmed in-app is marked "intentional" and skipped here to avoid a duplicate prompt.
 * This only fires for real browser-driven unloads: tab close, refresh, back/forward, or a
 * typed URL.
 */
export function installLeaveGuard(): () => void {
	function handleBeforeUnload(event: BeforeUnloadEvent) {
		if (consumeIntentionalNavigation()) return;
		event.preventDefault();
		event.returnValue = '';
	}

	window.addEventListener('beforeunload', handleBeforeUnload);
	return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}

/**
 * Navigates via a full page reload (the pod-teardown mechanism — see CLAUDE.md), unless leaving
 * an active agent or IDE session, in which case it asks for confirmation first since the running
 * terminal's work would otherwise be lost without warning.
 */
export function navigateWithLeaveGuard(path: string, isActiveSession: boolean) {
	if (isActiveSession) {
		leaveWarningState.pendingPath = path;
		leaveWarningState.open = true;
		return;
	}
	markIntentionalNavigation();
	window.location.href = path;
}
