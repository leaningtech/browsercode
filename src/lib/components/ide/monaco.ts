import * as monaco from 'monaco-editor';
import { typescript as monacoTs } from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

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

// Browserpod have no node_modules the TS worker can resolve, so semantic
// validation would flag every import as "cannot find module". Keep syntax checks.
for (const defaults of [monacoTs.typescriptDefaults, monacoTs.javascriptDefaults])
	defaults.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: false });

monaco.editor.defineTheme('browsercode-dark', {
	base: 'vs-dark',
	inherit: true,
	rules: [],
	colors: {
		'editor.background': '#09090b',
		'editor.foreground': '#d9d9d9',
		'editorCursor.foreground': '#10b981',
		'editor.selectionBackground': '#10b9812e',
		'editor.inactiveSelectionBackground': '#10b9811a',
		'editor.lineHighlightBackground': '#ffffff05',
		'editorLineNumber.foreground': '#ffffff40',
		'editorLineNumber.activeForeground': '#ffffff8c',
		'editorGutter.background': '#09090b',
		'editorIndentGuide.background1': '#ffffff0a',
		'editorIndentGuide.activeBackground1': '#ffffff1f',
		'editorWidget.background': '#111111',
		'editorWidget.border': '#ffffff14',
		'scrollbarSlider.background': '#ffffff1f',
		'scrollbarSlider.hoverBackground': '#ffffff38',
		'scrollbarSlider.activeBackground': '#ffffff38',
		'editorOverviewRuler.border': '#00000000'
	}
});

// Svelte and Vue have no Monaco grammar, so they fall back to HTML.
const LANGUAGE_BY_EXT: Record<string, string> = {
	svelte: 'html',
	vue: 'html',
	html: 'html',
	htm: 'html',
	ts: 'typescript',
	tsx: 'typescript',
	mts: 'typescript',
	cts: 'typescript',
	js: 'javascript',
	jsx: 'javascript',
	mjs: 'javascript',
	cjs: 'javascript',
	css: 'css',
	scss: 'scss',
	less: 'less',
	json: 'json',
	md: 'markdown',
	markdown: 'markdown',
	yaml: 'yaml',
	yml: 'yaml',
	xml: 'xml',
	svg: 'xml'
};

// Maps a file path to a Monaco language id by its extension; unknown types are plaintext.
export function languageFor(file: string): string {
	const ext = file.slice(file.lastIndexOf('.') + 1).toLowerCase();
	return LANGUAGE_BY_EXT[ext] ?? 'plaintext';
}

export { monaco };
