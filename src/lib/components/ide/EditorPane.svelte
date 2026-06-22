<script lang="ts">
	import { onDestroy } from 'svelte';
	import Icon from '@iconify/svelte';
	import CodeMirror from 'svelte-codemirror-editor';
	import { lineNumbers } from '@codemirror/view';
	import { oneDark } from '@codemirror/theme-one-dark';
	import { svelte } from '@replit/codemirror-lang-svelte';
	import { javascript } from '@codemirror/lang-javascript';
	import { html } from '@codemirror/lang-html';
	import { css } from '@codemirror/lang-css';
	import { json } from '@codemirror/lang-json';
	import { vue } from '@codemirror/lang-vue';
	import type { IdeSession } from '$lib/ide/session.svelte';

	let { session }: { session: IdeSession } = $props();

	function languageExtensions(file: string) {
		if (file.endsWith('.svelte')) return [svelte()];
		if (file.endsWith('.vue')) return [vue()];
		if (file.endsWith('.tsx')) return [javascript({ typescript: true, jsx: true })];
		if (file.endsWith('.ts')) return [javascript({ typescript: true })];
		if (file.endsWith('.jsx')) return [javascript({ jsx: true })];
		if (file.endsWith('.js')) return [javascript()];
		if (file.endsWith('.html')) return [html()];
		if (file.endsWith('.css')) return [css()];
		if (file.endsWith('.json')) return [json()];
		return [];
	}

	let extensions = $derived([oneDark, ...languageExtensions(session.selectedFile), lineNumbers()]);

	let saveTimeout: ReturnType<typeof setTimeout>;

	$effect(() => {
		if (session.dirty && !session.loading) {
			clearTimeout(saveTimeout);
			saveTimeout = setTimeout(() => void session.saveFile(), 1000);
		}
	});

	onDestroy(() => clearTimeout(saveTimeout));
</script>

<div class="flex h-full min-h-0 flex-col overflow-hidden">
	<div class="flex h-8 shrink-0 items-center border-b border-white/[0.06] bg-[#111111] px-3">
		<div class="flex items-center gap-1.5 text-[11px] text-white/35">
			<Icon icon="mingcute:code-line" width="11" height="11" />
			<span class="font-medium tracking-wide">Editor</span>
			<span class="text-white/20">·</span>
			<span class="max-w-50 truncate text-white/50">{session.selectedFile}</span>
		</div>
	</div>
	<div class="editor-surface min-h-0 flex-1 overflow-hidden bg-zinc-950">
		{#if session.loading}
			<div class="flex h-full flex-col items-center justify-center gap-2">
				<span class="loader-spin text-emerald-500">
					<Icon icon="mingcute:loading-3-line" width="18" height="18" />
				</span>
				<span class="text-[11px] text-white/25">Loading…</span>
			</div>
		{:else}
			<div class="h-full w-full">
				<CodeMirror bind:value={session.fileContent} class="h-full" {extensions} />
			</div>
		{/if}
	</div>
</div>

<style>
	@keyframes loader-spin {
		to {
			transform: rotate(360deg);
		}
	}
	.loader-spin {
		display: inline-flex;
		animation: loader-spin 0.9s linear infinite;
		will-change: transform;
	}

	.editor-surface :global(.cm-editor) {
		height: 100%;
		background: rgb(9 9 11);
		color: rgba(255, 255, 255, 0.85);
	}
	.editor-surface :global(.cm-scroller) {
		height: 100%;
		font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace, monospace;
		font-size: 0.72rem;
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 255, 255, 0.12) transparent;
	}
	.editor-surface :global(.cm-gutters) {
		min-height: 100%;
		border-right: 1px solid rgba(255, 255, 255, 0.06);
		background: rgb(9 9 11);
		color: rgba(255, 255, 255, 0.25);
	}
	.editor-surface :global(.cm-line) {
		padding-left: 4px;
		padding-right: 8px;
	}
	.editor-surface :global(.cm-cursor) {
		border-left-color: rgb(16 185 129) !important;
	}
	.editor-surface :global(.cm-activeLine) {
		background: rgba(255, 255, 255, 0.018);
	}
	.editor-surface :global(.cm-activeLineGutter) {
		background: rgba(255, 255, 255, 0.025);
		color: rgba(255, 255, 255, 0.55);
	}
	.editor-surface :global(.cm-selectionBackground) {
		background: rgba(16, 185, 129, 0.18) !important;
	}
	.editor-surface :global(.cm-scroller::-webkit-scrollbar) {
		width: 8px;
		height: 8px;
	}
	.editor-surface :global(.cm-scroller::-webkit-scrollbar-track) {
		background: transparent;
	}
	.editor-surface :global(.cm-scroller::-webkit-scrollbar-thumb) {
		background: rgba(255, 255, 255, 0.12);
		border-radius: 4px;
	}
	.editor-surface :global(.cm-scroller::-webkit-scrollbar-thumb:hover) {
		background: rgba(255, 255, 255, 0.22);
	}
	.editor-surface :global(.cm-scroller::-webkit-scrollbar-corner) {
		background: transparent;
	}

	@media (min-width: 640px) {
		.editor-surface :global(.cm-scroller) {
			font-size: 0.8rem;
		}
	}
</style>
