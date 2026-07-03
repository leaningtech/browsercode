<script lang="ts">
	import Icon from '@iconify/svelte';
	import { resolve } from '$app/paths';
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

		<h1 class="mb-2 text-3xl font-bold text-zinc-50">Help</h1>
		<p class="mb-10 text-[14.5px] leading-relaxed text-white/60">
			Not sure where to start, or something's not working? Pick one below.
		</p>

		<div class="grid gap-3 sm:grid-cols-2">
			<button
				onclick={() => (stepperState.open = true)}
				class="group flex flex-col items-start gap-3 rounded-lg border border-white/8 bg-[#111111] px-4 py-4 text-left transition hover:border-white/20 hover:bg-white/5"
			>
				<span
					class="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400"
				>
					<Icon icon="mingcute:route-line" width="18" height="18" />
				</span>
				<div>
					<div class="text-[13px] font-medium text-zinc-100">Take the UI tour</div>
					<div class="mt-0.5 text-[12px] leading-relaxed text-white/40">
						A quick walkthrough of agents, the playground, and where everything lives.
					</div>
				</div>
			</button>

			<a
				href="https://github.com/leaningtech/browsercode/issues/new"
				target="_blank"
				rel="noopener noreferrer"
				class="group flex flex-col items-start gap-3 rounded-lg border border-white/8 bg-[#111111] px-4 py-4 text-left transition hover:border-white/20 hover:bg-white/5"
			>
				<span
					class="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400"
				>
					<Icon icon="mingcute:bug-line" width="18" height="18" />
				</span>
				<div>
					<div class="text-[13px] font-medium text-zinc-100">Report a bug</div>
					<div class="mt-0.5 text-[12px] leading-relaxed text-white/40">
						Found something broken? Open an issue on GitHub and we'll take a look.
					</div>
				</div>
			</a>
		</div>

		<p class="mt-10 text-[12.5px] text-white/35">
			Looking for what BrowserCode actually is? That's over on
			<a
				href={resolve('/about')}
				class="text-white/55 underline decoration-white/20 underline-offset-2 hover:text-white/80 hover:decoration-white/50"
			>
				About
			</a>.
		</p>
	</div>
</div>
