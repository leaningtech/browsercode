<script lang="ts">
	import { resolve } from '$app/paths';
	import favicon from '$lib/assets/favicon.svg';
	import opencodeLogoSrc from '$lib/assets/opencode-logo.svg';
	import Icon from '@iconify/svelte';
	import { stepperState } from '$lib/stores/stepper.svelte';

	interface Props {
		activePanel?: string;
		onPanelToggle?: (panel: string) => void;
	}

	let { activePanel = '', onPanelToggle }: Props = $props();

	const navItems: { id: string; icon: string | null; label: string; disabled: boolean }[] = [
		{ id: 'gemini', icon: 'simple-icons:googlegemini', label: 'Gemini', disabled: false },
		{ id: 'claude', icon: 'mingcute:claude-line', label: 'Claude Code', disabled: true },
		{ id: 'codex', icon: 'hugeicons:chat-gpt', label: 'Codex CLI', disabled: true },
		{ id: 'opencode', icon: null, label: 'OpenCode', disabled: true }
	];
</script>

{#snippet navButton(item: { id: string; icon: string | null; label: string; disabled: boolean })}
	{@const isActive = activePanel === item.id}
	<div class="relative">
		<button
			onclick={() => !item.disabled && onPanelToggle?.(item.id)}
			class="group relative flex w-full items-center justify-center rounded-md p-2.5 transition-all duration-150
				{isActive
				? 'bg-white/8 text-white'
				: item.disabled
					? 'cursor-not-allowed text-white/15'
					: 'text-white/35 hover:bg-white/5 hover:text-white/70'}"
			disabled={item.disabled}
		>
			{#if item.icon}
				<Icon icon={item.icon} width="20" height="20" />
			{:else}
				<img src={opencodeLogoSrc} alt={item.label} class="h-5 w-5 opacity-15" />
			{/if}

			<span
				class="pointer-events-none absolute left-full z-50 ml-3 flex items-center opacity-0 transition-opacity duration-100 group-hover:opacity-100"
			>
				<span class="h-1.5 w-1.5 rotate-45 border-b border-l border-white/8 bg-zinc-900"></span>
				<span
					class="-ml-px flex items-center gap-1.5 rounded-md border border-white/8 bg-zinc-900 px-2.5 py-1.5 text-[11.5px] leading-none whitespace-nowrap text-white/80 shadow-lg shadow-black/40"
				>
					<span class="font-medium">{item.label}</span>
					{#if item.disabled}
						<span class="text-white/30">· Soon</span>
					{/if}
				</span>
			</span>
		</button>
	</div>
{/snippet}

<aside
	class="relative hidden h-full w-sidebar flex-col border-r border-white/[0.05] bg-[#0f0f10] md:flex"
>
	<div class="flex items-center justify-center py-3.5">
		<a
			href={resolve('/')}
			title="BrowserCode"
			class="rounded-md p-1 transition-opacity duration-150 hover:opacity-80"
		>
			<img src={favicon} alt="BrowserCode" class="h-6 w-6" />
		</a>
	</div>

	<div class="mx-3 h-px bg-white/[0.05]"></div>

	<nav class="flex flex-1 flex-col gap-0.5 px-1.5 pt-2">
		{#each navItems as item (item.id)}
			{@render navButton(item)}
		{/each}
	</nav>

	<div class="mx-3 h-px bg-white/[0.05]"></div>

	<div class="flex flex-col items-center justify-center gap-0.5 px-1.5 py-2">
		<div class="relative">
			<a
				href="https://github.com/leaningtech/browsercode"
				target="_blank"
				rel="noopener noreferrer"
				class="group relative flex items-center justify-center rounded-md p-2.5 text-white/30 transition-all duration-150 hover:bg-white/5 hover:text-white/65"
			>
				<Icon icon="simple-icons:github" width="20" height="20" />

				<span
					class="pointer-events-none absolute left-full z-50 ml-3 flex items-center opacity-0 transition-opacity duration-100 group-hover:opacity-100"
				>
					<span class="h-1.5 w-1.5 rotate-45 border-b border-l border-white/8 bg-zinc-900"></span>
					<span
						class="-ml-px rounded-md border border-white/8 bg-zinc-900 px-2.5 py-1.5 text-[11.5px] leading-none font-medium whitespace-nowrap text-white/80 shadow-lg shadow-black/40"
					>
						GitHub
					</span>
				</span>
			</a>
		</div>
		<div class="relative">
			<a
				href="https://discord.leaningtech.com"
				target="_blank"
				rel="noopener noreferrer"
				class="group relative flex items-center justify-center rounded-md p-2.5 text-white/30 transition-all duration-150 hover:bg-white/5 hover:text-white/65"
			>
				<Icon icon="simple-icons:discord" width="20" height="20" />

				<span
					class="pointer-events-none absolute left-full z-50 ml-3 flex items-center opacity-0 transition-opacity duration-100 group-hover:opacity-100"
				>
					<span class="h-1.5 w-1.5 rotate-45 border-b border-l border-white/8 bg-zinc-900"></span>
					<span
						class="-ml-px rounded-md border border-white/8 bg-zinc-900 px-2.5 py-1.5 text-[11.5px] leading-none font-medium whitespace-nowrap text-white/80 shadow-lg shadow-black/40"
					>
						Discord
					</span>
				</span>
			</a>
		</div>
		<div class="relative">
			<button
				onclick={() => (stepperState.open = true)}
				class="group relative flex items-center justify-center rounded-md p-2.5 text-white/30 transition-all duration-150 hover:bg-white/5 hover:text-white/65"
			>
				<Icon icon="mingcute:question-line" width="20" height="20" />

				<span
					class="pointer-events-none absolute left-full z-50 ml-3 flex items-center opacity-0 transition-opacity duration-100 group-hover:opacity-100"
				>
					<span class="h-1.5 w-1.5 rotate-45 border-b border-l border-white/8 bg-zinc-900"></span>
					<span
						class="-ml-px rounded-md border border-white/8 bg-zinc-900 px-2.5 py-1.5 text-[11.5px] leading-none font-medium whitespace-nowrap text-white/80 shadow-lg shadow-black/40"
					>
						Help & getting started
					</span>
				</span>
			</button>
		</div>
	</div>
</aside>
