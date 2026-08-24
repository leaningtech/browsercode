import type { ThemeRegistration } from 'shiki';
import catppuccinMocha from '@shikijs/themes/catppuccin-mocha';
import dracula from '@shikijs/themes/dracula';
import githubDarkDefault from '@shikijs/themes/github-dark-default';
import nightOwl from '@shikijs/themes/night-owl';
import oneDarkPro from '@shikijs/themes/one-dark-pro';
import tokyoNight from '@shikijs/themes/tokyo-night';
import type { EditorThemeId } from '$lib/config/editor-themes';
import { browsercodeDark } from './browsercode-dark';
import { colorblindSafe } from './colorblind-safe';

/**
 * Colors for every id in `config/editor-themes.ts`, which holds the metadata the menu and store
 * read. Kept apart from it so this data stays behind the lazy Monaco import.
 */
export const THEME_DATA: Record<EditorThemeId, ThemeRegistration> = {
	'browsercode-dark': browsercodeDark,
	'colorblind-safe': colorblindSafe,
	dracula,
	'tokyo-night': tokyoNight,
	'night-owl': nightOwl,
	'one-dark-pro': oneDarkPro,
	'github-dark-default': githubDarkDefault,
	'catppuccin-mocha': catppuccinMocha
};
