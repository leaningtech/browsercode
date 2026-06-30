<script lang="ts">
	import Icon from '@iconify/svelte';
	import { frameworkRailItems } from '$lib/config/frameworks';

	let url = $state('');
	let error = $state('');

	type ParsedRepo = { owner: string; repo: string; ref: string; dir: string };

	function parseGitHubUrl(input: string): ParsedRepo | null {
		const cleaned = input
			.trim()
			.replace(/^https?:\/\//, '')
			.replace(/^github\.com\//, '')
			.replace(/\.git$/, '')
			.replace(/\/+$/, '');
		const parts = cleaned.split('/').filter(Boolean);
		if (parts.length < 2) return null;
		const [owner, repo, keyword, ref, ...dirParts] = parts;
		if (keyword === 'tree' && ref) return { owner, repo, ref, dir: dirParts.join('/') };
		if (parts.length === 2) return { owner, repo, ref: 'main', dir: '' };
		return null;
	}

	function openRepo() {
		const parsed = parseGitHubUrl(url);
		if (!parsed) {
			error = 'Use github.com/owner/repo or …/tree/branch/optional/dir';
			return;
		}
		const { owner, repo, ref, dir } = parsed;
		// Full reload so any prior pod is torn down cleanly.
		window.location.href = `/ide/github/${owner}/${repo}/tree/${ref}${dir ? `/${dir}` : ''}`;
	}

	function openFramework(id: string) {
		window.location.href = `/ide?framework=${id}`;
	}
</script>

<div class="flex h-full w-full items-center justify-center overflow-auto bg-zinc-950 p-6 text-zinc-300">
	<div class="w-full max-w-lg">
		<h1 class="mb-1 text-lg font-semibold text-zinc-100">Playground</h1>
		<p class="mb-6 text-[13px] text-white/40">
			Start from a framework template or clone a GitHub repo.
		</p>

		<div class="mb-6">
			<div class="mb-2 text-[11px] font-medium tracking-widest text-zinc-600 uppercase">
				Frameworks
			</div>
			<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
				{#each frameworkRailItems as fw (fw.id)}
					<button
						onclick={() => openFramework(fw.id)}
						class="flex items-center gap-2 rounded-lg border border-white/8 bg-[#111111] px-3 py-2 text-left text-[13px] text-zinc-300 transition hover:border-white/20 hover:bg-white/5"
					>
						<Icon icon={fw.icon} width="16" height="16" class="shrink-0" />
						<span class="truncate">{fw.label}</span>
					</button>
				{/each}
			</div>
		</div>

		<div>
			<div class="mb-2 text-[11px] font-medium tracking-widest text-zinc-600 uppercase">
				Clone from GitHub
			</div>
			<div class="flex gap-2">
				<input
					bind:value={url}
					oninput={() => (error = '')}
					onkeydown={(e) => e.key === 'Enter' && openRepo()}
					placeholder="github.com/owner/repo/tree/main/dir"
					class="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#111111] px-3 py-2 text-[13px] text-zinc-200 outline-none placeholder:text-white/25 focus:border-white/25"
				/>
				<button
					onclick={openRepo}
					class="shrink-0 rounded-lg bg-emerald-600/90 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-emerald-500"
				>
					Clone
				</button>
			</div>
			{#if error}
				<p class="mt-2 text-[12px] text-rose-300/90">{error}</p>
			{/if}
		</div>
	</div>
</div>
