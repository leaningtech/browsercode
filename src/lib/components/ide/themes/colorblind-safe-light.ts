import type { ThemeRegistration } from 'shiki';

/**
 * Light counterpart to colorblind-safe.ts. The canonical Okabe–Ito hues are calibrated for
 * medium-light swatches on white paper, not for body text — at their original lightness most of
 * them fail WCAG AA against a white editor background, so each one here is darkened (same hue,
 * same or higher saturation) until it clears 4.5:1 on white. One role also changes which Okabe–Ito
 * hue it uses: the dark theme distinguishes "type" from "function" only by lightness (a pale tint
 * of the same sky blue), which collapses once both are darkened for contrast — type uses the
 * palette's bluish-green instead, which the dark theme leaves unused, for a true hue difference
 * rather than two near-identical darkened blues.
 */
export const colorblindSafeLight: ThemeRegistration = {
	name: 'colorblind-safe-light',
	type: 'light',
	colors: {
		'editor.background': '#ffffff',
		'editor.foreground': '#000000',
		'editorCursor.foreground': '#1676ab',
		'editor.selectionBackground': '#1676ab3d',
		'editor.inactiveSelectionBackground': '#1676ab21',
		'editor.lineHighlightBackground': '#00000008',
		'editorLineNumber.foreground': '#0000004d',
		'editorLineNumber.activeForeground': '#00000099',
		'editorGutter.background': '#ffffff',
		'editorIndentGuide.background1': '#0000000f',
		'editorIndentGuide.activeBackground1': '#0000002b',
		'editorWidget.background': '#ffffff',
		'editorWidget.border': '#0000001f',
		'scrollbarSlider.background': '#00000026',
		'scrollbarSlider.hoverBackground': '#00000040',
		'scrollbarSlider.activeBackground': '#00000040',
		'editorOverviewRuler.border': '#00000000'
	},
	tokenColors: [
		{
			scope: ['comment', 'punctuation.definition.comment'],
			settings: { foreground: '#67707b', fontStyle: 'italic' }
		},
		{
			scope: ['string', 'string.quoted', 'string.template'],
			settings: { foreground: '#79710a' }
		},
		{
			scope: ['constant.character.escape', 'string.regexp'],
			settings: { foreground: '#c1480a' }
		},
		{
			scope: ['constant.numeric', 'constant.language', 'support.constant'],
			settings: { foreground: '#956700' }
		},
		{
			scope: ['keyword', 'keyword.control', 'storage', 'storage.type', 'storage.modifier'],
			settings: { foreground: '#b74584' }
		},
		{
			scope: ['keyword.operator', 'punctuation', 'meta.brace'],
			settings: { foreground: '#66717d' }
		},
		{
			scope: ['entity.name.function', 'support.function', 'meta.function-call'],
			settings: { foreground: '#1676ab' }
		},
		{
			scope: [
				'entity.name.type',
				'entity.name.class',
				'entity.other.inherited-class',
				'support.type',
				'support.class'
			],
			settings: { foreground: '#007f5d' }
		},
		{
			scope: ['variable', 'variable.other', 'meta.definition.variable'],
			settings: { foreground: '#000000' }
		},
		{
			scope: ['variable.parameter', 'meta.object-literal.key', 'support.variable.property'],
			settings: { foreground: '#5b7289' }
		},
		{
			scope: ['entity.name.tag', 'punctuation.definition.tag'],
			settings: { foreground: '#b74584' }
		},
		{
			scope: ['entity.other.attribute-name'],
			settings: { foreground: '#1676ab' }
		},
		{
			scope: ['markup.heading', 'markup.bold'],
			settings: { foreground: '#000000', fontStyle: 'bold' }
		},
		{
			scope: ['invalid', 'invalid.illegal'],
			settings: { foreground: '#c1480a', fontStyle: 'underline' }
		}
	]
};
