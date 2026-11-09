<script lang="ts">
	import { replaceState } from '$app/navigation';
	import Icon from '@iconify/svelte';
	import type { IdeSession } from '$lib/ide/session.svelte';
	import { javaVersionLink } from '$lib/ide/share';
	import { JAVA_VERSIONS, type JavaVersion } from '$lib/java/versions';
	import { markIntentionalNavigation } from '$lib/stores/leaveWarning.svelte';

	let { session, current }: { session: IdeSession; current: JavaVersion } = $props();

	let open = $state(false);
	let rootEl = $state<HTMLElement | null>(null);
	let buttonEl = $state<HTMLElement | null>(null);
	/** Fixed to the viewport: the tab bar scrolls sideways, which clips anything absolute in it. */
	let anchor = $state('');

	/** Room the menu needs below its button before it opens upward instead. */
	const MENU_HEIGHT = 200;

	function toggle(): void {
		if (!open && buttonEl) {
			const rect = buttonEl.getBoundingClientRect();
			const right = `right: ${window.innerWidth - rect.right}px;`;
			// The Output bar usually sits low on the screen, so the menu mostly opens upward.
			anchor =
				rect.bottom + MENU_HEIGHT > window.innerHeight
					? `bottom: ${window.innerHeight - rect.top + 5}px; ${right}`
					: `top: ${rect.bottom + 5}px; ${right}`;
		}
		open = !open;
	}

	/**
	 * CheerpJ starts one Java per page, so switching reloads with the project in the hash. The
	 * edits travel with it, so there is nothing to confirm.
	 */
	async function switchJava(version: JavaVersion): Promise<void> {
		open = false;
		if (version === current) return;
		try {
			const url = await javaVersionLink(session, version);
			if (!url) return;
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			replaceState(url, {});
			markIntentionalNavigation();
			location.reload();
		} catch (error) {
			console.error('Failed to switch Java version:', error);
		}
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
		disabled={!session.fsReady}
		aria-haspopup="menu"
		aria-expanded={open}
		title="Java version"
		class="picker"
	>
		Java <span class="tabular-nums">{current}</span>
		<Icon icon="mingcute:down-line" width="10" height="10" class="opacity-60" />
	</button>

	{#if open}
		<div role="menu" aria-label="Java version" class="menu" style={anchor}>
			{#each JAVA_VERSIONS as version (version)}
				<button
					role="menuitemradio"
					aria-checked={version === current}
					onclick={() => switchJava(version)}
					class="row"
				>
					Java <span class="tabular-nums">{version}</span>
					{#if version === current}
						<Icon icon="mingcute:check-line" width="12" height="12" class="ml-auto" />
					{/if}
				</button>
			{/each}
			<p class="note">Switching reloads the page and keeps your edits.</p>
		</div>
	{/if}
</div>

<style>
	.picker {
		display: inline-flex;
		align-items: center;
		gap: 4px;
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
		width: 168px;
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

	.note {
		margin: 4px 0 0;
		padding: 6px 8px 4px;
		border-top: 1px solid var(--color-bc-border);
		color: var(--color-bc-text-muted);
		font-size: 10.5px;
		line-height: 1.4;
	}
</style>
