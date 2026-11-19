type Shortcut = {
	/** `KeyboardEvent.code`, since ⌥ on a Mac changes `key`. */
	code: string;
	/** ⌘ on a Mac, Ctrl elsewhere. */
	mod?: boolean;
	ctrl?: boolean;
	alt?: boolean;
	shift?: boolean;
	/** Also fires from a terminal, which otherwise keeps its keys for the shell. */
	inTerminal?: boolean;
};

// Tab commands use Alt because browsers reserve Ctrl/⌘+W and Ctrl+Tab.
const SHORTCUTS = {
	save: { code: 'KeyS', mod: true },
	toggleSidePanel: { code: 'KeyB', mod: true },
	search: { code: 'KeyF', mod: true, shift: true },
	closeTab: { code: 'KeyW', alt: true },
	previousTab: { code: 'BracketLeft', alt: true },
	nextTab: { code: 'BracketRight', alt: true },
	moveTabLeft: { code: 'BracketLeft', alt: true, shift: true },
	moveTabRight: { code: 'BracketRight', alt: true, shift: true },
	togglePreview: { code: 'KeyP', alt: true },
	toggleTerminal: { code: 'Backquote', ctrl: true, inTerminal: true },
	newTerminal: { code: 'Backquote', ctrl: true, shift: true, inTerminal: true },
	run: { code: 'Enter', mod: true, inTerminal: true }
} satisfies Record<string, Shortcut>;

export type ShortcutId = keyof typeof SHORTCUTS;

const IS_MAC = navigator.platform.startsWith('Mac');

export function shortcutFor(event: KeyboardEvent): ShortcutId | undefined {
	const inTerminal = event.target instanceof Element && event.target.closest('.xterm') !== null;
	return (Object.keys(SHORTCUTS) as ShortcutId[]).find((id) => {
		const keys: Shortcut = SHORTCUTS[id];
		return (
			event.code === keys.code &&
			event.ctrlKey === (!!keys.ctrl || (!!keys.mod && !IS_MAC)) &&
			event.metaKey === (!!keys.mod && IS_MAC) &&
			event.altKey === !!keys.alt &&
			event.shiftKey === !!keys.shift &&
			(!inTerminal || !!keys.inTerminal)
		);
	});
}
