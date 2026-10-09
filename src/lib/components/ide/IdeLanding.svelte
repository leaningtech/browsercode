<script lang="ts">
	import Icon from '@iconify/svelte';
	import { frameworkRailItems } from '$lib/config/frameworks';
	import CloneRepoForm from './CloneRepoForm.svelte';

	function openFramework(id: string) {
		window.location.href = `/ide?framework=${id}`;
	}
</script>

<div class="flex h-full w-full items-center justify-center overflow-auto p-6 text-bc-mist">
	<div class="w-full max-w-lg">
		<h1 class="mb-1 font-display text-lg font-semibold text-bc-text">IDE Playground</h1>
		<p class="mb-4 text-[13px] text-bc-text-muted">
			Start from a framework template or clone a GitHub repo.
		</p>

		<!-- Info callout: lilac is the palette's "info" accent (also used for badges and Codex CLI),
		     so this is tinted distinctly from the plain framework/clone buttons below instead of
		     sharing their neutral glass-panel look. Only "BrowserPod" itself links out. -->
		<div
			class="mb-6 flex items-start gap-2.5 rounded-lg border border-bc-orchid/18 bg-bc-orchid/6 px-3 py-2.5 text-left"
		>
			<span
				class="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-bc-orchid/12 text-bc-orchid"
			>
				<Icon icon="mingcute:cube-3d-line" width="14" height="14" />
			</span>
			<span class="text-[12px] leading-relaxed text-bc-text-muted">
				Runs entirely in a <a
					href="https://browserpod.io"
					target="_blank"
					rel="noopener noreferrer"
					class="font-medium text-bc-text underline decoration-bc-orchid/40 underline-offset-2 transition-colors hover:text-bc-link-hover hover:decoration-bc-link-hover"
					>BrowserPod</a
				> sandbox, a WebAssembly Node.js environment with a real filesystem, npm and git. Nothing installs
				on your machine.
			</span>
		</div>

		<div class="mb-6">
			<div class="mb-2 text-[11px] font-medium tracking-widest text-bc-mist/40 uppercase">
				Frameworks
			</div>
			<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
				{#each frameworkRailItems as fw (fw.id)}
					<button
						onclick={() => openFramework(fw.id)}
						class="glass-panel flex items-center gap-2 rounded-lg border border-bc-border px-3 py-2 text-left text-[13px] text-bc-mist transition hover:border-bc-tint/30"
					>
						<Icon icon={fw.icon} width="16" height="16" class="shrink-0" />
						<span class="truncate">{fw.label}</span>
					</button>
				{/each}
			</div>
		</div>

		<div>
			<div class="mb-2 flex items-center gap-2">
				<span class="text-[11px] font-medium tracking-widest text-bc-mist/40 uppercase">
					Clone from GitHub
				</span>
				<span class="group relative flex items-center">
					<span
						class="cursor-default rounded-full border border-bc-azure/30 bg-bc-azure/10 px-1.5 py-0.5 text-[9.5px] font-semibold tracking-wider text-bc-azure/85 uppercase"
					>
						Beta
					</span>
					<span
						class="pointer-events-none absolute top-full left-0 z-50 mt-2 flex flex-col items-start opacity-0 transition-opacity duration-100 group-hover:opacity-100"
					>
						<span class="solid-panel ml-3 h-1.5 w-1.5 rotate-45 border-t border-l border-bc-border"
						></span>
						<span
							class="solid-panel -mt-px flex w-[26rem] max-w-[80vw] flex-col gap-2 rounded-md border border-bc-border px-3.5 py-3 text-[12.5px] leading-[1.6] text-bc-mist shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
						>
							<span>
								Paste the GitHub URL of a working template, for example;
								<span class="block font-mono text-[11.5px] break-all text-bc-mist">
									github.com/vitejs/vite/tree/main/packages/create-vite/template-vanilla
								</span>
							</span>
							<span class="text-bc-text-muted">
								Browsing and editing a cloned repo works. Automatically building and running one is
								still in beta.
							</span>
						</span>
					</span>
				</span>
			</div>
			<CloneRepoForm />
		</div>
	</div>
</div>
