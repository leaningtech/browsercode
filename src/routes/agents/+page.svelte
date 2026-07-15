<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import opencodeLogoSrc from '$lib/assets/opencode-logo.svg';
	import { toolItems } from '$lib/config/tools';
	import WavyGridBackground from '$lib/components/WavyGridBackground.svelte';

	function openTool(id: string, disabled: boolean) {
		if (disabled) return;
		window.location.href = `/agents/${id}`;
	}

	// Fades the glass panel in over the wavy grid on arrival — full coverage from the start (not
	// a sheet sliding partway up), so it starts invisible and crossfades to opaque.
	let entered = $state(false);
	onMount(() => {
		requestAnimationFrame(() => {
			entered = true;
		});
	});
</script>

<div class="relative h-full w-full overflow-hidden">
	<WavyGridBackground />

	<!-- vignette to keep text legible over the grid, matching the landing page's hero -->
	<div
		class="pointer-events-none absolute inset-0 z-[1]"
		style="background: radial-gradient(closest-side at 50% 46%, rgba(2,9,20,0.55), rgba(2,9,20,0) 78%);"
	></div>

	<div
		class="panel-sheet absolute inset-0 z-[2] flex flex-col overflow-hidden"
		style="background-color: transparent; background-image: none; backdrop-filter: blur(1.5px);
			-webkit-backdrop-filter: blur(1.5px); opacity: {entered ? 1 : 0}; transition: opacity 0.5s ease;"
	>
		<div class="flex h-full w-full items-center justify-center overflow-auto p-6 text-zinc-300">
			<div class="w-full max-w-lg text-center">
				<h1 class="mb-1 text-lg font-semibold text-zinc-100">Agents</h1>
				<p class="mb-8 text-[13px] text-white/40">
					Use your favorite CLI agents without any installations, <span class="text-bc-mist"
						>sandboxed</span
					>.
				</p>

				<div class="grid grid-cols-2 gap-3">
					{#each toolItems as item (item.id)}
						<button
							onclick={() => openTool(item.id, item.disabled)}
							disabled={item.disabled}
							class="flex flex-col items-center gap-3 rounded-xl border px-4 py-6 text-left transition
						{item.disabled
								? 'cursor-not-allowed border-white/5 bg-white/[0.02]'
								: 'glass-panel border-bc-mist/12 hover:border-bc-mist/30'}"
						>
							<span
								class="flex h-11 w-11 items-center justify-center rounded-lg {item.disabled
									? 'bg-white/5 text-white/20'
									: item.accentClass}"
							>
								{#if item.icon}
									<Icon icon={item.icon} width="22" height="22" />
								{:else}
									<img
										src={opencodeLogoSrc}
										alt=""
										class="h-5 w-5 {item.disabled ? 'opacity-20' : 'opacity-90'}"
									/>
								{/if}
							</span>
							<span class="flex items-center gap-1.5 text-[13px] font-medium">
								<span class={item.disabled ? 'text-white/30' : 'text-zinc-200'}>{item.label}</span>
								{#if item.disabled}
									<span
										class="rounded bg-bc-gold/10 px-1.5 py-0.5 text-[10px] font-medium text-bc-gold/80"
									>
										Soon
									</span>
								{/if}
							</span>
						</button>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>
