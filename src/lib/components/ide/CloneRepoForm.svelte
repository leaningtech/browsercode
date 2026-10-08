<script lang="ts">
	import Icon from '@iconify/svelte';
	import { parseGitHubUrl } from '$lib/github/parse';

	let {
		autofocus = false,
		onNavigate
	}: { autofocus?: boolean; onNavigate?: (path: string) => void } = $props();

	let url = $state('');
	let error = $state('');

	function handleInput(el: HTMLInputElement) {
		error = '';
		// A pasted URL can carry newlines or stray spaces; the field holds one value.
		if (/\s/.test(el.value)) el.value = el.value.replace(/\s+/g, '');
		url = el.value;
	}

	// Resolves as you type, so the Clone action can show whether the URL is actually cloneable.
	const target = $derived(parseGitHubUrl(url));

	function openRepo() {
		if (!target) {
			error = 'Use github.com/owner/repo or …/tree/branch/optional/dir';
			return;
		}
		const { owner, repo, ref, dir } = target;
		const path = `/ide/github/${owner}/${repo}/tree/${ref}${dir ? `/${dir}` : ''}`;
		// Callers with a live session to protect (the Sidebar's dialog) pass their own
		// navigateWithLeaveGuard-backed navigate; the plain /ide landing page has no session yet,
		// so it's fine to fall back to a full reload here — still the pod-teardown mechanism.
		if (onNavigate) onNavigate(path);
		else window.location.href = path;
	}

	function focusInput(el: HTMLInputElement) {
		if (autofocus) el.focus();
	}
</script>

<!-- Field and action share one shell, so the row keeps a fixed height whatever the URL length. -->
<label
	class="glass-panel flex h-11 cursor-text items-center gap-1.5 rounded-xl border p-1.5 transition-colors focus-within:border-bc-azure/45 {error
		? 'border-bc-coral/45'
		: 'border-bc-border'}"
>
	<input
		use:focusInput
		type="text"
		value={url}
		oninput={(e) => handleInput(e.currentTarget)}
		onkeydown={(e) => {
			if (e.key !== 'Enter') return;
			e.preventDefault();
			openRepo();
		}}
		spellcheck="false"
		autocomplete="off"
		autocapitalize="off"
		aria-label="GitHub repository URL"
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={error ? 'clone-error' : undefined}
		placeholder="github.com/owner/repo/tree/main/dir"
		class="min-w-0 flex-1 bg-transparent px-2 py-1 text-[13px] leading-5 text-ellipsis whitespace-nowrap text-bc-text outline-none placeholder:text-bc-icon"
	/>
	<!-- Fills in only once the URL resolves to a repo: the action reflects what the field holds. -->
	<button
		onclick={openRepo}
		class="flex shrink-0 cursor-pointer items-center gap-1.5 self-center rounded-md px-3 py-1 text-[13px] leading-5 font-medium transition-colors duration-200 focus-visible:ring-1 focus-visible:ring-bc-mist/60 focus-visible:outline-none {target
			? 'bg-bc-azure text-bc-abyss hover:bg-bc-azure/85'
			: 'bg-bc-tint/10 text-bc-mist hover:bg-bc-tint/16 hover:text-bc-text'}"
	>
		<Icon icon="simple-icons:github" width="14" height="14" />
		Clone
	</button>
</label>
{#if error}
	<p id="clone-error" class="mt-2 text-[12px] text-bc-coral">{error}</p>
{/if}
