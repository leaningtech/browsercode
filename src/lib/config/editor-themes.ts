/**
 * Editor theme metadata.
 */

export type EditorThemeVariant = 'dark' | 'light';

export type EditorThemeId =
	| 'browsercode-dark'
	| 'browsercode-light'
	| 'browserpod-dark'
	| 'browserpod-light'
	| 'colorblind-safe'
	| 'colorblind-safe-light'
	| 'dracula'
	| 'tokyo-night'
	| 'night-owl'
	| 'one-dark-pro'
	| 'github-dark-default'
	| 'catppuccin-mocha';

export type EditorThemeConfig = {
	id: EditorThemeId;
	label: string;
	variant: EditorThemeVariant;
	/** The dark/light id of the same theme family, if it has one — see `counterpartOf`. */
	counterpart?: EditorThemeId;
};

/** Ids are Shiki theme names, which `shikiToMonaco` registers with Monaco verbatim. */
export const editorThemes: EditorThemeConfig[] = [
	{
		id: 'browsercode-dark',
		label: 'BrowserCode Dark',
		variant: 'dark',
		counterpart: 'browsercode-light'
	},
	{
		id: 'browsercode-light',
		label: 'BrowserCode Light',
		variant: 'light',
		counterpart: 'browsercode-dark'
	},
	{
		id: 'browserpod-dark',
		label: 'BrowserPod Dark',
		variant: 'dark',
		counterpart: 'browserpod-light'
	},
	{
		id: 'browserpod-light',
		label: 'BrowserPod Light',
		variant: 'light',
		counterpart: 'browserpod-dark'
	},
	{
		id: 'colorblind-safe',
		label: 'Colorblind Safe',
		variant: 'dark',
		counterpart: 'colorblind-safe-light'
	},
	{
		id: 'colorblind-safe-light',
		label: 'Colorblind Safe Light',
		variant: 'light',
		counterpart: 'colorblind-safe'
	},
	{ id: 'dracula', label: 'Dracula', variant: 'dark' },
	{ id: 'tokyo-night', label: 'Tokyo Night', variant: 'dark' },
	{ id: 'night-owl', label: 'Night Owl', variant: 'dark' },
	{ id: 'one-dark-pro', label: 'One Dark Pro', variant: 'dark' },
	{ id: 'github-dark-default', label: 'GitHub Dark', variant: 'dark' },
	{ id: 'catppuccin-mocha', label: 'Catppuccin Mocha', variant: 'dark' }
];

/** The pick `activeEditorThemeId` falls back to for a variant with nothing stored yet. */
export const defaultEditorThemeId: Record<EditorThemeVariant, EditorThemeId> = {
	dark: 'browsercode-dark',
	light: 'browsercode-light'
};

export function editorThemesFor(variant: EditorThemeVariant): EditorThemeConfig[] {
	return editorThemes.filter((theme) => theme.variant === variant);
}

export function isEditorThemeId(value: string | null): value is EditorThemeId {
	return value !== null && editorThemes.some((theme) => theme.id === value);
}

/** The matching dark/light id for a theme that has one, else null. */
export function counterpartOf(id: EditorThemeId): EditorThemeId | null {
	return editorThemes.find((theme) => theme.id === id)?.counterpart ?? null;
}
