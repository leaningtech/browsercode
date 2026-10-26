/**
 * True on iOS and iPadOS. iPadOS in desktop mode reports `MacIntel`, so touch points are
 * checked too. Returns false without a `navigator`.
 */
export function isIos(): boolean {
	if (typeof navigator === 'undefined') return false;
	return (
		/iPad|iPhone|iPod/.test(navigator.userAgent) ||
		(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
	);
}

/** Why BrowserPod cannot run here, or null when it can. */
export type PodBlocker = 'unsupported-platform' | 'unsupported-browser' | 'not-isolated';

/**
 * iOS is checked first because it passes every feature test below and still fails: the pod boots,
 * then `pod.run` never returns a running process. The cause is still unknown — a user-agent check
 * is a stopgap until it is, so remove this once pods work there.
 *
 * BrowserPod's runtime needs Atomics.waitAsync and WebAssembly JSPI (`WebAssembly.promising`),
 * and fails partway through boot without either.
 *
 * SharedArrayBuffer is only exposed on cross-origin isolated pages, and isolation is inherited
 * from the top-level document, so an embed fails here when its host page omits the headers.
 */
export function podBlocker(): PodBlocker | null {
	if (isIos()) return 'unsupported-platform';
	if (typeof Atomics?.waitAsync !== 'function') return 'unsupported-browser';
	// JSPI is not in TypeScript's DOM lib yet
	const wasm = globalThis.WebAssembly as { promising?: unknown } | undefined;
	if (typeof wasm?.promising !== 'function') return 'unsupported-browser';
	if (!globalThis.crossOriginIsolated) return 'not-isolated';
	return null;
}
