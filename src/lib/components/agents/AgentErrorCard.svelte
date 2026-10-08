<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { ToolItem } from '$lib/config/tools';

	let {
		tool,
		message,
		onRetry,
		onCancel
	}: {
		tool: ToolItem;
		/** The boot failure, verbatim — vague "something went wrong" copy helps nobody debug a pod. */
		message: string;
		onRetry: () => void;
		onCancel?: () => void;
	} = $props();
</script>

<div
	class="glass-panel glass-panel-solid w-full max-w-[520px] overflow-hidden rounded-[14px] border border-bc-border px-8 pt-8 pb-7 shadow-2xl"
>
	<div class="mb-5 flex items-center gap-3.5">
		<span
			class="flex h-12 w-12 items-center justify-center rounded-xl bg-bc-coral/10 text-bc-coral"
		>
			<Icon icon="mingcute:alert-line" width="26" height="26" />
		</span>
		<div class="flex flex-col gap-1">
			<span class="text-[15px] font-semibold text-bc-text">{tool.label} didn't start</span>
			<span class="text-[12.5px] text-bc-text-muted">
				The sandbox failed to boot, so there's nothing running in the terminal behind this.
			</span>
		</div>
	</div>

	<div
		class="max-h-40 overflow-auto rounded-[10px] border border-bc-coral/18 bg-bc-coral/5 px-4 py-3 font-mono text-[12px] leading-relaxed break-words whitespace-pre-wrap text-bc-mist"
	>
		{message}
	</div>

	<p class="mt-4 text-[12.5px] leading-relaxed text-bc-text-muted">
		Retrying is usually worth a shot. The disk image streams in lazily, so a dropped connection
		mid-boot is the most common cause. Check the browser console for the full stack trace.
	</p>

	<div class="mt-5.5 flex items-center justify-end gap-3">
		{#if onCancel}
			<button
				onclick={onCancel}
				class="rounded-md bg-[rgb(var(--bc-tint)/5%)] px-4.5 py-2 text-[13px] font-medium text-bc-mist transition hover:bg-[rgb(var(--bc-tint)/10%)]"
			>
				Back to agents
			</button>
		{/if}
		<button
			onclick={onRetry}
			class="rounded-[7px] bg-bc-azure/90 px-5 py-2 text-[13px] font-medium text-bc-abyss transition hover:bg-bc-azure"
		>
			Retry
		</button>
	</div>
</div>
