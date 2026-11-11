<script lang="ts">
	import { untrack } from 'svelte';

	let {
		lines,
		activeLine,
		hidden = false,
		surface = 'dark'
	}: {
		/** Ordered boot-log messages, dmesg-style (lowercase). */
		lines: readonly string[];
		/** Highest line index real progress justifies revealing (-1 before boot starts). */
		activeLine: number;
		hidden?: boolean;
		/** What the log sits on, which sets its ink. */
		surface?: 'dark' | 'light';
	} = $props();

	const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	// Screen-reader status: the current step only, not the streaming log.
	let status = $derived(activeLine >= 0 && activeLine < lines.length ? lines[activeLine] : '');

	// Reveal lines one at a time up to what real progress justifies (activeLine + 1), and drop the
	// ones past it at once when a rebuild steps back. untrack keeps the effect keyed to activeLine,
	// not to its own writes to `revealed`.
	let revealed = $state(0);
	$effect(() => {
		const target = activeLine + 1;
		if (reduceMotion || untrack(() => revealed) > target) {
			revealed = target;
			return;
		}
		let id: ReturnType<typeof setTimeout>;
		const tick = () => {
			const current = untrack(() => revealed);
			if (current >= target) return;
			revealed = current + 1;
			id = setTimeout(tick, 380);
		};
		if (untrack(() => revealed) < target) id = setTimeout(tick, 380);
		return () => clearTimeout(id);
	});

	const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
	let spin = $state(0);
	$effect(() => {
		if (reduceMotion) return;
		const id = setInterval(() => (spin = (spin + 1) % SPINNER.length), 90);
		return () => clearInterval(id);
	});
	let spinner = $derived(reduceMotion ? '⠿' : SPINNER[spin]);

	// Elapsed on the active step, so a long stage (pod boot, install) doesn't look frozen.
	let sinceStage = $state(0);
	$effect(() => {
		const stage = activeLine; // reading it resets the timer on each stage change
		sinceStage = 0;
		if (reduceMotion || stage < 0) return;
		const started = performance.now();
		const id = setInterval(() => {
			sinceStage = (performance.now() - started) / 1000;
		}, 250);
		return () => clearInterval(id);
	});

	let shown = $derived(lines.slice(0, revealed));
</script>

<div class="boot-log" class:on-light={surface === 'light'} class:hide={hidden} aria-hidden="true">
	{#each shown as line, i (line)}
		{@const done = i < activeLine}
		{@const active = i === activeLine}
		<div class="log-line" class:done>
			<span class="gate">[<span class="tok" class:ok={done}>{done ? 'OK' : spinner}</span>]</span>
			<span class="msg">{line}</span>
			{#if active && sinceStage >= 2}<span class="wait">{Math.floor(sinceStage)}s</span>{/if}
		</div>
	{/each}
</div>
<span class="sr-only" role="status" aria-live="polite">{status}</span>

<style>
	.boot-log {
		--ink: 255 255 255;
		position: absolute;
		left: clamp(14px, 3vw, 28px);
		bottom: clamp(14px, 4vh, 26px);
		z-index: 3;
		display: flex;
		flex-direction: column;
		gap: 5px;
		/* Stack Sans Text must be self-hosted (same-origin @font-face): the page is cross-origin
		   isolated for SharedArrayBuffer, so Google Fonts API assets are off the table. */
		font-family: 'Stack Sans Text', system-ui, sans-serif;
		font-size: 12px;
		line-height: 1.3;
		transition: opacity 0.2s ease;
		text-shadow: 0 1px 6px rgba(0, 0, 0, 0.7); /* legibility over the grid */
	}
	.boot-log.on-light {
		--ink: 30 30 30;
		text-shadow: none;
	}
	.hide {
		opacity: 0;
	}

	.log-line {
		display: flex;
		align-items: center;
		gap: 9px;
		white-space: nowrap;
		animation: log-in 0.22s ease both;
	}

	.gate {
		color: rgb(var(--ink) / 30%);
	}
	.tok {
		display: inline-block;
		/* min-, not fixed, width: 'OK' can run wider than 2ch in a proportional face */
		min-width: 2ch;
		text-align: center;
		color: rgb(var(--ink) / 90%);
	}
	.tok.ok {
		color: rgb(var(--ink)); /* completed step lands at full strength */
		font-weight: 600;
	}

	/* active step reads strong; completed steps recede into history */
	.msg {
		color: rgb(var(--ink) / 92%);
	}
	.log-line.done .msg {
		color: rgb(var(--ink) / 40%);
	}
	.on-light .log-line.done .msg {
		color: rgb(var(--ink) / 55%);
	}
	.wait {
		color: rgb(var(--ink) / 40%);
		font-variant-numeric: tabular-nums;
	}

	@keyframes log-in {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.log-line {
			animation: none;
		}
	}
</style>
