<script lang="ts">
	import { onDestroy } from 'svelte';
	import { replaceState } from '$app/navigation';
	import Icon from '@iconify/svelte';
	import { fly } from 'svelte/transition';
	import type { IdeSession } from '$lib/ide/session.svelte';
	import { shareLink } from '$lib/ide/share';

	let { session }: { session: IdeSession } = $props();

	/** Long enough to read two short sentences; hovering the note holds it open. */
	const NOTE_MS = 6000;
	const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	let result = $state<'copied' | 'failed' | null>(null);
	let rootEl = $state<HTMLElement | null>(null);
	let timer: ReturnType<typeof setTimeout>;

	function hideLater(): void {
		clearTimeout(timer);
		timer = setTimeout(() => (result = null), NOTE_MS);
	}

	async function share(): Promise<void> {
		try {
			const url = await shareLink(session);
			if (!url) return;
			// Only where the link opens this same page; an embed keeps the URL its host gave it. The
			// source builds the link from the site root, so resolve() has no route id to map.
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			if (new URL(url).pathname === location.pathname) replaceState(url, {});
			await navigator.clipboard.writeText(url);
			result = 'copied';
		} catch (error) {
			console.error('Failed to share project:', error);
			result = 'failed';
		}
		hideLater();
	}

	$effect(() => {
		if (!result) return;
		const dismiss = (event: PointerEvent): void => {
			if (!rootEl?.contains(event.target as Node)) result = null;
		};
		const onKey = (event: KeyboardEvent): void => {
			if (event.key === 'Escape') result = null;
		};
		window.addEventListener('pointerdown', dismiss);
		window.addEventListener('keydown', onKey);
		return () => {
			window.removeEventListener('pointerdown', dismiss);
			window.removeEventListener('keydown', onKey);
		};
	});

	onDestroy(() => clearTimeout(timer));
</script>

<!-- Not positioned itself: the note spans the bar this sits in, the nearest positioned ancestor. -->
<div bind:this={rootEl}>
	<button
		onclick={share}
		disabled={!session.fsReady}
		title="Copy a link that opens this project"
		class="share-btn"
	>
		<Icon
			icon={result === 'copied' ? 'mingcute:check-line' : 'mingcute:share-forward-line'}
			width="13"
			height="13"
		/>
		Share
	</button>

	<div role="status" aria-live="polite">
		{#if result}
			<div
				class="note"
				transition:fly={{ y: -4, duration: reduceMotion ? 0 : 160 }}
				onmouseenter={() => clearTimeout(timer)}
				onmouseleave={hideLater}
				role="presentation"
			>
				<p>
					{#if result === 'copied'}
						<Icon
							icon="mingcute:check-line"
							width="13"
							height="13"
							class="note-icon text-bc-azure"
						/>
						<strong>Link copied.</strong> It saves the project as it is now; share again after changes.
					{:else}
						<Icon
							icon="mingcute:warning-line"
							width="13"
							height="13"
							class="note-icon text-bc-coral"
						/>
						<strong>Couldn't copy the link.</strong> This page isn't allowed to write to the clipboard.
					{/if}
				</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.share-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 24px;
		padding: 0 8px;
		border: none;
		border-radius: 4px;
		background: transparent;
		color: var(--color-bc-text-muted);
		font: inherit;
		font-size: 11px;
		cursor: pointer;
		transition:
			color 0.14s ease,
			background 0.14s ease;
	}
	.share-btn:hover:not(:disabled) {
		background: rgb(var(--bc-tint) / 6%);
		color: var(--color-bc-text);
	}
	.share-btn:disabled {
		cursor: not-allowed;
		opacity: 0.4;
	}
	.share-btn:focus-visible {
		outline: 1px solid var(--color-bc-azure);
		outline-offset: -1px;
	}

	/* Centred by auto margins, not a transform, which `fly` would overwrite. */
	.note {
		position: absolute;
		top: calc(100% + 8px);
		left: 0;
		right: 0;
		z-index: 40;
		width: fit-content;
		max-width: min(320px, 100% - 24px);
		margin-inline: auto;
		padding: 6px 12px;
		border: 1px solid var(--color-bc-border);
		border-radius: 8px;
		background-color: var(--color-bc-navy);
		box-shadow: 0 8px 18px rgb(0 0 0 / 25%);
		color: var(--color-bc-text-muted);
		font-size: 11px;
		line-height: 1.45;
	}
	.note p {
		margin: 0;
		text-align: center;
		text-wrap: balance;
	}
	/* Inline with the text, so it stays beside the first word when the lines centre. */
	.note :global(.note-icon) {
		display: inline-block;
		margin-right: 4px;
		vertical-align: -2px;
	}
	.note strong {
		color: var(--color-bc-text);
		font-weight: 500;
	}
</style>
