<script lang="ts">
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import IdeShell from '$lib/components/ide/IdeShell.svelte';
	import { IdeSession, type PortalUpdate } from '$lib/ide/session.svelte';
	import type { FrameworkId } from '$lib/config/frameworks';

	const SEGMENT = /^[\w.-]+$/;

	// `[...dir]` matches the empty segment, so /…/tree/<ref> arrives here with dir = ''.
	const owner = $page.params.owner ?? '';
	const repo = $page.params.repo ?? '';
	const ref = $page.params.ref ?? '';
	const dir = $page.params.dir ?? '';

	function dirIsValid(value: string): boolean {
		if (value === '') return true;
		return value.split('/').every((seg) => SEGMENT.test(seg) && seg !== '..');
	}

	const valid = SEGMENT.test(owner) && SEGMENT.test(repo) && SEGMENT.test(ref) && dirIsValid(dir);

	const session = new IdeSession();

	function selectFramework(framework: FrameworkId) {
		// Switching to a curated framework leaves GitHub mode (full reload = pod teardown).
		window.location.href = `/ide?framework=${framework}`;
	}

	function boot(terminalEl: HTMLElement, onPortalUpdate: (update: PortalUpdate) => void) {
		return session.bootFromGitHub(owner, repo, ref, dir, terminalEl, onPortalUpdate);
	}
</script>

{#if valid}
	<IdeShell {session} {boot} />
{:else}
	<div class="flex h-full w-full items-center justify-center bg-zinc-950 p-4 text-zinc-300">
		<div class="max-w-md rounded-xl border border-white/8 bg-[#111111] px-6 py-8 text-center">
			<div
				class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400"
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
				class="mt-4 inline-block rounded-md bg-white/8 px-3 py-1.5 text-[12px] font-medium text-white/80 transition hover:bg-white/14"
			>
				Back to playground
			</a>
		</div>
	</div>
{/if}
