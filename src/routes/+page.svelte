<script lang="ts">
	import Icon from '@iconify/svelte';
	import favicon from '$lib/assets/favicon.svg';
	import browserpodLogo from '$lib/assets/browserpod.svg';
	import heroDust from '$lib/assets/hero-dust.webp';
	import BrowserCodeLogo from '$lib/components/BrowserCodeLogo.svelte';
	import { aboutPanelState } from '$lib/stores/aboutPanel.svelte';

	function goAgents() {
		window.location.href = '/agents';
	}

	function goIde() {
		window.location.href = '/ide';
	}

	let panelScroll = $state<HTMLDivElement>();
	let logoComp = $state<BrowserCodeLogo>();

	function openPanel() {
		aboutPanelState.open = true;
	}

	function closePanel() {
		aboutPanelState.open = false;
	}

	// Scrolls back to the top on every close, however it's triggered — the Escape key, the wheel,
	// this page's own close button, or the shared scrim in +layout.svelte (which closes the panel
	// directly via the store, with no reference to panelScroll of its own).
	$effect(() => {
		if (!aboutPanelState.open && panelScroll) panelScroll.scrollTop = 0;
	});

	function replayLogo() {
		logoComp?.replay();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && aboutPanelState.open) closePanel();
	}

	// Wheel needs `{ passive: false }` to preventDefault (block the native scroll while driving the
	// panel open/closed instead) — Svelte's onwheel attribute can't opt out of passive listening.
	function wheelControl(node: HTMLElement) {
		function onWheel(e: WheelEvent) {
			if (!aboutPanelState.open) {
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

	// ── Hero dust texture: a faint grain backdrop with a soft spotlight that follows the pointer.
	let dustSpotEl = $state<HTMLDivElement>();
	let lightX = $state(-999);
	let lightY = $state(-999);
	let lightOn = $state(false);
	let dustRaf = 0;

	function handleDustMove(e: MouseEvent) {
		if (dustRaf) return;
		const cx = e.clientX;
		const cy = e.clientY;
		dustRaf = requestAnimationFrame(() => {
			dustRaf = 0;
			const r = dustSpotEl?.getBoundingClientRect();
			if (!r) return;
			lightX = Math.round(cx - r.left);
			lightY = Math.round(cy - r.top);
			lightOn = true;
		});
	}
	function handleDustLeave() {
		lightOn = false;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="bc-page-bg relative h-full w-full overflow-hidden text-bc-mist" use:wheelControl>
	<!-- ── Section 1: hero — fills the viewport; scales/dims when the About panel opens ── -->
	<section
		onmousemove={handleDustMove}
		onmouseleave={handleDustLeave}
		role="presentation"
		class="absolute inset-0 flex flex-col items-center justify-center overflow-hidden px-6 py-16 text-center"
		style="transform-origin: center 42%; transition: transform 0.55s cubic-bezier(0.22,1,0.36,1), filter 0.55s ease; transform: {aboutPanelState.open
			? 'scale(0.94)'
			: 'scale(1)'}; filter: {aboutPanelState.open ? 'brightness(0.72)' : 'brightness(1)'};"
	>
		<div class="bc-hero-dust" aria-hidden="true" style="background-image: url({heroDust})"></div>
		<div
			bind:this={dustSpotEl}
			class="bc-hero-dust bc-hero-dust-spot"
			aria-hidden="true"
			style="background-image: url({heroDust}); --lx: {lightX}px; --ly: {lightY}px; opacity: {lightOn
				? 0.55
				: 0}"
		></div>

		<div class="flex flex-col items-center">
			<button
				type="button"
				onclick={replayLogo}
				aria-label="BrowserCode — replay logo animation"
				class="mb-6 cursor-pointer border-0 bg-transparent p-0"
			>
				<BrowserCodeLogo bind:this={logoComp} size={74} />
			</button>

			<h1
				class="mb-4 max-w-2xl font-display text-4xl font-bold tracking-tight text-bc-text sm:text-5xl"
			>
				Start <span class="text-bc-orchid">coding</span> right here, in your
				<span class="text-bc-azure">browser</span> tab<span class="text-bc-green">.</span>
			</h1>

			<p class="mb-8 max-w-md text-[15px] leading-relaxed text-bc-mist">
				BrowserCode is a browser-based playground for fast-prototyping full-stack apps and sharing
				them instantly.
			</p>

			<div class="grid w-full max-w-xl gap-3 sm:grid-cols-2">
				<button
					onclick={goIde}
					style="background: rgb(var(--bc-tint) / 4%)"
					class="glass-panel group flex flex-col gap-3 rounded-xl border border-bc-tint/30 p-4 text-left transition hover:border-bc-tint/45"
				>
					<div class="flex items-center justify-between">
						<span
							class="flex h-9 w-9 items-center justify-center rounded-lg bg-bc-tint/8 text-bc-text"
						>
							<Icon icon="mingcute:code-line" width="20" height="20" />
						</span>
						<Icon
							icon="mingcute:arrow-right-line"
							width="16"
							height="16"
							class="text-bc-text-muted transition group-hover:translate-x-0.5 group-hover:text-bc-text"
						/>
					</div>
					<div>
						<div class="text-[14px] font-medium text-bc-text">IDE for popular frameworks</div>
						<div class="mt-0.5 text-[12.5px] leading-relaxed text-bc-mist">
							A full editor with terminal and live previews
						</div>
					</div>
				</button>
				<button
					onclick={goAgents}
					style="background: rgb(var(--bc-tint) / 4%)"
					class="glass-panel group flex flex-col gap-3 rounded-xl border border-bc-tint/20 p-4 text-left transition hover:border-bc-tint/35"
				>
					<div class="flex items-center justify-between">
						<span
							class="flex h-9 w-9 items-center justify-center rounded-lg bg-bc-tint/8 text-bc-text"
						>
							<Icon icon="mingcute:robot-line" width="20" height="20" />
						</span>
						<Icon
							icon="mingcute:arrow-right-line"
							width="16"
							height="16"
							class="text-bc-text-muted transition group-hover:translate-x-0.5 group-hover:text-bc-text"
						/>
					</div>
					<div>
						<div class="text-[14px] font-medium text-bc-text">Run coding agents</div>
						<div class="mt-0.5 text-[12.5px] leading-relaxed text-bc-mist">
							Claude Code and Codex CLI, sandboxed in your browser
						</div>
					</div>
				</button>
			</div>

			<p class="mt-6 max-w-md text-[12px] leading-relaxed text-bc-text-muted">
				A multi-language WebAssembly sandbox (Node.js, Rust, and Python in preview) with no
				installs, no servers, no cloud compute.
			</p>
		</div>

		<button
			onclick={openPanel}
			class="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5 text-[11.5px] text-bc-text-muted transition-colors duration-150 hover:text-bc-mist"
		>
			Learn more
			<Icon icon="mingcute:down-line" width="16" height="16" class="animate-bounce" />
		</button>
	</section>

	<!-- ── Section 2: about — slides up as a window over the hero ─────────────────────── -->
	<div
		class="panel-sheet absolute inset-x-0 top-9 bottom-0 z-20 flex flex-col overflow-hidden rounded-t-[20px] border-t border-bc-border"
		style="transform: translateY({aboutPanelState.open
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
			<span class="h-[5px] w-11 rounded-full bg-bc-mist/28 transition group-hover:bg-bc-mist/45"
			></span>
		</button>

		<div bind:this={panelScroll} class="flex-1 overflow-y-auto">
			<section id="about" class="mx-auto w-full max-w-3xl px-6 pt-0 pb-16">
				<img src={favicon} alt="BrowserCode" class="bc-logo-mark mb-5 h-12 w-12" />

				<h2 class="mb-4 font-display text-3xl font-bold text-bc-text">What is BrowserCode?</h2>

				<p class="mb-4 text-[14.5px] leading-relaxed text-bc-mist">
					BrowserCode is a web-based IDE and AI coding agent playground that works entirely inside
					your browser tab. There's nothing to install and nothing running on a server somewhere:
					every terminal, filesystem, and dev server lives in a sandboxed WebAssembly environment on
					your machine.
				</p>

				<p class="mb-4 text-[14.5px] leading-relaxed text-bc-mist">
					It ships two experiences: a <span class="text-bc-text">playground IDE</span> with an
					editor, file tree, terminals, and live preview for popular frameworks, and a set of
					<span class="text-bc-text">AI coding CLIs</span>
					that you can run unmodified, with real file access and networking, without touching your local
					machine, including Claude Code and Codex CLI today, with more on the way.
				</p>

				<p class="mb-10 text-[14.5px] leading-relaxed text-bc-mist">
					Both are built on
					<a
						href="https://browserpod.io"
						target="_blank"
						rel="noopener noreferrer"
						class="font-medium text-bc-text underline decoration-bc-tint/20 underline-offset-2 transition-colors hover:text-bc-link-hover hover:decoration-bc-link-hover"
					>
						BrowserPod
					</a>, a sandboxed multi-language runtime compiled to WebAssembly with a persistent
					filesystem, POSIX CLI tools (bash, git, npm), and instant app previews through portal
					URLs.
				</p>

				<div class="mb-2 text-[11px] font-medium tracking-widest text-bc-mist uppercase">
					Get involved
				</div>
				<div class="grid gap-2.5 sm:grid-cols-3">
					<a
						href="https://github.com/leaningtech/browsercode"
						target="_blank"
						rel="noopener noreferrer"
						class="glass-panel group flex flex-col gap-2 rounded-lg border border-bc-border px-4 py-3.5 transition hover:border-bc-tint/24"
					>
						<div class="flex items-center justify-between">
							<Icon icon="simple-icons:github" width="20" height="20" class="text-bc-text" />
							<Icon
								icon="mingcute:arrow-right-up-line"
								width="14"
								height="14"
								class="text-bc-text-muted transition-colors duration-150 group-hover:text-bc-mist"
							/>
						</div>
						<div>
							<div class="text-[13px] font-medium text-bc-text">GitHub</div>
							<div class="text-[11.5px] text-bc-text-muted">
								Star the repo, open issues, or send a PR
							</div>
						</div>
					</a>
					<a
						href="https://discord.leaningtech.com"
						target="_blank"
						rel="noopener noreferrer"
						class="glass-panel group flex flex-col gap-2 rounded-lg border border-bc-border px-4 py-3.5 transition hover:border-bc-tint/24"
					>
						<div class="flex items-center justify-between">
							<Icon icon="simple-icons:discord" width="20" height="20" class="text-bc-text" />
							<Icon
								icon="mingcute:arrow-right-up-line"
								width="14"
								height="14"
								class="text-bc-text-muted transition-colors duration-150 group-hover:text-bc-mist"
							/>
						</div>
						<div>
							<div class="text-[13px] font-medium text-bc-text">Discord</div>
							<div class="text-[11.5px] text-bc-text-muted">
								Ask questions and chat with the team
							</div>
						</div>
					</a>
					<a
						href="https://browserpod.io"
						target="_blank"
						rel="noopener noreferrer"
						class="glass-panel group flex flex-col gap-2 rounded-lg border border-bc-border px-4 py-3.5 transition hover:border-bc-tint/24"
					>
						<div class="flex items-center justify-between">
							<img src={browserpodLogo} alt="" class="bc-mono-icon h-5 w-5 opacity-70 grayscale" />
							<Icon
								icon="mingcute:arrow-right-up-line"
								width="14"
								height="14"
								class="text-bc-text-muted transition-colors duration-150 group-hover:text-bc-mist"
							/>
						</div>
						<div>
							<div class="text-[13px] font-medium text-bc-text">BrowserPod</div>
							<div class="text-[11.5px] text-bc-text-muted">The WebAssembly sandbox underneath</div>
						</div>
					</a>
				</div>
			</section>
		</div>
	</div>
</div>
