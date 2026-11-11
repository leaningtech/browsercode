/**
 * Loads the CheerpJ runtime into the page and types the globals it defines. CheerpJ can only be
 * initialized once per page, so every caller shares one load.
 */

export const CHEERPJ_VERSION = '5.0';

/**
 * A CheerpJ nightly until a release ships the features the IDE relies on. `VITE_CHEERPJ_LOADER`
 * points at another build, such as a local one.
 */
const LOADER_URL =
	(import.meta.env.VITE_CHEERPJ_LOADER as string | undefined) ??
	`https://cjrtnc.leaningtech.com/${CHEERPJ_VERSION}/loader.js`;

/** Without one, CheerpJ runs as the Community Edition and bars the display with a notice. */
const LICENSE_KEY = import.meta.env.VITE_CHEERPJ_LICENSE_KEY as string | undefined;

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
					readAllBytes(path: JavaPath): Promise<Int8Array>;
				}>;
			};
		};
	};
};

/** One console write or read; `cb` takes the byte count, 0 meaning end of input. */
type ConCallback = (bytes: number) => void;

type CheerpjGlobals = {
	cheerpjInit(options: {
		version: number;
		status?: 'default' | 'splash' | 'none';
		javaProperties?: string[];
		licenseKey?: string;
	}): Promise<void>;
	/** Resolves with the exit code; a program that keeps running may never resolve. */
	cheerpjRunMain(className: string, classPath: string, ...args: string[]): Promise<number>;
	/** `''` gives the standard library alone. */
	cheerpjRunLibrary(classPath: string): Promise<JavaLibrary>;
	/**
	 * Undocumented, so typed optional in case a release drops it. Roots every relative path at
	 * `/files/`, whatever `user.dir` says.
	 */
	cheerpjNormalizePath?: (path: string) => string;
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

/**
 * Injects the loader and initializes CheerpJ, once per page. CheerpJ can't be initialized twice,
 * so the first caller's `workdir` and `version` hold for the page.
 */
export function loadCheerpj(workdir: string, version: number): Promise<void> {
	loading ??= (async () => {
		await new Promise<void>((resolve, reject) => {
			const script = document.createElement('script');
			script.src = LOADER_URL;
			script.onload = () => resolve();
			script.onerror = () => reject(new Error(`Could not load CheerpJ from ${LOADER_URL}`));
			document.head.appendChild(script);
		});
		await cheerpj.cheerpjInit({
			version,
			// The status line sits over the display and, for a program that opens no window, never
			// goes.
			status: 'none',
			javaProperties: [`user.dir=${workdir}`],
			...(LICENSE_KEY && { licenseKey: LICENSE_KEY })
		});
		rootRelativePaths(workdir);
	})();
	return loading;
}

/**
 * `user.dir` moves `java.nio` and `javac`, but `java.io` (`new File("input.txt")`, `FileReader`,
 * `Scanner(File)`) still resolves relative paths against `/files/`: CheerpJ has no working
 * directory yet. Rooting them at `workdir` first makes both agree.
 */
function rootRelativePaths(workdir: string): void {
	const normalize = cheerpj.cheerpjNormalizePath;
	if (typeof normalize !== 'function') {
		console.warn(
			'CheerpJ has no cheerpjNormalizePath; java.io resolves relative paths in /files/.'
		);
		return;
	}
	cheerpj.cheerpjNormalizePath = (path) =>
		normalize(path.startsWith('/') ? path : `${workdir}/${path}`);
}
