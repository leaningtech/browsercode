<script lang="ts">
	import Icon from '@iconify/svelte';
	import { resolve } from '$app/paths';
	import favicon from '$lib/assets/favicon.svg';
	import browserpodLogo from '$lib/assets/browserpod.svg';
	import { stepperState } from '$lib/stores/stepper.svelte';
</script>

<div class="flex h-full w-full flex-col overflow-y-auto bg-zinc-950 text-zinc-300">
	<div class="mx-auto w-full max-w-xl px-6 py-16">
		<a
			href={resolve('/')}
			class="mb-8 inline-flex items-center gap-1.5 text-[12.5px] text-white/40 transition-colors duration-150 hover:text-white/70"
		>
			<Icon icon="mingcute:arrow-left-line" width="14" height="14" />
			Back home
		</a>

		<img src={favicon} alt="BrowserCode" class="mb-5 h-12 w-12" />

		<h1 class="mb-4 text-3xl font-bold text-zinc-50">What is BrowserCode?</h1>

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
			class="mb-8 flex w-full items-center gap-3 rounded-lg border border-white/8 bg-white/[0.03] px-4 py-3 text-left transition hover:border-white/20 hover:bg-white/5"
		>
			<span
				class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400"
			>
				<Icon icon="mingcute:route-line" width="18" height="18" />
			</span>
			<span class="flex-1">
				<div class="text-[13px] font-medium text-zinc-100">Not sure where to start?</div>
				<div class="text-[11.5px] text-white/40">Take a quick tour of the UI</div>
			</span>
			<Icon icon="mingcute:arrow-right-line" width="16" height="16" class="text-white/25" />
		</button>

		<div class="mb-2 text-[11px] font-medium tracking-widest text-zinc-600 uppercase">
			Get involved
		</div>
		<div class="grid gap-2.5 sm:grid-cols-3">
			<a
				href="https://github.com/leaningtech/browsercode"
				target="_blank"
				rel="noopener noreferrer"
				class="group flex flex-col gap-2 rounded-lg border border-white/8 bg-[#111111] px-4 py-3.5 transition hover:border-white/20 hover:bg-white/5"
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
				class="group flex flex-col gap-2 rounded-lg border border-white/8 bg-[#111111] px-4 py-3.5 transition hover:border-white/20 hover:bg-white/5"
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
				class="group flex flex-col gap-2 rounded-lg border border-white/8 bg-[#111111] px-4 py-3.5 transition hover:border-white/20 hover:bg-white/5"
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
	</div>
</div>
