/**
 * Where AWT and Swing windows draw. CheerpJ has no API to list or close a window, so this finds
 * them by the class CheerpJ gives their elements.
 */

const WINDOW = '.cjWindow';

export type CheerpjDisplay = {
	/** Removes every window drawn so far, though not the program that opened it. */
	clearWindows: () => void;
	dispose: () => void;
};

/**
 * Mounts the display into `parent`, filling it, once CheerpJ has loaded. `onWindows` hears
 * whether any window is open, as programs open them and `clearWindows` removes them.
 */
export function createDisplay(
	parent: HTMLElement,
	onWindows: (open: boolean) => void
): CheerpjDisplay {
	const display = cheerpjCreateDisplay(-1, -1, parent);
	// CheerpJ's splash stays until a window opens, so a program that only prints never clears it.
	display.classList.remove('cheerpjLoading');
	const observer = new MutationObserver(() => onWindows(display.querySelector(WINDOW) !== null));
	// CheerpJ adds a window's element before it gives it the class, so the class has to be watched.
	observer.observe(display, { childList: true, subtree: true, attributeFilter: ['class'] });
	return {
		clearWindows: () => display.querySelectorAll(WINDOW).forEach((el) => el.remove()),
		dispose: () => observer.disconnect()
	};
}
