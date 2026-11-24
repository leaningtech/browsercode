<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import Icon from '@iconify/svelte';
	import { resolve } from '$app/paths';
	import BrowserCodeLogo from '$lib/components/BrowserCodeLogo.svelte';
	import { sharedProjectLink } from '$lib/java/shared-project';
	import { trackEvent } from '$lib/utils/useLazyTracking';
	import CodeView from './CodeView.svelte';
	import { loadHighlighter } from './highlight';
	import { SERIES_LABELS, emphasis, type Lesson } from './lessons';
	import { LessonPlayer, type Mode, type QuizState } from './player.svelte';

	let { lesson, mode }: { lesson: Lesson; mode: Mode } = $props();

	// The lesson and mode are fixed for the page's life: the route keys a new player per lesson.
	// svelte-ignore state_referenced_locally
	const player = new LessonPlayer(lesson, mode);
	// svelte-ignore state_referenced_locally
	const record = mode === 'record';
	// svelte-ignore state_referenced_locally
	const number = `#${lesson.id}`;
	// svelte-ignore state_referenced_locally
	const shortUrl = `browsercode.io/learn/${lesson.id}`;

	let displayEl = $state<HTMLDivElement | null>(null);
	let liveWidth = $state(0);
	let input = $state('');
	let ready = $state(false);

	/**
	 * Sized so 44 columns and the gutter fit the card on a phone, padding and borders included.
	 * Whole pixels: a fractional size renders softer on screens without high density.
	 */
	const liveFont = $derived(Math.floor(Math.max(11, Math.min(17, (liveWidth - 40) / (49 * 0.6)))));

	/**
	 * The video's code panel fits the lesson's longest file and widest line, so a three-line
	 * puzzle is big rather than lost in an empty editor. Up to 14 lines show at once; longer code
	 * scrolls as it is typed. The font starts from the widest line (28 to 40px) and shrinks at
	 * mount if the whole lesson, panels included, is too tall for the frame.
	 */
	// svelte-ignore state_referenced_locally
	const stageLines = lesson.files.flatMap(({ content }) => content.replace(/\n$/, '').split('\n'));
	let stageFont = $state(
		Math.round(
			Math.max(28, Math.min(40, 860 / ((Math.max(...stageLines.map((l) => l.length)) + 4.5) * 0.6)))
		)
	);
	const stageCode = $derived.by(() => {
		const lineHeight = Math.round(stageFont * 1.5);
		const shown = Math.min(14, Math.max(4, stageLines.length));
		// Tab, the code's own padding, and the rows.
		return { fontSize: stageFont, height: 62 + stageFont + shown * lineHeight };
	});
	let columnEl = $state<HTMLDivElement | null>(null);
	/** Room for the most output any run prints, typed input included. */
	const stageOutputHeight = $derived.by(() => {
		const runs = lesson.script.flatMap((step) =>
			'run' in step && !step.run.display ? [step.run] : []
		);
		if (!runs.length) return 0;
		const lines = Math.max(
			...runs.map((run) => (run.expect ?? '').split('\n').length + (run.stdin ? 1 : 0))
		);
		return 70 + Math.round(lines * stageCode.fontSize * 1.35);
	});
	/** The first quiz, standing in for the panel's size until a quiz is on screen. */
	const firstQuiz: QuizState | null = (() => {
		const step = lesson.script.find((step) => 'quiz' in step);
		return step && 'quiz' in step
			? { ...step.quiz, remaining: 0, picked: null, revealed: false }
			: null;
	})();
	/** A 400px window, as large as the code panel allows. */
	const stageDisplayScale = $derived(Math.min(1.9, (stageCode.height - 90) / 440));

	/** Room for the lesson's longest caption, so the panels below it never move. */
	let captionHeight = $state(200);
	let captionEl = $state<HTMLParagraphElement | null>(null);

	/**
	 * Fits the lesson above Instagram's caption: the caption box takes the height of the longest
	 * caption, then the code shrinks if it still has to, never below 24px, the smallest that reads
	 * on a phone. A lesson that still doesn't fit is reported for its script to be shortened.
	 */
	async function fitStage() {
		if (!columnEl || !captionEl) return;
		await document.fonts.ready;
		const probe = captionEl.cloneNode() as HTMLElement;
		Object.assign(probe.style, {
			position: 'absolute',
			visibility: 'hidden',
			height: 'auto',
			width: `${captionEl.clientWidth}px`,
			fontFamily: getComputedStyle(captionEl).fontFamily
		});
		// Outside the component's own DOM, which Svelte manages.
		document.body.append(probe);
		const heights = lesson.script.flatMap((step) => {
			if (!('say' in step)) return [];
			probe.textContent = step.say.replace(/\*/g, '');
			return [probe.offsetHeight];
		});
		probe.remove();
		captionHeight = Math.max(0, ...heights);
		await tick();
		while (columnEl.scrollHeight > columnEl.clientHeight && stageFont > 24) {
			stageFont--;
			await tick();
		}
		const overflow = columnEl.scrollHeight - columnEl.clientHeight;
		if (overflow > 0) console.warn(`Lesson ${lesson.id} is ${overflow}px too tall for the frame`);
	}

	/** A 400px window, shrunk to fit a phone. */
	const displayScale = $derived(Math.min(1, Math.max(0.5, (liveWidth - 30) / 440)));

	const quizCorrect = $derived(
		player.quiz?.revealed && player.quiz.picked !== null
			? player.quiz.picked === player.quiz.answer
			: null
	);

	onMount(() => {
		let frame = 0;
		void (async () => {
			await tick();
			const loading = Promise.all([
				loadHighlighter(),
				displayEl ? player.mountDisplay(displayEl) : player.loadJava()
			]);
			void player.loadJava();
			if (record) {
				await loading;
				await fitStage();
				ready = true;
				return;
			}
			ready = true;
			void player.play();
			// A visitor's replay runs on real time; a recording's on the recorder's frames.
			let last = performance.now();
			let advancing = false;
			const loop = (now: number) => {
				const elapsed = Math.min(100, now - last);
				last = now;
				if (!advancing) {
					advancing = true;
					void player.clock.advance(elapsed).finally(() => (advancing = false));
				}
				frame = requestAnimationFrame(loop);
			};
			frame = requestAnimationFrame(loop);
		})();

		if (record) {
			(window as unknown as { __lesson: unknown }).__lesson = {
				get ready() {
					return ready;
				},
				get busy() {
					return player.busy;
				},
				get done() {
					return player.done;
				},
				get cues() {
					return player.cues;
				},
				start: () => void player.play(),
				/** Advances the replay by `ms`, resolving once the page shows the new state. */
				tick: async (ms: number) => {
					await player.clock.advance(ms);
					await tick();
				}
			};
		}
		return () => cancelAnimationFrame(frame);
	});

	onDestroy(() => player.dispose());

	function pick(option: number) {
		player.pick(option);
		trackEvent('Lesson Quiz', {
			lesson: lesson.id,
			correct: option === player.quiz?.answer
		});
	}

	function run() {
		trackEvent('Lesson Run', { lesson: lesson.id });
		void player.runNow();
	}

	function openPlayground() {
		trackEvent('Lesson Playground', { lesson: lesson.id });
		const files = player.currentFiles();
		// The same tab: Java runs in one tab at a time, and this one has to let go of it.
		location.assign(sharedProjectLink(lesson.title, files, lesson.java, lesson.main));
	}

	function submitInput(event: SubmitEvent) {
		event.preventDefault();
		player.sendInput(input);
		input = '';
	}

	function optionState(quiz: QuizState, index: number): 'right' | 'wrong' | 'picked' | 'idle' {
		if (quiz.revealed && index === quiz.answer) return 'right';
		if (quiz.revealed && index === quiz.picked) return 'wrong';
		if (index === quiz.picked) return 'picked';
		return 'idle';
	}
