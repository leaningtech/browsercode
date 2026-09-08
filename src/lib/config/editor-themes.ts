/**
 * Editor theme metadata.
 */

export type EditorThemeVariant = 'dark' | 'light';

export type EditorThemeId =
	| 'browsercode-dark'
	| 'colorblind-safe'
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
};

/** Ids are Shiki theme names, which `shikiToMonaco` registers with Monaco verbatim. */
export const editorThemes: EditorThemeConfig[] = [
	{ id: 'browsercode-dark', label: 'BrowserCode Dark', variant: 'dark' },
	{ id: 'colorblind-safe', label: 'Colorblind Safe', variant: 'dark' },
	{ id: 'dracula', label: 'Dracula', variant: 'dark' },
	{ id: 'tokyo-night', label: 'Tokyo Night', variant: 'dark' },
	{ id: 'night-owl', label: 'Night Owl', variant: 'dark' },
	{ id: 'one-dark-pro', label: 'One Dark Pro', variant: 'dark' },
	{ id: 'github-dark-default', label: 'GitHub Dark', variant: 'dark' },
	{ id: 'catppuccin-mocha', label: 'Catppuccin Mocha', variant: 'dark' }
];

/** Stands in for any variant with nothing stored, including light until one ships. */
export const defaultEditorThemeId: EditorThemeId = 'browsercode-dark';

export function editorThemesFor(variant: EditorThemeVariant): EditorThemeConfig[] {
	return editorThemes.filter((theme) => theme.variant === variant);
}

export function isEditorThemeId(value: string | null): value is EditorThemeId {
	return value !== null && editorThemes.some((theme) => theme.id === value);
}
