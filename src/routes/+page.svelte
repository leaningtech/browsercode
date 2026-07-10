<script lang="ts">
	import Icon from '@iconify/svelte';
	import favicon from '$lib/assets/favicon.svg';
	import browserpodLogo from '$lib/assets/browserpod.svg';
	import { stepperState } from '$lib/stores/stepper.svelte';

	function goAgents() {
		window.location.href = '/agents';
	}

	function goIde() {
		window.location.href = '/ide';
	}

	function scrollToAbout() {
		document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
	}
</script>

<div class="bc-page-bg flex h-full w-full flex-col overflow-y-auto text-zinc-300">
	<!-- ── Section 1: hero ─────────────────────────────────────────────────── -->
	<section
		class="relative flex min-h-full shrink-0 flex-col items-center justify-center px-6 py-16 text-center"
	>
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
				class="flex items-center justify-center gap-2 rounded-lg bg-bc-azure/90 px-5 py-3 text-[14px] font-medium text-white transition hover:bg-bc-azure"
			>
				<Icon icon="mingcute:robot-line" width="18" height="18" />
				Start with agents
			</button>
			<button
				onclick={goIde}
				class="glass-panel flex items-center justify-center gap-2 rounded-lg border border-bc-mist/15 px-5 py-3 text-[14px] font-medium text-zinc-200 transition hover:border-bc-mist/30"
			>
				<Icon icon="mingcute:code-line" width="18" height="18" />
				Start with frameworks
			</button>
		</div>

		<button
			onclick={scrollToAbout}
			class="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5 text-[11.5px] text-white/30 transition-colors duration-150 hover:text-white/60"
		>
			Scroll down to learn more
			<Icon icon="mingcute:down-line" width="16" height="16" class="animate-bounce" />
		</button>
	</section>

	<!-- ── Section 2: about ────────────────────────────────────────────────── -->
	<section id="about" class="mx-auto w-full max-w-3xl shrink-0 px-6 py-16">
		<img src={favicon} alt="BrowserCode" class="mb-5 h-12 w-12" />

		<h2 class="mb-4 text-3xl font-bold text-zinc-50">What is BrowserCode?</h2>

		<p class="mb-4 text-[14.5px] leading-relaxed text-white/60">
			BrowserCode is a web-based IDE and AI coding agent runner that works entirely inside your
			browser tab. There's nothing to install and nothing running on a server somewhere — every
			terminal, filesystem, and dev server lives in a sandboxed WebAssembly environment on your
			machine.
		</p>

		<p class="mb-4 text-[14.5px] leading-relaxed text-white/60">
			It ships two experiences: a <span class="text-zinc-200">playground IDE</span> with an editor,
			file tree, terminals, and live preview for popular frameworks, and a set of
			<span class="text-zinc-200">AI coding CLIs</span>
			— Claude Code and Gemini CLI today, with more on the way — that you can run unmodified, with real
			file access and networking, without touching your local machine.
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
			</a>, a sandboxed Node.js runtime compiled to WebAssembly with a persistent filesystem, POSIX
			CLI tools (bash, git, npm), and instant app previews through portal URLs.
		</p>

		<button
			onclick={() => (stepperState.open = true)}
			class="glass-panel mb-8 flex w-full items-center gap-3 rounded-lg border border-bc-mist/12 px-4 py-3 text-left transition hover:border-bc-mist/30"
		>
			<span
				class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bc-azure/10 text-bc-azure"
			>
				<Icon icon="mingcute:route-line" width="18" height="18" />
			</span>
			<span class="flex-1">
				<div class="text-[13px] font-medium text-zinc-100">Not sure where to start?</div>
				<div class="text-[11.5px] text-white/40">Take a quick tour of the UI</div>
			</span>
			<Icon icon="mingcute:arrow-right-line" width="16" height="16" class="text-white/25" />
		</button>

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
					<div class="text-[11.5px] text-white/40">Star the repo, open issues, or send a PR</div>
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
