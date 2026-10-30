/**
 * Loads the CheerpJ runtime into the page and types the globals it defines. CheerpJ can only be
 * initialized once per page, so every caller shares one load.
 */

/**
 * A CheerpJ nightly until a release ships the features the IDE relies on. `VITE_CHEERPJ_LOADER`
 * points at another build, such as a local one.
 */
const LOADER_URL =
	(import.meta.env.VITE_CHEERPJ_LOADER as string | undefined) ??
	'https://cjrtnc.leaningtech.com/5.0/loader.js';

/** One console write or read; `cb` takes the byte count, 0 meaning end of input. */
type ConCallback = (bytes: number) => void;

declare global {
	function cheerpjInit(options: { version: number }): Promise<void>;
	/** Resolves with the exit code; a program that keeps running may never resolve. */
	function cheerpjRunMain(className: string, classPath: string, ...args: string[]): Promise<number>;
	/** `path` must sit directly under `/str/`: that mount has no directories. */
	function cheerpOSAddStringFile(path: string, content: string | Uint8Array): void;
	function cheerpOSRemoveStringFile(path: string): void;
	/** Backs every Java process's console; `fileData` is one per process, shared by out and err. */
	var ConInodeOps: {
		readAsync: (
			fileData: object,
			fileOffset: number,
			buf: Uint8Array | Int8Array,
			off: number,
			len: number,
			flags: number,
			cb: ConCallback
		) => void;
		writeAsync: (
			fileData: object,
			fileOffset: number,
			buf: Uint8Array | Int8Array,
			off: number,
			len: number,
			cb: ConCallback
		) => void;
	};
}

let loading: Promise<void> | null = null;

/** Injects the loader and initializes CheerpJ, once per page. */
export function loadCheerpj(): Promise<void> {
	loading ??= (async () => {
		await new Promise<void>((resolve, reject) => {
			const script = document.createElement('script');
			script.src = LOADER_URL;
			script.onload = () => resolve();
			script.onerror = () => reject(new Error(`Could not load CheerpJ from ${LOADER_URL}`));
			document.head.appendChild(script);
		});
		await cheerpjInit({ version: 25 });
	})();
	return loading;
}
