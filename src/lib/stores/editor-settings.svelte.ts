import {
	counterpartOf,
	defaultEditorThemeId,
	isEditorThemeId,
	type EditorThemeId,
	type EditorThemeVariant
} from '$lib/config/editor-themes';
import { themeState } from '$lib/stores/theme.svelte';

const STORAGE_KEY = 'browsercode:editor-theme';

/** Follows the app-wide light/dark toggle so the editor theme switches along with it. */
const currentAppearance: EditorThemeVariant = $derived(themeState.current);

export function appearance(): EditorThemeVariant {
	return currentAppearance;
}

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

function persistChoices(): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(choices));
	} catch (error) {
		console.warn('Could not persist the editor theme:', error);
	}
}

// Carries a theme family across the app-wide toggle: leaving dark on BrowserCode Dark and
// switching to light should land on BrowserCode Light, not on whatever was last picked for light
// (possibly a stale default from before this family was ever chosen). Themes with no counterpart
// (the bundled Shiki imports) are untouched — each variant keeps its own independent memory for
// those, exactly as before.
$effect.root(() => {
	let previousVariant = currentAppearance;
	$effect(() => {
		const variant = currentAppearance;
		if (variant === previousVariant) return;
		const previousId = choices[previousVariant] ?? defaultEditorThemeId[previousVariant];
		const counterpart = counterpartOf(previousId);
		if (counterpart) {
			choices[variant] = counterpart;
			persistChoices();
		}
		previousVariant = variant;
	});
});

export function activeEditorThemeId(): EditorThemeId {
	const variant = appearance();
	return choices[variant] ?? defaultEditorThemeId[variant];
}

/** Persists the pick for the current appearance. */
export function setEditorTheme(id: EditorThemeId): void {
	choices[appearance()] = id;
	persistChoices();
}
