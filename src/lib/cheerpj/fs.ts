/**
 * CheerpJ's IndexedDB-backed `/files/` mount. JavaScript has no API to write, list or delete there,
 * so these call Java's own `java.io` and `java.nio` in library mode. The page gets one library
 * thread, which rejects a call made while another is in flight, so every call is queued.
 */
import { cheerpj, type JavaFile, type JavaLibrary } from './cheerpj';

let library: Promise<JavaLibrary> | null = null;
let queue: Promise<unknown> = Promise.resolve();

function serial<T>(operation: () => Promise<T>): Promise<T> {
	const result = queue.then(operation);
	// A failed operation mustn't stall the ones queued after it.
	queue = result.catch(() => {});
	return result;
}

/**
 * Kept, since a second `cheerpjRunLibrary` on the page rejects. A failed load is dropped so the
 * next call retries.
 */
function javaLibrary(): Promise<JavaLibrary> {
	library ??= cheerpj.cheerpjRunLibrary('').catch((error: unknown) => {
		library = null;
		throw error;
	});
	return library;
}

async function javaFile(path: string): Promise<JavaFile> {
	const File = await (await javaLibrary()).java.io.File;
	return new File(path);
}

/** Empty when `dir` doesn't exist. */
export function listDirectory(dir: string): Promise<string[]> {
	return serial(async () => {
		const entries = await (await javaFile(dir)).listFiles();
		const names: string[] = [];
		for (let i = 0; i < (entries?.length ?? 0); i++) names.push(await entries![i].getName());
		return names;
	});
}

/** A missing `path` is not an error. */
export function removeTree(path: string): Promise<void> {
	return serial(async () => removeFile(await javaFile(path)));
}

async function removeFile(file: JavaFile): Promise<void> {
	if (await file.isDirectory()) {
		const children = await file.listFiles();
		for (let i = 0; i < (children?.length ?? 0); i++) await removeFile(children![i]);
	}
	// Java returns false for a missing file as well as for a failed delete.
	if (!(await file.delete()) && (await file.exists())) {
		throw new Error(`Could not delete ${await file.getPath()}`);
	}
}

/** Creates missing parent directories. */
export function writeFiles(files: { path: string; bytes: Uint8Array }[]): Promise<void> {
	return serial(async () => {
		const nio = (await javaLibrary()).java.nio.file;
		const paths = await nio.Paths;
		const nioFiles = await nio.Files;
		const dirs = new Set(files.map(({ path }) => path.slice(0, path.lastIndexOf('/'))));
		for (const dir of dirs) await (await javaFile(dir)).mkdirs();
		for (const { path, bytes } of files) {
			// Java's byte[] is signed; a view avoids copying the bytes.
			const signed = new Int8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
			await nioFiles.write(await paths.get(path, []), signed, []);
		}
	});
}
