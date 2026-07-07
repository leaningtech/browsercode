export const leaveWarningState = $state<{ open: boolean; pendingPath: string }>({
	open: false,
	pendingPath: ''
});

// A `window.location.href` assignment triggers the browser's own `beforeunload` event just like
// a refresh or a closed tab does. Pages that listen for it (to catch tab-close/refresh/back-
// forward) call `consumeIntentionalNavigation()` there to skip their dialog for navigations we
// triggered ourselves — the in-app leave-warning modal already asked, so a second native prompt
// right after would just be a confusing duplicate.
let intentionalNavigation = false;

export function markIntentionalNavigation() {
	intentionalNavigation = true;
}

export function consumeIntentionalNavigation(): boolean {
	const wasIntentional = intentionalNavigation;
	intentionalNavigation = false;
	return wasIntentional;
}

/**
 * Navigates via a full page reload (the pod-teardown mechanism — see CLAUDE.md), unless leaving
 * an active agent session, in which case it asks for confirmation first since the running
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
