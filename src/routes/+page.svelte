<script lang="ts">
	import Icon from '@iconify/svelte';
	import { resolve } from '$app/paths';
	import favicon from '$lib/assets/favicon.svg';

	function goAgents() {
		window.location.href = '/agents';
	}

	function goIde() {
		window.location.href = '/ide';
	}
</script>

<div class="flex h-full w-full flex-col overflow-y-auto bg-zinc-950 text-zinc-300">
	<div class="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
		<img src={favicon} alt="BrowserCode" class="mb-6 h-14 w-14" />

		<span
			class="mb-4 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium tracking-wide text-white/50 uppercase"
		>
			Runs entirely in your browser
		</span>

		<h1 class="mb-4 max-w-2xl text-4xl font-bold tracking-tight text-zinc-50 sm:text-5xl">
			Start coding on your browser tab
		</h1>

		<p class="mb-10 max-w-md text-[15px] leading-relaxed text-white/45">
			BrowserCode boots a full, sandboxed Node.js environment in WebAssembly — no installs, no
			servers, no cloud compute. Just open a tab.
		</p>

		<div class="flex flex-col gap-3 sm:flex-row">
			<button
				onclick={goAgents}
				class="flex items-center justify-center gap-2 rounded-lg bg-emerald-600/90 px-5 py-3 text-[14px] font-medium text-white transition hover:bg-emerald-500"
			>
				<Icon icon="mingcute:robot-line" width="18" height="18" />
				Start with agents
			</button>
			<button
				onclick={goIde}
				class="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-[14px] font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/10"
			>
				<Icon icon="mingcute:code-line" width="18" height="18" />
				Start with frameworks
			</button>
		</div>
	</div>

	<footer
		class="flex shrink-0 items-center justify-center gap-5 border-t border-white/[0.05] py-5 text-[12.5px] text-white/35"
	>
		<a href={resolve('/about')} class="transition-colors duration-150 hover:text-white/70">
			About
		</a>
		<a
			href="https://github.com/leaningtech/browsercode"
			target="_blank"
			rel="noopener noreferrer"
			class="transition-colors duration-150 hover:text-white/70"
		>
			GitHub
		</a>
		<a
			href="https://discord.leaningtech.com"
			target="_blank"
			rel="noopener noreferrer"
			class="transition-colors duration-150 hover:text-white/70"
		>
			Discord
		</a>
	</footer>
</div>
