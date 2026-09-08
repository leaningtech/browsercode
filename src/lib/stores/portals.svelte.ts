import type { PortalUpdate } from '$lib/pod/portals';

/** A live preview target as rendered by Portal.svelte's port selector. */
export type PortalItem = { port: number; url: string };

/**
 * How far the preview frame has got with the selected portal. `waiting` keeps the iframe unmounted
 * until the dev server answers, `loading` while its document arrives, `ready` once it has painted.
 */
export type FrameStatus = 'waiting' | 'loading' | 'ready';

export type PortalStateOptions = {
	/**
	 * When it returns a port, only that port is auto-selected for the preview (frameworks with
	 * a declared appPort); other ports stay reachable through the port selector. When it returns
	 * undefined (agents, GitHub repos), every new active portal takes over the preview.
	 */
	preferredPort?: () => number | undefined;
	/** Fires after a portal becomes active, with the new portal count (agents: auto-show/switch). */
	onActivate?: (count: number) => void;
	/** Fires when the last portal goes away (agents: auto-hide the preview pane). */
	onEmpty?: () => void;
};

/**
 * The portal controller shared by the IDE shell and the agents page: holds the live portal
 * list plus the preview-header UI state (menu, QR panel, copied flash), and folds BrowserPod
 * portal events into them. Handlers are arrow-function fields so they can be passed straight
 * to Portal.svelte as props. Host-specific behaviour stays in the host via the options hooks.
 */
export class PortalState {
	portals = $state<PortalItem[]>([]);
	selectedPort = $state<number | null>(null);
	/** Preview URL of the selected portal; '' when none. */
	url = $state('');
	frameStatus = $state<FrameStatus>('waiting');
	showMenu = $state(false);
	showPorts = $state(false);
	showInfo = $state(false);
	copied = $state(false);
	qrError = $state('');

	private copiedTimeout: ReturnType<typeof setTimeout> | undefined;
	/** Fallback for a `load` that never fires. */
	private frameReadyTimer: ReturnType<typeof setTimeout> | undefined;

	constructor(private options: PortalStateOptions = {}) {}

	/** Folds a BrowserPod portal event into the list and the current selection. */
	apply = (update: PortalUpdate): void => {
		const next = [...this.portals];
		const idx = next.findIndex((item) => item.port === update.port);

		if (update.active && update.url) {
			if (idx >= 0) next[idx] = { port: update.port, url: update.url };
			else next.push({ port: update.port, url: update.url });
			next.sort((a, b) => a.port - b.port);
			this.portals = next;

			const preferred = this.options.preferredPort?.();
			if (preferred === undefined || update.port === preferred || this.selectedPort === null)
				this.selectUrl(update.port, update.url);
			this.options.onActivate?.(next.length);
			return;
		}

		if (idx >= 0) next.splice(idx, 1);
		this.portals = next;

		if (
			this.selectedPort === update.port ||
			!next.some((item) => item.port === this.selectedPort)
		) {
			const fallback = next[0];
			this.selectUrl(fallback?.port ?? null, fallback?.url ?? '');
		}
		if (next.length === 0) this.options.onEmpty?.();
	};

	selectPort = (port: number): void => {
		this.selectUrl(port, this.portals.find((item) => item.port === port)?.url ?? '');
		this.closeOverlays();
	};

	/**
	 * Points the preview at a port. Unchanged URLs return early so a re-emitted portal does not
	 * restart the wait.
	 */
	private selectUrl(port: number | null, url: string): void {
		this.selectedPort = port;
		if (url === this.url) return;
		this.url = url;
		// Unmount while waiting, so the frame re-navigates once this URL is ready.
		this.frameStatus = 'waiting';
		clearTimeout(this.frameReadyTimer);
		if (url) void this.showFrameWhenServing(url);
	}

	toggleMenu = (): void => {
		this.showMenu = !this.showMenu;
		this.clearCopied();
		if (this.showMenu) {
			this.showPorts = false;
			this.showInfo = false;
		}
	};

	togglePorts = (): void => {
		this.showPorts = !this.showPorts;
		if (this.showPorts) {
			this.showMenu = false;
			this.showInfo = false;
		}
	};

	closeOverlays = (): void => {
		this.showMenu = false;
		this.showPorts = false;
		this.showInfo = false;
		this.clearCopied();
		this.qrError = '';
	};

	/** The pending timer would otherwise close a later menu. */
	private clearCopied(): void {
		clearTimeout(this.copiedTimeout);
		this.copied = false;
	}

	showQRCode = (): void => {
		if (!this.url) return;
		this.showMenu = false;
		this.showPorts = false;
		this.showInfo = true;
	};

	/** Records what Portal.svelte's QR render reported; it owns the canvas, this owns the message. */
	reportQrResult = (error: string | null): void => {
		this.qrError = error ?? '';
	};

	openInNewTab = (): void => {
		if (!this.url) return;
		this.showMenu = false;
		window.open(this.url, '_blank', 'noopener,noreferrer');
	};

	copyUrl = async (): Promise<void> => {
		if (!this.url) return;
		await navigator.clipboard.writeText(this.url);
		this.copied = true;
		clearTimeout(this.copiedTimeout);
		this.copiedTimeout = setTimeout(() => {
			this.copied = false;
			this.showMenu = false;
		}, 1200);
	};

	/** Reports that the framed document loaded. Ignored unless that frame is still the current one. */
	reportFrameLoaded = (): void => {
		if (this.frameStatus !== 'loading') return;
		clearTimeout(this.frameReadyTimer);
		this.frameStatus = 'ready';
	};

	/** Clears timers and stops any pending wait. */
	dispose = (): void => {
		clearTimeout(this.copiedTimeout);
		clearTimeout(this.frameReadyTimer);
		this.url = '';
		this.frameStatus = 'waiting';
	};

	/** Polls until the dev server answers, then shows the frame. Shows it anyway once out of tries. */
	private async showFrameWhenServing(url: string): Promise<void> {
		for (let attempt = 0; attempt < PROBE_ATTEMPTS; attempt++) {
			if (this.url !== url) return; // selection moved on
			if (await serving(url)) break;
			await new Promise((resolve) => setTimeout(resolve, PROBE_INTERVAL_MS));
		}
		if (this.url !== url) return;
		this.frameStatus = 'loading';
		// Advance anyway if `load` never fires, so the loader cannot stick.
		this.frameReadyTimer = setTimeout(() => (this.frameStatus = 'ready'), FRAME_READY_DEADLINE_MS);
	}
}

const PROBE_INTERVAL_MS = 1000;
/** A real response takes under a second; a starting server holds the connection ~2.5min. */
const PROBE_TIMEOUT_MS = 5000;
const PROBE_ATTEMPTS = 60;
const FRAME_READY_DEADLINE_MS = 8000;

/** True once the dev server answers. Bounded: a starting server can accept and never reply. */
async function serving(url: string): Promise<boolean> {
	const abort = new AbortController();
	const timer = setTimeout(() => abort.abort(), PROBE_TIMEOUT_MS);
	try {
		await fetch(url, { mode: 'no-cors', cache: 'no-store', signal: abort.signal });
		return true;
	} catch {
		return false;
	} finally {
		clearTimeout(timer);
	}
}
