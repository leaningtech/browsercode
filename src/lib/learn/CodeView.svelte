<script lang="ts">
	import { onMount, tick } from 'svelte';
	import type { HighlighterCore } from 'shiki/core';
	import { loadHighlighter, tokenize, type Token } from './highlight';
	import type { LineRange } from './lessons';

	type Props = {
		code: string;
		/** Character offset of the cursor, or null for none. */
		cursor?: number | null;
		selection?: [number, number] | null;
		highlight?: LineRange | null;
		/** Font size in px; the gutter and line height follow it. */
		fontSize?: number;
		/** Once true the visitor can type; `onchange` hears every edit. */
		editable?: boolean;
		onchange?: (code: string) => void;
		/** Without motion, for a recording that moves only when its clock does. */
		still?: boolean;
	};

	let {
		code,
		cursor = null,
		selection = null,
		highlight = null,
		fontSize = 16,
		editable = false,
		onchange,
		still = false
	}: Props = $props();

	let highlighter = $state<HighlighterCore | null>(null);
	let scroller: HTMLDivElement;
	let textarea = $state<HTMLTextAreaElement | null>(null);

	onMount(() => {
		void loadHighlighter().then((h) => (highlighter = h));
	});

	const lines = $derived(code.split('\n'));
	/** A file's final newline would show as an empty, numbered line; an editor needs it. */
	const shownLines = $derived(
		!editable && lines.length > 1 && lines.at(-1) === '' && cursor !== code.length
			? lines.length - 1
			: lines.length
	);
	const tokens = $derived<Token[][]>(
		(highlighter ? tokenize(highlighter, code) : lines.map((line) => [{ content: line }])).slice(
			0,
			shownLines
		)
	);

	/** Line and column of an offset, both 0-based. */
	function position(offset: number): { line: number; column: number } {
		const before = code.slice(0, offset).split('\n');
		return { line: before.length - 1, column: before.at(-1)!.length };
	}

	const cursorAt = $derived(cursor === null ? null : position(cursor));

	/** One rectangle per line the selection covers, in columns. */
	const selectionRects = $derived.by(() => {
		if (!selection) return [];
		const from = position(selection[0]);
		const to = position(selection[1]);
		const rects: { line: number; from: number; to: number }[] = [];
		for (let line = from.line; line <= to.line; line++) {
			rects.push({
				line,
				from: line === from.line ? from.column : 0,
				to: line === to.line ? to.column : lines[line].length + 1
			});
		}
		return rects;
	});

	const lineHeight = $derived(Math.round(fontSize * 1.5));

	// Keeps the line being typed, or the lines being explained, in view.
	$effect(() => {
		const focus = highlight
			? [highlight[0] - 1, highlight[1] - 1]
			: cursorAt
				? [cursorAt.line, cursorAt.line]
				: null;
		if (!focus || editable || !scroller) return;
		const top = focus[0] * lineHeight;
		const bottom = (focus[1] + 1) * lineHeight;
		const view = scroller.clientHeight;
		const margin = lineHeight * 2;
		let target = scroller.scrollTop;
		if (bottom + margin > target + view) target = bottom + margin - view;
		if (top - margin < target) target = top - margin;
		scroller.scrollTo({ top: Math.max(0, target), behavior: still ? 'instant' : 'smooth' });
	});

	/** Tab indents and Enter keeps the indentation: enough editor for a phone. */
	async function keydown(event: KeyboardEvent) {
		const el = event.currentTarget as HTMLTextAreaElement;
		const { selectionStart: start, selectionEnd: end, value } = el;
		let insert: string | null = null;
		if (event.key === 'Tab' && !event.shiftKey) insert = '  ';
		if (event.key === 'Enter') {
			const lineStart = value.lastIndexOf('\n', start - 1) + 1;
			const indent = value.slice(lineStart).match(/^ */)![0];
			const opens = value.slice(lineStart, start).trimEnd().endsWith('{');
			insert = `\n${indent}${opens ? '  ' : ''}`;
		}
		if (insert === null) return;
		event.preventDefault();
		const next = value.slice(0, start) + insert + value.slice(end);
		onchange?.(next);
		await tick();
		el.selectionStart = el.selectionEnd = start + insert.length;
	}
</script>

<div
	bind:this={scroller}
	class="code-view relative h-full overflow-auto"
	class:still
	style="--font-size: {fontSize}px; --line-height: {lineHeight}px;"
>
	<div class="relative min-w-max py-[0.5em]">
		{#each tokens as lineTokens, i (i)}
			{@const lit = highlight !== null && i + 1 >= highlight[0] && i + 1 <= highlight[1]}
			<div class="line" class:lit class:dim={highlight !== null && !lit && !editable}>
				<span class="gutter">{i + 1}</span><span class="text"
					>{#each lineTokens as token, t (t)}<span style:color={token.color}>{token.content}</span
						>{/each}</span
				>
				{#each selectionRects.filter((rect) => rect.line === i) as rect (rect.from)}
					<span
						class="selection"
						style="left: calc(var(--gutter) + {rect.from}ch); width: {rect.to - rect.from}ch;"
					></span>
				{/each}
				{#if cursorAt && cursorAt.line === i && !editable}
					<span class="cursor" style="left: calc(var(--gutter) + {cursorAt.column}ch);"></span>
				{/if}
			</div>
		{/each}
		{#if editable}
			<textarea
				bind:this={textarea}
				class="editor"
				value={code}
				rows={lines.length}
				spellcheck="false"
				autocapitalize="off"
				autocomplete="off"
				wrap="off"
				aria-label="Code"
				oninput={(event) => onchange?.(event.currentTarget.value)}
				onkeydown={keydown}
			></textarea>
		{/if}
	</div>
</div>

<style>
	.code-view {
		--gutter: 3.5ch;
		/* The IDE editor's font stack (EditorPane.svelte), so lessons look like the editor. */
		font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace, monospace;
		font-size: var(--font-size);
		line-height: var(--line-height);
		color: #ffffff;
		background: #0d0d0f;
	}
	.line {
		position: relative;
		height: var(--line-height);
		white-space: pre;
		transition: opacity 0.25s ease;
	}
	.line.lit {
		background: rgba(184, 238, 244, 0.1);
		box-shadow: inset 0.25em 0 0 #b8eef4;
	}
	.line.dim .text {
		opacity: 0.35;
	}
	.gutter {
		display: inline-block;
		width: var(--gutter);
		padding-right: 1ch;
		text-align: right;
		color: rgba(255, 255, 255, 0.25);
		user-select: none;
	}
	.cursor {
		position: absolute;
		top: 0.15em;
		bottom: 0.15em;
		width: 0.12em;
		background: #87d68d;
		animation: blink 1s steps(1) infinite;
	}
	.still .cursor {
		animation: none;
	}
	.still .line {
		transition: none;
	}
	.selection {
		position: absolute;
		top: 0;
		bottom: 0;
		background: rgba(74, 125, 255, 0.45);
	}
	.editor {
		position: absolute;
		top: 0.5em;
		left: var(--gutter);
		right: 0;
		bottom: 0.5em;
		margin: 0;
		padding: 0;
		border: 0;
		outline: none;
		resize: none;
		overflow: hidden;
		background: transparent;
		color: transparent;
		caret-color: #87d68d;
		font: inherit;
		line-height: var(--line-height);
		white-space: pre;
	}
	.editor::selection {
		background: rgba(74, 125, 255, 0.45);
	}
	@keyframes blink {
		50% {
			opacity: 0;
		}
	}
</style>
