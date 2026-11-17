type Shortcut = {
	label: string;
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
	save: { label: 'Save all', code: 'KeyS', mod: true },
	toggleSidePanel: { label: 'Toggle side panel', code: 'KeyB', mod: true },
	search: { label: 'Search in project', code: 'KeyF', mod: true, shift: true },
	closeTab: { label: 'Close tab', code: 'KeyW', alt: true },
	previousTab: { label: 'Previous tab', code: 'BracketLeft', alt: true },
	nextTab: { label: 'Next tab', code: 'BracketRight', alt: true },
	moveTabLeft: { label: 'Move tab left', code: 'BracketLeft', alt: true, shift: true },
	moveTabRight: { label: 'Move tab right', code: 'BracketRight', alt: true, shift: true },
	togglePreview: { label: 'Toggle preview', code: 'KeyP', alt: true },
	toggleTerminal: {
		label: 'Switch editor / terminal',
		code: 'Backquote',
		ctrl: true,
		inTerminal: true
	},
	newTerminal: {
		label: 'New terminal',
		code: 'Backquote',
		ctrl: true,
		shift: true,
		inTerminal: true
	},
	run: { label: 'Build and run', code: 'Enter', mod: true, inTerminal: true }
} satisfies Record<string, Shortcut>;

export type ShortcutId = keyof typeof SHORTCUTS;

const IS_MAC = navigator.platform.startsWith('Mac');

const KEY_NAMES: Record<string, string> = { BracketLeft: '[', BracketRight: ']', Backquote: '`' };

function keysLabel({ code, mod, ctrl, alt, shift }: Shortcut): string {
	const key = KEY_NAMES[code] ?? code.replace(/^Key/, '');
	if (IS_MAC)
		return `${ctrl ? '⌃' : ''}${alt ? '⌥' : ''}${shift ? '⇧' : ''}${mod ? '⌘' : ''}${key}`;
	return [(ctrl || mod) && 'Ctrl', alt && 'Alt', shift && 'Shift', key].filter(Boolean).join('+');
}

/** The shortcuts in `available`, in declaration order, with their keys as this platform shows them. */
export function describeShortcuts(available: ShortcutId[]): { label: string; keys: string }[] {
	return (Object.keys(SHORTCUTS) as ShortcutId[])
		.filter((id) => available.includes(id))
		.map((id) => ({ label: SHORTCUTS[id].label, keys: keysLabel(SHORTCUTS[id]) }));
}

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
