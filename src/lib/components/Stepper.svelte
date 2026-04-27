<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';

	let showModal = $state(false);
	let currentStep = $state(1);
	const totalSteps = 4;

	const steps = [
		{
			icon: 'mingcute:terminal-line',
			title: 'Integrated Terminal',
			description:
				'A full-featured terminal runs directly in your browser. Execute commands, install packages, and interact with your environment — no local setup required.'
		},
		{
			icon: 'mingcute:eye-2-line',
			title: 'Live Preview',
			description:
				'See your application running in real time on the right. The preview updates as your app serves changes — instant feedback, zero friction.'
		},
		{
			icon: 'mingcute:share-forward-line',
			title: 'Portal Sharing',
			description:
				'Generate a public URL for your running app via the Portal menu. Share it with teammates or scan the QR code to open it on any device.'
		},
		{
			icon: 'mingcute:sparkles-2-line',
			title: 'Powered by BrowserPod',
			description:
				'BrowserCode runs entirely in your browser using BrowserPod — a full Linux environment compiled to WebAssembly. No servers, no installs, just code.'
		}
	];

	onMount(() => {
		if (!localStorage.getItem('bc:hasVisited')) {
			showModal = true;
			localStorage.setItem('bc:hasVisited', 'true');
		}
	});

	function next() {
		if (currentStep < totalSteps) currentStep += 1;
	}

	function prev() {
		if (currentStep > 1) currentStep -= 1;
	}

	function close() {
		showModal = false;
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) close();
	}
</script>

{#if showModal}
	<!-- Backdrop -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm"
		onclick={handleBackdropClick}
	>
		<!-- Dialog -->
		<div
			class="relative w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#111111] shadow-[0_32px_64px_rgba(0,0,0,0.7)]"
			role="dialog"
			aria-modal="true"
			aria-labelledby="stepper-title"
		>
			<!-- Close button -->
			<button
				onclick={close}
				class="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-md text-white/30 transition hover:bg-white/8 hover:text-white/70"
				aria-label="Close"
			>
				<Icon icon="mingcute:close-line" width="14" height="14" />
			</button>

			<!-- Header -->
			<div class="border-b border-white/[0.06] px-6 pt-6 pb-5">
				<div class="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
					<Icon icon="mingcute:code-line" width="18" height="18" class="text-emerald-400" />
				</div>
				<h2 id="stepper-title" class="text-base font-semibold text-zinc-100">
					Welcome to BrowserCode
				</h2>
				<p class="mt-1 text-[13px] text-white/40">
					A quick tour of your in-browser development environment.
				</p>
			</div>

			<!-- Step content -->
			<div class="px-6 py-5">
				{#key currentStep}
					<div class="flex items-start gap-3">
						<div
							class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-zinc-400"
						>
							<Icon icon={steps[currentStep - 1].icon} width="16" height="16" />
						</div>
						<div>
							<h3 class="mb-1.5 text-[13px] font-semibold text-zinc-100">
								{steps[currentStep - 1].title}
							</h3>
							<p class="text-[12px] leading-relaxed text-white/45">
								{steps[currentStep - 1].description}
							</p>
						</div>
					</div>
				{/key}
			</div>

			<!-- Step indicators -->
			<div class="flex items-center gap-1.5 px-6 pb-1">
				{#each Array(totalSteps) as _, i}
					<button
						onclick={() => (currentStep = i + 1)}
						class="h-1 rounded-full transition-all duration-200 {currentStep === i + 1
							? 'w-5 bg-emerald-500'
							: 'w-1.5 bg-white/15 hover:bg-white/30'}"
						aria-label="Go to step {i + 1}"
					></button>
				{/each}
			</div>

			<!-- Footer -->
			<div class="flex items-center justify-between border-t border-white/[0.06] px-6 py-4">
				<button
					onclick={prev}
					disabled={currentStep === 1}
					class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-white/40 transition hover:bg-white/5 hover:text-white/70 disabled:pointer-events-none disabled:opacity-0"
				>
					<Icon icon="mingcute:arrow-left-line" width="14" height="14" />
					Back
				</button>

				<div class="flex items-center gap-3">
					<button
						onclick={close}
						class="text-[12px] font-medium text-white/30 transition hover:text-white/60"
					>
						Skip
					</button>

					{#if currentStep < totalSteps}
						<button
							onclick={next}
							class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-[12px] font-medium text-black transition hover:bg-emerald-400"
						>
							Next
							<Icon icon="mingcute:arrow-right-line" width="14" height="14" />
						</button>
					{:else}
						<button
							onclick={close}
							class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-[12px] font-medium text-black transition hover:bg-emerald-400"
						>
							<Icon icon="mingcute:check-fill" width="14" height="14" />
							Get started
						</button>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}
