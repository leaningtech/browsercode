<script lang="ts">
	import { onDestroy } from 'svelte';
	import Icon from '@iconify/svelte';
	import QRCode from 'qrcode';
	import type { PortalState } from '$lib/stores/portals.svelte';

	type Props = {
		portal: PortalState;
		/** Awaited before a reload, so a debounced editor save cannot be outrun by it. */
		onBeforeReload?: () => Promise<void>;
		/** Collapses the pane; omitted by hosts with nowhere to collapse to. */
		onCollapse?: () => void;
	};

	let { portal, onBeforeReload, onCollapse }: Props = $props();

	/** Matches the sweep animation below. */
	const SWEEP_MS = 620;
	/** Fills the QR panel's content column exactly; `.qr-plate` supplies the quiet zone. */
	const QR_PX = 160;

	let localQrCodeCanvas = $state<HTMLCanvasElement | null>(null);
	let frameEl = $state<HTMLIFrameElement | null>(null);
	let toolbarEl = $state<HTMLElement | null>(null);
	let sweeping = $state(false);
	let sweepId = $state(0);
	let sweepTimer: ReturnType<typeof setTimeout>;

	let hasChoice = $derived(portal.portals.length > 1);
	let anyOverlay = $derived(portal.showMenu || portal.showPorts || portal.showInfo);

	/**
	 * `location.reload()` is not cross-origin accessible; `replace()` is, and unlike re-setting
	 * `src` it adds no entry to the joint session history.
	 */
	async function reloadFrame(): Promise<void> {
		if (!frameEl?.contentWindow) return;
		portal.closeOverlays();
		await onBeforeReload?.();
		frameEl.contentWindow.location.replace(portal.url);
		sweepId++;
		sweeping = true;
		clearTimeout(sweepTimer);
		sweepTimer = setTimeout(() => (sweeping = false), SWEEP_MS);
	}

	async function renderQRCode(url: string): Promise<void> {
		try {
			if (!localQrCodeCanvas) return;

			await QRCode.toCanvas(localQrCodeCanvas, url, {
				width: QR_PX,
				margin: 0,
				errorCorrectionLevel: 'H',
				color: { dark: '#000000', light: '#ffffff' }
			});
			// Clears a message left by an earlier failure; this render replaced that canvas.
			portal.reportQrResult(null);
		} catch (error) {
			console.error('Failed to generate QR code:', error);
			portal.reportQrResult('Unable to generate QR code');
		}
	}

	$effect(() => {
		if (portal.showInfo && portal.url && localQrCodeCanvas) {
			renderQRCode(portal.url);
		}
	});

	// `pointerdown`, not `click`: a row that closes its own menu is gone from the DOM by the time
	// a click reaches the window. `blur` catches clicks into the iframe, which raise no event here.
	$effect(() => {
		if (!anyOverlay) return;
		const dismiss = (event: PointerEvent): void => {
			if (toolbarEl?.contains(event.target as Node)) return;
			portal.closeOverlays();
		};
		const onKey = (event: KeyboardEvent): void => {
			if (event.key === 'Escape') portal.closeOverlays();
		};
		const onBlur = (): void => portal.closeOverlays();
		window.addEventListener('pointerdown', dismiss);
		window.addEventListener('keydown', onKey);
		window.addEventListener('blur', onBlur);
		return () => {
			window.removeEventListener('pointerdown', dismiss);
			window.removeEventListener('keydown', onKey);
			window.removeEventListener('blur', onBlur);
		};
	});

	onDestroy(() => clearTimeout(sweepTimer));
</script>

