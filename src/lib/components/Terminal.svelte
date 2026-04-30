<script lang="ts">
	import Icon from '@iconify/svelte';

	export let portalAvailable: boolean = false;
	export let isPortalVisible: boolean = false;
	export let onTogglePortal: (() => void) | undefined = undefined;
</script>

<div class="flex h-full min-h-0 w-full min-w-0 flex-col bg-[#0d0d0e]">
	<div
		class="flex h-10 shrink-0 items-center justify-between border-b border-white/6 bg-[#111111] px-3"
	>
		<div class="flex items-center gap-2 text-[13px] text-white/35">
			<Icon icon="mingcute:terminal-line" width="14" height="14" />
			<span class="font-medium tracking-wide">Terminal</span>
		</div>
		<button
			onclick={onTogglePortal}
			disabled={!portalAvailable}
			title={!portalAvailable
				? 'No portal available'
				: isPortalVisible
					? 'Hide portal'
					: 'Show portal'}
			class="mr-35 hidden items-center rounded border-none bg-transparent p-1 transition-colors md:inline-flex
				{portalAvailable
				? isPortalVisible
					? 'cursor-pointer text-white/60 hover:text-white/90'
					: 'cursor-pointer text-white/35 hover:text-white/60'
				: 'cursor-not-allowed text-white/15'}"
		>
			<Icon icon="mingcute:layout-right-line" width="14" height="14" />
		</button>
	</div>
	<div id="console" class="min-h-0 flex-1 bg-black"></div>
</div>
