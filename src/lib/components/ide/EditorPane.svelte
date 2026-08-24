<script lang="ts">
	import { onDestroy, onMount, untrack } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import Icon from '@iconify/svelte';
	import { fileIcon } from '$lib/ide/file-icons';
	import ImageViewer from '$lib/components/ide/ImageViewer.svelte';
	import type * as Monaco from 'monaco-editor';
	import type { IdeSession } from '$lib/ide/session.svelte';

	let { session }: { session: IdeSession } = $props();

	let container = $state<HTMLDivElement | null>(null);
	let monacoMod = $state.raw<typeof import('./monaco') | null>(null);
	let editor = $state.raw<Monaco.editor.IStandaloneCodeEditor | null>(null);
	let destroyed = false;

	// One Monaco model per open tab (keyed by its file URI) keeps content and undo
	// history alive across switches; view states park cursor/scroll per path.
	const viewStates = new SvelteMap<string, Monaco.editor.ICodeEditorViewState | null>();
	let renderedPath = '';

	let activeFile = $derived(session.openFiles.find((file) => file.path === session.selectedFile));

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
				model: null,
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
			// Mirror every edit back into the tab it belongs to; a real edit pins a preview tab.
			editor.onDidChangeModelContent(() => {
				const entry = session.openFiles.find((file) => file.path === renderedPath);
				if (!entry || !editor) return;
				const value = editor.getValue();
				// Our own setValue (tab load) fires this event too; ignore it so it can't pin.
				if (entry.content === value) return;
				entry.content = value;
				entry.preview = false;
			});
		});

		return () => media.removeEventListener('change', onMediaChange);
	});

	/** Returns (creating if needed) the Monaco model that backs `path`. */
	function modelFor(mod: typeof import('./monaco'), path: string, content: string) {
		const uri = mod.monaco.Uri.file(path);
		return (
			mod.monaco.editor.getModel(uri) ??
			mod.monaco.editor.createModel(content, mod.languageFor(path), uri)
		);
	}

	/** Applies a pending Search "jump to line" once the target's model is showing, then clears it. */
	function consumeReveal(path: string) {
		const reveal = session.revealRequest;
		if (!editor || !reveal || reveal.path !== path) return;
		editor.revealLineInCenter(reveal.line);
		editor.setPosition({ lineNumber: reveal.line, column: reveal.column });
		editor.focus();
		session.revealRequest = null;
	}

	// Show the active tab: park the outgoing view state, attach the incoming
	// model, restore its cursor/scroll.
	$effect(() => {
		const entry = activeFile;
		if (!editor || !monacoMod) return;
		// Track the reveal request so a jump to the already-open file still re-runs this effect.
		void session.revealRequest;
		// Detaching on an image tab stops the previous file's text showing through under it.
		if (!entry || entry.image) {
			if (renderedPath) viewStates.set(renderedPath, editor.saveViewState());
			editor.setModel(null);
			renderedPath = '';
			return;
		}
		if (entry.path === renderedPath) {
			// Session-side content change — push it into the model.
			const model = editor.getModel();
			if (model && model.getValue() !== entry.content) model.setValue(entry.content);
			consumeReveal(entry.path);
			return;
		}
		if (renderedPath) viewStates.set(renderedPath, editor.saveViewState());
		const model = modelFor(monacoMod, entry.path, entry.content);
		if (model.getValue() !== entry.content) model.setValue(entry.content);
		editor.setModel(model);
		const viewState = viewStates.get(entry.path);
		if (viewState) editor.restoreViewState(viewState);
		renderedPath = entry.path;
		consumeReveal(entry.path);
	});

	// Dispose models and view states whose tab has been closed (or renamed away).
	$effect(() => {
		const open = new Set(session.openFiles.map((file) => file.path));
		if (!monacoMod || !editor) return;
		for (const model of monacoMod.monaco.editor.getModels()) {
			const path = model.uri.path.slice(1);
			if (open.has(path) || model === editor.getModel()) continue;
			model.dispose();
			viewStates.delete(path);
		}
	});

	// Autosave: debounce a write of the active tab to 1s after the last edit.
	// The path is captured so the save lands on the right tab even after a switch.
	let saveTimeout: ReturnType<typeof setTimeout>;

	$effect(() => {
		const path = session.selectedFile;
		if (session.dirty && !session.loading) {
			clearTimeout(saveTimeout);
			saveTimeout = setTimeout(() => void session.saveFile(path), 1000);
		}
	});

	// Saves are gated on `hasPortal`, so edits made during boot never persist. Flush
	// them once the dev server is up.
	$effect(() => {
		if (session.hasPortal) untrack(() => void session.saveAll());
	});

	// Teardown: Monaco leaks DOM/workers if not disposed
	onDestroy(() => {
		destroyed = true;
		clearTimeout(saveTimeout);
		editor?.dispose();
		editor = null;
		monacoMod?.monaco.editor.getModels().forEach((model) => model.dispose());
	});
