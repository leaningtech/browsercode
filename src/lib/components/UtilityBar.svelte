<script lang="ts">
	import Icon from '@iconify/svelte';
	import pkg from '@leaningtech/browserpod/package.json';
	import favicon from '$lib/assets/favicon.svg';
</script>

<footer
	class="hidden h-8 shrink-0 items-center justify-between border-t border-white/[0.05] bg-[#0a0a0b] px-4 md:flex"
>
	<span class="flex items-center gap-2 text-[11.5px]">
		<img src={favicon} alt="BrowserCode logo" class="h-4 w-4" />
		<span class="text-white/40">BrowserCode v0.1.0</span>
	</span>

	<span class="flex items-center gap-1.5 text-[11.5px] text-emerald-300">
		<span>Powered by BrowserPod</span>
		<span class="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10.5px] text-emerald-300/60"
			>v{pkg.version}</span
		>
	</span>

	<a
		href="https://labs.leaningtech.com/blog/browserpod-20"
		target="_blank"
		rel="noopener noreferrer"
		class="flex items-center gap-1 text-[11.5px] text-white/40 transition-colors duration-150 hover:text-white/75"
	>
		<span>Git, bash & BrowserPod 2.0</span>
		<Icon icon="mingcute:arrow-right-up-line" width="12" height="12" />
	</a>
</footer>
