<script lang="ts">
	import Icon from '@iconify/svelte';
	import { page } from '$app/stores';
	import { SvelteSet } from 'svelte/reactivity';

	// Scratch review page — not part of the branch. Boots each embed shape on demand so the
	// badge, the phone-width terminal and the narrow layout's preview-first tabs can be seen
	// side by side, at whichever width the host page would frame them.

	type Sample = {
		id: string;
		label: string;
		blurb: string;
		/** What this one is here to show. */
		look: string;
		/** Everything after `/embed?`, exactly as a host page would write it. */
		query: string;
		height: number;
		/** Frame width to open at; null fills the column. */
		width: number | null;
	};

	const BLOG = 620;
	const PHONE = 375;

	const samples: Sample[] = [
		{
			id: 'full',
			label: 'Full IDE',
			blurb: 'Every pane — what you get when the view parameter is left off entirely.',
			look: 'The case from the review comment. At 620px it opens on Preview, and the Terminal and Preview tabs mark themselves while you are on another tab. Switch to Full for the three-pane desktop layout.',
			query: 'framework=vite',
			height: 560,
			width: BLOG
		},
		{
			id: 'editor-preview',
			label: 'Editor and preview',
			blurb: 'The tutorial layout: edit on the left, see it on the right.',
			look: 'Badge in the top bar, left of the project name.',
			query: 'framework=react&view=editor,preview',
			height: 480,
			width: null
		},
		{
			id: 'files-editor-terminal',
			label: 'No preview',
			blurb: 'Files, editor and terminal for a project with nothing to render.',
			look: 'No preview tab to open on, so the narrow layout falls back to the editor.',
			query: 'framework=express&view=files,editor,terminal',
			height: 480,
			width: null
		},
		{
			id: 'preview-only',
			label: 'Preview only',
			blurb: 'A running app and nothing else.',
			look: 'No header, so the badge floats bottom-right — over the boot scene first, then over the app.',
			query: 'framework=vue&view=preview',
			height: 420,
			width: null
		},
		{
			id: 'terminal-only',
			label: 'Terminal only',
			blurb: 'The sandbox shell on its own.',
			look: 'Opened at phone width: this is where the text used to come out squashed, 12px glyphs in 7px rows.',
			query: 'framework=vite&view=terminal',
			height: 520,
			width: PHONE
		},
		{
			id: 'repo',
			label: 'A GitHub repo',
			blurb: 'Any repo, branch and subdirectory, cloned into the sandbox.',
			look: 'Same shell as the framework templates, with the repo name in the top bar.',
			query: 'repo=github.com/vitejs/vite/tree/main/packages/create-vite/template-vanilla',
			height: 520,
			width: null
		},
		{
			id: 'claude',
			label: 'Claude Code',
			blurb: 'Terminal first. One agent session per browser — see the note above.',
			look: 'The reported bug, at the width it was reported from. The TUI banner and theme picker should be legible and aligned.',
			query: 'agent=claude',
			height: 620,
			width: PHONE
		},
		{
			id: 'codex',
			label: 'Codex CLI',
			blurb: 'Asks for an OpenAI API key inside the frame.',
			look: 'The loading card: its elapsed counter and the key card below it no longer collapse to 5px.',
			query: 'agent=codex',
			height: 560,
			width: PHONE
		}
	];

	const origin = $page.url.origin;
	const urlFor = (sample: Sample) => `${origin}/embed?${sample.query}`;

	const WIDTHS: { label: string; value: number | null }[] = [
		{ label: 'Full', value: null },
		{ label: 'Blog 620', value: BLOG },
		{ label: 'Phone 375', value: PHONE }
	];

	// Each running sample is a full sandbox, so none boot until asked. Width lives outside the
	// iframe's src on purpose: resizing a running one re-lays it out without rebooting the pod,
	// which is the quickest way to watch the panes collapse into tabs.
	const running = new SvelteSet<string>();
	let widths = $state<Record<string, number | null>>(
		Object.fromEntries(samples.map((sample) => [sample.id, sample.width]))
	);
	let copied = $state<string | null>(null);
	let copyTimer: ReturnType<typeof setTimeout>;

	function toggle(id: string): void {
		if (!running.delete(id)) running.add(id);
	}

	function snippetFor(sample: Sample): string {
		return `<iframe\n  src="${urlFor(sample)}"\n  allow="cross-origin-isolated"\n  style="width: 100%; height: ${sample.height}px; border: 0"\n></iframe>`;
	}

	async function copySnippet(sample: Sample): Promise<void> {
		try {
			await navigator.clipboard.writeText(snippetFor(sample));
			copied = sample.id;
			clearTimeout(copyTimer);
			copyTimer = setTimeout(() => (copied = null), 1600);
		} catch (error) {
			console.error('Could not copy the snippet:', error);
		}
	}
