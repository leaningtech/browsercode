import type { ThemeRegistration } from 'shiki';

/**
 * Light counterpart to browsercode-dark.ts — the same four roles (keyword/tag/heading blue,
 * constant/type/invalid violet, escape/function/attribute cyan, string green), each a darker,
 * more saturated shade than its dark-mode counterpart so it holds up on a white ground, plus
 * black in place of white for plain text. Cyan/violet/green reuse the exact values of
 * --color-bc-azure/orchid/green's light-mode override in layout.css, so the same three hues read
 * identically in the app's own UI accents and in code here — those were darkened off the source
 * palette to clear WCAG AA as text on light (see the comment there); blue has no bc-* counterpart
 * and already cleared AA at this shade, so it's unchanged.
 */
export const browsercodeLight: ThemeRegistration = {
	name: 'browsercode-light',
	type: 'light',
	colors: {
		'editor.background': '#ffffff',
		'editor.foreground': '#000000',
		'editorCursor.foreground': '#2c8132',
		'editor.selectionBackground': '#2e69ff25',
		'editor.inactiveSelectionBackground': '#2e69ff15',
		'editor.lineHighlightBackground': '#00000006',
		'editorLineNumber.foreground': '#94a3b8',
		'editorLineNumber.activeForeground': '#000000',
		'editorGutter.background': '#ffffff',
		'editorIndentGuide.background1': '#0000000d',
		'editorIndentGuide.activeBackground1': '#00000022',
		'editorWidget.background': '#ffffff',
		'editorWidget.border': '#e2e8f0',
		'scrollbarSlider.background': '#0000001a',
		'scrollbarSlider.hoverBackground': '#00000030',
		'scrollbarSlider.activeBackground': '#00000030',
		'editorOverviewRuler.border': '#00000000'
	},
	tokenColors: [
		{
			scope: ['comment', 'punctuation.definition.comment'],
			settings: { foreground: '#64748b', fontStyle: 'italic' }
		},
		{
			scope: ['string', 'string.quoted', 'string.template'],
			settings: { foreground: '#2c8132' }
		},
		{
			scope: ['constant.character.escape', 'string.regexp'],
			settings: { foreground: '#047c90' }
		},
		{
			scope: ['constant.numeric', 'constant.language', 'support.constant'],
			settings: { foreground: '#7a4ff7' }
		},
		{
			scope: ['keyword', 'keyword.control', 'storage', 'storage.type', 'storage.modifier'],
			settings: { foreground: '#2e69ff' }
		},
		{
			scope: ['keyword.operator', 'punctuation', 'meta.brace'],
			settings: { foreground: '#64748b' }
		},
		{
			scope: ['entity.name.function', 'support.function', 'meta.function-call'],
			settings: { foreground: '#047c90' }
		},
		{
			scope: [
				'entity.name.type',
				'entity.name.class',
				'entity.other.inherited-class',
				'support.type',
				'support.class'
			],
			settings: { foreground: '#7a4ff7' }
		},
		{
			scope: ['variable', 'variable.other', 'meta.definition.variable'],
			settings: { foreground: '#000000' }
		},
		{
			scope: ['variable.parameter', 'meta.object-literal.key', 'support.variable.property'],
			settings: { foreground: '#475569' }
		},
		{
			scope: ['entity.name.tag', 'punctuation.definition.tag'],
			settings: { foreground: '#2e69ff' }
		},
		{
			scope: ['entity.other.attribute-name'],
			settings: { foreground: '#047c90' }
		},
		{
			scope: ['markup.heading', 'markup.bold'],
			settings: { foreground: '#2e69ff', fontStyle: 'bold' }
		},
		{
			scope: ['invalid', 'invalid.illegal'],
			settings: { foreground: '#7a4ff7' }
		}
	]
};
