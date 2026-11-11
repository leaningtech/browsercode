<script lang="ts" generics="T extends string | number">
	import type { Snippet } from 'svelte';
	import Icon from '@iconify/svelte';

	let {
		label,
		options,
		selected,
		placeholder = '',
		disabled = false,
		note,
		option,
		onselect
	}: {
		/** Names the menu for screen readers and titles its button. */
		label: string;
		options: readonly T[];
		selected: T | null;
		/** The button's text while nothing is selected. */
		placeholder?: string;
		disabled?: boolean;
		/** A line under the options. */
		note?: string;
		/** Renders one option, on the button and in the menu. */
		option: Snippet<[T]>;
		onselect: (value: T) => void;
	} = $props();

	let open = $state(false);
	let rootEl = $state<HTMLElement | null>(null);
	let buttonEl = $state<HTMLElement | null>(null);
	/** Fixed to the viewport: the tab bar scrolls sideways, which clips anything absolute in it. */
	let anchor = $state('');

	/** Room the menu needs below its button before it opens upward instead. */
	const MENU_HEIGHT = 200;
	/** Between the button and the menu. */
	const GAP = 5;
	/** Kept clear of the viewport edge, so a capped list doesn't sit flush against it. */
	const EDGE = 8;
	/** A menu shorter than this is no use; below that it scrolls rather than shrinks further. */
	const MIN_HEIGHT = 96;

	function toggle(): void {
		if (!open && buttonEl) {
			const rect = buttonEl.getBoundingClientRect();
			const right = `right: ${window.innerWidth - rect.right}px;`;
			// The Output bar usually sits low on the screen, so the menu mostly opens upward.
			const upward = rect.bottom + MENU_HEIGHT > window.innerHeight;
			// The options are whatever the build found, so the list has no length to design
			// around: a project with a main method in thirty classes would run off the screen,
			// taking the entries at that end with it. Capped to the room on this side instead,
			// which leaves the overflow scrollable.
			const room = (upward ? rect.top : window.innerHeight - rect.bottom) - GAP - EDGE;
			const cap = `max-height: ${Math.max(MIN_HEIGHT, room)}px;`;
			anchor = upward
				? `bottom: ${window.innerHeight - rect.top + GAP}px; ${right} ${cap}`
				: `top: ${rect.bottom + GAP}px; ${right} ${cap}`;
		}
		open = !open;
	}

	function pick(value: T): void {
		open = false;
		onselect(value);
	}

	// `pointerdown`, as in Portal.svelte: `blur` catches a click into the Display's canvas.
	$effect(() => {
		if (!open) return;
		const dismiss = (event: PointerEvent): void => {
			if (!rootEl?.contains(event.target as Node)) open = false;
		};
		const onKey = (event: KeyboardEvent): void => {
			if (event.key === 'Escape') open = false;
		};
		const close = (): void => {
			open = false;
		};
		window.addEventListener('pointerdown', dismiss);
		window.addEventListener('keydown', onKey);
		window.addEventListener('blur', close);
		// A fixed menu would drift from its button as the panes resize.
		window.addEventListener('resize', close);
		return () => {
			window.removeEventListener('pointerdown', dismiss);
			window.removeEventListener('keydown', onKey);
			window.removeEventListener('blur', close);
			window.removeEventListener('resize', close);
		};
	});
</script>

<div bind:this={rootEl} class="flex h-full">
	<button
		bind:this={buttonEl}
		onclick={toggle}
		{disabled}
		aria-haspopup="menu"
		aria-expanded={open}
		title={label}
		class="picker"
	>
		<span class="truncate">
			{#if selected !== null}
				{@render option(selected)}
			{:else}
				{placeholder}
			{/if}
		</span>
		<Icon icon="mingcute:down-line" width="10" height="10" class="shrink-0 opacity-60" />
	</button>

	{#if open}
		<div role="menu" aria-label={label} class="menu" style={anchor}>
			{#each options as value (value)}
				<button
					role="menuitemradio"
					aria-checked={value === selected}
					onclick={() => pick(value)}
					class="row"
				>
					<span class="truncate">{@render option(value)}</span>
					{#if value === selected}
						<Icon icon="mingcute:check-line" width="12" height="12" class="ml-auto shrink-0" />
					{/if}
				</button>
			{/each}
			{#if note}
				<p class="note">{note}</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.picker {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		max-width: 160px;
		height: 100%;
		padding: 0 6px 0 8px;
		border: none;
		background: transparent;
		color: var(--color-bc-text-muted);
		font-family: monospace;
		font-size: 11px;
		font-weight: 500;
		cursor: pointer;
		transition:
			color 0.14s ease,
			background 0.14s ease;
	}
	.picker:hover:not(:disabled),
	.picker[aria-expanded='true'] {
		background: rgb(var(--bc-tint) / 6%);
		color: var(--color-bc-text);
	}
	.picker:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}
	.picker:focus-visible,
	.row:focus-visible {
		outline: 1px solid var(--color-bc-azure);
		outline-offset: -1px;
	}

	/* Same surface as the preview's menus in Portal.svelte, so both runtimes read alike. */
	.menu {
		position: fixed;
		z-index: 50;
		min-width: 168px;
		max-width: 320px;
		/* `max-height` comes from the anchor, measured against the room below or above the
		   button. `contain` keeps a long list's scroll from carrying on into the page. */
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 4px;
		border-radius: 8px;
		border: 1px solid var(--color-bc-border);
		background-color: var(--color-bc-navy);
		box-shadow: 0 12px 26px rgb(0 0 0 / 35%);
	}

	.row {
		display: flex;
		align-items: center;
		gap: 4px;
		width: 100%;
		padding: 5px 8px;
		border: none;
		border-radius: 4px;
		background: transparent;
		color: var(--color-bc-mist);
		font-family: monospace;
		font-size: 11px;
		text-align: left;
		cursor: pointer;
		transition: background 0.12s ease;
	}
	.row:hover {
		background: color-mix(in srgb, var(--color-bc-azure) 10%, transparent);
		color: var(--color-bc-text);
	}
	.row[aria-checked='true'] {
		color: var(--color-bc-text);
	}

	/* Sized by the rows, not by its own text, which would stretch the menu to its widest. */
	.note {
		width: 0;
		min-width: 100%;
		margin: 4px 0 0;
		padding: 6px 8px 4px;
		border-top: 1px solid var(--color-bc-border);
		color: var(--color-bc-text-muted);
		font-size: 10.5px;
		line-height: 1.4;
	}
</style>
