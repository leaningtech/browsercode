<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import Icon from '@iconify/svelte';
	import favicon from '$lib/assets/favicon.svg';
	import opencodeLogoSrc from '$lib/assets/opencode-logo.svg';
	import { page } from '$app/stores';
	import { stepperState } from '$lib/stores/stepper.svelte';
	import { toolItems } from '$lib/config/tools';
	import { frameworkRailItems } from '$lib/config/frameworks';
	import { navigateWithLeaveGuard } from '$lib/stores/leaveWarning.svelte';

	let currentStep = 1;
	const totalSteps = 7;

	const dispatch = createEventDispatcher();

	// Measured from the real sidebar buttons (via data-tour-target) rather than hand-computed
	// pixel math, so the pointers stay accurate if the sidebar's layout ever changes again.
	// These are just sane fallbacks in case a target isn't found for some reason.
	let agentsTop = 113;
	let ideTop = 155;
	let helpBottom = 28;

	function centerOf(selector: string): DOMRect | null {
		return document.querySelector(selector)?.getBoundingClientRect() ?? null;
	}

	function measureTourTargets() {
		const agentsRect = centerOf('[data-tour-target="agents"]');
		if (agentsRect) agentsTop = agentsRect.top + agentsRect.height / 2;

		const ideRect = centerOf('[data-tour-target="ide"]');
		if (ideRect) ideTop = ideRect.top + ideRect.height / 2;

		const helpRect = centerOf('[data-tour-target="help"]');
		if (helpRect) helpBottom = window.innerHeight - (helpRect.top + helpRect.height / 2);
	}

	// Re-measure every time the tour is actually opened — it can be triggered long after this
	// component first mounted (from Help, or the Home page), by which point the initial-mount
	// measurement may be stale if the viewport was resized in between. The backdrop below only
	// exists while the modal is open, so this action re-fires on every fresh open.
	function measureOnMount(node: HTMLElement) {
		void node;
		measureTourTargets();
	}

	onMount(() => {
		measureTourTargets();

		// The tour only auto-opens the first time someone lands on Home — deep-linking straight
		// into /ide or /agents/[tool] on a first visit shouldn't interrupt with the modal.
		const isFirstTime = !localStorage.getItem('hasVisited');
		if (isFirstTime && $page.route.id === '/') {
			stepperState.open = true;
			localStorage.setItem('hasVisited', 'true');
		}
	});

	function nextStep() {
		if (currentStep < totalSteps) {
			currentStep += 1;
			measureTourTargets();
		}
	}

	function prevStep() {
		if (currentStep > 1) {
			currentStep -= 1;
			measureTourTargets();
		}
	}

	function finish() {
		stepperState.open = false;
		dispatch('close');
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			finish();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!stepperState.open) return;
		if (event.key === 'Escape') {
			event.preventDefault();
			finish();
		}
	}

	// Already viewing an active agent session? Leaving it from here should ask first, same as
	// the sidebar does.
	function goAgents() {
		navigateWithLeaveGuard('/agents', $page.route.id === '/agents/[tool]');
	}

	function goIde() {
		navigateWithLeaveGuard('/ide', $page.route.id === '/agents/[tool]');
	}

	// Steps 3-5 point at sidebar buttons, so the backdrop leaves the sidebar uncovered for those.
	const sidebarSteps = new Set([3, 4, 5]);
</script>

<svelte:window on:keydown={handleKeydown} />

