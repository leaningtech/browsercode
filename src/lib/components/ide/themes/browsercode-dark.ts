import type { ThemeRegistration } from 'shiki';

/**
 * The house dark theme, in TextMate form so Shiki loads it alongside the bundled ones: blue,
 * violet, cyan and green, plus white for plain text. See browsercode-light.ts for the light
 * counterpart — same roles, darker/more saturated shades of the same four hues plus black.
 */
export const browsercodeDark: ThemeRegistration = {
	name: 'browsercode-dark',
	type: 'dark',
	colors: {
		'editor.background': '#0d0d0f',
		'editor.foreground': '#ffffff',
		'editorCursor.foreground': '#87d68d',
		'editor.selectionBackground': '#4a7dff2e',
		'editor.inactiveSelectionBackground': '#4a7dff1a',
		'editor.lineHighlightBackground': '#ffffff05',
		'editorLineNumber.foreground': '#ffffff40',
		'editorLineNumber.activeForeground': '#ffffff8c',
		'editorGutter.background': '#0d0d0f',
		'editorIndentGuide.background1': '#ffffff0a',
		'editorIndentGuide.activeBackground1': '#ffffff1f',
		'editorWidget.background': '#121214',
		'editorWidget.border': '#26262a',
		focusBorder: '#ffffff33',
		'list.activeSelectionBackground': '#ffffff14',
		'list.highlightForeground': '#b8eef4',
		'scrollbarSlider.background': '#ffffff1f',
		'scrollbarSlider.hoverBackground': '#ffffff38',
		'scrollbarSlider.activeBackground': '#ffffff38',
		'editorOverviewRuler.border': '#00000000'
	},
	tokenColors: [
		{
			scope: ['comment', 'punctuation.definition.comment'],
			settings: { foreground: '#5c687a', fontStyle: 'italic' }
		},
		{
			scope: ['string', 'string.quoted', 'string.template'],
			settings: { foreground: '#87d68d' }
		},
		{
			scope: ['constant.character.escape', 'string.regexp'],
			settings: { foreground: '#06b6d4' }
		},
		{
			scope: ['constant.numeric', 'constant.language', 'support.constant'],
			settings: { foreground: '#a78bfa' }
		},
		{
			scope: ['keyword', 'keyword.control', 'storage', 'storage.type', 'storage.modifier'],
			settings: { foreground: '#4a7dff' }
		},
		{
			scope: ['keyword.operator', 'punctuation', 'meta.brace'],
			settings: { foreground: '#848e9c' }
		},
		{
			scope: ['entity.name.function', 'support.function', 'meta.function-call'],
			settings: { foreground: '#06b6d4' }
		},
		{
			scope: [
				'entity.name.type',
				'entity.name.class',
				'entity.other.inherited-class',
				'support.type',
				'support.class'
			],
			settings: { foreground: '#a78bfa' }
		},
		{
			scope: ['variable', 'variable.other', 'meta.definition.variable'],
			settings: { foreground: '#ffffff' }
		},
		{
			scope: ['variable.parameter', 'meta.object-literal.key', 'support.variable.property'],
			settings: { foreground: '#aeb6c2' }
		},
		{
			scope: ['entity.name.tag', 'punctuation.definition.tag'],
			settings: { foreground: '#4a7dff' }
		},
		{
			scope: ['entity.other.attribute-name'],
			settings: { foreground: '#06b6d4' }
		},
		{
			scope: ['markup.heading', 'markup.bold'],
			settings: { foreground: '#4a7dff', fontStyle: 'bold' }
		},
		{
			scope: ['invalid', 'invalid.illegal'],
			settings: { foreground: '#a78bfa' }
		}
	]
};
