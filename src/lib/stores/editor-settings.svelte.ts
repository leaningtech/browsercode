import {
	defaultEditorThemeId,
	isEditorThemeId,
	type EditorThemeId,
	type EditorThemeVariant
} from '$lib/config/editor-themes';

const STORAGE_KEY = 'browsercode:editor-theme';

export const appearance: EditorThemeVariant = 'dark';

type ThemeChoices = Record<EditorThemeVariant, EditorThemeId | null>;

/** Unknown ids are dropped, so a stale value can't reach Monaco. */
function loadChoices(): ThemeChoices {
	const choices: ThemeChoices = { dark: null, light: null };
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return choices;
		const stored = JSON.parse(raw) as Partial<Record<EditorThemeVariant, unknown>>;
		for (const variant of ['dark', 'light'] as const) {
			const value = stored[variant];
			if (typeof value === 'string' && isEditorThemeId(value)) choices[variant] = value;
		}
	} catch (error) {
		console.warn('Could not read the stored editor theme:', error);
	}
	return choices;
}

const choices = $state<ThemeChoices>(loadChoices());

export function activeEditorThemeId(): EditorThemeId {
	return choices[appearance] ?? defaultEditorThemeId;
}

/** Persists the pick for the current appearance. */
export function setEditorTheme(id: EditorThemeId): void {
	choices[appearance] = id;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(choices));
	} catch (error) {
		console.warn('Could not persist the editor theme:', error);
	}
}
