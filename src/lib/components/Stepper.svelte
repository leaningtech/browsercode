<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import favicon from '$lib/assets/favicon.svg';
	import opencodeLogoSrc from '$lib/assets/opencode-logo.svg';
	import { page } from '$app/stores';
	import { stepperState, openTour } from '$lib/stores/stepper.svelte';
	import { toolItems } from '$lib/config/tools';
	import { frameworkRailItems } from '$lib/config/frameworks';
	import { navigateWithLeaveGuard } from '$lib/stores/leaveWarning.svelte';

	const totalSteps = 6;

	// Derived from the registry rather than spelled out, so shipping a CLI can't leave the tour
	// still announcing it as "coming soon".
	const listSentence = (labels: string[]) =>
		new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(labels);
	const liveToolNames = listSentence(toolItems.filter((t) => !t.disabled).map((t) => t.label));
	const soonToolNames = listSentence(toolItems.filter((t) => t.disabled).map((t) => t.label));

	// The step lives in the shared store (not a local `let`) so +layout.svelte can read it for the
	// GitHub ribbon z-index, and — more importantly — so opening the tour from anywhere (see
	// openTour() in the store) can reliably reset it. A local reactive statement watching
	// stepperState.open here couldn't do that: legacy `$:` blocks in a non-runes component only
	// re-run off their own component's `let` dependencies, not off external $state proxy reads.

	// Measured from the real sidebar/ribbon elements (via data-tour-target) rather than hand-
	// computed pixel math, so the pointers stay accurate if the layout ever changes again. These
	// are just sane fallbacks in case a target isn't found for some reason.
	let ideTop = 113;
	let agentsTop = 155;
	let githubTop = 31;
	let githubRight = 160;

	// `display: none` (the ribbon on mobile, via its `hidden md:flex`) still returns a rect, just
	// an all-zero one — treat that the same as "not found" rather than snapping the tooltip there.
	function centerOf(selector: string): DOMRect | null {
		const rect = document.querySelector(selector)?.getBoundingClientRect();
		return rect && (rect.width || rect.height) ? rect : null;
	}

	function measureTourTargets() {
		const agentsRect = centerOf('[data-tour-target="agents"]');
		if (agentsRect) agentsTop = agentsRect.top + agentsRect.height / 2;

		const ideRect = centerOf('[data-tour-target="ide"]');
		if (ideRect) ideTop = ideRect.top + ideRect.height / 2;

		const githubRect = centerOf('[data-tour-target="github-ribbon"]');
		if (githubRect) {
			githubTop = githubRect.top + githubRect.height / 2;
			githubRight = window.innerWidth - githubRect.left;
		}
	}

	// Re-measures whenever the element it's attached to mounts — used on the backdrop (which only
	// exists while the modal is open, so this re-fires on every fresh open; the tour can be
	// triggered long after this component first mounted, by which point the initial-mount
	// measurement may be stale if the viewport was resized in between) and on the step 5 tooltip
	// (whose target, the GitHub ribbon, only renders for that one step — see ribbonAboveTour in
	// +layout.svelte).
	function measureOnMount(node: HTMLElement) {
		void node;
		measureTourTargets();
	}

	onMount(() => {
		measureTourTargets();

		// The tour only auto-opens the first time someone lands on Home — deep-linking straight
		// into /ide or /agents/[tool] on a first visit shouldn't interrupt with the modal. Storage
		// is best-effort: if it's blocked (privacy modes, sandboxed iframes), skip auto-opening
		// rather than let the throw fail this component's mount.
		try {
			const isFirstTime = !localStorage.getItem('hasVisited');
			if (isFirstTime && $page.route.id === '/') {
				openTour();
				localStorage.setItem('hasVisited', 'true');
			}
		} catch (error) {
			console.warn('Could not read/persist the first-visit flag:', error);
		}
	});

	function nextStep() {
		if (stepperState.step < totalSteps) {
			stepperState.step += 1;
			measureTourTargets();
		}
	}

	function prevStep() {
		if (stepperState.step > 1) {
			stepperState.step -= 1;
			measureTourTargets();
		}
	}

	function finish() {
		stepperState.open = false;
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

	// Steps 3-4 point at sidebar buttons, so the backdrop leaves the sidebar uncovered for those.
	const sidebarSteps = new Set([3, 4]);
</script>

<svelte:window on:keydown={handleKeydown} />

{#if stepperState.open}
	<!-- Backdrop. Escape-to-close is handled by the window listener above. The GitHub ribbon
	     (step 5) is raised above this via z-index in +layout.svelte, so it stays sharp there. The
	     +0.625rem matches the sidebar's own `ml-2.5` left margin (Sidebar.svelte) — the floating
	     card sits that far past --width-sidebar, so the backdrop needs the same offset or it dims
	     a sliver of the card's right edge. -->
	<div
		class="fixed inset-y-0 right-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm transition-[left] duration-500 ease-out"
		style="left: {sidebarSteps.has(stepperState.step)
			? 'calc(var(--width-sidebar) + 0.625rem)'
			: '0'};"
		role="presentation"
		on:click={handleBackdropClick}
		use:measureOnMount
	>
		<div
			class="glass-panel glass-panel-solid relative w-full max-w-xl rounded-xl border border-bc-mist/15 shadow-2xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="stepper-title"
		>
			<!-- Header strip, mirroring the IDE panel chrome -->
			<div
				class="flex items-center justify-between border-b border-bc-mist/10 px-5 py-3 text-xs text-bc-icon"
			>
				<span class="font-medium tracking-wide text-bc-text-muted uppercase">BrowserCode</span>
				<span class="font-mono text-bc-icon">{stepperState.step} / {totalSteps}</span>
			</div>

			<div class="p-8">
				{#if stepperState.step === 1}
					<div class="mb-5 flex justify-center">
						<img src={favicon} alt="BrowserCode" class="bc-logo-mark h-14 w-14" />
					</div>
					<h1 id="stepper-title" class="mb-3 font-display text-3xl font-bold text-bc-text">
						Welcome to BrowserCode
					</h1>
					<p class="text-sm leading-relaxed text-bc-text-muted">
						Run AI coding agents like Claude Code, or spin up a full IDE playground for popular
						frameworks, with everything sandboxed right in this browser tab.
					</p>
				{:else if stepperState.step === 2}
					<h1 id="stepper-title" class="mb-3 font-display text-3xl font-bold text-bc-text">
						Powered by BrowserPod
					</h1>
					<p class="text-sm leading-relaxed text-bc-text-muted">
						BrowserCode is built on
						<a
							href="https://browserpod.io"
							target="_blank"
							rel="noopener noreferrer"
							class="font-medium text-bc-text underline decoration-bc-orchid/40 underline-offset-2 transition-colors hover:text-bc-link-hover hover:decoration-bc-link-hover"
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
						<div class="flex-1 text-sm text-bc-mist">
							<span class="font-medium">BrowserPod</span>
							<span class="ml-2 text-bc-icon">Learn more</span>
						</div>
						<Icon icon="mingcute:arrow-right-up-line" width="16" height="16" class="text-bc-icon" />
					</a>
				{:else if stepperState.step === 3}
					<h1 id="stepper-title" class="mb-3 font-display text-3xl font-bold text-bc-text">
						Build in the IDE playground
					</h1>
					<p class="text-sm leading-relaxed text-bc-text-muted">
						Boot a curated framework template straight into a full editor with terminal and live
						previews. You can find them in the sidebar.
					</p>

					<div class="mt-6 flex flex-wrap gap-2">
						{#each frameworkRailItems as fw (fw.id)}
							<span
								class="glass-panel flex items-center gap-1.5 rounded-md border border-bc-mist/10 px-2.5 py-1.5 text-xs text-bc-text-muted"
							>
								<Icon icon={fw.icon} width="14" height="14" />
								{fw.label}
							</span>
						{/each}
					</div>
				{:else if stepperState.step === 4}
					<h1 id="stepper-title" class="mb-3 font-display text-3xl font-bold text-bc-text">
						Or run AI agents from the sidebar
					</h1>
					<p class="text-sm leading-relaxed text-bc-text-muted">
						{liveToolNames} are available now. {soonToolNames} are coming soon.
					</p>

					<div class="mt-6 grid grid-cols-2 gap-2">
						{#each toolItems as item (item.id)}
							<div
								class="glass-panel flex items-center gap-2 rounded-lg border border-bc-mist/10 px-3 py-2.5"
							>
								<span
									class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md {item.disabled
										? 'bg-[rgb(var(--bc-tint)/5%)] text-[rgb(var(--bc-tint)/20%)]'
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
									class="flex-1 truncate text-xs {item.disabled ? 'text-bc-icon' : 'text-bc-mist'}"
								>
									{item.label}
								</span>
								{#if item.disabled}
									<span class="text-[10px] text-bc-gold/70">Soon</span>
								{/if}
							</div>
						{/each}
					</div>
				{:else if stepperState.step === 5}
					<h1 id="stepper-title" class="mb-3 font-display text-3xl font-bold text-bc-text">
						Give us a star on GitHub
					</h1>
					<p class="text-sm leading-relaxed text-bc-text-muted">
						BrowserCode is free and open source software. Do anything you like with it:
					</p>
					<ul class="mb-5 flex flex-col gap-2 text-sm leading-relaxed text-bc-text-muted">
						<li class="flex items-start gap-2.5">
							<Icon
								icon="mingcute:check-circle-line"
								width="16"
								height="16"
								class="mt-0.5 shrink-0 text-bc-mist"
							/>
							<span>Change and customize it however you like</span>
						</li>
						<li class="flex items-start gap-2.5">
							<Icon
								icon="mingcute:check-circle-line"
								width="16"
								height="16"
								class="mt-0.5 shrink-0 text-bc-mist"
							/>
							<span>Embed it in your own application</span>
						</li>
					</ul>
					<a
						href="https://github.com/leaningtech/browsercode"
						target="_blank"
						rel="noopener noreferrer"
						class="glass-panel inline-flex items-center gap-2 rounded-lg border border-bc-mist/10 px-4 py-2.5 text-sm font-medium text-bc-text transition-colors duration-150 hover:border-bc-mist/25"
					>
						<Icon icon="simple-icons:github" width="16" height="16" />
						Star us on GitHub
					</a>
				{:else if stepperState.step === 6}
					<h1 id="stepper-title" class="mb-3 font-display text-3xl font-bold text-bc-text">
						Ready when you are
					</h1>
					<p class="mb-6 text-sm leading-relaxed text-bc-text-muted">Pick a path to get started.</p>

					<div class="flex flex-col gap-3 sm:flex-row">
						<button
							on:click={goIde}
							class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-bc-azure/90 px-5 py-3 text-[14px] font-medium text-bc-abyss transition hover:bg-bc-azure"
						>
							<Icon icon="mingcute:code-line" width="18" height="18" />
							Start with IDE
						</button>
						<button
							on:click={goAgents}
							class="glass-panel flex flex-1 items-center justify-center gap-2 rounded-lg border border-bc-mist/15 px-5 py-3 text-[14px] font-medium text-bc-text transition hover:border-bc-mist/30"
						>
							<Icon icon="mingcute:robot-line" width="18" height="18" />
							Start with agents
						</button>
					</div>
				{/if}
			</div>

			<!-- Footer with nav + step pips -->
			<div
				class="flex items-center justify-between border-t border-bc-mist/10 bg-bc-statusbar px-5 py-3"
			>
				<button
					on:click={prevStep}
					disabled={stepperState.step === 1}
					class="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-bc-text-muted transition-colors hover:bg-[rgb(var(--bc-tint)/5%)] hover:text-bc-text disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
				>
					<Icon icon="mingcute:arrow-left-line" width="14" height="14" />
					Back
				</button>

				<div class="flex items-center gap-1.5">
					{#each { length: totalSteps }, i (i)}
						<span
							class="h-1.5 w-1.5 rounded-full transition-colors duration-300 {i + 1 ===
							stepperState.step
								? 'bg-bc-azure'
								: 'bg-[rgb(var(--bc-tint)/15%)]'}"
						></span>
					{/each}
				</div>

				<div class="flex items-center gap-2">
					<button
						on:click={finish}
						class="rounded-md px-3 py-1.5 text-xs font-medium text-bc-icon transition-colors hover:text-bc-mist"
					>
						Skip
					</button>
					{#if stepperState.step < totalSteps}
						<button
							on:click={nextStep}
							class="inline-flex items-center gap-1.5 rounded-md bg-bc-azure px-3 py-1.5 text-xs font-medium text-bc-abyss transition-colors hover:bg-bc-azure/85"
						>
							Next
							<Icon icon="mingcute:arrow-right-line" width="14" height="14" />
						</button>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Step 3: helper tooltip pointing at the Ide sidebar button. -->
	{#if stepperState.step === 3}
		<div
			class="pointer-events-none fixed z-[60] ml-3 flex items-center"
			style="left: var(--width-sidebar); top: {ideTop}px; transform: translateY(-50%);"
		>
			<span class="h-2 w-2 rotate-45 bg-bc-mist"></span>
			<span
				class="-ml-1 flex items-center gap-2 rounded-md bg-bc-mist px-2.5 py-1 text-xs font-medium whitespace-nowrap text-bc-abyss shadow-lg"
			>
				Frameworks, ready in one click
			</span>
		</div>
	{/if}

	<!-- Step 4: helper tooltip pointing at the Agents sidebar button. -->
	{#if stepperState.step === 4}
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

	<!-- Step 5: helper tooltip pointing to the GitHub fork ribbon in the top-right corner. The
	     ribbon itself only mounts for this step (see ribbonAboveTour in +layout.svelte), so
	     `use:measureOnMount` re-measures it right as it appears, same as the backdrop does on open. -->
	{#if stepperState.step === 5}
		<div
			class="pointer-events-none fixed z-[60] flex items-center"
			style="top: {githubTop}px; right: {githubRight}px; transform: translateY(-50%);"
			use:measureOnMount
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
