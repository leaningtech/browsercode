import type { BinaryFile, BrowserPod, TextFile } from '@leaningtech/browserpod';

/** Default working directory. Curated templates hydrate here; GitHub clones live in a subdir. */
export const POD_HOME = '/home/user';

export async function readPodFile(pod: BrowserPod, absPath: string): Promise<string> {
	const file = (await pod.openFile(absPath, 'utf-8')) as TextFile;
	const size = await file.getSize();
	const content = await file.read(size);
	await file.close();
	return content;
}

export async function writePodFile(pod: BrowserPod, absPath: string, content: string): Promise<void> {
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
