<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import type * as Monaco from 'monaco-editor';
	import type { IdeSession } from '$lib/ide/session.svelte';

	let { session }: { session: IdeSession } = $props();

	let container = $state<HTMLDivElement | null>(null);
	let monacoMod = $state.raw<typeof import('./monaco') | null>(null);
	let editor = $state.raw<Monaco.editor.IStandaloneCodeEditor | null>(null);
	let destroyed = false;

	// Responsive font
	const FONT_QUERY = '(min-width: 640px)';
	const fontSizeFor = (desktop: boolean) => (desktop ? 12.8 : 11.5);

	onMount(() => {
		const media = window.matchMedia(FONT_QUERY);
		const onMediaChange = () => editor?.updateOptions({ fontSize: fontSizeFor(media.matches) });
		media.addEventListener('change', onMediaChange);

		// Load Monaco lazily
		void import('./monaco').then((mod) => {
			if (destroyed || !container) return;
			monacoMod = mod;
			editor = mod.monaco.editor.create(container, {
				value: session.fileContent,
				language: mod.languageFor(session.selectedFile),
				theme: 'browsercode-dark',
				automaticLayout: true,
				fontSize: fontSizeFor(media.matches),
				fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace, monospace",
				minimap: { enabled: false },
				scrollBeyondLastLine: false,
				padding: { top: 6 },
				lineNumbersMinChars: 3,
				renderLineHighlight: 'all',
				scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
				fixedOverflowWidgets: true
			});
			// Mirror every edit back into shared state.
			editor.onDidChangeModelContent(() => {
				if (editor) session.fileContent = editor.getValue();
			});
		});

		return () => media.removeEventListener('change', onMediaChange);
	});

	// Push session state into the editor.
	$effect(() => {
		const file = session.selectedFile;
		const content = session.fileContent;
		if (!editor || !monacoMod) return;
		const model = editor.getModel();
		if (!model) return;
		const language = monacoMod.languageFor(file);
		if (model.getLanguageId() !== language)
			monacoMod.monaco.editor.setModelLanguage(model, language);
		if (content !== model.getValue()) model.setValue(content);
	});

	// Autosave: debounce a write to 1s after the last edit.
	let saveTimeout: ReturnType<typeof setTimeout>;

	$effect(() => {
		if (session.dirty && !session.loading) {
			clearTimeout(saveTimeout);
			saveTimeout = setTimeout(() => void session.saveFile(), 1000);
		}
	});

	// Teardown: Monaco leaks DOM/workers if not disposed
	onDestroy(() => {
		destroyed = true;
		clearTimeout(saveTimeout);
		editor?.dispose();
		editor = null;
	});
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
	<div class="relative min-h-0 flex-1 overflow-hidden bg-zinc-950">
		<div bind:this={container} class="h-full w-full"></div>
		{#if session.loading || !editor}
			<div
				class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-zinc-950"
			>
				<span class="loader-spin text-emerald-500">
					<Icon icon="mingcute:loading-3-line" width="18" height="18" />
				</span>
				<span class="text-[11px] text-white/25">Loading…</span>
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
</style>
