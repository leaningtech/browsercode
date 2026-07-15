<script lang="ts">
	import Icon from '@iconify/svelte';
	import favicon from '$lib/assets/favicon.svg';
	import browserpodLogo from '$lib/assets/browserpod.svg';
	import WavyGridBackground from '$lib/components/WavyGridBackground.svelte';

	function goAgents() {
		window.location.href = '/agents';
	}

	function goIde() {
		window.location.href = '/ide';
	}

	let panelOpen = $state(false);
	let panelScroll = $state<HTMLDivElement>();

	function openPanel() {
		panelOpen = true;
	}

	function closePanel() {
		panelOpen = false;
		if (panelScroll) panelScroll.scrollTop = 0;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && panelOpen) closePanel();
	}

	// Wheel needs `{ passive: false }` to preventDefault (block the native scroll while driving the
	// panel open/closed instead) — Svelte's onwheel attribute can't opt out of passive listening.
	function wheelControl(node: HTMLElement) {
		function onWheel(e: WheelEvent) {
			if (!panelOpen) {
				if (e.deltaY > 8) {
					e.preventDefault();
					openPanel();
				}
			} else if (e.deltaY < -8 && (!panelScroll || panelScroll.scrollTop <= 0)) {
				e.preventDefault();
				closePanel();
			}
		}
		node.addEventListener('wheel', onWheel, { passive: false });
		return {
			destroy() {
				node.removeEventListener('wheel', onWheel);
			}
		};
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="relative h-full w-full overflow-hidden bg-bc-abyss text-zinc-300" use:wheelControl>
	<!-- ── Section 1: hero — fills the viewport; scales/dims when the About panel opens ── -->
	<section
		class="absolute inset-0 flex flex-col items-center justify-center overflow-hidden px-6 py-16 text-center"
		style="transform-origin: center 42%; transition: transform 0.55s cubic-bezier(0.22,1,0.36,1), filter 0.55s ease; transform: {panelOpen
			? 'scale(0.94)'
			: 'scale(1)'}; filter: {panelOpen ? 'brightness(0.72)' : 'brightness(1)'};"
	>
		<WavyGridBackground />

		<!-- vignette to keep text legible over the grid -->
		<div
			class="pointer-events-none absolute inset-0 z-[1]"
			style="background: radial-gradient(closest-side at 50% 46%, rgba(2,9,20,0.55), rgba(2,9,20,0) 78%);"
		></div>

		<div class="relative z-[2] flex flex-col items-center">
			<img src={favicon} alt="BrowserCode" class="mb-6 h-14 w-14" />

			<span
				class="mb-4 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium tracking-wide text-white/50 uppercase"
			>
				Runs entirely client-side
			</span>

			<h1
				class="mb-4 max-w-2xl font-display text-4xl font-bold tracking-tight text-zinc-50 sm:text-5xl"
			>
				Start coding right here, in your browser tab
			</h1>

			<p class="mb-10 max-w-md text-[15px] leading-relaxed text-white/45">
				BrowserCode is a development playground for fast-prototyping. It boots a sandboxed Node.js environment
				in WebAssembly, powered by BrowserPod. No installs, no servers, and no cloud compute.
			</p>

			<div class="flex flex-col gap-3 sm:flex-row">
				<button
					onclick={goIde}
					class="flex items-center justify-center gap-2 rounded-lg bg-bc-azure/90 px-5 py-3 text-[14px] font-medium text-white transition hover:bg-bc-azure"
				>
					<Icon icon="mingcute:code-line" width="18" height="18" />
					Start with frameworks
				</button>
				<button
					onclick={goAgents}
					class="glass-panel flex items-center justify-center gap-2 rounded-lg border border-bc-mist/15 px-5 py-3 text-[14px] font-medium text-zinc-200 transition hover:border-bc-mist/30"
				>
					<Icon icon="mingcute:robot-line" width="18" height="18" />
					Start with agents
				</button>
			</div>
		</div>

		<button
			onclick={openPanel}
			class="absolute bottom-6 left-1/2 z-[2] flex -translate-x-1/2 flex-col items-center gap-1.5 text-[11.5px] text-white/30 transition-colors duration-150 hover:text-white/60"
		>
			Learn more
			<Icon icon="mingcute:down-line" width="16" height="16" class="animate-bounce" />
		</button>
	</section>

	<!-- Backdrop — dims the hero further and catches outside clicks to close the panel -->
	<div
		class="absolute inset-0 z-10 transition-opacity duration-500 ease-out"
		style="background: rgba(2,9,20,0.28); opacity: {panelOpen ? 1 : 0}; pointer-events: {panelOpen
			? 'auto'
			: 'none'};"
		onclick={closePanel}
		role="presentation"
	></div>

	<!-- ── Section 2: about — slides up as a window over the hero ─────────────────────── -->
	<div
		class="panel-sheet absolute inset-x-0 top-9 bottom-0 z-20 flex flex-col overflow-hidden rounded-t-[20px] border-t border-bc-mist/15"
		style="transform: translateY({panelOpen
			? '0%'
			: '101%'}); transition: transform 0.62s cubic-bezier(0.22,1,0.36,1);"
	>
		<!-- window title bar — the handle is the close target; padded well past the thin pill
		     itself so it's a comfortable click/tap target. -->
		<button
			onclick={closePanel}
			aria-label="Close"
			title="Close"
			class="group flex shrink-0 cursor-pointer items-center justify-center px-6 py-3"
		>
			<span class="h-[5px] w-11 rounded-full bg-bc-mist/20 transition group-hover:bg-bc-mist/40"
			></span>
		</button>

		<div bind:this={panelScroll} class="flex-1 overflow-y-auto">
			<section id="about" class="mx-auto w-full max-w-3xl px-6 pt-0 pb-16">
				<img src={favicon} alt="BrowserCode" class="mb-5 h-12 w-12" />

				<h2 class="mb-4 font-display text-3xl font-bold text-zinc-50">What is BrowserCode?</h2>

				<p class="mb-4 text-[14.5px] leading-relaxed text-white/60">
					BrowserCode is a web-based IDE and AI coding agent playground that works entirely inside
					your browser tab. There's nothing to install and nothing running on a server somewhere:
					every terminal, filesystem, and dev server lives in a sandboxed WebAssembly environment on
					your machine.
				</p>

				<p class="mb-4 text-[14.5px] leading-relaxed text-white/60">
					It ships two experiences: a <span class="text-zinc-200">playground IDE</span> with an
					editor, file tree, terminals, and live preview for popular frameworks, and a set of
					<span class="text-zinc-200">AI coding CLIs</span>
					that you can run unmodified, with real file access and networking, without touching your local
					machine, including Claude Code and Gemini CLI today, with more on the way.
				</p>

				<p class="mb-10 text-[14.5px] leading-relaxed text-white/60">
					Both are built on
					<a
						href="https://browserpod.io"
						target="_blank"
						rel="noopener noreferrer"
						class="font-medium text-zinc-100 underline decoration-white/20 underline-offset-2 hover:decoration-white/50"
					>
						BrowserPod
					</a>, a sandboxed Node.js runtime compiled to WebAssembly with a persistent filesystem,
					POSIX CLI tools (bash, git, npm), and instant app previews through portal URLs.
				</p>

				<div class="mb-2 text-[11px] font-medium tracking-widest text-bc-mist/40 uppercase">
					Get involved
				</div>
				<div class="grid gap-2.5 sm:grid-cols-3">
					<a
						href="https://github.com/leaningtech/browsercode"
						target="_blank"
						rel="noopener noreferrer"
						class="glass-panel group flex flex-col gap-2 rounded-lg border border-bc-mist/12 px-4 py-3.5 transition hover:border-bc-mist/30"
					>
						<div class="flex items-center justify-between">
							<Icon icon="simple-icons:github" width="20" height="20" class="text-zinc-200" />
							<Icon
								icon="mingcute:arrow-right-up-line"
								width="14"
								height="14"
								class="text-white/25 transition-colors duration-150 group-hover:text-white/60"
							/>
						</div>
						<div>
							<div class="text-[13px] font-medium text-zinc-100">GitHub</div>
							<div class="text-[11.5px] text-white/40">
								Star the repo, open issues, or send a PR
							</div>
						</div>
					</a>
					<a
						href="https://discord.leaningtech.com"
						target="_blank"
						rel="noopener noreferrer"
						class="glass-panel group flex flex-col gap-2 rounded-lg border border-bc-mist/12 px-4 py-3.5 transition hover:border-bc-mist/30"
					>
						<div class="flex items-center justify-between">
							<Icon icon="simple-icons:discord" width="20" height="20" class="text-zinc-200" />
							<Icon
								icon="mingcute:arrow-right-up-line"
								width="14"
								height="14"
								class="text-white/25 transition-colors duration-150 group-hover:text-white/60"
							/>
						</div>
						<div>
							<div class="text-[13px] font-medium text-zinc-100">Discord</div>
							<div class="text-[11.5px] text-white/40">Ask questions and chat with the team</div>
						</div>
					</a>
					<a
						href="https://browserpod.io"
						target="_blank"
						rel="noopener noreferrer"
						class="glass-panel group flex flex-col gap-2 rounded-lg border border-bc-mist/12 px-4 py-3.5 transition hover:border-bc-mist/30"
					>
						<div class="flex items-center justify-between">
							<img src={browserpodLogo} alt="" class="h-5 w-5 opacity-70 grayscale" />
							<Icon
								icon="mingcute:arrow-right-up-line"
								width="14"
								height="14"
								class="text-white/25 transition-colors duration-150 group-hover:text-white/60"
							/>
						</div>
						<div>
							<div class="text-[13px] font-medium text-zinc-100">BrowserPod</div>
							<div class="text-[11.5px] text-white/40">The WebAssembly sandbox underneath</div>
						</div>
					</a>
				</div>
			</section>
		</div>
	</div>
</div>
