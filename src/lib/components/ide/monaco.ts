import * as monaco from 'monaco-editor';
import { typescript as monacoTs } from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import { shikiToMonaco, textmateThemeToMonacoTheme } from '@shikijs/monaco';
import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import type { ThemeRegistrationResolved } from 'shiki';
import css from '@shikijs/langs/css';
import docker from '@shikijs/langs/docker';
import graphql from '@shikijs/langs/graphql';
import html from '@shikijs/langs/html';
import ini from '@shikijs/langs/ini';
import javascript from '@shikijs/langs/javascript';
import json from '@shikijs/langs/json';
import less from '@shikijs/langs/less';
import markdown from '@shikijs/langs/markdown';
import python from '@shikijs/langs/python';
import scss from '@shikijs/langs/scss';
import shellscript from '@shikijs/langs/shellscript';
import sql from '@shikijs/langs/sql';
import svelte from '@shikijs/langs/svelte';
import toml from '@shikijs/langs/toml';
import typescript from '@shikijs/langs/typescript';
import vue from '@shikijs/langs/vue';
import xml from '@shikijs/langs/xml';
import yaml from '@shikijs/langs/yaml';
import type { EditorThemeId } from '$lib/config/editor-themes';
import { THEME_DATA } from './themes/theme-data';

/**
 * Monaco bootstrap for the playground editor. This module (and EditorPane, which
 * dynamically imports it) is the only place that touches `monaco-editor`
 */

self.MonacoEnvironment = {
	getWorker(_workerId: string, label: string): Worker {
		if (label === 'json') return new jsonWorker();
		if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker();
		if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker();
		if (label === 'typescript' || label === 'javascript') return new tsWorker();
		return new editorWorker();
	}
};

// BrowserPod pods have no node_modules the TS worker can resolve, so semantic
// validation would flag every import as "cannot find module". Keep syntax checks.
for (const defaults of [monacoTs.typescriptDefaults, monacoTs.javascriptDefaults])
	defaults.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: false });

// Fallback for a failed install below: Monaco resolves an unknown theme name to vs-light, and
// silently, so every theme has to exist even without TextMate.
for (const [id, theme] of Object.entries(THEME_DATA))
	monaco.editor.defineTheme(
		id,
		textmateThemeToMonacoTheme(
			theme as ThemeRegistrationResolved
		) as monaco.editor.IStandaloneThemeData
	);

/* Replaces Monarch with TextMate grammars */
async function installHighlighting(): Promise<void> {
	// Not Monaco languages, so shikiToMonaco would skip them and they would fall back to
	// HTML (.svelte/.vue) or plaintext (.toml). Registering the extensions also lets Monaco
	// infer them in `modelFor`.
	monaco.languages.register({ id: 'svelte', extensions: ['.svelte'] });
	monaco.languages.register({ id: 'vue', extensions: ['.vue'] });
	monaco.languages.register({ id: 'toml', extensions: ['.toml'] });

	const highlighter = await createHighlighterCore({
		themes: Object.values(THEME_DATA),
		langs: [
			css,
			docker,
			graphql,
			html,
			ini,
			javascript,
			json,
			less,
			markdown,
			python,
			scss,
			shellscript,
			sql,
			svelte,
			toml,
			typescript,
			vue,
			xml,
			yaml
		],
		// Covers every grammar loaded here, and keeps the oniguruma wasm out of the bundle.
		engine: createJavaScriptRegexEngine()
	});

	// Reads the theme list once, and re-running would wrap `setTheme` twice.
	shikiToMonaco(highlighter, monaco);
}

/** Await before creating an editor: `shikiToMonaco` patches `create` and `setTheme`. */
export const highlightingReady: Promise<void> = installHighlighting().catch((error) => {
	console.error('Failed to install TextMate highlighting:', error);
});

/** Global; no editor or model is rebuilt. */
export function applyTheme(id: EditorThemeId): void {
	try {
		monaco.editor.setTheme(id);
	} catch (error) {
		console.error(`Failed to apply the ${id} editor theme:`, error);
	}
}

export { monaco };
