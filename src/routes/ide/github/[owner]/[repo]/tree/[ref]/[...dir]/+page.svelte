<script lang="ts">
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import IdeShell from '$lib/components/ide/IdeShell.svelte';
	import { IdeSession } from '$lib/ide/session.svelte';
	import { repoSource } from '$lib/ide/repo-source';
	import { isValidRepoPath } from '$lib/github/parse';

	// `[...dir]` matches the empty segment, so /…/tree/<ref> arrives here with dir = ''.
	const owner = $page.params.owner ?? '';
	const repo = $page.params.repo ?? '';
	const ref = $page.params.ref ?? '';
	const dir = $page.params.dir ?? '';

	const valid = isValidRepoPath({ owner, repo, ref, dir });

	const session = new IdeSession(repoSource({ owner, repo, ref, dir }));
</script>

{#if valid}
	<IdeShell {session} />
{:else}
	<div class="bc-page-bg flex h-full w-full items-center justify-center p-4 text-zinc-300">
		<div class="glass-panel max-w-md rounded-xl border border-bc-mist/15 px-6 py-8 text-center">
			<div
				class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-bc-coral/10 text-bc-coral"
			>
				<Icon icon="mingcute:alert-line" width="22" height="22" />
			</div>
			<h3 class="mb-2 text-sm font-semibold text-zinc-50">Invalid repository URL</h3>
			<p class="text-[12px] leading-relaxed text-zinc-400">
				Expected
				<code class="text-zinc-200"
					>/ide/github/&lt;owner&gt;/&lt;repo&gt;/tree/&lt;ref&gt;/&lt;dir&gt;</code
				>.
			</p>
			<a
				href={resolve('/ide')}
				class="mt-4 inline-block rounded-md bg-bc-azure/90 px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-bc-azure"
			>
				Back to playground
			</a>
		</div>
	</div>
{/if}
