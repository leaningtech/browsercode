<script lang="ts">
	import Icon from '@iconify/svelte';
	import { resolve } from '$app/paths';
	import BrowserCodeLogo from '$lib/components/BrowserCodeLogo.svelte';
	import { SERIES_LABELS, lessons, type Series } from '$lib/learn/lessons';

	// Only the series that have a lesson yet get a filter.
	const series = [...new Set(lessons.map((lesson) => lesson.series))];
	let shown = $state<Series | null>(null);
	const listed = $derived(shown ? lessons.filter((lesson) => lesson.series === shown) : lessons);
</script>

<!-- Most visitors come from a link in a social profile, on a phone: sizes are px, since the app
     scales rem down on narrow screens. -->
<div class="hub bc-page-bg">
	<div class="inner">
		<header>
			<BrowserCodeLogo size={40} playIntro={false} />
			<h1>Learn Java, one small lesson at a time</h1>
			<p>
				Puzzles, bugs and tiny builds. Watch a lesson, guess the answer, then change the code and
				run it yourself, right here in your browser. Free, nothing to install.
			</p>
		</header>

		{#if series.length > 1}
			<div class="filters" role="group" aria-label="Filter by series">
				{#each [null, ...series] as option (option)}
					<button
						type="button"
						class:active={shown === option}
						aria-pressed={shown === option}
						onclick={() => (shown = option)}
					>
						{option ? SERIES_LABELS[option] : 'All'}
					</button>
				{/each}
			</div>
		{/if}

		<ol>
			{#each listed as lesson (lesson.id)}
				<li>
					<a class="lesson" href={resolve('/learn/[id]', { id: lesson.id })}>
						<span class="number">#{lesson.id}</span>
						<span class="text">
							<span class="title">{lesson.title}</span>
							<span class="meta">{SERIES_LABELS[lesson.series]} · {lesson.topic}</span>
						</span>
						<Icon icon="mingcute:right-line" width="20" />
					</a>
				</li>
			{:else}
				<li class="empty">No lessons yet.</li>
			{/each}
		</ol>

		<p class="more">
			Want a blank page? Open the <a href={resolve('/java')}>Java Playground</a>.
		</p>
		<p class="more">
			Teachers: every lesson's code is open source (Apache 2.0) and yours to reuse in class.
			<a
				href="https://github.com/leaningtech/browsercode/tree/main/src/lib/learn/lessons"
				target="_blank"
				rel="noopener">Get it on GitHub</a
			>.
		</p>
	</div>
</div>

<style>
	.hub {
		width: 100%;
		height: 100%;
		overflow-y: auto;
		color: var(--color-bc-text);
	}
	.inner {
		display: flex;
		flex-direction: column;
		gap: 20px;
		max-width: 680px;
		margin: 0 auto;
		padding: 28px 16px 40px;
	}
	header {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	h1 {
		margin: 6px 0 0;
		font-size: 26px;
		font-weight: 650;
		line-height: 1.2;
	}
	header p {
		margin: 0;
		color: var(--color-bc-mist);
		font-size: 15px;
		line-height: 1.5;
	}
	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.filters button {
		padding: 6px 14px;
		border: 1px solid var(--color-bc-border);
		border-radius: 999px;
		color: var(--color-bc-mist);
		font-size: 14px;
	}
	.filters button.active {
		border-color: var(--color-bc-azure);
		color: var(--color-bc-azure);
	}
	ol {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	a.lesson {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 14px 16px;
		border: 1px solid var(--color-bc-border);
		border-radius: 14px;
		background: var(--color-bc-surface);
		color: var(--color-bc-icon);
		text-decoration: none;
		transition: border-color 0.15s;
	}
	a.lesson:hover {
		border-color: var(--color-bc-azure);
	}
	.number {
		color: var(--color-bc-text-muted);
		/* The IDE editor's font stack (EditorPane.svelte). */
		font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace, monospace;
		font-size: 14px;
	}
	.text {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 3px;
		min-width: 0;
	}
	/* Titles wrap rather than truncate: on a phone the title is the hook. */
	.title {
		color: var(--color-bc-text);
		font-size: 17px;
		font-weight: 600;
		line-height: 1.3;
		text-wrap: balance;
	}
	.meta {
		color: var(--color-bc-mist);
		font-size: 13px;
	}
	.empty,
	.more {
		color: var(--color-bc-mist);
		font-size: 14px;
	}
	.more {
		margin: 0;
	}
	.more a {
		color: var(--color-bc-azure);
	}
</style>
