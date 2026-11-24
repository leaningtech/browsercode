/**
 * Java syntax colors for lesson code, in the IDE's own dark theme. Shiki alone, without Monaco:
 * lesson code is short, and the page has to work with a phone's keyboard, which Monaco doesn't.
 */
import { createHighlighterCore, type HighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import java from '@shikijs/langs/java';
import { browsercodeDark } from '$lib/components/ide/themes/browsercode-dark';

export type Token = { content: string; color?: string };

let highlighter: Promise<HighlighterCore> | null = null;

export function loadHighlighter(): Promise<HighlighterCore> {
	highlighter ??= createHighlighterCore({
		langs: [java],
		themes: [browsercodeDark],
		engine: createJavaScriptRegexEngine()
	});
	return highlighter;
}

/** One array of tokens per line; a line with no text has none. */
export function tokenize(h: HighlighterCore, code: string): Token[][] {
	return h
		.codeToTokensBase(code, { lang: 'java', theme: 'browsercode-dark' })
		.map((line) => line.map(({ content, color }) => ({ content, color })));
}
