<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import Icon from '@iconify/svelte';

	let currentStep = 1;
	const totalSteps = 4;
	let showModal = false;

	const dispatch = createEventDispatcher();

	onMount(() => {
		const isFirstTime = !localStorage.getItem('hasVisited');
		if (isFirstTime) {
			showModal = true;
			localStorage.setItem('hasVisited', 'true');
		}
	});

	function nextStep() {
		if (currentStep < totalSteps) {
			currentStep += 1;
		}
	}

	function prevStep() {
		if (currentStep > 1) {
			currentStep -= 1;
		}
	}

	function finish() {
		showModal = false;
		dispatch('close');
	}

	function handleClickOutside(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			finish();
		}
	}
</script>

{#if showModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs"
		on:click={handleClickOutside}
	>
		<div
			class="w-full max-w-2xl rounded-2xl border border-white/10 p-1 shadow-2xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="stepper-title"
		>
			<div class="rounded-xl bg-[#141414] p-8">
				<div class="mb-8 text-center">
					<h2 id="stepper-title" class="mb-2 text-3xl font-bold text-zinc-100">
						Welcome to BrowserPod
					</h2>
					<p class="text-zinc-400">A quick tour of your in-browser development environment.</p>
				</div>

				<div class="mb-10 flex items-center justify-center px-4">
					{#each Array(totalSteps) as _, i}
						<div class="flex flex-1 items-center">
							<div
								class="flex h-9 w-9 items-center justify-center rounded-full border-2 text-base font-semibold transition-all duration-300"
								class:border-emerald-500={i + 1 <= currentStep}
								class:bg-emerald-500={i + 1 <= currentStep}
								class:text-white={i + 1 <= currentStep}
								class:border-zinc-700={i + 1 > currentStep}
								class:bg-transparent={i + 1 > currentStep}
								class:text-zinc-400={i + 1 > currentStep}
							>
								{i + 1}
							</div>
							{#if i < totalSteps - 1}
								<div class="h-0.5 flex-auto bg-zinc-700 transition-colors duration-300">
									<div
										class="h-full bg-emerald-500 transition-all duration-300"
										style="width: {i + 1 < currentStep ? '100%' : '0%'}"
									></div>
								</div>
							{/if}
						</div>
					{/each}
				</div>

				<div
					class="relative min-h-[160px] overflow-hidden rounded-lg border border-white/5 bg-black/20 p-6"
				>
					<div class="absolute -inset-px z-0 opacity-20"></div>
					<div class="relative z-10">
						{#if currentStep === 1}
							<div>
								<h3 class="mb-2 text-xl font-semibold text-zinc-100">
									<Icon icon="mingcute:file-line" class="mr-2 inline-block" />
									File System
								</h3>
								<p class="text-zinc-400">
									Explore and manage your project files on the left. Click to open and edit. All
									changes are saved automatically.
								</p>
							</div>
						{:else if currentStep === 2}
							<div>
								<h3 class="mb-2 text-xl font-semibold text-zinc-100">
									<Icon icon="mingcute:eye-2-line" class="mr-2 inline-block" />
									Live Preview
								</h3>
								<p class="text-zinc-400">
									See your application live on the right. The preview updates instantly as you make
									changes to the code.
								</p>
							</div>
						{:else if currentStep === 3}
							<div>
								<h3 class="mb-2 text-xl font-semibold text-zinc-100">
									<Icon icon="mingcute:terminal-line" class="mr-2 inline-block" />
									Integrated Terminal
								</h3>
								<p class="text-zinc-400">
									A full-featured terminal is at your disposal. Run build scripts, install
									dependencies, and interact with your app's environment.
								</p>
							</div>
						{:else if currentStep === 4}
							<div>
								<h3 class="mb-2 text-xl font-semibold text-zinc-100">
									<Icon icon="mingcute:share-forward-line" class="mr-2 inline-block" />
									Share Your Portal
								</h3>
								<p class="text-zinc-400">
									Generate a public URL for your running application via the 'Portal' menu. It's
									perfect for sharing or testing on other devices.
								</p>
							</div>
						{/if}
					</div>
				</div>

				<div class="mt-10 flex items-center justify-between">
					<button
						on:click={prevStep}
						disabled={currentStep === 1}
						class="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
					>
						<Icon icon="mingcute:arrow-left-line" width="18" height="18" />
						Back
					</button>

					<div class="flex items-center gap-4">
						<button
							on:click={finish}
							class="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-200"
						>
							Skip
						</button>
						{#if currentStep < totalSteps}
							<button
								on:click={nextStep}
								class="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-medium text-black shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all hover:bg-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.6)]"
							>
								Next
								<Icon icon="mingcute:arrow-right-line" width="18" height="18" />
							</button>
						{:else}
							<button
								on:click={finish}
								class="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-medium text-black shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all hover:bg-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.6)]"
							>
								<Icon icon="mingcute:check-fill" width="18" height="18" />
								Get Started
							</button>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
