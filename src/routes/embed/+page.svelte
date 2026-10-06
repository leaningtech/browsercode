<script lang="ts">
	import { page } from '$app/stores';
	import Icon from '@iconify/svelte';
	import IdeShell from '$lib/components/ide/IdeShell.svelte';
	import AgentShell from '$lib/components/agents/AgentShell.svelte';
	import DuplicateTabDialog from '$lib/components/agents/DuplicateTabDialog.svelte';
	import { IdeSession } from '$lib/ide/session.svelte';
	import { AgentSession } from '$lib/agents/session.svelte';
	import { templateSource } from '$lib/ide/template-source';
	import { repoSource } from '$lib/ide/repo-source';
	import { parseEmbedOptions } from '$lib/embed/options';

	// The host page composes the embed through the query string; nothing here is navigable, so the
	// options are read once for this page's lifetime.
	const options = parseEmbedOptions($page.url);
	const source = options?.source;

	const agentSession =
		source?.kind === 'agent' ? new AgentSession(source.id, { leaveGuard: false }) : null;
	const ideSession =
		source && source.kind !== 'agent'
			? new IdeSession(
					source.kind === 'framework' ? templateSource(source.id) : repoSource(source.ref)
				)
			: null;
</script>

{#if options && agentSession}
	<div class="flex h-full min-h-0 w-full min-w-0 flex-col">
		{#if agentSession.lock === 'taken'}
			<DuplicateTabDialog />
		{/if}
		<AgentShell session={agentSession} shell={options.shell} />
	</div>
{:else if options && ideSession}
	<IdeShell session={ideSession} shell={options.shell} />
{:else}
	<div
		class="bc-page-bg bc-dark-scope flex h-full w-full items-center justify-center p-4 text-zinc-300"
	>
		<div
			class="glass-panel w-full max-w-md rounded-xl border border-bc-mist/15 px-6 py-8 text-center"
		>
			<div
				class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-bc-coral/10 text-bc-coral"
			>
				<Icon icon="mingcute:alert-line" width="22" height="22" />
			</div>
			<h3 class="mb-3 text-sm font-semibold text-zinc-50">Nothing to boot</h3>
			<p class="text-[12px] leading-relaxed text-zinc-400">Pass one of</p>
			<ul class="mt-2 space-y-1 text-left text-[12px] text-zinc-200">
				<li><code class="break-all">?repo=&lt;github url&gt;</code></li>
				<li><code class="break-all">?framework=&lt;id&gt;</code></li>
				<li><code class="break-all">?agent=&lt;id&gt;</code></li>
			</ul>
			<p class="mt-3 text-[12px] leading-relaxed text-zinc-400">
				optionally with <code class="break-all text-zinc-200"
					>&amp;view=files,editor,terminal,preview</code
				>.
			</p>
		</div>
	</div>
{/if}
