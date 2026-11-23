export type TabLock = {
	/** Resolves true once this tab holds the exclusive lock, false if another tab already does. */
	acquired: Promise<boolean>;
	/** Resolves once this tab holds the lock, whether on the first request or after `takeOver`. */
	held: Promise<void>;
	/** Asks the tab holding the lock to give it up; false when it hasn't in time. */
	takeOver: () => Promise<boolean>;
	/** Releases the lock so another tab can claim it. Safe to call even if never acquired. */
	release: () => void;
};

/** Long enough for the holder to unload; a request it ignores would otherwise wait until it closes. */
const TAKE_OVER_TIMEOUT_MS = 5000;

/**
 * Claims an exclusive, tab-lifetime lock so only one browser tab can hold `name` at a time —
 * used to stop two tabs from booting the same agent against the same BrowserPod storage key.
 * Falls back to always-acquired when the Web Locks API isn't available, so unsupported browsers
 * fail open instead of being blocked by a check they can't run.
 *
 * Waits (rather than failing instantly) for `graceMs` before concluding another tab holds the
 * lock: on a reload/navigation, the previous tab's lock release and this tab's request can race,
 * and a plain `ifAvailable` check would misreport that race as "another tab is open".
 *
 * Another tab's `takeOver` calls `onTakenOver` here, which must tear the session down by unloading
 * the page: the lock only passes on once this document is gone, so the two sessions never overlap.
 */
export function requestSingleTabLock(
	name: string,
	onTakenOver: () => void,
	graceMs = 500
): TabLock {
	if (typeof navigator === 'undefined' || !navigator.locks) {
		return {
			acquired: Promise.resolve(true),
			held: Promise.resolve(),
			takeOver: () => Promise.resolve(true),
			release: () => {}
		};
	}

	let release: () => void = () => {};
	const released = new Promise<void>((resolve) => {
		release = resolve;
	});
	let markHeld: () => void = () => {};
	const held = new Promise<void>((resolve) => {
		markHeld = resolve;
	});
	const channel = new BroadcastChannel(`tab-lock:${name}`);

	async function hold(): Promise<void> {
		markHeld();
		const since = Date.now();
		// A request sent before this tab held the lock was meant for the previous holder.
		channel.onmessage = (event: MessageEvent<number>) => {
			if (event.data >= since) onTakenOver();
		};
		await released;
	}

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), graceMs);

	const acquired = new Promise<boolean>((resolveAcquired) => {
		navigator.locks
			.request(name, { mode: 'exclusive', signal: controller.signal }, async (lock) => {
				clearTimeout(timeoutId);
				resolveAcquired(lock !== null);
				if (lock !== null) {
					await hold();
				}
			})
			.catch((err: unknown) => {
				const isTimeout = err instanceof DOMException && err.name === 'AbortError';
				// Timed out waiting => another tab genuinely still holds it. Anything else is an
				// error we can't diagnose, so fail open rather than block booting on it.
				resolveAcquired(!isTimeout);
			});
	});

	return {
		acquired,
		held,
		takeOver: () =>
			new Promise<boolean>((resolve) => {
				navigator.locks
					.request(
						name,
						{ mode: 'exclusive', signal: AbortSignal.timeout(TAKE_OVER_TIMEOUT_MS) },
						() => {
							resolve(true);
							return hold();
						}
					)
					.catch(() => resolve(false));
				// query() runs on the same lock queue as the request above, so once it settles this
				// tab is queued ahead of the holder's reload, which would otherwise race it for the lock.
				void navigator.locks.query().then(() => channel.postMessage(Date.now()));
			}),
		release: () => {
			clearTimeout(timeoutId);
			channel.close();
			release();
		}
	};
}
