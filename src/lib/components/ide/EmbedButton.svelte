<script lang="ts">
	import Icon from '@iconify/svelte';
	import EmbedBuilder from '$lib/components/embed/EmbedBuilder.svelte';
	import type { IdeSession } from '$lib/ide/session.svelte';
	import { MAX_LINK_LENGTH, shareLink } from '$lib/ide/share';

	let { session }: { session: IdeSession } = $props();

	let open = $state(false);
	/** The project as Share would link it; empty when it is too large for one. */
	let link = $state('');

	async function show(): Promise<void> {
		try {
			const url = await shareLink(session);
			if (!url) return;
			link = url.length > MAX_LINK_LENGTH ? '' : url;
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
			class="max-h-full w-full max-w-5xl overflow-y-auto rounded-xl border border-bc-border bg-bc-statusbar p-6 shadow-2xl"
		>
			<div class="mb-6 flex items-start justify-between gap-3">
				<div>
					<h3 id="embed-title" class="mb-1 text-[14px] font-semibold text-bc-text">
						Embed this project
					</h3>
					<p class="text-[12px] leading-relaxed text-bc-text-muted">
						{link
							? 'The embed opens the project as it is now; open this again after changes.'
							: 'This project is too large for a link, so pick something else to embed below.'}
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
			<EmbedBuilder {link} live={false} />
		</div>
	</div>
{/if}
