/**
 * BrowserPod filesystem and terminal plumbing, shared by the playground IDE and the agent
 * CLIs. Paths are absolute inside the pod; callers resolve them against their own workdir.
 */
import type { BinaryFile, BrowserPod, TextFile, Terminal } from '@leaningtech/browserpod';

/** Default working directory. Curated templates hydrate here; GitHub clones live in a subdir. */
export const POD_HOME = '/home/user';

/** write() exists on the terminal at runtime but isn't in the published types. */
export function writeToTerminal(terminal: Terminal | null, data: string): void {
	(terminal as (Terminal & { write?: (data: string) => void }) | null)?.write?.(data);
}

/**
 * Races `signal` against a `ms` timeout. `pod.run` resolves on spawn, not exit, so a boot or
 * install step that never produces its expected output would otherwise hang forever — callers
 * watch a custom terminal for that output and resolve `signal` once they see it.
 *
 * `onTimeout` decides what the timeout means for that caller: throw to reject the whole race (a
 * hard failure), or return a fallback value to resolve with instead (the caller then inspects it,
 * e.g. to tell a timeout apart from an explicit failure signal). Either way, the timer is always
 * cleared so it can't fire after the race has already settled.
 */
export async function raceWithTimeout<T>(
	signal: Promise<T>,
	ms: number,
	onTimeout: () => T
): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timedOut = new Promise<T>((resolve, reject) => {
		timer = setTimeout(() => {
			try {
				resolve(onTimeout());
			} catch (error) {
				reject(error);
			}
		}, ms);
	});

	try {
		return await Promise.race([signal, timedOut]);
	} finally {
		clearTimeout(timer);
	}
}

export async function readPodFile(pod: BrowserPod, absPath: string): Promise<string> {
	const file = (await pod.openFile(absPath, 'utf-8')) as TextFile;
	const size = await file.getSize();
	const content = await file.read(size);
	await file.close();
	return content;
}

/** Reads a file as raw bytes so binary assets survive intact. */
export async function readPodBinaryFile(
	pod: BrowserPod,
	absPath: string
): Promise<Uint8Array<ArrayBuffer>> {
	const file = (await pod.openFile(absPath, 'binary')) as BinaryFile;
	try {
		const size = await file.getSize();
		return new Uint8Array(await file.read(size));
	} finally {
		await file.close();
	}
}

/** Byte size of a pod file, without reading its contents. */
export async function podFileSize(pod: BrowserPod, absPath: string): Promise<number> {
	const file = (await pod.openFile(absPath, 'binary')) as BinaryFile;
	try {
		return await file.getSize();
	} finally {
		await file.close();
	}
}

/** Reads a text file, or returns null (without reading it) when larger than `maxBytes`. */
export async function readPodFileWithinLimit(
	pod: BrowserPod,
	absPath: string,
	maxBytes: number
): Promise<string | null> {
	const file = (await pod.openFile(absPath, 'utf-8')) as TextFile;
	try {
		const size = await file.getSize();
		if (size > maxBytes) return null;
		return await file.read(size);
	} finally {
		await file.close();
	}
}

export async function writePodFile(
	pod: BrowserPod,
	absPath: string,
	content: string
): Promise<void> {
	await ensureParentDirectory(pod, absPath);
	const file = (await pod.createFile(absPath, 'utf-8')) as TextFile;
	await file.write(content);
	await file.close();
}

export async function writePodBinaryFile(
	pod: BrowserPod,
	absPath: string,
	content: ArrayBuffer
): Promise<void> {
	await ensureParentDirectory(pod, absPath);
	const file = (await pod.createFile(absPath, 'binary')) as BinaryFile;
	await file.write(content);
	await file.close();
}

async function ensureParentDirectory(pod: BrowserPod, absPath: string): Promise<void> {
	const parent = absPath.slice(0, absPath.lastIndexOf('/'));
	if (parent) await pod.createDirectory(parent, { recursive: true });
}
