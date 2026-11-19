<script lang="ts">
	import Icon from '@iconify/svelte';
	import ToolIcon from '$lib/components/ToolIcon.svelte';
	import { frameworkRailItems, javaRailItems, type FrameworkId } from '$lib/config/frameworks';
	import { defaultToolId, toolItems, type ToolId } from '$lib/config/tools';
	import { VIEWS, type View } from '$lib/embed/options';
	import {
		embedSnippet,
		embedUrl,
		iframeAllow,
		runsOnCheerpj,
		shareLinkTarget,
		type EmbedTarget
	} from '$lib/embed/url';
	import { parseGitHubUrl } from '$lib/github/parse';

	let {
		link = ''
	}: {
		/** A Share link to embed. Nothing else is offered, nor a live preview of a second copy. */
		link?: string;
	} = $props();

	type Tab = EmbedTarget['kind'];

	const TABS: { id: Tab; label: string }[] = [
		{ id: 'framework', label: 'Template' },
		{ id: 'java', label: 'Java' },
		{ id: 'repo', label: 'GitHub repo' },
		{ id: 'agent', label: 'Agent' },
		{ id: 'link', label: 'Shared link' }
	];
	const VIEW_LABELS: Record<View, string> = {
		files: 'Files',
		search: 'Search',
		editor: 'Editor',
		terminal: 'Terminal',
		preview: 'Preview'
	};
	const agents = toolItems.filter((item) => !item.disabled);

	// svelte-ignore state_referenced_locally
	let tab = $state<Tab>(link ? 'link' : 'framework');
	let framework = $state<FrameworkId>(frameworkRailItems[0].id);
	let javaExample = $state(javaRailItems[0].example);
	let repoInput = $state('');
	let agent = $state<ToolId>(defaultToolId);
	// svelte-ignore state_referenced_locally
	let linkInput = $state(link);
	let views = $state<View[]>([...VIEWS]);
	let agentPreview = $state(true);
	let keyless = $state(false);
	let height = $state(600);
	// An emptied number field binds null.
	let iframeHeight = $derived(height || 600);
	/** The URL the live preview was loaded for; any change of options drops back to the diagram. */
	let liveUrl = $state<string | null>(null);
	let copied = $state<'url' | 'snippet' | null>(null);

	let target = $derived.by((): EmbedTarget | null => {
		if (tab === 'framework') return { kind: 'framework', id: framework };
		if (tab === 'java') return { kind: 'java', example: javaExample };
		if (tab === 'agent') return { kind: 'agent', id: agent };
		if (tab === 'repo') {
			const repo = parseGitHubUrl(repoInput);
			return repo && { kind: 'repo', repo };
		}
		return shareLinkTarget(linkInput, location.origin);
	});
	let cheerpj = $derived(!!target && runsOnCheerpj(target));
	// Agents are terminal first: `view` only decides whether the preview comes along.
	let shownViews = $derived<View[]>(
		tab === 'agent' ? (agentPreview ? [...VIEWS] : ['terminal']) : views
	);
	// Only a template boots without a key; a repo clones and an agent calls its API.
	let canKeyless = $derived(tab === 'framework' || (target?.kind === 'link' && !target.java));
	let url = $derived(target && embedUrl(target, shownViews, canKeyless && keyless));
	let absoluteUrl = $derived(url && `${location.origin}${url}`);
	let snippet = $derived(target && absoluteUrl && embedSnippet(absoluteUrl, target, iframeHeight));

	/** A shared project's hash runs to many KB; only the screen shortens it, Copy takes it whole. */
	function shorten(text: string): string {
		return text.replace(/#([\w-]{24})[\w-]+/, '#$1…');
	}

	function toggleView(view: View): void {
		views = views.includes(view) ? views.filter((v) => v !== view) : [...views, view];
	}

	function viewLabel(view: View): string {
		if (cheerpj && view === 'terminal') return 'Output';
		if (cheerpj && view === 'preview') return 'Display';
		return VIEW_LABELS[view];
	}

	async function copy(what: 'url' | 'snippet', text: string): Promise<void> {
		try {
			await navigator.clipboard.writeText(text);
			copied = what;
			setTimeout(() => (copied = null), 1500);
		} catch (error) {
			console.error('Failed to copy:', error);
		}
	}
</script>

{#snippet heading(text: string)}
	<div class="mb-2 text-[11px] font-medium tracking-widest text-bc-mist/40 uppercase">{text}</div>
{/snippet}

{#snippet choice(selected: boolean, onclick: () => void, label: string, icon?: string)}
	<button
		type="button"
		{onclick}
		class="glass-panel flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-[13px] transition {selected
			? 'border-bc-azure/50 text-bc-text'
			: 'border-bc-border text-bc-mist hover:border-bc-tint/30'}"
	>
		{#if icon}<Icon {icon} width="16" height="16" class="shrink-0" />{/if}
		<span class="truncate">{label}</span>
	</button>
{/snippet}

{#snippet pane(label: string, size: string)}
	<div
		class="flex min-h-0 min-w-0 items-center justify-center rounded border border-bc-border bg-bc-tint/5 text-[10px] text-bc-text-muted {size}"
	>
		{label}
	</div>
{/snippet}

{#snippet codeBlock(text: string, what: 'url' | 'snippet')}
	{@const shown = shorten(text)}
	<div class="relative">
		<pre
			class="overflow-x-auto rounded-lg border border-bc-border bg-bc-terminal p-3 pr-20 font-mono text-[11.5px] leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap text-bc-mist">{shown}</pre>
		<button
			type="button"
			onclick={() => copy(what, text)}
			class="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-bc-tint/10 px-2 py-1 text-[11px] text-bc-mist transition hover:bg-bc-tint/16 hover:text-bc-text"
		>
			<Icon
				icon={copied === what ? 'mingcute:check-line' : 'mingcute:copy-2-line'}
				width="12"
				height="12"
			/>
			{copied === what ? 'Copied' : 'Copy'}
		</button>
	</div>
	{#if shown !== text}
		<p class="mt-1.5 text-[11px] text-bc-text-muted">
			The link is shortened here. Use Copy to get all of it.
		</p>
	{/if}
{/snippet}

<div class="grid gap-6 lg:grid-cols-2">
	<div class="flex flex-col gap-6">
		{#if !link}
			<section>
				{@render heading('What to embed')}
				<div class="mb-3 flex flex-wrap gap-1">
					{#each TABS as item (item.id)}
						<button
							type="button"
							onclick={() => (tab = item.id)}
							class="rounded-md px-2.5 py-1 text-[12px] transition {tab === item.id
								? 'bg-bc-azure/15 text-bc-azure'
								: 'text-bc-text-muted hover:bg-bc-tint/5 hover:text-bc-text'}"
						>
							{item.label}
						</button>
					{/each}
				</div>

				{#if tab === 'framework'}
					<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
						{#each frameworkRailItems as item (item.id)}
							{@render choice(
								framework === item.id,
								() => (framework = item.id),
								item.label,
								item.icon
							)}
						{/each}
					</div>
				{:else if tab === 'java'}
					<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
						{#each javaRailItems as item (item.id)}
							{@render choice(
								javaExample === item.example,
								() => (javaExample = item.example),
								item.label,
								item.icon
							)}
						{/each}
					</div>
				{:else if tab === 'agent'}
					<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
						{#each agents as item (item.id)}
							<button
								type="button"
								onclick={() => (agent = item.id)}
								class="glass-panel flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-[13px] transition {agent ===
								item.id
									? 'border-bc-azure/50 text-bc-text'
									: 'border-bc-border text-bc-mist hover:border-bc-tint/30'}"
							>
								<ToolIcon {item} iconSize={16} imgClass="h-4 w-4" />
								<span class="truncate">{item.label}</span>
							</button>
						{/each}
					</div>
				{:else}
					<input
						type="text"
						value={tab === 'repo' ? repoInput : linkInput}
						oninput={(e) =>
							tab === 'repo'
								? (repoInput = e.currentTarget.value)
								: (linkInput = e.currentTarget.value)}
						spellcheck="false"
						autocomplete="off"
						placeholder={tab === 'repo'
							? 'github.com/owner/repo/tree/main/dir'
							: 'Paste a link copied with Share'}
						class="glass-panel w-full rounded-xl border border-bc-border px-3 py-2.5 text-[13px] text-bc-text outline-none placeholder:text-bc-icon focus:border-bc-azure/45"
					/>
					{#if (tab === 'repo' ? repoInput : linkInput).trim() && !target}
						<p class="mt-2 text-[12px] text-bc-coral">
							{tab === 'repo'
								? 'Not a GitHub repo URL. Use github.com/owner/repo, optionally with /tree/<branch>/<folder>.'
								: 'Not a project link. Use Share in the IDE or the Java playground, then paste the link here.'}
						</p>
					{/if}
				{/if}
			</section>
		{/if}

		<section>
			{@render heading('Panes')}
			<div class="flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-bc-mist">
				{#if tab === 'agent'}
					<label class="flex items-center gap-2">
						<input type="checkbox" bind:checked={agentPreview} class="accent-bc-azure" />
						Preview beside the terminal
					</label>
				{:else}
					{#each VIEWS as view (view)}
						<label class="flex items-center gap-2">
							<input
								type="checkbox"
								checked={views.includes(view)}
								disabled={views.length === 1 && views.includes(view)}
								onchange={() => toggleView(view)}
								class="accent-bc-azure"
							/>
							{viewLabel(view)}
						</label>
					{/each}
				{/if}
			</div>
		</section>

		<section>
			{@render heading('Options')}
			<div class="flex flex-col gap-3 text-[13px] text-bc-mist">
				<label class="flex items-center gap-2">
					Height
					<input
						type="number"
						min="200"
						step="50"
						bind:value={height}
						class="w-[6em] rounded-md border border-bc-border bg-bc-terminal px-2 py-1 text-bc-text outline-none focus:border-bc-azure/45"
					/>
					px
				</label>
				{#if canKeyless}
					<label class="flex items-start gap-2">
						<input type="checkbox" bind:checked={keyless} class="mt-1 accent-bc-azure" />
						<span>
							Run without an API key
							<span class="block text-[12px] text-bc-text-muted">
								The pod reaches only the npm registry, so the project installs and runs but has no
								live preview.
							</span>
						</span>
					</label>
				{/if}
			</div>
		</section>
	</div>

	<div class="flex flex-col gap-6">
		<section>
			{@render heading('Preview')}
			{#if url && liveUrl === url}
				<iframe
					src={url}
					title="Embed preview"
					allow={target ? iframeAllow(target) : undefined}
					class="w-full rounded-lg border border-bc-border"
					style="height: {iframeHeight}px;"
				></iframe>
			{:else}
				<div class="flex h-44 flex-col gap-1 rounded-lg border border-bc-border bg-bc-abyss p-1.5">
					{#if tab === 'agent'}
						<div class="flex min-h-0 flex-1 gap-1">
							{@render pane('Terminal', 'flex-1')}
							{#if agentPreview}{@render pane('Preview', 'flex-1')}{/if}
						</div>
					{:else}
						{#if views.includes('editor')}<div class="h-3 shrink-0 rounded bg-bc-tint/5"></div>{/if}
						<div class="flex min-h-0 flex-1 gap-1">
							{#if views.includes('files') || views.includes('search')}
								{@render pane(views.includes('files') ? 'Files' : 'Search', 'w-14 shrink-0')}
							{/if}
							{#if views.includes('editor') || views.includes('terminal')}
								<div class="flex min-w-0 flex-1 flex-col gap-1">
									{#if views.includes('editor')}{@render pane('Editor', 'flex-[3]')}{/if}
									{#if views.includes('terminal')}{@render pane(
											viewLabel('terminal'),
											'flex-1'
										)}{/if}
								</div>
							{/if}
							{#if views.includes('preview')}{@render pane(viewLabel('preview'), 'flex-1')}{/if}
						</div>
					{/if}
				</div>
			{/if}
			<div class="mt-2 flex gap-2">
				{#if !link}
					<button
						type="button"
						disabled={!url || liveUrl === url}
						onclick={() => (liveUrl = url)}
						class="flex items-center gap-1.5 rounded-md bg-bc-azure/90 px-3 py-1.5 text-[12px] font-medium text-bc-abyss transition hover:bg-bc-azure disabled:cursor-not-allowed disabled:opacity-40"
					>
						<Icon icon="mingcute:play-line" width="13" height="13" />
						Load live preview
					</button>
				{/if}
				{#if url}
					<!-- An embed URL carries a query and hash resolve() has no route id for. -->
					<!-- eslint-disable svelte/no-navigation-without-resolve -->
					<a
						href={url}
						target="_blank"
						rel="noopener"
						class="flex items-center gap-1.5 rounded-md bg-bc-tint/10 px-3 py-1.5 text-[12px] text-bc-mist no-underline transition hover:bg-bc-tint/16 hover:text-bc-text"
					>
						<Icon icon="mingcute:external-link-line" width="13" height="13" />
						Open in new tab
					</a>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				{/if}
			</div>
		</section>

		{#if absoluteUrl && snippet}
			<section>
				{@render heading('Embed code')}
				{@render codeBlock(snippet, 'snippet')}
			</section>
			<section>
				{@render heading('URL')}
				{@render codeBlock(absoluteUrl, 'url')}
			</section>
			<section class="text-[12px] leading-relaxed text-bc-text-muted">
				{#if cheerpj}
					Java runs on CheerpJ, which needs nothing from your page: the snippet works on any site.
				{:else}
					BrowserPod needs a cross-origin isolated page. Yours must send these two headers, or the
					embed reports that they are missing:
					<pre
						class="mt-2 rounded-lg border border-bc-border bg-bc-terminal p-3 font-mono text-[11.5px] text-bc-mist">Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp</pre>
				{/if}
			</section>
		{/if}
	</div>
</div>
