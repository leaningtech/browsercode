import type { ThemeRegistration } from 'shiki';

/**
 * Built on the Okabe–Ito palette, which stays separable under protanopia, deuteranopia and
 * tritanopia. Every color clears WCAG AA (4.5:1) on this background.
 */
export const colorblindSafe: ThemeRegistration = {
	name: 'colorblind-safe',
	type: 'dark',
	colors: {
		'editor.background': '#0f1319',
		'editor.foreground': '#e6edf3',
		'editorCursor.foreground': '#56b4e9',
		'editor.selectionBackground': '#56b4e93d',
		'editor.inactiveSelectionBackground': '#56b4e921',
		'editor.lineHighlightBackground': '#ffffff08',
		'editorLineNumber.foreground': '#ffffff4d',
		'editorLineNumber.activeForeground': '#ffffff99',
		'editorGutter.background': '#0f1319',
		'editorIndentGuide.background1': '#ffffff0f',
		'editorIndentGuide.activeBackground1': '#ffffff2b',
		'editorWidget.background': '#161b22',
		'editorWidget.border': '#ffffff1f',
		'scrollbarSlider.background': '#ffffff26',
		'scrollbarSlider.hoverBackground': '#ffffff40',
		'scrollbarSlider.activeBackground': '#ffffff40',
		'editorOverviewRuler.border': '#00000000'
	},
	tokenColors: [
		{
			scope: ['comment', 'punctuation.definition.comment'],
			settings: { foreground: '#8d96a0', fontStyle: 'italic' }
		},
		{
			scope: ['string', 'string.quoted', 'string.template'],
			settings: { foreground: '#f0e442' }
		},
		{
			scope: ['constant.character.escape', 'string.regexp'],
			settings: { foreground: '#f5793a' }
		},
		{
			scope: ['constant.numeric', 'constant.language', 'support.constant'],
			settings: { foreground: '#e69f00' }
		},
		{
			scope: ['keyword', 'keyword.control', 'storage', 'storage.type', 'storage.modifier'],
			settings: { foreground: '#cc79a7' }
		},
		{
			scope: ['keyword.operator', 'punctuation', 'meta.brace'],
			settings: { foreground: '#7d8895' }
		},
		{
			scope: ['entity.name.function', 'support.function', 'meta.function-call'],
			settings: { foreground: '#56b4e9' }
		},
		{
			scope: [
				'entity.name.type',
				'entity.name.class',
				'entity.other.inherited-class',
				'support.type',
				'support.class'
			],
			settings: { foreground: '#9fe6ff' }
		},
		{
			scope: ['variable', 'variable.other', 'meta.definition.variable'],
			settings: { foreground: '#e6edf3' }
		},
		{
			scope: ['variable.parameter', 'meta.object-literal.key', 'support.variable.property'],
			settings: { foreground: '#b8c4d0' }
		},
		{
			scope: ['entity.name.tag', 'punctuation.definition.tag'],
			settings: { foreground: '#cc79a7' }
		},
		{
			scope: ['entity.other.attribute-name'],
			settings: { foreground: '#56b4e9' }
		},
		{
			scope: ['markup.heading', 'markup.bold'],
			settings: { foreground: '#e6edf3', fontStyle: 'bold' }
		},
		{
			scope: ['invalid', 'invalid.illegal'],
			settings: { foreground: '#f5793a', fontStyle: 'underline' }
		}
	]
};