{#if portal.portals.length > 0}
	<div class="flex h-full min-h-0 w-full min-w-0 flex-col">
		<!-- Controls stay left so the fixed promo ribbon keeps the corner. -->
		<div
			bind:this={toolbarEl}
			class="relative flex h-8 shrink-0 items-center gap-0.5 border-b border-bc-mist/10 bg-bc-navy px-1"
		>
			{#if onCollapse}
				<button
					onclick={onCollapse}
					class="tool-btn"
					title="Hide preview"
					aria-label="Hide preview"
				>
					<Icon icon="mingcute:right-line" width="14" height="14" />
				</button>
				<span class="tool-sep"></span>
			{/if}

			{#if portal.url}
				<div class="relative">
					<button
						onclick={portal.togglePorts}
						disabled={!hasChoice}
						aria-expanded={hasChoice ? portal.showPorts : undefined}
						aria-label={hasChoice ? 'Switch preview port' : undefined}
						title={hasChoice ? 'Switch port' : undefined}
						class="port-plate"
					>
						<span class="inline-flex items-baseline gap-1.5">
							<span class="text-[10px] tracking-wide text-white/40">port</span>
							<span class="font-mono text-[11px] font-medium tracking-tight tabular-nums"
								>{portal.selectedPort}</span
							>
						</span>
						{#if hasChoice}
							<Icon icon="mingcute:down-line" width="9" height="9" class="opacity-50" />
						{/if}
					</button>

					{#if portal.showPorts}
						<div class="portal-menu left-0 min-w-28">
							{#each portal.portals as item (item.port)}
								<button
									onclick={() => portal.selectPort(item.port)}
									class="menu-row {item.port === portal.selectedPort ? 'text-bc-mist' : ''}"
								>
									<span class="font-mono text-[11px] tabular-nums">{item.port}</span>
									{#if item.port === portal.selectedPort}
										<Icon icon="mingcute:check-line" width="12" height="12" class="ml-auto" />
									{/if}
								</button>
							{/each}
						</div>
					{/if}
				</div>

				<span class="tool-sep"></span>

				<button
					onclick={reloadFrame}
					class="tool-btn"
					title="Reload preview"
					aria-label="Reload preview"
				>
					<Icon icon="mingcute:refresh-2-line" width="14" height="14" />
				</button>
				<button
					onclick={portal.openInNewTab}
					class="tool-btn"
					title="Open in new tab"
					aria-label="Open preview in new tab"
				>
					<Icon icon="mingcute:external-link-line" width="14" height="14" />
				</button>

				<div class="relative">
					<button
						onclick={portal.toggleMenu}
						aria-expanded={portal.showMenu}
						class="tool-btn"
						title="More"
						aria-label="More preview actions"
					>
						<Icon icon="mingcute:more-1-line" width="14" height="14" />
					</button>

					{#if portal.showMenu}
						<div class="portal-menu left-0 min-w-38">
							<button
								onclick={portal.copyUrl}
								class="menu-row {portal.copied ? 'text-bc-mist' : ''}"
							>
								<Icon
									icon={portal.copied ? 'mingcute:check-line' : 'mingcute:copy-2-line'}
									width="13"
									height="13"
								/>
								{portal.copied ? 'Copied' : 'Copy link'}
							</button>
							<button onclick={portal.showQRCode} class="menu-row">
								<Icon icon="mingcute:qrcode-2-line" width="13" height="13" />
								Show QR code
							</button>
						</div>
					{/if}
				</div>
				{#if portal.showInfo}
					<div class="portal-menu qr-panel left-1">
						<div class="qr-head">
							<span class="qr-title text-[11px] text-white/55">Scan the QR code</span>
							<button
								onclick={portal.closeOverlays}
								class="tool-btn -mr-1.5"
								title="Close"
								aria-label="Close QR code"
							>
								<Icon icon="mingcute:close-line" width="13" height="13" />
							</button>
						</div>

						{#if portal.qrError}
							<p class="mb-2 text-center text-[11px] text-bc-coral">{portal.qrError}</p>
						{/if}
						<div
							class="qr-plate"
							class:hidden={!!portal.qrError}
							role="img"
							aria-label="QR code for the preview URL"
						>
							<canvas bind:this={localQrCodeCanvas} width={QR_PX} height={QR_PX} class="block"
							></canvas>
						</div>

						<!-- eslint-disable svelte/no-navigation-without-resolve -->
						<a
							href={portal.url}
							target="_blank"
							rel="noopener noreferrer"
							class="qr-link font-mono text-[10px] break-all"
						>
							{portal.url}
						</a>
						<!-- eslint-enable svelte/no-navigation-without-resolve -->
					</div>
				{/if}
			{/if}

			{#if sweeping}
				{#key sweepId}
					<div class="sweep"></div>
				{/key}
			{/if}
		</div>

		<!-- Content -->
		{#if portal.url}
			<div class="relative min-h-0 flex-1">
				<!-- Mounts once the dev server answers; an early navigation hangs and stays blank. -->
				{#if portal.frameStatus !== 'waiting'}
					<iframe
						src={portal.url}
						id="portal"
						title="Portal content"
						bind:this={frameEl}
						onload={portal.reportFrameLoaded}
						class="h-full min-h-0 w-full border-none {portal.frameStatus === 'ready'
							? 'bg-white'
							: 'bg-bc-navy'}"
					></iframe>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	.tool-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		flex-shrink: 0;
		border: none;
		border-radius: 4px;
		background: transparent;
		color: rgba(255, 255, 255, 0.38);
		cursor: pointer;
		transition:
			color 0.14s ease,
			background 0.14s ease;
	}
	.tool-btn:hover {
		background: rgba(255, 255, 255, 0.06);
		color: rgba(255, 255, 255, 0.78);
	}

	.tool-sep {
		width: 1px;
		height: 14px;
		flex-shrink: 0;
		margin: 0 3px;
		background: color-mix(in srgb, var(--color-bc-mist) 14%, transparent);
	}

	.port-plate {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		height: 22px;
		padding: 0 7px;
		border: none;
		border-radius: 4px;
		background: transparent;
		color: rgba(255, 255, 255, 0.72);
		font: inherit;
		cursor: default;
		transition:
			color 0.14s ease,
			background 0.14s ease;
	}
	.port-plate:enabled {
		cursor: pointer;
	}
	.port-plate:enabled:hover {
		background: rgba(255, 255, 255, 0.06);
		color: #fff;
	}

	.portal-menu {
		position: absolute;
		top: calc(100% + 5px);
		z-index: 30;
		padding: 4px;
		border-radius: 8px;
		border: 1px solid color-mix(in srgb, var(--color-bc-mist) 15%, transparent);
		background-color: var(--color-bc-navy);
		background-image: linear-gradient(155deg, rgba(74, 125, 255, 0.16), transparent 65%);
		box-shadow: 0 12px 26px rgba(0, 0, 0, 0.55);
	}

	/* Padding lives here because the scoped .portal-menu rule outranks a Tailwind utility. */
	.qr-panel {
		width: 200px;
		padding: 12px;
	}

	.qr-head {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		margin-bottom: 8px;
	}

	.qr-title {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.qr-plate {
		margin-bottom: 8px;
		padding: 8px;
		border-radius: 6px;
		background: #fff;
		box-shadow:
			0 0 0 1px color-mix(in srgb, var(--color-bc-azure) 30%, transparent),
			0 6px 16px rgba(0, 0, 0, 0.4);
	}

	.qr-link {
		display: block;
		padding: 6px 8px;
		border-radius: 6px;
		background: rgba(2, 9, 20, 0.5);
		color: rgba(255, 255, 255, 0.55);
		line-height: 1.5;
		text-align: center;
		transition:
			color 0.14s ease,
			background 0.14s ease;
	}
	.qr-link:hover {
		background: rgba(2, 9, 20, 0.72);
		color: var(--color-bc-mist);
	}
	.qr-link:focus-visible {
		outline: 1px solid color-mix(in srgb, var(--color-bc-azure) 70%, transparent);
		outline-offset: 1px;
	}

	.menu-row {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 6px 8px;
		border: none;
		border-radius: 4px;
		background: transparent;
		color: rgba(255, 255, 255, 0.7);
		font: inherit;
		font-size: 12px;
		text-align: left;
		cursor: pointer;
		transition: background 0.12s ease;
	}
	.menu-row:hover {
		background: color-mix(in srgb, var(--color-bc-azure) 10%, transparent);
		color: #fff;
	}

	.sweep {
		position: absolute;
		left: 0;
		bottom: -1px;
		height: 1px;
		width: 100%;
		pointer-events: none;
		background: linear-gradient(90deg, transparent, var(--color-bc-azure), transparent);
		animation: sweep 620ms cubic-bezier(0.4, 0, 0.2, 1);
	}
	@keyframes sweep {
		0% {
			transform: translateX(-100%);
			opacity: 0;
		}
		12%,
		88% {
			opacity: 1;
		}
		100% {
			transform: translateX(100%);
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.sweep {
			animation: none;
			opacity: 1;
		}
	}
</style>
