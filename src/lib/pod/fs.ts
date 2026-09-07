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
