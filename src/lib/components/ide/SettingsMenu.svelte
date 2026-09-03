<script lang="ts">
	import Icon from '@iconify/svelte';
	import { editorThemesFor, type EditorThemeId } from '$lib/config/editor-themes';
	import {
		appearance,
		activeEditorThemeId,
		setEditorTheme
	} from '$lib/stores/editor-settings.svelte';

	// Host supplies the classes
	let {
		baseClass = '',
		activeClass = '',
		idleClass = '',
		size = 18
	}: {
		baseClass?: string;
		activeClass?: string;
		idleClass?: string;
		size?: number;
	} = $props();

	let open = $state(false);
	let rootEl = $state<HTMLElement | null>(null);

	let themes = $derived(editorThemesFor(appearance));
	let selected = $derived(activeEditorThemeId());

	function choose(id: EditorThemeId): void {
		setEditorTheme(id);
		open = false;
	}

	// `pointerdown`, not `click`: the row that closes the menu is gone before a click reaches the
	// window. `blur` catches clicks into the preview iframe, which raise no event here.
	$effect(() => {
		if (!open) return;
		const dismiss = (event: PointerEvent): void => {
			if (rootEl?.contains(event.target as Node)) return;
			open = false;
		};
		const onKey = (event: KeyboardEvent): void => {
			if (event.key === 'Escape') open = false;
		};
		const onBlur = (): void => {
			open = false;
		};
		window.addEventListener('pointerdown', dismiss);
		window.addEventListener('keydown', onKey);
		window.addEventListener('blur', onBlur);
		return () => {
			window.removeEventListener('pointerdown', dismiss);
			window.removeEventListener('keydown', onKey);
			window.removeEventListener('blur', onBlur);
		};
	});
</script>

<div bind:this={rootEl} class="relative">
	<button
		type="button"
		onclick={() => (open = !open)}
		aria-expanded={open}
		class="{baseClass} {open ? activeClass : idleClass}"
		title="Settings"
		aria-label="Settings"
	>
		<Icon icon="mingcute:settings-3-line" width={size} height={size} />
	</button>

	{#if open}
		<div class="settings-menu">
			<p class="settings-heading">Editor theme</p>
			{#each themes as theme (theme.id)}
				<button type="button" onclick={() => choose(theme.id)} class="menu-row">
					<span class="truncate">{theme.label}</span>
					{#if theme.id === selected}
						<Icon icon="mingcute:check-line" width="12" height="12" class="ml-auto shrink-0" />
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.settings-menu {
		position: absolute;
		bottom: 0;
		left: calc(100% + 6px);
		z-index: 40;
		width: 176px;
		padding: 4px;
		border-radius: 8px;
		border: 1px solid color-mix(in srgb, var(--color-bc-mist) 15%, transparent);
		background-color: var(--color-bc-navy);
		background-image: linear-gradient(155deg, rgba(74, 125, 255, 0.16), transparent 65%);
		box-shadow: 0 12px 26px rgba(0, 0, 0, 0.55);
	}

	.settings-heading {
		padding: 4px 8px 5px;
		color: rgba(255, 255, 255, 0.35);
		font-size: 10px;
		font-weight: 500;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.menu-row {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 6px 8px;
		border: none;
		border-radius: 4px;
		background: transparent;
		color: rgba(255, 255, 255, 0.7);
		font: inherit;
		font-size: 12px;
		text-align: left;
		cursor: pointer;
		transition: background 0.12s ease;
	}
	.menu-row:hover {
		background: color-mix(in srgb, var(--color-bc-azure) 10%, transparent);
		color: #fff;
	}
</style>