</script>

{#snippet caption(text: string)}
	{#each emphasis(text) as part, i (i)}{#if part.em}<em>{part.text}</em
			>{:else}{part.text}{/if}{/each}
{/snippet}

{#snippet output(size: number)}
	<pre class="console" style="font-size: {size}px">{#each player.output as chunk, i (i)}<span
				class={chunk.kind}>{chunk.text}</span
			>{/each}{#if player.javaStatus === 'compiling' && player.output.length === 0}<span
				class="info">Compiling…</span
			>{:else if player.javaStatus === 'loading' && !record && player.output.length === 0}<span
				class="info">Starting Java…</span
			>{/if}</pre>
{/snippet}

{#snippet quizOptions(quiz: QuizState)}
	<div
		class="options"
		class:multiline={quiz.options.some((option) => option.includes('\n'))}
		role="group"
		aria-label={quiz.question}
	>
		{#each quiz.options as option, i (i)}
			{@const state = optionState(quiz, i)}
			<button
				type="button"
				class="option {state}"
				disabled={record || quiz.picked !== null || quiz.revealed}
				onclick={() => pick(i)}
			>
				{#if state === 'right' || state === 'wrong'}
					<svg class="mark" viewBox="0 0 16 16" aria-hidden="true">
						<path d={state === 'right' ? 'M3 8.5l3.2 3.2L13 5' : 'M4 4l8 8M12 4l-8 8'} />
					</svg>
				{/if}<span>{option}</span>
			</button>
		{/each}
	</div>
{/snippet}

{#if record}
	<div class="stage">
		<div class="column" bind:this={columnEl}>
			<div class="brand">
				<BrowserCodeLogo size={44} playIntro={false} />
				<span class="series">{SERIES_LABELS[lesson.series]}</span>
				<span class="number">{number}</span>
			</div>

			<p class="caption" bind:this={captionEl} style="height: {captionHeight}px">
				{@render caption(player.caption)}
			</p>

			<div class="panel code-panel" style="height: {stageCode.height}px">
				<div class="tab">{player.file}</div>
				<div class="code-body">
					<CodeView
						code={player.code}
						cursor={player.cursor}
						selection={player.selection}
						highlight={player.highlight}
						fontSize={stageCode.fontSize}
						still
					/>
				</div>
				<div class="display-panel" class:shown={player.showDisplay}>
					<div class="display-scale" style="transform: scale({stageDisplayScale})">
						<div bind:this={displayEl} class="display"></div>
					</div>
				</div>
			</div>

			<!-- Panels that appear later keep their room from the start, so nothing jumps. -->
			{#if stageOutputHeight}
				<div
					class="panel output-panel"
					class:invisible={player.showDisplay ||
						(player.output.length === 0 &&
							player.javaStatus !== 'compiling' &&
							!player.quiz?.revealed)}
					style="min-height: {stageOutputHeight}px"
				>
					<div class="label">Output</div>
					{@render output(stageCode.fontSize)}
				</div>
			{/if}

			{#if firstQuiz}
				{@const quiz = player.quiz ?? firstQuiz}
				<div class="panel quiz-panel" class:invisible={!player.quiz}>
					<div class="quiz-head">
						<span>{quiz.revealed ? 'The answer' : quiz.question}</span>
						{#if quiz.remaining !== null && !quiz.revealed}
							<span class="countdown">{Math.max(1, Math.ceil(quiz.remaining / 1000))}</span>
						{/if}
					</div>
					{@render quizOptions(quiz)}
				</div>
			{/if}
		</div>

		{#if player.endCard}
			<div class="end-card">
				<BrowserCodeLogo size={140} playIntro={false} />
				<p class="end-title">Run it yourself</p>
				<p class="end-url">{shortUrl}</p>
				<p class="end-note">Free, in your browser. Nothing to install.</p>
			</div>
		{/if}
	</div>
{:else}
	<div class="live bc-page-bg">
		<header class="bar">
			<a href={resolve('/learn')} class="home" aria-label="All lessons">
				<BrowserCodeLogo size={26} playIntro={false} />
				<span>Learn</span>
			</a>
			<span class="meta">{number} · {SERIES_LABELS[lesson.series]}</span>
			{#if player.finished}
				<button type="button" class="ghost" onclick={() => void player.play()}>
					<Icon icon="mingcute:refresh-2-line" width="16" /> Replay
				</button>
			{:else}
				<button type="button" class="ghost" onclick={() => player.skip()}>
					Skip <Icon icon="mingcute:skip-forward-line" width="16" />
				</button>
			{/if}
		</header>

		<main class="body" bind:clientWidth={liveWidth}>
			<h1 class="title">{lesson.title}</h1>
			<p class="live-caption" aria-live="polite">{@render caption(player.caption)}</p>

			<section class="card">
				<div class="card-head">
					<span class="file">{player.file}</span>
					{#if player.finished}
						<button type="button" class="ghost small" onclick={() => player.resetCode()}>
							Reset
						</button>
						<button
							type="button"
							class="run"
							disabled={player.javaStatus === 'compiling' || player.javaStatus === 'blocked'}
							onclick={run}
						>
							<Icon icon="mingcute:play-fill" width="14" /> Run
						</button>
					{/if}
				</div>
				<div
					class="live-code"
					style="height: {Math.max(6, player.code.split('\n').length + 1) *
						Math.round(liveFont * 1.5) +
						liveFont}px"
				>
					<CodeView
						code={player.code}
						cursor={player.finished ? null : player.cursor}
						selection={player.selection}
						highlight={player.highlight}
						fontSize={liveFont}
						editable={player.finished}
						onchange={(code) => (player.code = code)}
					/>
				</div>
			</section>

			{#if player.quiz}
				<section class="card quiz">
					<p class="question">
						{player.quiz.question}
						{#if player.quiz.picked === null && !player.quiz.revealed}<span class="hint"
								>Tap your guess.</span
							>{/if}
					</p>
					{@render quizOptions(player.quiz)}
				</section>
			{/if}

			<section class="card">
				<div class="card-head">
					<span class="file">{player.showDisplay ? 'Window' : 'Output'}</span>
					{#if player.quiz?.revealed && quizCorrect !== null}
						<span class="result" class:right={quizCorrect}>
							{quizCorrect
								? 'You got it!'
								: `Not quite: it's ${player.quiz.options[player.quiz.answer].replace(/\n/g, ' / ')}`}
						</span>
					{/if}
				</div>
				<div class="out">
					<div class="out-text" class:hidden={player.showDisplay}>
						{@render output(Math.max(13, liveFont))}
						{#if player.waiting && (player.finished || !lesson.script.some((s) => 'run' in s && s.run.stdin))}
							<form class="input-row" onsubmit={submitInput}>
								<input
									bind:value={input}
									placeholder="Type here, then Enter"
									aria-label="Program input"
									autocapitalize="off"
									autocomplete="off"
								/>
							</form>
						{/if}
					</div>
					<div
						class="live-display"
						class:shown={player.showDisplay}
						style="height: {440 * displayScale}px"
					>
						<div class="display-scale" style="transform: scale({displayScale})">
							<div bind:this={displayEl} class="display"></div>
						</div>
					</div>
				</div>
			</section>

			{#if player.javaStatus === 'blocked'}
				<p class="blocked">
					Java is already running in another BrowserCode tab. Close it, then reload this page.
				</p>
			{/if}

			<div class="actions">
				<button type="button" class="ghost" onclick={openPlayground}>
					<Icon icon="mingcute:code-line" width="16" /> Open in Java Playground
				</button>
				<a href={resolve('/learn')} class="ghost">More lessons</a>
			</div>
		</main>
	</div>
{/if}

<style>
	/* ---------- Record: a fixed 1080×1920 frame, kept clear of Instagram's own UI ---------- */
	.stage {
		position: fixed;
		inset: 0 auto auto 0;
		width: 1080px;
		height: 1920px;
		overflow: hidden;
		background: radial-gradient(120% 60% at 50% 0%, #10182a 0%, #07090e 60%);
		color: #f2f4f7;
		font-family: var(--font-display);
	}
	.stage :global(*) {
		transition: none !important;
		animation: none !important;
	}
	/* Instagram covers about 220px at the top, 420px at the bottom and 120px on the right, and
	   the profile grid crops covers to 3:4, cutting 240px off the top. Content starts at the same
	   height in every lesson, so reels look like one series whether swiped through or side by
	   side; a short lesson leaves room at the bottom, where Instagram's caption sits anyway. */
	.column {
		position: absolute;
		top: 264px;
		left: 60px;
		width: 900px;
		height: 1236px;
		display: flex;
		flex-direction: column;
		gap: 22px;
	}
	.stage .console {
		line-height: 1.35;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 18px;
		font-size: 30px;
	}
	.series {
		color: #b8eef4;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.number {
		margin-left: auto;
		color: #848e9c;
		font-weight: 600;
	}
	.caption {
		flex: none;
		margin: 0;
		font-size: 56px;
		line-height: 1.2;
		font-weight: 650;
	}
	.caption em {
		color: #b8eef4;
		font-style: normal;
	}
	.panel {
		position: relative;
		flex: none;
		border: 2px solid #273249;
		border-radius: 28px;
		background: #0d0d0f;
		overflow: hidden;
	}
	.code-panel {
		display: flex;
		flex-direction: column;
	}
	.tab {
		padding: 14px 28px;
		border-bottom: 2px solid #273249;
		color: #aeb6c2;
		font-family: var(--mono);
		font-size: 26px;
	}
	.code-body {
		flex: 1;
		min-height: 0;
		padding: 0 12px;
	}
	.code-body :global(.code-view) {
		scrollbar-width: none;
	}
	.output-panel {
		padding: 16px 28px 22px;
	}
	.quiz-panel {
		padding: 20px 24px 24px;
	}
	.label {
		color: #848e9c;
		font-size: 24px;
		margin-bottom: 6px;
	}
	.quiz-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 34px;
		font-weight: 650;
		margin-bottom: 18px;
	}
	.countdown {
		display: grid;
		place-items: center;
		width: 60px;
		height: 60px;
		border-radius: 50%;
		background: #b8eef4;
		color: #07090e;
		font-size: 34px;
		font-weight: 700;
	}
	.stage .options {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}
	.stage .option {
		min-height: 84px;
		padding: 10px 16px;
		border-width: 3px;
		border-radius: 18px;
		font-size: 38px;
	}
	/* Outputs of several lines: smaller and tighter, so a quiz of them still fits the frame. */
	.stage .multiline .option {
		min-height: 72px;
		padding: 8px 14px;
		font-size: 32px;
		line-height: 1.08;
	}
	.stage .option.idle,
	.stage .option.picked {
		opacity: 1;
	}
	.display-panel {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		background: #0d0d0f;
		opacity: 0;
	}
	.display-panel.shown,
	.live-display.shown {
		opacity: 1;
	}
	.end-card {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 28px;
		padding: 0 120px 200px 60px;
		background: #07090ef2;
		text-align: center;
	}
	.end-title {
		margin: 0;
		font-size: 76px;
		font-weight: 700;
	}
	.end-url {
		margin: 0;
		padding: 18px 34px;
		border-radius: 999px;
		background: #b8eef4;
		color: #07090e;
		font-size: 50px;
		font-weight: 700;
	}
	.end-note {
		margin: 0;
		color: #aeb6c2;
		font-size: 34px;
	}

	/* ---------- Shared ---------- */
	.stage,
	.live {
		/* The IDE editor's font stack (EditorPane.svelte), so lessons look like the editor. */
		--mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace, monospace;
	}
	.console {
		margin: 0;
		white-space: pre-wrap;
		word-break: break-word;
		font-family: var(--mono);
		color: #f2f4f7;
	}
	.console .input {
		color: #b8eef4;
	}
	.console .compiler {
		color: #f27474;
	}
	.console .info {
		color: #848e9c;
	}
	.option {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4em;
		padding: 6px 10px;
		border: 2px solid #273249;
		border-radius: 12px;
		background: #12161f;
		color: #f2f4f7;
		font-family: var(--mono);
		white-space: pre-line;
		line-height: 1.15;
	}
	.option.picked {
		border-color: #b8eef4;
	}
	.option.right {
		border-color: #87d68d;
		background: #87d68d26;
	}
	.option.wrong {
		border-color: #f27474;
		background: #f2747426;
	}
	.mark {
		flex: none;
		width: 0.85em;
		height: 0.85em;
		fill: none;
		stroke-width: 2.4;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.right .mark {
		stroke: #87d68d;
	}
	.wrong .mark {
		stroke: #f27474;
	}
	.display {
		width: 440px;
		height: 440px;
	}

	/* ---------- Live: px throughout, since the app scales rem down on phones ---------- */
	.live {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
		overflow-y: auto;
		color: var(--color-bc-text);
		font-size: 15px;
	}
	.bar {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 16px;
		border-bottom: 1px solid var(--color-bc-border);
	}
	.home {
		display: flex;
		align-items: center;
		gap: 8px;
		color: var(--color-bc-text);
		font-size: 15px;
		font-weight: 600;
		text-decoration: none;
	}
	.meta {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		color: var(--color-bc-text-muted);
		font-size: 13px;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.body {
		display: flex;
		flex-direction: column;
		gap: 12px;
		width: 100%;
		max-width: 760px;
		margin: 0 auto;
		padding: 16px;
	}
	.title {
		margin: 0;
		font-size: 22px;
		font-weight: 650;
		line-height: 1.25;
	}
	.live-caption {
		min-height: 2.8em;
		margin: 0;
		color: var(--color-bc-azure);
		font-size: 17px;
		font-weight: 600;
		line-height: 1.4;
	}
	.live-caption em {
		color: var(--color-bc-green);
		font-style: normal;
	}
	.card {
		overflow: hidden;
		border: 1px solid var(--color-bc-border);
		border-radius: 14px;
		background: var(--color-bc-terminal);
	}
	.card-head {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 40px;
		padding: 6px 12px;
		border-bottom: 1px solid var(--color-bc-border);
	}
	.file {
		flex: 1;
		color: var(--color-bc-mist);
		font-family: var(--mono);
		font-size: 13px;
	}
	.result {
		color: var(--color-bc-coral);
		font-size: 13px;
		font-weight: 600;
	}
	.result.right {
		color: var(--color-bc-green);
	}
	.live-code {
		max-height: 70vh;
	}
	.quiz {
		padding: 12px;
		background: var(--color-bc-surface);
	}
	.question {
		margin: 0 0 10px;
		font-size: 15px;
		font-weight: 600;
	}
	.hint {
		margin-left: 6px;
		color: var(--color-bc-text-muted);
		font-weight: 400;
	}
	.live .options {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}
	.live .option {
		min-height: 48px;
		font-size: 16px;
		cursor: pointer;
	}
	.live .option:disabled {
		cursor: default;
	}
	.out {
		position: relative;
	}
	.out-text {
		min-height: 88px;
		padding: 10px 12px;
	}
	.input-row input {
		width: 100%;
		margin-top: 8px;
		padding: 8px 10px;
		border: 1px solid var(--color-bc-border);
		border-radius: 8px;
		background: var(--color-bc-surface);
		color: var(--color-bc-text);
		font-family: var(--mono);
		font-size: 16px;
	}
	.live-display {
		position: absolute;
		inset: 0;
		display: flex;
		justify-content: center;
		overflow: hidden;
		opacity: 0;
		pointer-events: none;
	}
	.live-display.shown {
		position: relative;
		pointer-events: auto;
	}
	.live-display .display-scale {
		transform-origin: top center;
	}
	.blocked {
		margin: 0;
		color: var(--color-bc-gold);
		font-size: 14px;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		padding: 4px 0 24px;
	}
	.ghost {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px 14px;
		border: 1px solid var(--color-bc-border);
		border-radius: 999px;
		color: var(--color-bc-text);
		font-size: 14px;
		text-decoration: none;
		white-space: nowrap;
	}
	.ghost.small {
		padding: 4px 12px;
		font-size: 13px;
	}
	.ghost:hover {
		border-color: var(--color-bc-azure);
	}
	.run {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 5px 14px;
		border-radius: 999px;
		background: var(--color-bc-azure);
		color: var(--color-bc-abyss);
		font-size: 14px;
		font-weight: 650;
	}
	.run:disabled {
		opacity: 0.5;
	}
</style>
