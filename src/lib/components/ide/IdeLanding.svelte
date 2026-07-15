<script lang="ts">
	import Icon from '@iconify/svelte';
	import { frameworkRailItems } from '$lib/config/frameworks';

	function openFramework(id: string) {
		window.location.href = `/ide?framework=${id}`;
	}
</script>

<div class="flex h-full w-full items-center justify-center overflow-auto p-6 text-zinc-300">
	<div class="w-full max-w-lg">
		<h1 class="mb-1 font-display text-lg font-semibold text-zinc-100">IDE Playground</h1>
		<p class="mb-4 text-[13px] text-white/40">Start from a framework template.</p>

		<a
			href="https://browserpod.io"
			target="_blank"
			rel="noopener noreferrer"
			class="glass-panel mb-6 flex items-start gap-2.5 rounded-lg border border-bc-mist/12 px-3 py-2.5 text-left transition hover:border-bc-mist/30"
		>
			<Icon
				icon="mingcute:cube-3d-line"
				width="16"
				height="16"
				class="mt-0.5 shrink-0 text-bc-mist"
			/>
			<span class="text-[12px] leading-relaxed text-white/45">
				Runs entirely in a <span class="text-zinc-200">BrowserPod</span> sandbox, a WebAssembly Node.js
				environment with a real filesystem, npm and git. Nothing installs on your machine.
			</span>
		</a>

		<div>
			<div class="mb-2 text-[11px] font-medium tracking-widest text-bc-mist/40 uppercase">
				Frameworks
			</div>
			<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
				{#each frameworkRailItems as fw (fw.id)}
					<button
						onclick={() => openFramework(fw.id)}
						class="glass-panel flex items-center gap-2 rounded-lg border border-bc-mist/12 px-3 py-2 text-left text-[13px] text-zinc-300 transition hover:border-bc-mist/30"
					>
						<Icon icon={fw.icon} width="16" height="16" class="shrink-0" />
						<span class="truncate">{fw.label}</span>
					</button>
				{/each}
			</div>
		</div>
	</div>
</div>
