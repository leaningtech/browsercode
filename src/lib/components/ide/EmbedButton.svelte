<script lang="ts">
	import Icon from '@iconify/svelte';
	import EmbedBuilder from '$lib/components/embed/EmbedBuilder.svelte';
	import type { EmbedTarget } from '$lib/embed/url';
	import type { IdeSession } from '$lib/ide/session.svelte';
	import { emptiedNote, MAX_LINK_LENGTH, shareLink } from '$lib/ide/share';

	let { session }: { session: IdeSession } = $props();

	let open = $state(false);
	/** What to embed; null when the project only fits in a link and that link is too long. */
	let target = $state<EmbedTarget | null>(null);
	let emptied = $state<string[]>([]);

	async function show(): Promise<void> {
		try {
			const shared = await shareLink(session);
			if (!shared) return;
			// Only a link has a length to run over; a project still as it shipped is named, not carried.
			const tooLong = shared.target.kind === 'link' && shared.url.length > MAX_LINK_LENGTH;
			target = tooLong ? null : shared.target;
			emptied = shared.emptied;
			open = true;
		} catch (error) {
			console.error('Failed to build the embed link:', error);
		}
	}
</script>

<svelte:window onkeydown={(event) => event.key === 'Escape' && (open = false)} />

<button
	onclick={show}
	title="Embed this project in your own page"
	class="inline-flex h-6 shrink-0 items-center gap-1.5 rounded px-2 text-[11px] text-bc-text-muted transition hover:bg-bc-tint/6 hover:text-bc-text focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-bc-azure"
>
	<Icon icon="mingcute:code-line" width="13" height="13" />
	Embed
</button>

{#if open}
	<div
		class="fixed inset-0 z-70 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
		role="presentation"
		onclick={(event) => event.target === event.currentTarget && (open = false)}
	>
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="embed-title"
			class="max-h-full w-full max-w-4xl overflow-y-auto rounded-xl border border-bc-border bg-bc-statusbar p-5 shadow-2xl"
		>
		<div class="mb-5 flex items-start justify-between gap-3">
			<div>
				<h3 id="embed-title" class="mb-1 text-[14px] font-semibold text-bc-text">
					Embed this project
				</h3>
				<p class="text-[12px] leading-relaxed text-bc-text-muted">
					{#if target?.kind === 'link'}
						The embed opens the project as it is now; open this again after changes.
						{#if emptied.length}{emptiedNote(emptied)} Download keeps them.{/if}
					{:else if target}
						Nothing has changed since this project booted, so the embed opens it by name.
					{:else}
						This project is too large to embed as a link. Use Download to share it instead.
					{/if}
				</p>
			</div>
			<button
				onclick={() => (open = false)}
				aria-label="Close"
				class="shrink-0 rounded-md p-1 text-bc-icon transition hover:bg-bc-tint/10 hover:text-bc-mist"
			>
				<Icon icon="mingcute:close-line" width="16" height="16" />
			</button>
		</div>
		{#if target}
			<EmbedBuilder fixed={target} />
		{/if}
		</div>
	</div>
{/if}
