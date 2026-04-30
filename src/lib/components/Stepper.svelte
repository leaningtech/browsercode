<script lang="ts">
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import Icon from '@iconify/svelte';
	import favicon from '$lib/assets/favicon.svg';
	import opencodeLogoSrc from '$lib/assets/opencode-logo.svg';

	let currentStep = 1;
	const totalSteps = 6;
	let showModal = false;
	let highlightedAgent: 'claude' | 'codex' | 'opencode' = 'claude';
	let agentCycleTimer: ReturnType<typeof setInterval> | null = null;
	let copied = false;
	let copyTimer: ReturnType<typeof setTimeout> | null = null;

	const firstPrompt =
		"Please create and preview a 'hello world' project in Express.js";

	const dispatch = createEventDispatcher();

	const agents = {
		claude: {
			label: 'Claude Code',
			icon: 'mingcute:claude-line',
			helper: 'Claude Code — coming soon',
			useIcon: true
		},
		codex: {
			label: 'Codex CLI',
			icon: 'hugeicons:chat-gpt',
			helper: 'Codex CLI — coming soon',
			useIcon: true
		},
		opencode: {
			label: 'OpenCode',
			icon: null,
			helper: 'OpenCode — coming soon',
			useIcon: false
		}
	} as const;

	// Sidebar geometry: favicon header (py-3.5 ~2.875rem) + divider + nav pt-2 + nav buttons.
	// Each nav button = p-2.5 (20px) + 20px icon = 40px, plus gap-0.5 (2px).
	// Button 1 (Gemini) center ≈ 46 + 1 + 20 + 2 = ~47px from top of nav → ~46 + 1 + 20 = ~93px total
	// Button 2 (Claude) center ≈ previous + 40 + 2 = ~135px
	// Button 3 (Codex) center ≈ ~177px
	// Button 4 (OpenCode) center ≈ ~219px
	const agentButtonOffsets = {
		claude: 135,
		codex: 177,
		opencode: 219
	};

	// GitHub icon is in the bottom section of the sidebar.
	// We use a bottom offset from the viewport bottom.
	// Bottom section: py-2 (8px) + 3 buttons (40px each) + gap-0.5 (2px) between each.
	// From bottom: 8px padding + 8px (half of last question button) → GitHub is 3rd from bottom.
	// GitHub button center from bottom ≈ 8 + 40 + 2 + 40 + 2 + 20 = 112px
	const githubButtonBottomOffset = 112;

	onMount(() => {
		const isFirstTime = !localStorage.getItem('hasVisited');
		if (isFirstTime) {
			showModal = true;
			localStorage.setItem('hasVisited', 'true');
		}
	});

	onDestroy(() => {
		if (agentCycleTimer) clearInterval(agentCycleTimer);
		if (copyTimer) clearTimeout(copyTimer);
	});

	const agentOrder: Array<'claude' | 'codex' | 'opencode'> = ['claude', 'codex', 'opencode'];

	function startAgentCycle() {
		if (agentCycleTimer) return;
		agentCycleTimer = setInterval(() => {
			const idx = agentOrder.indexOf(highlightedAgent);
			highlightedAgent = agentOrder[(idx + 1) % agentOrder.length];
		}, 1800);
	}

	function stopAgentCycle() {
		if (agentCycleTimer) {
			clearInterval(agentCycleTimer);
			agentCycleTimer = null;
		}
	}

	function nextStep() {
		if (currentStep < totalSteps) {
			currentStep += 1;
			if (currentStep === 3) {
				highlightedAgent = 'claude';
				startAgentCycle();
			} else {
				stopAgentCycle();
			}
		}
	}

	function prevStep() {
		if (currentStep > 1) {
			currentStep -= 1;
			if (currentStep === 3) {
				highlightedAgent = 'claude';
				startAgentCycle();
			} else {
				stopAgentCycle();
			}
		}
	}

	function finish() {
		stopAgentCycle();
		showModal = false;
		dispatch('close');
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			finish();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!showModal) return;
		if (event.key === 'Escape') {
			event.preventDefault();
			finish();
		}
	}

	async function copyPrompt() {
		try {
			await navigator.clipboard.writeText(firstPrompt);
			copied = true;
			if (copyTimer) clearTimeout(copyTimer);
			copyTimer = setTimeout(() => (copied = false), 1500);
		} catch (err) {
			console.error('Failed to copy prompt:', err);
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if showModal}
	<!-- Backdrop. On step 3 we leave the sidebar uncovered so the CLI
	     buttons remain visible and visually "highlighted" by the surrounding dim.
	     On step 2 we leave the sidebar uncovered so the GitHub button is visible.
	     Escape-to-close is handled by the window listener above. -->
	<div
		class="fixed inset-y-0 right-0 z-50 flex items-center justify-center bg-black/60 transition-[left] duration-500 ease-out"
		style="left: {currentStep === 2 || currentStep === 3 ? 'var(--width-sidebar)' : '0'};"
		role="presentation"
		on:click={handleBackdropClick}
	>
		<div
			class="relative w-full max-w-xl rounded-xl border border-white/10 bg-bc-panel shadow-2xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="stepper-title"
		>
			<!-- Header strip, mirroring the IDE panel chrome -->
			<div
				class="flex items-center justify-between border-b border-white/10 px-5 py-3 text-xs text-zinc-500"
			>
				<span class="font-medium tracking-wide text-zinc-400 uppercase">BrowserCode (Preview) </span>
				<span class="font-mono text-zinc-600">{currentStep} / {totalSteps}</span>
			</div>

			<div class="p-8">
				{#if currentStep === 1}
					<div class="mb-5 flex justify-center">
						<img src={favicon} alt="BrowserCode" class="h-14 w-14" />
					</div>
					<h1 id="stepper-title" class="mb-3 text-3xl font-bold text-zinc-100">BrowserCode (Preview)</h1>
					<p class="text-sm leading-relaxed text-zinc-400">
						BrowserCode runs Gemini CLI in the browser unmodified. It runs via BrowserPod, an API that provides
						Wasm-based runtimes for AI agents and code. It runs in-browser without any cloud compute.
					</p>
				{:else if currentStep === 2}
					<h1 id="stepper-title" class="mb-3 text-3xl font-bold text-zinc-100">Breaking BrowserCode</h1>
					<p class="text-sm leading-relaxed text-zinc-400">
						This is our first beta, so please bend, stretch and break it. When you find issues,
						please raise it using
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
				{:else if currentStep === 3}
					<h1 id="stepper-title" class="mb-3 text-3xl font-bold text-zinc-100">
						More AI coding CLIs coming soon
					</h1>
					<p class="text-sm leading-relaxed text-zinc-400">
						BrowserCode boots with Gemini, but support for
						<span
							class="font-medium transition-colors duration-300"
							class:text-zinc-100={highlightedAgent === 'claude'}
							class:text-zinc-500={highlightedAgent !== 'claude'}>Claude Code</span
						>,
						<span
							class="font-medium transition-colors duration-300"
							class:text-zinc-100={highlightedAgent === 'codex'}
							class:text-zinc-500={highlightedAgent !== 'codex'}>Codex CLI</span
						>
						and
						<span
							class="font-medium transition-colors duration-300"
							class:text-zinc-100={highlightedAgent === 'opencode'}
							class:text-zinc-500={highlightedAgent !== 'opencode'}>OpenCode</span
						>
						are coming soon.
					</p>

					<div
						class="mt-6 flex items-center gap-3 rounded-lg border border-white/5 bg-black/30 px-4 py-3"
					>
						{#if agents[highlightedAgent].useIcon}
							<Icon
								icon={agents[highlightedAgent].icon as string}
								width="22"
								height="22"
								class="text-zinc-200 transition-colors duration-300"
							/>
						{:else}
							<img src={opencodeLogoSrc} alt="OpenCode" class="h-[22px] w-[22px]" />
						{/if}
						<div class="flex-1 text-sm text-zinc-300">
							<span class="font-medium">{agents[highlightedAgent].label}</span>
							<span class="ml-2 text-zinc-500">— coming soon</span>
						</div>
						<div class="flex gap-1">
							<span
								class="h-1.5 w-1.5 rounded-full transition-colors duration-300"
								class:bg-zinc-200={highlightedAgent === 'claude'}
								class:bg-zinc-700={highlightedAgent !== 'claude'}
							></span>
							<span
								class="h-1.5 w-1.5 rounded-full transition-colors duration-300"
								class:bg-zinc-200={highlightedAgent === 'codex'}
								class:bg-zinc-700={highlightedAgent !== 'codex'}
							></span>
							<span
								class="h-1.5 w-1.5 rounded-full transition-colors duration-300"
								class:bg-zinc-200={highlightedAgent === 'opencode'}
								class:bg-zinc-700={highlightedAgent !== 'opencode'}
							></span>
						</div>
					</div>
				{:else if currentStep === 4}
					<h1 id="stepper-title" class="mb-3 text-3xl font-bold text-zinc-100">Contribute to BrowserCode</h1>
					<p class="text-sm leading-relaxed text-zinc-400">
						BrowserCode is open source. You can fork the project on
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
				{:else if currentStep === 5}
					<h1 id="stepper-title" class="mb-3 text-3xl font-bold text-zinc-100">Get started</h1>
					<p class="text-sm leading-relaxed text-zinc-400">
						BrowserCode will boot Gemini CLI now. On boot, Gemini may hang silently for up to 30 seconds. This is normal behavior for Gemini CLI in any environment. 
					</p>
				{:else if currentStep === 6}
					<h1 id="stepper-title" class="mb-3 text-3xl font-bold text-zinc-100">Try this</h1>
					<p class="text-sm leading-relaxed text-zinc-400">
						Use this as your first prompt for BrowserCode:
					</p>

					<div
						class="mt-5 flex items-start gap-3 rounded-lg border border-white/10 bg-black/40 p-4"
					>
						<code class="flex-1 font-mono text-sm leading-relaxed text-zinc-200 select-all">
							{firstPrompt}
						</code>
						<button
							on:click={copyPrompt}
							class="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/10 hover:text-zinc-100"
							aria-label="Copy prompt"
						>
							{#if copied}
								<Icon icon="mingcute:check-line" width="14" height="14" />
								Copied
							{:else}
								<Icon icon="mingcute:copy-2-line" width="14" height="14" />
								Copy
							{/if}
						</button>
					</div>
				{/if}
			</div>

			<!-- Footer with nav + step pips -->
			<div
				class="flex items-center justify-between border-t border-white/10 bg-black/20 px-5 py-3"
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
					{#each Array(totalSteps) as _, i}
						<span
							class="h-1.5 rounded-full transition-all duration-300"
							class:w-6={i + 1 === currentStep}
							class:bg-zinc-100={i + 1 === currentStep}
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
							class="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-white"
						>
							Next
							<Icon icon="mingcute:arrow-right-line" width="14" height="14" />
						</button>
					{:else}
						<button
							on:click={finish}
							class="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-white"
						>
							<Icon icon="mingcute:check-fill" width="14" height="14" />
							Get started
						</button>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Step 3: helper tooltip that jumps between the Claude, Codex, and OpenCode sidebar buttons.
	     Sits above the backdrop (z-50) so it's visible, positioned over the sidebar strip. -->
	{#if currentStep === 3}
		<div
			class="pointer-events-none fixed z-[60] ml-3 flex items-center transition-[top] duration-500 ease-out"
			style="left: var(--width-sidebar); top: {agentButtonOffsets[highlightedAgent]}px; transform: translateY(-50%);"
		>
			<span class="h-2 w-2 rotate-45 bg-zinc-100"></span>
			<span
				class="-ml-1 flex items-center gap-2 rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-black shadow-lg"
			>
				{agents[highlightedAgent].helper}
			</span>
		</div>
	{/if}

	<!-- Step 2: helper tooltip pointing to the GitHub icon in the sidebar bottom section. -->
	{#if currentStep === 2}
		<div
			class="pointer-events-none fixed z-[60] ml-3 flex items-center"
			style="left: var(--width-sidebar); bottom: {githubButtonBottomOffset}px; transform: translateY(50%);"
		>
			<span class="h-2 w-2 rotate-45 bg-zinc-100"></span>
			<span
				class="-ml-1 flex items-center gap-2 rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-black shadow-lg"
			>
				<Icon icon="simple-icons:github" width="12" height="12" />
				Report issues on GitHub
			</span>
		</div>
	{/if}

	<!-- Step 4: helper tooltip pointing to the GitHub fork ribbon in the top-right corner. -->
	{#if currentStep === 4}
		<div
			class="pointer-events-none fixed z-[60] flex items-center"
			style="top: 24px; right: 160px; transform: translateY(-50%);"
		>
			<span
				class="flex items-center gap-2 rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-black shadow-lg"
			>
				<Icon icon="simple-icons:github" width="12" height="12" />
				Fork on GitHub
			</span>
			<span class="h-2 w-2 rotate-45 bg-zinc-100"></span>
		</div>
	{/if}
{/if}
