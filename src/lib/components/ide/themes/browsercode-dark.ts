import type { ThemeRegistration } from 'shiki';

/**
 * The house theme, in TextMate form so Shiki loads it alongside the bundled ones. Token colors come
 * from the `bc-*` palette in `routes/layout.css`.
 */
export const browsercodeDark: ThemeRegistration = {
	name: 'browsercode-dark',
	type: 'dark',
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
	},
	tokenColors: [
		{
			scope: ['comment', 'punctuation.definition.comment'],
			settings: { foreground: '#5c6473', fontStyle: 'italic' }
		},
		{
			scope: ['string', 'string.quoted', 'string.template'],
			settings: { foreground: '#b7cdff' }
		},
		{
			scope: ['constant.character.escape', 'string.regexp'],
			settings: { foreground: '#ffd633' }
		},
		{
			scope: ['constant.numeric', 'constant.language', 'support.constant'],
			settings: { foreground: '#c73da6' }
		},
		{
			scope: ['keyword', 'keyword.control', 'storage', 'storage.type', 'storage.modifier'],
			settings: { foreground: '#4a7dff' }
		},
		{
			scope: ['keyword.operator', 'punctuation', 'meta.brace'],
			settings: { foreground: '#7d8595' }
		},
		{
			scope: ['entity.name.function', 'support.function', 'meta.function-call'],
			settings: { foreground: '#ffd633' }
		},
		{
			scope: [
				'entity.name.type',
				'entity.name.class',
				'entity.other.inherited-class',
				'support.type',
				'support.class'
			],
			settings: { foreground: '#8fb0ff' }
		},
		{
			scope: ['variable', 'variable.other', 'meta.definition.variable'],
			settings: { foreground: '#d9d9d9' }
		},
		{
			scope: ['variable.parameter', 'meta.object-literal.key', 'support.variable.property'],
			settings: { foreground: '#a9b4c8' }
		},
		{
			scope: ['entity.name.tag', 'punctuation.definition.tag'],
			settings: { foreground: '#ff6161' }
		},
		{
			scope: ['entity.other.attribute-name'],
			settings: { foreground: '#ffd633' }
		},
		{
			scope: ['markup.heading', 'markup.bold'],
			settings: { foreground: '#b7cdff', fontStyle: 'bold' }
		},
		{
			scope: ['invalid', 'invalid.illegal'],
			settings: { foreground: '#ff6161' }
		}
	]
};