</script>

<div class="flex h-full min-h-0 flex-col overflow-hidden">
	<div class="flex h-8 shrink-0 items-center overflow-x-auto border-b border-bc-mist/10 bg-bc-navy">
		{#if session.openFiles.length === 0}
			<div class="flex items-center gap-1.5 px-3 text-[11px] text-white/35">
				<Icon icon="mingcute:code-line" width="11" height="11" />
				<span class="font-medium tracking-wide">Editor</span>
			</div>
		{/if}
		{#each session.openFiles as file (file.path)}
			{@const active = session.selectedFile === file.path}
			{@const dirty = file.content !== file.savedContent}
			<div
				class="group flex h-8 shrink-0 items-center transition {active
					? 'bg-bc-azure/10 text-bc-mist'
					: 'text-white/30 hover:text-white/55'}"
			>
				<!-- Focus as a preview open so clicking a tab never changes its pin state. -->
				<button
					onclick={() => void session.openFile(file.path, true)}
					ondblclick={() => session.pinFile(file.path)}
					title={file.path}
					class="inline-flex h-8 items-center gap-1.5 border-none bg-transparent pl-3 text-[11px] font-medium"
				>
					<Icon icon={fileIcon(file.path)} width="11" height="11" class="shrink-0" />
					<span class="max-w-40 truncate" class:italic={file.preview}>
						{file.path.split('/').pop()}
					</span>
				</button>
				<button
					onclick={() => session.closeFile(file.path)}
					aria-label="Close {file.path}"
					class="inline-flex h-8 items-center border-none bg-transparent px-1.5 text-white/25 transition hover:text-white/70"
				>
					<!-- Dirty tabs show a dot where the close button sits; hover swaps it back. -->
					{#if dirty}
						<span class="h-1.5 w-1.5 rounded-full bg-white/50 group-hover:hidden"></span>
					{/if}
					<Icon
						icon="mingcute:close-line"
						width="10"
						height="10"
						class={dirty ? 'hidden group-hover:block' : ''}
					/>
				</button>
			</div>
		{/each}
	</div>
	<div class="relative min-h-0 flex-1 overflow-hidden bg-bc-abyss">
		<div bind:this={container} class="h-full w-full"></div>
		{#if activeFile?.image}
			<div class="absolute inset-0 z-10">
				<ImageViewer path={activeFile.path} image={activeFile.image} />
			</div>
		{/if}
		{#if session.openFiles.length === 0 && !session.loading && editor}
			<div class="absolute inset-0 z-10 flex items-center justify-center bg-bc-abyss">
				<span class="text-[11px] text-white/25">No file open</span>
			</div>
		{/if}
		{#if session.loading || !editor}
			<div
				class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-bc-abyss"
			>
				<span class="loader-spin text-bc-azure">
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
