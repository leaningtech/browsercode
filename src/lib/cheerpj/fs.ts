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

/** A missing `path` is not an error. */
export function removeTree(path: string): Promise<void> {
	const remove = async (file: JavaFile): Promise<void> => {
		if (await file.isDirectory()) {
			const children = await file.listFiles();
			for (let i = 0; i < (children?.length ?? 0); i++) await remove(children![i]);
		}
		// Java returns false for a missing file as well as for a failed delete.
		if (!(await file.delete()) && (await file.exists())) {
			throw new Error(`Could not delete ${await file.getPath()}`);
		}
	};
	return serial(async () => remove(await javaFile(path)));
}

export function makeDirectory(dir: string): Promise<void> {
	return serial(async () => {
		await (await javaFile(dir)).mkdirs();
	});
}

/** The bytes of every file under `dir`, at any depth; empty when `dir` doesn't exist. */
export function readFilesUnder(dir: string): Promise<Uint8Array[]> {
	return serial(async () => {
		const nio = (await javaLibrary()).java.nio.file;
		const paths = await nio.Paths;
		const nioFiles = await nio.Files;
		const found: Uint8Array[] = [];
		const walk = async (file: JavaFile): Promise<void> => {
			const entries = await file.listFiles();
			for (let i = 0; i < (entries?.length ?? 0); i++) {
				const entry = entries![i];
				if (await entry.isDirectory()) {
					await walk(entry);
					continue;
				}
				const signed = await nioFiles.readAllBytes(await paths.get(await entry.getPath(), []));
				found.push(new Uint8Array(signed.buffer, signed.byteOffset, signed.byteLength));
			}
		};
		await walk(await javaFile(dir));
		return found;
	});
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
