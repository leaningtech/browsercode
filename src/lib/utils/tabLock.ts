export type TabLock = {
	/** Resolves true once this tab holds the exclusive lock, false if another tab already does. */
	acquired: Promise<boolean>;
	/** Releases the lock so another tab can claim it. Safe to call even if never acquired. */
	release: () => void;
};

/**
 * Claims an exclusive, tab-lifetime lock so only one browser tab can hold `name` at a time —
 * used to stop two tabs from booting the same agent against the same BrowserPod storage key.
 * Falls back to always-acquired when the Web Locks API isn't available, so unsupported browsers
 * fail open instead of being blocked by a check they can't run.
 *
 * Waits (rather than failing instantly) for `graceMs` before concluding another tab holds the
 * lock: on a reload/navigation, the previous tab's lock release and this tab's request can race,
 * and a plain `ifAvailable` check would misreport that race as "another tab is open".
 */
export function requestSingleTabLock(name: string, graceMs = 500): TabLock {
	if (typeof navigator === 'undefined' || !navigator.locks) {
		return { acquired: Promise.resolve(true), release: () => {} };
	}

	let release: () => void = () => {};
	const held = new Promise<void>((resolve) => {
		release = resolve;
	});

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), graceMs);

	const acquired = new Promise<boolean>((resolveAcquired) => {
		navigator.locks
			.request(name, { mode: 'exclusive', signal: controller.signal }, async (lock) => {
				clearTimeout(timeoutId);
				resolveAcquired(lock !== null);
				if (lock !== null) {
					await held;
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
		release: () => {
			clearTimeout(timeoutId);
			release();
		}
	};
}
