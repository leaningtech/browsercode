<script lang="ts">
	import Icon from '@iconify/svelte';
	import opencodeLogoSrc from '$lib/assets/opencode-logo.svg';
	import { toolItems, type ToolId } from '$lib/config/tools';
	import { navigateWithLeaveGuard } from '$lib/stores/leaveWarning.svelte';

	type Props = {
		activeId: ToolId;
		onSelect: (id: string) => void;
		onClose: () => void;
	};

	let { activeId, onSelect, onClose }: Props = $props();
</script>

<button
	class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
	onclick={onClose}
	aria-label="Close menu"
></button>
<div
	class="fixed right-0 left-0 z-50 rounded-t-2xl border-t border-white/8 bg-[#0e0e0e] shadow-[0_-12px_40px_rgba(0,0,0,0.7)]"
	style="bottom: calc(48px + env(safe-area-inset-bottom));"
>
	<!-- Decorative: the sheet closes by its button or backdrop, there is no drag gesture. -->
	<div class="flex justify-center pt-3 pb-1">
		<div class="h-1 w-10 rounded-full bg-white/15"></div>
	</div>
	<div class="flex items-center justify-between px-4 py-2">
		<span class="text-[12px] font-semibold tracking-wide text-white/40 uppercase">CLI Tool</span>
		<button
			onclick={onClose}
			class="rounded-md p-1.5 text-white/30 transition-colors hover:bg-white/6 hover:text-white/60"
		>
			<Icon icon="mingcute:close-line" width="15" height="15" />
		</button>
	</div>
	<div class="px-3 pb-3">
		{#each toolItems as item (item.id)}
			<button
				onclick={() => !item.disabled && onSelect(item.id)}
				disabled={item.disabled}
				class="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors
				{activeId === item.id
					? 'bg-white/8 text-white'
					: item.disabled
						? 'cursor-not-allowed text-white/20'
						: 'text-white/50 hover:bg-white/5 hover:text-white/80'}"
			>
				<div
					class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg {activeId === item.id
						? 'bg-white/10'
						: 'bg-white/5'}"
				>
					{#if item.icon}
						<Icon icon={item.icon} width="18" height="18" />
					{:else}
						<img
							src={opencodeLogoSrc}
							alt={item.label}
							class="h-4.5 w-4.5 {item.disabled
								? 'opacity-20'
								: activeId === item.id
									? 'opacity-90'
									: 'opacity-40'}"
						/>
					{/if}
				</div>
				<span class="flex-1 text-[14px] font-medium">{item.label}</span>
				{#if activeId === item.id}
					<div class="flex h-5 w-5 items-center justify-center rounded-full bg-white/15">
						<Icon icon="mingcute:check-line" width="12" height="12" class="text-white/80" />
					</div>
				{:else if item.disabled}
					<span class="rounded-md bg-white/6 px-2 py-0.5 text-[10px] font-medium text-white/25"
						>Soon</span
					>
				{/if}
			</button>
		{/each}
		<div class="my-2 h-px bg-white/[0.06]"></div>
		<button
			onclick={() => navigateWithLeaveGuard('/ide', true)}
			class="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-white/50 transition-colors hover:bg-white/5 hover:text-white/80"
		>
			<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
				<Icon icon="mingcute:code-line" width="18" height="18" />
			</div>
			<span class="flex-1 text-[14px] font-medium">Open Playground IDE</span>
			<Icon icon="mingcute:arrow-right-line" width="16" height="16" class="text-white/30" />
		</button>
	</div>
</div>
