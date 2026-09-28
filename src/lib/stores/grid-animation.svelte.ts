// Lets people turn the wavy grid background (idle wave motion and cursor reactivity) off
// entirely, e.g. on lower-power hardware. Module-level $state singleton, shared by every
// WavyGridBackground instance and the toggle button, persisted across reloads/navigation.
const STORAGE_KEY = 'browsercode:grid-animation-enabled';

function loadInitial(): boolean {
	try {
		return localStorage.getItem(STORAGE_KEY) !== 'false';
	} catch (error) {
		console.warn('Could not read the stored grid animation preference:', error);
		return true;
	}
}

export const gridAnimationState = $state({ enabled: loadInitial() });

export function toggleGridAnimation(): void {
	gridAnimationState.enabled = !gridAnimationState.enabled;
	try {
		localStorage.setItem(STORAGE_KEY, String(gridAnimationState.enabled));
	} catch (error) {
		console.warn('Could not persist the grid animation preference:', error);
	}
}
