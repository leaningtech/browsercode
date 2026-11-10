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

/** Not iterable: `Array.from` and spreading fail, so read it by index. */
type JavaArray<T> = { readonly length: number; readonly [index: number]: T };

/** Library mode hands Java's `boolean` back as 1 or 0. */
type JavaBoolean = number;

export type JavaFile = {
	isDirectory(): Promise<JavaBoolean>;
	listFiles(): Promise<JavaArray<JavaFile> | null>;
	getName(): Promise<string>;
	getPath(): Promise<string>;
	exists(): Promise<JavaBoolean>;
	mkdirs(): Promise<JavaBoolean>;
	delete(): Promise<JavaBoolean>;
};

type JavaPath = object;

/**
 * Classes, constructors and methods all resolve asynchronously, and varargs take an array. A
 * `byte[]` must be an `Int8Array`: library mode maps a `Uint8Array` to `boolean[]`.
 */
export type JavaLibrary = {
	java: {
		io: { File: Promise<new (path: string) => Promise<JavaFile>> };
		nio: {
			file: {
				Paths: Promise<{ get(first: string, more: string[]): Promise<JavaPath> }>;
				Files: Promise<{
					write(path: JavaPath, bytes: Int8Array, options: never[]): Promise<JavaPath>;
				}>;
			};
		};
	};
};

/** One console write or read; `cb` takes the byte count, 0 meaning end of input. */
type ConCallback = (bytes: number) => void;

type CheerpjGlobals = {
	cheerpjInit(options: { version: number }): Promise<void>;
	/** Resolves with the exit code; a program that keeps running may never resolve. */
	cheerpjRunMain(className: string, classPath: string, ...args: string[]): Promise<number>;
	/** `''` gives the standard library alone. */
	cheerpjRunLibrary(classPath: string): Promise<JavaLibrary>;
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
		await cheerpj.cheerpjInit({ version: 25 });
	})();
	return loading;
}
