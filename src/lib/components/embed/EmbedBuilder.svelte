<script lang="ts">
	import Icon from '@iconify/svelte';
	import ToolIcon from '$lib/components/ToolIcon.svelte';
	import {
		frameworkRailItems,
		javaRailItems,
		qualifiedLabel,
		type FrameworkId
	} from '$lib/config/frameworks';
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
		fixed = null
	}: {
		/**
		 * The one thing to embed, set by the IDE's dialog. Nothing else is offered, nor a live
		 * preview of a second copy of the project already running behind it.
		 */
		fixed?: EmbedTarget | null;
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
	/** What the host page has to send for BrowserPod; copied as one block. */
	const EMBED_HEADERS = `Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp`;

	let tab = $state<Tab>('framework');
	let framework = $state<FrameworkId>(frameworkRailItems[0].id);
	let javaExample = $state(javaRailItems[0].example);
	let repoInput = $state('');
	let agent = $state<ToolId>(defaultToolId);
	let linkInput = $state('');
	let views = $state<View[]>([...VIEWS]);
	let agentPreview = $state(true);
	let keyless = $state(false);
	let height = $state(600);
	// An emptied number field binds null.
	let iframeHeight = $derived(height || 600);
	/** The URL the live preview was loaded for; any change of options drops back to the diagram. */
	let liveUrl = $state<string | null>(null);
	type Copyable = 'url' | 'snippet' | 'headers';
	let copied = $state<Copyable | null>(null);

	let target = $derived.by((): EmbedTarget | null => {
		// A fixed target can't be changed from here, so the tabs never get a say.
		if (fixed) return fixed;
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
	let canKeyless = $derived(
		target?.kind === 'framework' || (target?.kind === 'link' && !target.java)
	);
	let url = $derived(target && embedUrl(target, shownViews, canKeyless && keyless));
	let absoluteUrl = $derived(url && `${location.origin}${url}`);
	let snippet = $derived(target && absoluteUrl && embedSnippet(absoluteUrl, target, iframeHeight));
	/** Sums the panes and options up beside their step heading, to read back at a glance. */
	let paneSummary = $derived(
		tab === 'agent'
			? agentPreview
				? 'Terminal and preview'
				: 'Terminal only'
			: [
					views.length === VIEWS.length ? 'All panes' : `${views.length} of ${VIEWS.length} panes`,
					`${iframeHeight}px`,
					...(canKeyless && keyless ? ['no API key'] : [])
				].join(' · ')
	);

	/** Names the chosen target beside step 1, as `paneSummary` does for step 2. */
	let targetSummary = $derived.by((): string => {
		const chosen = target;
		if (!chosen) return '';
		if (chosen.kind === 'framework')
			return frameworkRailItems.find((item) => item.id === chosen.id)?.label ?? chosen.id;
		if (chosen.kind === 'java') {
			const item = javaRailItems.find((entry) => entry.example === chosen.example);
			return item ? qualifiedLabel(item.id) : chosen.example;
		}
		if (chosen.kind === 'agent')
			return agents.find((item) => item.id === chosen.id)?.label ?? chosen.id;
		if (chosen.kind === 'repo') return `${chosen.repo.owner}/${chosen.repo.repo}`;
		return chosen.java ? 'Shared Java project' : 'Shared project';
	});

	/** The dialog skips step 1, so every later step shifts up by one. */
	function stepNumber(afterTarget: number): number {
		return fixed ? afterTarget : afterTarget + 1;
	}

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

	async function copy(what: Copyable, text: string): Promise<void> {
		try {
			await navigator.clipboard.writeText(text);
			copied = what;
			setTimeout(() => (copied = null), 1500);
		} catch (error) {
			console.error('Failed to copy:', error);
		}
	}
</script>

<!-- A step heading; `summary` reads that step's choices back on the right. -->
{#snippet stepHead(n: number, title: string, summary?: string)}
	<div class="mb-2 flex items-center gap-2.5">
		<span
			class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bc-azure/15 text-[11px] text-bc-azure"
			>{n}</span
		>
		<span class="text-[13px] font-medium text-bc-text">{title}</span>
		{#if summary}<span class="ml-auto text-[11.5px] text-bc-text-muted">{summary}</span>{/if}
	</div>
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

{#snippet panesControl()}
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
{/snippet}

{#snippet optionsControl()}
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
						The pod reaches only the npm registry, so the project installs and runs but has no live
						preview.
					</span>
				</span>
			</label>
		{/if}
	</div>
{/snippet}

<!-- The panes as a diagram, so the checkboxes have something to point at. -->
{#snippet paneDiagram(heightClass: string)}
	<div
		class="flex {heightClass} flex-col gap-1 rounded-lg border border-bc-border bg-bc-abyss p-1.5"
	>
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
						{#if views.includes('terminal')}{@render pane(viewLabel('terminal'), 'flex-1')}{/if}
					</div>
				{/if}
				{#if views.includes('preview')}{@render pane(viewLabel('preview'), 'flex-1')}{/if}
			</div>
		{/if}
	</div>
{/snippet}

{#snippet headersBlock()}
	<p class="mb-2">
		BrowserPod needs a cross-origin isolated page, so yours must send these two response headers.
		Set them in a <code class="text-bc-mist">_headers</code> file on Netlify or Cloudflare Pages, or
		in <code class="text-bc-mist">vercel.json</code> on Vercel.
	</p>
	{@render codeBlock(EMBED_HEADERS, 'headers')}
{/snippet}

{#snippet codeBlock(text: string, what: Copyable)}
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

{#snippet openInNewTab(href: string)}
	<!-- An embed URL carries a query and hash resolve() has no route id for. -->
	<!-- eslint-disable svelte/no-navigation-without-resolve -->
	<a
		{href}
		target="_blank"
		rel="noopener"
		class="inline-flex items-center gap-1 hover:text-bc-text"
	>
		Open in new tab
		<Icon icon="mingcute:external-link-line" width="12" height="12" />
	</a>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
{/snippet}

<!--
	One numbered walk-through for both presentations. The IDE's dialog starts a step later: the
	project it embeds is already fixed, so it has nothing to choose in step 1 and no room for a
	second live copy of itself. Nothing gates anything — every control updates the diagram and
	the snippet as it changes.
-->
<!-- Width is the host's: the page wrapper constrains the column, the dialog its panel. -->
<div class="flex flex-col">
	{#if !fixed}
		<section>
			{@render stepHead(1, 'Choose what to embed', targetSummary)}
			<div class="pl-[30px]">
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
			</div>
		</section>

		<div class="my-3 h-px shrink-0 bg-bc-border"></div>
	{/if}

	<section>
		{@render stepHead(stepNumber(1), 'Choose what it shows', paneSummary)}
		<div class="pl-[30px]">
			<div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
				<div class="flex flex-col gap-3">
					{@render panesControl()}
					{@render optionsControl()}
				</div>
				{@render paneDiagram('h-28')}
			</div>
			<!-- The diagram says which panes are on; this runs the real thing, which costs a pod. -->
			{#if !fixed}
				<button
					type="button"
					disabled={!url || liveUrl === url}
					onclick={() => (liveUrl = url)}
					class="mt-3 flex items-center gap-1.5 rounded-md bg-bc-azure/90 px-3 py-1.5 text-[12px] font-medium text-bc-abyss transition hover:bg-bc-azure disabled:cursor-not-allowed disabled:opacity-40"
				>
					<Icon icon="mingcute:play-line" width="13" height="13" />
					Load live preview
				</button>
				{#if url && liveUrl === url}
					<iframe
						src={url}
						title="Embed preview"
						allow={target ? iframeAllow(target) : undefined}
						class="mt-3 w-full rounded-lg border border-bc-border"
						style="height: {iframeHeight}px;"
					></iframe>
				{/if}
			{/if}
		</div>
	</section>

	{#if absoluteUrl && snippet}
		<div class="my-3 h-px shrink-0 bg-bc-border"></div>
		<section>
			{@render stepHead(stepNumber(2), 'Copy the snippet')}
			<div class="pl-[30px]">
				{@render codeBlock(snippet, 'snippet')}
				<div
					class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-bc-text-muted"
				>
					<button type="button" onclick={() => copy('url', absoluteUrl)} class="hover:text-bc-text">
						{copied === 'url' ? 'URL copied' : 'Copy the URL instead'}
					</button>
					{@render openInNewTab(absoluteUrl)}
				</div>
				{#if cheerpj}
					<p class="mt-3 text-[12px] leading-relaxed text-bc-text-muted">
						Java runs on CheerpJ, which needs nothing from your page: the snippet works on any site.
					</p>
				{/if}
			</div>
		</section>

		{#if !cheerpj}
			<div class="my-3 h-px shrink-0 bg-bc-border"></div>
			<section>
				{@render stepHead(stepNumber(3), 'Send these headers from your page')}
				<div class="pl-[30px] text-[12px] leading-relaxed text-bc-text-muted">
					{@render headersBlock()}
				</div>
			</section>
		{/if}
	{/if}
</div>
