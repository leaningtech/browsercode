<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import ToolIcon from '$lib/components/ToolIcon.svelte';
	import { cliConfigs, toolItems, type ToolItem } from '$lib/config/tools';

	function openTool(id: string, disabled: boolean) {
		if (disabled) return;
		window.location.href = `/agents/${id}`;
	}

	// Split so available agents line up on their own row, separate from the "coming soon" ones.
	const availableTools = toolItems.filter((item) => !item.disabled);
	const soonTools = toolItems.filter((item) => item.disabled);

	// Fades the glass panel in on arrival — full coverage from the start (not a sheet sliding
	// partway up), so it starts invisible and crossfades to opaque.
	let entered = $state(false);
	onMount(() => {
		requestAnimationFrame(() => {
			entered = true;
		});
	});
</script>

<div class="bc-page-bg relative h-full w-full overflow-hidden">
	<div
		class="panel-sheet absolute inset-0 flex flex-col overflow-hidden"
		style="opacity: {entered ? 1 : 0}; transition: opacity 0.5s ease;"
	>
		<div class="flex h-full w-full items-center justify-center overflow-auto p-6 text-bc-mist">
			<div class="w-full max-w-lg text-center">
				<h1 class="mb-1 text-lg font-semibold text-bc-text">Agents</h1>
				<p class="mb-4 text-[13px] text-bc-text-muted">
					Use your favorite CLI agents without any installations, <span class="text-bc-mist"
						>sandboxed</span
					>.
				</p>

				<!-- Info callout: lilac is the palette's "info" accent (also used for badges and Codex
				     CLI), same treatment as the IDE playground's BrowserPod callout. Only "BrowserPod"
				     itself links out. -->
				<div
					class="mb-6 flex items-start gap-2.5 rounded-lg border border-bc-orchid/18 bg-bc-orchid/6 px-3 py-2.5 text-left"
				>
					<span
						class="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-bc-orchid/12 text-bc-orchid"
					>
						<Icon icon="mingcute:cube-3d-line" width="14" height="14" />
					</span>
					<span class="text-[12px] leading-relaxed text-bc-text-muted">
						Each agent runs entirely in a <a
							href="https://browserpod.io"
							target="_blank"
							rel="noopener noreferrer"
							class="font-medium text-bc-text underline decoration-bc-orchid/40 underline-offset-2 transition-colors hover:text-bc-link-hover hover:decoration-bc-link-hover"
							>BrowserPod</a
						> sandbox, with a real filesystem and networking. Nothing touches your local machine.
					</span>
				</div>

				{#snippet toolButton(item: ToolItem)}
					{@const credential = cliConfigs[item.id]?.credential}
					<button
						onclick={() => openTool(item.id, item.disabled)}
						disabled={item.disabled}
						class="flex flex-col items-center gap-3 rounded-xl border px-4 py-6 text-left transition
					{item.disabled
							? 'cursor-not-allowed border-bc-tint/5 bg-bc-tint/2'
							: 'glass-panel border-bc-border hover:border-bc-tint/30'}"
					>
						<span
							class="flex h-11 w-11 items-center justify-center rounded-lg {item.disabled
								? 'bg-bc-tint/5 text-bc-icon'
								: item.accentClass}"
						>
							<ToolIcon
								{item}
								iconSize={22}
								imgClass="h-5 w-5 {item.disabled ? 'opacity-20' : 'opacity-90'}"
							/>
						</span>
						<span class="flex flex-col items-center gap-1">
							<span class="flex items-center gap-1.5 text-[13px] font-medium">
								<span class={item.disabled ? 'text-bc-icon' : 'text-bc-text'}>{item.label}</span>
								{#if item.disabled}
									<span
										class="rounded bg-bc-tint/14 px-1.5 py-0.5 text-[10px] font-medium text-bc-mist"
									>
										Soon
									</span>
								{:else if item.id === 'pi'}
									<span
										class="rounded bg-bc-green/15 px-1.5 py-0.5 text-[10px] font-medium text-bc-green"
									>
										New
									</span>
								{/if}
							</span>
							{#if item.note && !item.disabled}
								<span class="text-center text-[10.5px] text-bc-icon">{item.note}</span>
							{:else if credential && !item.disabled}
								<span class="text-center text-[10.5px] text-bc-icon"
									>Needs an {credential.label}</span
								>
							{/if}
						</span>
					</button>
				{/snippet}

				<div class="flex flex-col gap-3">
					<div class="grid grid-cols-3 gap-3">
						{#each availableTools as item (item.id)}
							{@render toolButton(item)}
						{/each}
					</div>
					<div class="grid grid-cols-2 gap-3">
						{#each soonTools as item (item.id)}
							{@render toolButton(item)}
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
