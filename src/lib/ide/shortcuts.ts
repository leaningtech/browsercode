import { tick } from 'svelte';
import type { IdeSession } from './session.svelte';
import type { ShellOptions } from './shell-options';

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

type Panel = 'files' | 'search';

/** The shell's own state and controls; the getters are read at the key press, not before. */
export type ShellControls = {
	session: IdeSession;
	shell: ShellOptions;
	isMobile: () => boolean;
	panel: () => Panel | null;
	setPanel: (panel: Panel | null) => void;
	/** Absent where the preview can't collapse. */
	togglePreview?: () => void;
	showPane: (pane: 'editor' | 'terminal') => void;
	focusSearch: () => void;
	focusEditor: () => void;
	focusTerminal: () => void;
	addTerminal: () => void;
};

/** Each action exists only where its control does; otherwise the key is left alone. */
export function createShortcutActions(
	controls: ShellControls
): Partial<Record<ShortcutId, () => void>> {
	const { session, shell } = controls;
	return {
		...(shell.editor && {
			save: () => void session.saveAll(),
			closeTab: () => session.closeFile(session.selectedFile),
			previousTab: () => selectTab(session, -1),
			nextTab: () => selectTab(session, 1),
			moveTabLeft: () => moveTab(session, -1),
			moveTabRight: () => moveTab(session, 1)
		}),
		...((shell.fileTree || shell.search) && {
			toggleSidePanel: () =>
				controls.setPanel(controls.panel() ? null : shell.fileTree ? 'files' : 'search')
		}),
		...(shell.search && {
			search: () =>
				controls.panel() === 'search' ? controls.focusSearch() : controls.setPanel('search')
		}),
		...(controls.togglePreview && { togglePreview: controls.togglePreview }),
		...(shell.editor && shell.terminal && { toggleTerminal: () => toggleTerminal(controls) }),
		...(shell.terminal &&
			session.runtime.startBash && {
				newTerminal: () => {
					if (controls.isMobile()) controls.showPane('terminal');
					controls.addTerminal();
				}
			}),
		...(session.runtime.run && { run: () => void session.run() })
	};
}

function selectTab(session: IdeSession, offset: number): void {
	const files = session.openFiles;
	const index = files.findIndex((file) => file.path === session.selectedFile);
	if (index < 0) return;
	void session.openFile(files[(index + offset + files.length) % files.length].path, true);
}

function moveTab(session: IdeSession, offset: -1 | 1): void {
	const index = session.openFiles.findIndex((file) => file.path === session.selectedFile);
	// `moveFile` inserts before `before`, so one step right is two along.
	const before = offset < 0 ? index - 1 : index + 2;
	if (index >= 0 && before >= 0 && before <= session.openFiles.length)
		session.moveFile(session.selectedFile, before);
}

function toggleTerminal(controls: ShellControls): void {
	const toTerminal = !document.activeElement?.closest('.xterm');
	if (controls.isMobile()) controls.showPane(toTerminal ? 'terminal' : 'editor');
	// A pane the narrow layout just showed can't take focus until it renders.
	void tick().then(() => (toTerminal ? controls.focusTerminal() : controls.focusEditor()));
}
