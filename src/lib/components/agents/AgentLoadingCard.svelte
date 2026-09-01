<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import type { CredentialSpec, ToolItem } from '$lib/config/tools';

	let {
		tool,
		credential,
		willAskForCredential,
		onCancel
	}: {
		tool: ToolItem;
		credential: CredentialSpec;
		/** Nothing stored yet, so the prompt comes right after this card. */
		willAskForCredential: boolean;
		onCancel: () => void;
	} = $props();

	/** The bare host reads better as link text than the full URL. */
	let consoleLabel = $derived(credential.consoleUrl.replace(/^https?:\/\//, ''));

	let elapsed = $state(0);
	onMount(() => {
		const start = performance.now();
		const id = setInterval(() => (elapsed = (performance.now() - start) / 1000), 100);
		return () => clearInterval(id);
	});
</script>

<div
	class="glass-panel w-full max-w-[520px] overflow-hidden rounded-[14px] border border-bc-mist/15 px-8 pt-8 pb-7 shadow-2xl"
>
	<div class="mb-6 flex items-center gap-3.5">
		<span class="flex h-12 w-12 items-center justify-center rounded-xl {tool.accentClass}">
			<Icon icon={tool.icon ?? 'mingcute:terminal-box-line'} width="26" height="26" />
		</span>
		<div class="flex flex-col gap-1">
			<span class="text-[15px] font-semibold text-zinc-50">Loading {tool.label}</span>
			<span class="text-[12.5px] text-white/40">
				Streaming {tool.label} into your browser sandbox. Nothing installs on your machine.
			</span>
		</div>
	</div>

	<div class="relative h-2 w-full overflow-hidden rounded-full bg-white/7">
		<div class="track absolute top-0 bottom-0 w-1/3 rounded-full"></div>
	</div>

	{#if willAskForCredential}
		<div
			class="mt-4.5 flex gap-3 rounded-[10px] border border-bc-gold/18 bg-bc-gold/6 p-3.5 text-[12.5px] leading-relaxed text-white/60"
		>
			<span
				class="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-bc-gold/12 text-bc-gold"
			>
				<Icon icon="mingcute:information-line" width="15" height="15" />
			</span>
			<div>
				<span class="font-semibold text-zinc-50">Sign-in comes next.</span>
				{tool.label} needs an {credential.label} to run in BrowserPod, so grab one from
				<!-- The provider's console is an external URL, so resolve() does not apply here. -->
				<!-- eslint-disable svelte/no-navigation-without-resolve -->
				<a
					href={credential.consoleUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="text-bc-mist hover:text-bc-azure">{consoleLabel}</a
				> while this loads.
			</div>
		</div>
	{/if}

	<div class="mt-5.5 flex items-center justify-between">
		<span class="text-xs text-white/28 tabular-nums">{elapsed.toFixed(1)}s elapsed</span>
		<button
			onclick={onCancel}
			class="rounded-md bg-white/5 px-4.5 py-2 text-[13px] font-medium text-zinc-300 transition hover:bg-white/10"
		>
			Cancel
		</button>
	</div>
</div>

<style>
	.track {
		background-image: linear-gradient(90deg, var(--color-bc-azure), var(--color-bc-orchid));
		animation: sweep 1.5s cubic-bezier(0.45, 0, 0.55, 1) infinite;
	}
	@keyframes sweep {
		0% {
			transform: translateX(-105%);
		}
		100% {
			transform: translateX(305%);
		}
	}
</style>
