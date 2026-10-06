<script lang="ts">
	import { onDestroy } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import Icon from '@iconify/svelte';
	import { fileIcon } from '$lib/ide/file-icons';
	import { ProjectSearch, MAX_FILE_BYTES, type ContentMatch } from '$lib/ide/search.svelte';
	import type { IdeSession } from '$lib/ide/session.svelte';

	let { session, onFileOpen }: { session: IdeSession; onFileOpen?: () => void } = $props();

	// Size cap label for the "large file" note.
	const maxFileLabel = `${(MAX_FILE_BYTES / 1_000_000).toFixed(MAX_FILE_BYTES % 1_000_000 ? 1 : 0)} MB`;

	// The route owns one session for this component's lifetime, so capturing it once is fine.
	// svelte-ignore state_referenced_locally
	const search = new ProjectSearch(session);
	onDestroy(search.dispose);

	// Content hits grouped by file.
	let groups = $derived.by(() => {
		const byPath = new SvelteMap<string, ContentMatch[]>();
		for (const match of search.contentMatches) {
			const list = byPath.get(match.path);
			if (list) list.push(match);
			else byPath.set(match.path, [match]);
		}
		return [...byPath];
	});

	function open(path: string) {
		void session.openFile(path, true);
		onFileOpen?.();
	}

	function openMatch(match: ContentMatch) {
		void session.openAt(match.path, match.line, match.col);
		onFileOpen?.();
	}

	function focusInput(el: HTMLInputElement) {
		el.focus();
	}
</script>

<div class="flex h-full min-h-0 flex-col">
	<div class="px-2 pt-1.5 pb-1">
		<div class="relative">
			<Icon
				icon="mingcute:search-line"
				width="13"
				height="13"
				class="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-bc-icon"
			/>
			<input
				use:focusInput
				value={search.query}
				oninput={(e) => search.setQuery(e.currentTarget.value)}
				onkeydown={(e) => e.key === 'Enter' && search.runNow()}
				placeholder="Search files"
				spellcheck="false"
				autocomplete="off"
				class="w-full rounded border border-bc-border bg-bc-surface py-1 pr-2 pl-7 text-[11px] text-bc-text outline-none placeholder:text-bc-icon focus:border-bc-azure/50"
			/>
		</div>
	</div>

	<div class="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
		{#if !search.query.trim()}
			<p class="px-1.5 py-2 text-[11px] leading-relaxed text-bc-icon">
				Search across file names and contents.
			</p>
		{:else if search.busy && search.empty}
			<p class="px-1.5 py-2 text-[11px] text-bc-icon">Searching…</p>
		{:else if search.empty}
			<p class="px-1.5 py-2 text-[11px] text-bc-icon">No results for “{search.query.trim()}”.</p>
		{:else}
			{#if search.fileMatches.length > 0}
				<p
					class="px-1.5 pt-1 pb-0.5 text-[10px] font-medium tracking-widest text-bc-icon uppercase"
				>
					Files
				</p>
				{#each search.fileMatches as match (match.path)}
					<button
						type="button"
						onclick={() => open(match.path)}
						title={match.path}
						class="flex w-full items-center gap-1.5 rounded px-1.5 py-0.5 text-left text-[11px] text-bc-icon transition hover:bg-[rgb(var(--bc-tint)/5%)] hover:text-bc-mist"
					>
						<Icon icon={fileIcon(match.path)} width="12" height="12" class="shrink-0" />
						<span class="truncate">{match.path}</span>
					</button>
				{/each}
			{/if}

			{#if groups.length > 0}
				<p
					class="px-1.5 pt-2 pb-0.5 text-[10px] font-medium tracking-widest text-bc-icon uppercase"
				>
					In files
				</p>
				{#each groups as [path, matches] (path)}
					<div class="mb-0.5">
						<div
							class="flex items-center gap-1.5 px-1.5 py-0.5 text-[11px] text-bc-text-muted"
							title={path}
						>
							<Icon icon={fileIcon(path)} width="12" height="12" class="shrink-0" />
							<span class="truncate">{path}</span>
							<span class="ml-auto shrink-0 text-[10px] text-bc-icon">{matches.length}</span>
						</div>
						{#each matches as match (`${match.line}:${match.col}`)}
							<button
								type="button"
								onclick={() => openMatch(match)}
								class="flex w-full items-baseline gap-2 rounded py-0.5 pr-1.5 pl-6 text-left text-[11px] text-bc-icon transition hover:bg-[rgb(var(--bc-tint)/5%)] hover:text-bc-mist"
							>
								<span class="shrink-0 text-[10px] text-bc-icon tabular-nums">{match.line}</span>
								<span class="truncate font-mono">{match.preview}</span>
							</button>
						{/each}
					</div>
				{/each}
			{/if}

			{#if search.truncated || search.skippedLarge > 0}
				<p class="px-1.5 pt-2 text-[10px] leading-relaxed text-bc-icon">
					{#if search.truncated}Showing the first {search.contentMatches.length} matches. Refine your
						query to narrow results.{/if}
					{#if search.skippedLarge > 0}
						{search.skippedLarge} large file{search.skippedLarge === 1 ? '' : 's'} (over {maxFileLabel})
						not searched. Open to find inside.
					{/if}
				</p>
			{/if}
		{/if}
	</div>
</div>
