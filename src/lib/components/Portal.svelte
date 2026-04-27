<script lang="ts">
	import Icon from '@iconify/svelte';
	import QRCode from 'qrcode';

	type PortalItem = { port: number; url: string };

	let {
		src = '',
		debug = false,
		portals = [] as PortalItem[],
		selectedPort = null as number | null,
		showMenu = false,
		showInfo = false,
		copied = false,
		qrError = '',
		qrCodeCanvas = null as HTMLCanvasElement | null,
		onPortChange,
		onToggleMenu,
		onCopyLink,
		onOpenNewTab,
		onShowQrCode,
		onCloseOverlays
	} = $props<{
		src?: string;
		debug?: boolean;
		portals?: PortalItem[];
		selectedPort?: number | null;
		showMenu?: boolean;
		showInfo?: boolean;
		copied?: boolean;
		qrError?: string;
		qrCodeCanvas?: HTMLCanvasElement | null;
		onPortChange?: (event: Event) => void;
		onToggleMenu?: () => void;
		onCopyLink?: () => void;
		onOpenNewTab?: () => void;
		onShowQrCode?: () => void;
		onCloseOverlays?: () => void;
	}>();

	let localQrCodeCanvas: HTMLCanvasElement | null = null;

	async function renderQRCode(url: string) {
		try {
			if (!localQrCodeCanvas) return;

			await QRCode.toCanvas(localQrCodeCanvas, url, {
				width: 150,
				margin: 0,
				errorCorrectionLevel: 'H',
				color: { dark: '#000000', light: '#ffffff' }
			});
		} catch (error) {
			console.error('Failed to generate QR code:', error);
			qrError = 'Unable to generate QR code';
		}
	}

	$effect(() => {
		if (showInfo && src && localQrCodeCanvas) {
			renderQRCode(src);
		}
	});
</script>

{#if portals.length > 0 || debug}
	<div class="flex h-full min-h-0 w-full min-w-0 flex-col">
		<!-- Header -->
		<div
			class="flex h-10 shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#111111] px-3"
		>
			<div class="flex items-center gap-2 text-[13px] text-white/35">
				<Icon icon="mingcute:eye-2-line" width="14" height="14" />
				<span class="font-medium tracking-wide">Preview</span>
			</div>

			{#if src}
				<div class="relative flex items-center gap-1.5">
					{#if portals.length > 1}
						<div class="relative">
							<select
								class="h-7 min-w-[72px] appearance-none rounded border border-white/10 bg-white/5 pr-5 pl-2 text-[12px] text-white/50 outline-none hover:border-white/20 hover:text-white/70"
								onchange={onPortChange}
								value={selectedPort ?? undefined}
								aria-label="Select portal port"
							>
								{#each portals as item (item.port)}
									<option value={item.port}>:{item.port}</option>
								{/each}
							</select>
							<div
								class="pointer-events-none absolute inset-y-0 right-1 flex items-center text-white/30"
							>
								<Icon icon="mingcute:down-line" width="10" height="10" />
							</div>
						</div>
					{/if}

					<button
						onclick={onToggleMenu}
						class="inline-flex cursor-pointer items-center gap-1 rounded border-none bg-transparent px-1.5 py-0.5 text-[12px] text-white/35 transition hover:text-white/70"
					>
						<Icon icon="mingcute:settings-2-line" width="13" height="13" />
						<span>{copied ? 'Copied!' : 'Portal'}</span>
					</button>

					{#if showMenu}
						<div
							class="absolute top-[calc(100%+4px)] right-0 z-30 min-w-[168px] rounded-lg border border-white/10 bg-[#111111] p-1 shadow-[0_12px_26px_rgba(0,0,0,0.55)]"
						>
							<button onclick={onCopyLink} class="flex w-full cursor-pointer items-center gap-2 rounded border-none bg-transparent px-2 py-1.5 text-left text-[12px] text-white/70 transition-colors hover:bg-white/[0.06]">
								<Icon icon="mingcute:copy-2-line" width="13" height="13" />
								Copy link
							</button>
							<button onclick={onOpenNewTab} class="flex w-full cursor-pointer items-center gap-2 rounded border-none bg-transparent px-2 py-1.5 text-left text-[12px] text-white/70 transition-colors hover:bg-white/[0.06]">
								<Icon icon="mingcute:external-link-line" width="13" height="13" />
								Open in new tab
							</button>
							<button onclick={onShowQrCode} class="flex w-full cursor-pointer items-center gap-2 rounded border-none bg-transparent px-2 py-1.5 text-left text-[12px] text-white/70 transition-colors hover:bg-white/[0.06]">
								<Icon icon="mingcute:qrcode-2-line" width="13" height="13" />
								Show QR code
							</button>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Content -->
		{#if src}
			<div class="relative min-h-0 flex-1">
				<iframe
					{src}
					id="portal"
					title="Portal content"
					class="h-full min-h-0 w-full border-none bg-white"
				></iframe>

				{#if showInfo}
					<div
						class="absolute inset-0 z-30 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-md"
					>
						<button
							onclick={onCloseOverlays}
							class="absolute top-3 right-3 inline-flex cursor-pointer items-center gap-1 rounded border-none bg-white/8 px-2 py-1 text-[12px] font-medium text-white/70 transition hover:bg-white/14"
						>
							<Icon icon="mingcute:close-line" width="13" height="13" />
							Dismiss
						</button>

						<div class="rounded-lg bg-white p-2 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
							<canvas bind:this={localQrCodeCanvas} width="150" height="150"></canvas>
						</div>

						{#if qrError}
							<div class="mt-3 text-center text-[12px] text-rose-300/90">{qrError}</div>
						{:else}
							<div class="mt-3 max-w-[200px] truncate text-center text-[12px] text-white/40">
								{src}
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{:else if debug}
			<div class="flex h-full w-full items-center justify-center text-[12px] text-white/20">
				Portal debug mode (no URL)
			</div>
		{/if}
	</div>
{/if}
