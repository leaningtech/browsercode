<script lang="ts">
	import Icon from '@iconify/svelte';
	import pkg from '@leaningtech/browserpod/package.json';
	import appPkg from '../../../package.json';
	import favicon from '$lib/assets/favicon.svg';
	import browserpodLogo from '$lib/assets/browserpod.svg';
</script>

<footer
	class="relative z-10 hidden h-8 shrink-0 items-center justify-between bg-bc-abyss px-7 text-bc-text-muted md:flex"
>
	<!-- Line separator: a hairline that fades out 28px from each edge, rather than a flat border
	     spanning the full width. -->
	<span
		aria-hidden="true"
		class="pointer-events-none absolute inset-x-7 top-0 h-px"
		style="background: linear-gradient(
			90deg,
			transparent 0,
			var(--color-bc-border) 40px,
			var(--color-bc-border) calc(100% - 40px),
			transparent 100%
		);"
	></span>

	<span class="flex items-center gap-2 text-[11.5px]">
		<img src={favicon} alt="BrowserCode logo" class="bc-logo-mark h-4 w-4" />
		<span class="text-bc-text-muted">BrowserCode</span>
		<span class="rounded bg-bc-tint/12 px-1.5 py-0.5 font-mono text-[10.5px] text-bc-mist"
			>v{appPkg.version}</span
		>
	</span>

	<a
		href="https://browserpod.io"
		target="_blank"
		rel="noopener noreferrer"
		class="group flex items-center gap-1.5 text-[11.5px] text-bc-text-muted transition-colors duration-150 hover:text-bc-link-hover"
	>
		<img
			src={browserpodLogo}
			alt="BrowserPod logo"
			class="bc-mono-icon h-4 w-4 opacity-60 grayscale"
		/>
		<span>Powered by BrowserPod</span>
		<span
			class="rounded bg-bc-tint/12 px-1.5 py-0.5 font-mono text-[10.5px] text-bc-mist transition-colors duration-150 group-hover:text-bc-link-hover"
			>v{pkg.version}</span
		>
	</a>

	<a
		href="https://labs.leaningtech.com/blog/browserpod-rust"
		target="_blank"
		rel="noopener noreferrer"
		class="flex items-center gap-1 text-[11.5px] text-bc-text-muted transition-colors duration-150 hover:text-bc-link-hover"
	>
		<span>Rust & BrowserPod 3.0</span>
		<Icon icon="mingcute:arrow-right-up-line" width="12" height="12" />
	</a>
</footer>
