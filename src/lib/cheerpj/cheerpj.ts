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

type CheerpjGlobals = {
	cheerpjInit(options: { version: number; status?: 'default' | 'splash' | 'none' }): Promise<void>;
	/** Resolves with the exit code; a program that keeps running may never resolve. */
	cheerpjRunMain(className: string, classPath: string, ...args: string[]): Promise<number>;
	cheerpOSAddStringFile(path: string, content: string | Uint8Array): void;
	cheerpOSRemoveStringFile(path: string): void;
	/** Where AWT and Swing windows draw; -1 for both sizes fills `parent`. */
	cheerpjCreateDisplay(width: number, height: number, parent: HTMLElement): HTMLElement;
	/** Backs every Java process's console; `fileData` is one per process, shared by out and err. */
	ConInodeOps: {
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
};

/**
 * What the loader defines on the page, for the rest of this layer. Typed here rather than declared
 * global, so code outside `src/lib/cheerpj/` can't reach CheerpJ without importing this.
 */
export const cheerpj = globalThis as unknown as CheerpjGlobals;

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
		// The status line sits over the display and, for a program that opens no window, never goes.
		await cheerpj.cheerpjInit({ version: 25, status: 'none' });
	})();
	return loading;
}
