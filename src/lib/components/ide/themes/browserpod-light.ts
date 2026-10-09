import type { ThemeRegistration } from 'shiki';

/**
 * Light counterpart to browserpod-dark.ts: the same BrowserPod brand accents on a white ground.
 * The plain-text foreground and white-tinted chrome overlays (line highlight, indent guides,
 * scrollbar, widget surface) invert to black-based equivalents, same as browsercode-light.ts.
 * The periwinkle, light-blue and gold accents are pastel precisely so they pop on near-black —
 * on white they're close to unreadable, so those three are darkened/more saturated here to the
 * same hue family (richer blue, indigo, amber); magenta and coral already have enough contrast on
 * white and are untouched, same as every other non-color value. editorWidget.border is the one
 * chrome exception: a solid --color-bc-border instead of a translucent black, matching
 * browsercode-light.ts rather than the (barely visible here, but still stray) dark-theme pattern.
 */
export const browserpodLight: ThemeRegistration = {
	name: 'browserpod-light',
	type: 'light',
	colors: {
		'editor.background': '#ffffff',
		'editor.foreground': '#000000',
		'editorCursor.foreground': '#10b981',
		'editor.selectionBackground': '#10b9812e',
		'editor.inactiveSelectionBackground': '#10b9811a',
		'editor.lineHighlightBackground': '#00000005',
		'editorLineNumber.foreground': '#00000040',
		'editorLineNumber.activeForeground': '#0000008c',
		'editorGutter.background': '#ffffff',
		'editorIndentGuide.background1': '#0000000a',
		'editorIndentGuide.activeBackground1': '#0000001f',
		'editorWidget.background': '#ffffff',
		'editorWidget.border': '#e2e8f0',
		'scrollbarSlider.background': '#0000001f',
		'scrollbarSlider.hoverBackground': '#00000038',
		'scrollbarSlider.activeBackground': '#00000038',
		'editorOverviewRuler.border': '#00000000'
	},
	tokenColors: [
		{
			scope: ['comment', 'punctuation.definition.comment'],
			settings: { foreground: '#5c6473', fontStyle: 'italic' }
		},
		{
			scope: ['string', 'string.quoted', 'string.template'],
			settings: { foreground: '#1d4ed8' }
		},
		{
			scope: ['constant.character.escape', 'string.regexp'],
			settings: { foreground: '#b45309' }
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
			settings: { foreground: '#b45309' }
		},
		{
			scope: [
				'entity.name.type',
				'entity.name.class',
				'entity.other.inherited-class',
				'support.type',
				'support.class'
			],
			settings: { foreground: '#4338ca' }
		},
		{
			scope: ['variable', 'variable.other', 'meta.definition.variable'],
			settings: { foreground: '#000000' }
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
			settings: { foreground: '#b45309' }
		},
		{
			scope: ['markup.heading', 'markup.bold'],
			settings: { foreground: '#1d4ed8', fontStyle: 'bold' }
		},
		{
			scope: ['invalid', 'invalid.illegal'],
			settings: { foreground: '#ff6161' }
		}
	]
};
