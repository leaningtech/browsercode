import type { Action } from 'svelte/action';

type DismissOptions = { open: boolean; close: () => void };

/**
 * Closes a popover on a press outside `node`, on Escape, or when the window loses focus. A press,
 * not a click: a row that closes its own menu is gone before its click reaches the window. `blur`
 * catches clicks into an iframe, which raise no event here.
 */
export const dismissable: Action<HTMLElement, DismissOptions> = (node, initial) => {
	let options = initial;
	const onPointerDown = (event: PointerEvent): void => {
		if (options.open && !node.contains(event.target as Node)) options.close();
	};
	const onKeyDown = (event: KeyboardEvent): void => {
		if (options.open && event.key === 'Escape') options.close();
	};
	const onBlur = (): void => {
		if (options.open) options.close();
	};
	window.addEventListener('pointerdown', onPointerDown);
	window.addEventListener('keydown', onKeyDown);
	window.addEventListener('blur', onBlur);
	return {
		update: (next) => {
			options = next;
		},
		destroy: () => {
			window.removeEventListener('pointerdown', onPointerDown);
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('blur', onBlur);
		}
	};
};
