/** Why BrowserPod cannot run here, or null when it can. */
export type PodBlocker = 'unsupported-browser' | 'not-isolated';

/**
 * BrowserPod's runtime needs Atomics.waitAsync and WebAssembly JSPI (`WebAssembly.promising`),
 * and fails partway through boot without either.
 *
 * SharedArrayBuffer is only exposed on cross-origin isolated pages, and isolation is inherited
 * from the top-level document, so an embed fails here when its host page omits the headers.
 */
export function podBlocker(): PodBlocker | null {
	if (typeof Atomics?.waitAsync !== 'function') return 'unsupported-browser';
	// JSPI is not in TypeScript's DOM lib yet
	const wasm = globalThis.WebAssembly as { promising?: unknown } | undefined;
	if (typeof wasm?.promising !== 'function') return 'unsupported-browser';
	if (!globalThis.crossOriginIsolated) return 'not-isolated';
	return null;
}