{#if stepperState.open}
	<!-- Backdrop. Escape-to-close is handled by the window listener above. -->
	<div
		class="fixed inset-y-0 right-0 z-50 flex items-center justify-center bg-black/60 transition-[left] duration-500 ease-out"
		style="left: {sidebarSteps.has(currentStep) ? 'var(--width-sidebar)' : '0'};"
		role="presentation"
		on:click={handleBackdropClick}
		use:measureOnMount
	>
		<div
			class="glass-panel relative w-full max-w-xl rounded-xl border border-bc-mist/15 shadow-2xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="stepper-title"
		>
			<!-- Header strip, mirroring the IDE panel chrome -->
			<div
				class="flex items-center justify-between border-b border-bc-mist/10 px-5 py-3 text-xs text-zinc-500"
			>
				<span class="font-medium tracking-wide text-zinc-400 uppercase">BrowserCode</span>
				<span class="font-mono text-zinc-600">{currentStep} / {totalSteps}</span>
			</div>

			<div class="p-8">
				{#if currentStep === 1}
					<div class="mb-5 flex justify-center">
						<img src={favicon} alt="BrowserCode" class="h-14 w-14" />
					</div>
					<h1 id="stepper-title" class="mb-3 text-3xl font-bold text-zinc-100">
						Welcome to BrowserCode
					</h1>
					<p class="text-sm leading-relaxed text-zinc-400">
						Run AI coding agents like Claude Code and Gemini CLI, or spin up a full IDE playground
						for popular frameworks — everything sandboxed right in this browser tab.
					</p>
				{:else if currentStep === 2}
					<h1 id="stepper-title" class="mb-3 text-3xl font-bold text-zinc-100">
						Powered by BrowserPod
					</h1>
					<p class="text-sm leading-relaxed text-zinc-400">
						BrowserCode is built on
						<a
							href="https://browserpod.io"
							target="_blank"
							rel="noopener noreferrer"
							class="font-medium text-zinc-100 transition-colors duration-300 hover:text-white"
							>BrowserPod</a
						>, a browser-based sandbox that runs AI agents, code and development tools in the
						browser, without cloud compute.
					</p>

					<a
						href="https://browserpod.io"
						target="_blank"
						rel="noopener noreferrer"
						class="glass-panel mt-6 flex items-center gap-3 rounded-lg border border-bc-mist/10 px-4 py-3 transition-colors duration-150 hover:border-bc-mist/25"
					>
						<Icon icon="mingcute:cube-3d-line" width="22" height="22" class="text-bc-mist" />
						<div class="flex-1 text-sm text-zinc-300">
							<span class="font-medium">BrowserPod</span>
							<span class="ml-2 text-zinc-500">Learn more</span>
						</div>
						<Icon
							icon="mingcute:arrow-right-up-line"
							width="16"
							height="16"
							class="text-zinc-500"
						/>
					</a>
				{:else if currentStep === 3}
					<h1 id="stepper-title" class="mb-3 text-3xl font-bold text-zinc-100">
						Run AI agents from the sidebar
					</h1>
					<p class="text-sm leading-relaxed text-zinc-400">
						Claude Code and Gemini CLI are ready to go now. Codex CLI and OpenCode are coming soon.
					</p>

					<div class="mt-6 grid grid-cols-2 gap-2">
						{#each toolItems as item (item.id)}
							<div
								class="glass-panel flex items-center gap-2 rounded-lg border border-bc-mist/10 px-3 py-2.5"
							>
								<span
									class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md {item.disabled
										? 'bg-white/5 text-white/20'
										: item.accentClass}"
								>
									{#if item.icon}
										<Icon icon={item.icon} width="16" height="16" />
									{:else}
										<img
											src={opencodeLogoSrc}
											alt=""
											class="h-3.5 w-3.5 {item.disabled ? 'opacity-20' : 'opacity-90'}"
										/>
									{/if}
								</span>
								<span
									class="flex-1 truncate text-xs {item.disabled
										? 'text-zinc-500'
										: 'text-zinc-300'}"
								>
									{item.label}
								</span>
								{#if item.disabled}
									<span class="text-[10px] text-bc-gold/70">Soon</span>
								{/if}
							</div>
						{/each}
					</div>
				{:else if currentStep === 4}
					<h1 id="stepper-title" class="mb-3 text-3xl font-bold text-zinc-100">
						Or build in the IDE playground
					</h1>
					<p class="text-sm leading-relaxed text-zinc-400">
						Boot a curated framework template, or clone any GitHub repo straight into a full editor,
						terminal, and live preview. Also from the sidebar.
					</p>

					<div class="mt-6 flex flex-wrap gap-2">
						{#each frameworkRailItems as fw (fw.id)}
							<span
								class="glass-panel flex items-center gap-1.5 rounded-md border border-bc-mist/10 px-2.5 py-1.5 text-xs text-zinc-400"
							>
								<Icon icon={fw.icon} width="14" height="14" />
								{fw.label}
							</span>
						{/each}
					</div>
				{:else if currentStep === 5}
					<h1 id="stepper-title" class="mb-3 text-3xl font-bold text-zinc-100">
						This is our first beta
					</h1>
					<p class="text-sm leading-relaxed text-zinc-400">
						Please bend, stretch and break it. If something's off, let us know from Help in the
						sidebar — it's also where the getting-started basics and this tour live.
					</p>
				{:else if currentStep === 6}
					<h1 id="stepper-title" class="mb-3 text-3xl font-bold text-zinc-100">
						Give us a star on GitHub
					</h1>
					<p class="text-sm leading-relaxed text-zinc-400">
						BrowserCode is free and open source software. Do anything you like with it! Change it,
						customize it, embed it on your application. Find us on
						<a
							href="https://github.com/leaningtech/browsercode"
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-1 font-medium text-zinc-100 transition-colors duration-300 hover:text-white"
						>
							<Icon icon="simple-icons:github" width="13" height="13" />
							GitHub
						</a>
					</p>
				{:else if currentStep === 7}
					<h1 id="stepper-title" class="mb-3 text-3xl font-bold text-zinc-100">
						Ready when you are
					</h1>
					<p class="mb-6 text-sm leading-relaxed text-zinc-400">Pick a path to get started.</p>

					<div class="flex flex-col gap-3 sm:flex-row">
						<button
							on:click={goAgents}
							class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-bc-azure/90 px-5 py-3 text-[14px] font-medium text-white transition hover:bg-bc-azure"
						>
							<Icon icon="mingcute:robot-line" width="18" height="18" />
							Start with agents
						</button>
						<button
							on:click={goIde}
							class="glass-panel flex flex-1 items-center justify-center gap-2 rounded-lg border border-bc-mist/15 px-5 py-3 text-[14px] font-medium text-zinc-200 transition hover:border-bc-mist/30"
						>
							<Icon icon="mingcute:code-line" width="18" height="18" />
							Start with IDE
						</button>
					</div>
				{/if}
			</div>

			<!-- Footer with nav + step pips -->
			<div
				class="flex items-center justify-between border-t border-bc-mist/10 bg-black/20 px-5 py-3"
			>
				<button
					on:click={prevStep}
					disabled={currentStep === 1}
					class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
				>
					<Icon icon="mingcute:arrow-left-line" width="14" height="14" />
					Back
				</button>

				<div class="flex items-center gap-1.5">
					{#each { length: totalSteps }, i (i)}
						<span
							class="h-1.5 rounded-full transition-all duration-300"
							class:w-6={i + 1 === currentStep}
							class:bg-bc-azure={i + 1 === currentStep}
							class:w-1.5={i + 1 !== currentStep}
							class:bg-zinc-700={i + 1 !== currentStep}
						></span>
					{/each}
				</div>

				<div class="flex items-center gap-2">
					<button
						on:click={finish}
						class="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-300"
					>
						Skip
					</button>
					{#if currentStep < totalSteps}
						<button
							on:click={nextStep}
							class="inline-flex items-center gap-1.5 rounded-md bg-bc-azure px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-bc-azure/85"
						>
							Next
							<Icon icon="mingcute:arrow-right-line" width="14" height="14" />
						</button>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Step 3: helper tooltip pointing at the Agents sidebar button. -->
	{#if currentStep === 3}
		<div
			class="pointer-events-none fixed z-[60] ml-3 flex items-center"
			style="left: var(--width-sidebar); top: {agentsTop}px; transform: translateY(-50%);"
		>
			<span class="h-2 w-2 rotate-45 bg-bc-mist"></span>
			<span
				class="-ml-1 flex items-center gap-2 rounded-md bg-bc-mist px-2.5 py-1 text-xs font-medium whitespace-nowrap text-bc-abyss shadow-lg"
			>
				Run AI agents, sandboxed
			</span>
		</div>
	{/if}

	<!-- Step 4: helper tooltip pointing at the Ide sidebar button. -->
	{#if currentStep === 4}
		<div
			class="pointer-events-none fixed z-[60] ml-3 flex items-center"
			style="left: var(--width-sidebar); top: {ideTop}px; transform: translateY(-50%);"
		>
			<span class="h-2 w-2 rotate-45 bg-bc-mist"></span>
			<span
				class="-ml-1 flex items-center gap-2 rounded-md bg-bc-mist px-2.5 py-1 text-xs font-medium whitespace-nowrap text-bc-abyss shadow-lg"
			>
				Frameworks & GitHub, in one click
			</span>
		</div>
	{/if}

	<!-- Step 5: helper tooltip pointing at the Help sidebar button. -->
	{#if currentStep === 5}
		<div
			class="pointer-events-none fixed z-[60] ml-3 flex items-center"
			style="left: var(--width-sidebar); bottom: {helpBottom}px; transform: translateY(50%);"
		>
			<span class="h-2 w-2 rotate-45 bg-bc-mist"></span>
			<span
				class="-ml-1 flex items-center gap-2 rounded-md bg-bc-mist px-2.5 py-1 text-xs font-medium whitespace-nowrap text-bc-abyss shadow-lg"
			>
				Found a bug? Start here
			</span>
		</div>
	{/if}

	<!-- Step 6: helper tooltip pointing to the GitHub fork ribbon in the top-right corner. -->
	{#if currentStep === 6}
		<div
			class="pointer-events-none fixed z-[60] flex items-center"
			style="top: 24px; right: 160px; transform: translateY(-50%);"
		>
			<span
				class="flex items-center gap-2 rounded-md bg-bc-mist px-2.5 py-1 text-xs font-medium whitespace-nowrap text-bc-abyss shadow-lg"
			>
				<Icon icon="simple-icons:github" width="12" height="12" />
				Star us on GitHub!
			</span>
			<span class="h-2 w-2 rotate-45 bg-bc-mist"></span>
		</div>
	{/if}
{/if}
