<script lang="ts">
	import Icon from '@iconify/svelte';

	export function triggerResize() {
		window.dispatchEvent(new Event('resize'));
	}
</script>

<div class="flex h-full min-h-0 w-full min-w-0 flex-col bg-[#0d0d0e]">
	<div class="flex h-10 shrink-0 items-center border-b border-white/[0.06] bg-[#111111] px-3">
		<div class="flex items-center gap-2 text-[13px] text-white/35">
			<Icon icon="mingcute:terminal-line" width="14" height="14" />
			<span class="font-medium tracking-wide">Terminal</span>
		</div>
	</div>
	<div id="console" class="min-h-0 flex-1"></div>
</div>