</script>

<svelte:head>
	<title>Embed samples — BrowserCode</title>
</svelte:head>

<div class="bc-page-bg h-full w-full overflow-y-auto text-bc-mist">
	<div class="mx-auto w-full max-w-5xl px-6 py-10">
		<div class="flex flex-wrap items-baseline justify-between gap-3">
			<h1 class="font-display text-2xl font-semibold text-bc-text">Embed samples</h1>
			{#if running.size > 0}
				<button onclick={() => running.clear()} class="sample-btn is-running">
					<Icon icon="mingcute:stop-line" width="13" height="13" />
					Stop all ({running.size})
				</button>
			{/if}
		</div>
		<p class="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-bc-text-muted">
			Scratch page, not committed to the branch. Each card is a real sandbox, so they boot on demand
			— press <span class="text-bc-mist">Run</span> on the ones you want to see, and use the width buttons
			to frame them the way a host page would.
		</p>

		<div class="mt-5 grid gap-2 sm:grid-cols-3">
			<div class="legend">
				<span class="legend-dot" style="background: var(--color-bc-azure)"></span>
				The badge, in the top bar or floating
			</div>
			<div class="legend">
				<span class="legend-dot" style="background: var(--color-bc-green)"></span>
				Terminal text at phone width
			</div>
			<div class="legend">
				<span class="legend-dot" style="background: var(--color-bc-orchid)"></span>
				Preview first, and the tab cues
			</div>
		</div>

		<div
			class="mt-4 flex items-start gap-2.5 rounded-lg border border-bc-gold/18 bg-bc-gold/6 px-3 py-2.5"
		>
			<span
				class="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-bc-gold/12 text-bc-gold"
			>
				<Icon icon="mingcute:information-line" width="14" height="14" />
			</span>
			<span class="text-[12px] leading-relaxed text-bc-text-muted">
				Agents hold a browser-wide lock, so running Claude here shows the duplicate-session dialog
				if you have it open in another tab. Resizing a running sample re-lays it out without
				rebooting its pod — the fastest way to watch the panes collapse into tabs.
			</span>
		</div>

		<div class="mt-8 flex flex-col gap-8">
			{#each samples as sample (sample.id)}
				{@const isRunning = running.has(sample.id)}
				{@const width = widths[sample.id]}
				<section>
					<h2 class="font-display text-[15px] font-semibold text-bc-text">{sample.label}</h2>
					<p class="mt-0.5 text-[12.5px] leading-relaxed text-bc-text-muted">{sample.blurb}</p>
					<p class="mt-1.5 flex items-start gap-1.5 text-[12.5px] leading-relaxed text-bc-mist">
						<Icon
							icon="mingcute:eye-2-line"
							width="13"
							height="13"
							class="mt-[3px] shrink-0 text-bc-azure"
						/>
						{sample.look}
					</p>

					<div class="mt-3 overflow-hidden rounded-xl border border-bc-border">
						<div
							class="flex flex-wrap items-center gap-2 border-b border-bc-border bg-bc-navy px-2.5 py-1.5"
						>
							<code class="min-w-0 flex-1 truncate font-mono text-[11px] text-bc-mist">
								/embed?{sample.query}
							</code>

							<div class="flex shrink-0 items-center rounded-md border border-bc-tint/10 p-0.5">
								{#each WIDTHS as option (option.label)}
									<button
										onclick={() => (widths[sample.id] = option.value)}
										class="width-btn"
										class:selected={width === option.value}
									>
										{option.label}
									</button>
								{/each}
							</div>

							<button onclick={() => copySnippet(sample)} class="sample-btn">
								<Icon
									icon={copied === sample.id ? 'mingcute:check-line' : 'mingcute:copy-2-line'}
									width="13"
									height="13"
								/>
								{copied === sample.id ? 'Copied' : 'Copy'}
							</button>
							<!-- Our own page, but a full load: an embed boots a pod of its own. -->
							<!-- eslint-disable svelte/no-navigation-without-resolve -->
							<a href={urlFor(sample)} target="_blank" rel="noopener noreferrer" class="sample-btn">
								<Icon icon="mingcute:external-link-line" width="13" height="13" />
								Open
							</a>
							<!-- eslint-enable svelte/no-navigation-without-resolve -->
							<button
								onclick={() => toggle(sample.id)}
								class="sample-btn {isRunning ? 'is-running' : 'is-idle'}"
							>
								<Icon
									icon={isRunning ? 'mingcute:stop-line' : 'mingcute:play-line'}
									width="13"
									height="13"
								/>
								{isRunning ? 'Stop' : 'Run'}
							</button>
						</div>

						<div
							class="flex justify-center bg-bc-abyss"
							style="height: {sample.height}px"
							class:p-3={width !== null}
						>
							{#if isRunning}
								<iframe
									src={urlFor(sample)}
									title={sample.label}
									allow="cross-origin-isolated"
									class="h-full border-0"
									style={width === null ? 'width: 100%' : `width: ${width}px`}
								></iframe>
							{:else}
								<button
									onclick={() => toggle(sample.id)}
									class="group flex h-full w-full flex-col items-center justify-center gap-2 text-bc-text-muted transition hover:text-bc-text"
								>
									<span
										class="flex h-10 w-10 items-center justify-center rounded-full border border-bc-tint/15 transition group-hover:border-bc-tint/35"
									>
										<Icon icon="mingcute:play-line" width="18" height="18" />
									</span>
									<span class="text-[12px]">Run this embed</span>
								</button>
							{/if}
						</div>
					</div>
				</section>
			{/each}
		</div>
	</div>
</div>

<style>
	.legend {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		border-radius: 0.5rem;
		border: 1px solid var(--color-bc-border);
		padding: 0.5rem 0.65rem;
		font-size: 11.5px;
		color: var(--color-bc-text-muted);
	}
	.legend-dot {
		width: 7px;
		height: 7px;
		flex-shrink: 0;
		border-radius: 9999px;
	}

	.sample-btn {
		display: inline-flex;
		flex-shrink: 0;
		align-items: center;
		gap: 0.3rem;
		border-radius: 0.375rem;
		border: 1px solid transparent;
		padding: 0.2rem 0.5rem;
		font-size: 11px;
		color: var(--color-bc-icon);
		text-decoration: none;
		transition:
			color 0.15s,
			background 0.15s,
			border-color 0.15s;
	}
	.sample-btn:hover {
		background: color-mix(in srgb, var(--color-bc-tint) 5%, transparent);
		color: var(--color-bc-text);
	}
	.sample-btn.is-idle {
		border-color: color-mix(in srgb, var(--color-bc-azure) 30%, transparent);
		color: var(--color-bc-azure);
	}
	.sample-btn.is-running {
		border-color: color-mix(in srgb, var(--color-bc-coral) 30%, transparent);
		color: var(--color-bc-coral);
	}

	.width-btn {
		border: none;
		background: transparent;
		border-radius: 0.3rem;
		padding: 0.15rem 0.45rem;
		font-size: 10.5px;
		color: var(--color-bc-icon);
		cursor: pointer;
		transition:
			color 0.15s,
			background 0.15s;
	}
	.width-btn:hover {
		color: var(--color-bc-text);
	}
	.width-btn.selected {
		background: color-mix(in srgb, var(--color-bc-azure) 15%, transparent);
		color: var(--color-bc-azure);
	}
</style>
