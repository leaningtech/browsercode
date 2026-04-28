<script lang="ts">
	import Icon from '@iconify/svelte';
	import pkg from '@leaningtech/browserpod/package.json';
	import favicon from '$lib/assets/favicon.svg';
</script>

<footer
	class="hidden h-9 shrink-0 items-center justify-between border-t border-white/6 bg-[#111111] px-4 md:flex"
>
	<span class="flex items-center gap-1.5 text-[12px] text-white/45">
		<img src={favicon} alt="BrowserPod" class="size-3.5 opacity-45 grayscale" />
		Made with BrowserPod v{pkg.version} © {new Date().getFullYear()}
	</span>
	<a
		href="https://labs.leaningtech.com/blog/browserpod-20"
		target="_blank"
		rel="noopener noreferrer"
		class="flex items-center gap-1 text-[12px] text-white/45 transition hover:text-white/55"
	>
		<span>Latest: Git, bash, BrowserPod 2.0</span>
		<Icon icon="mingcute:arrow-right-up-line" width="13" height="13" />
	</a>
</footer>
