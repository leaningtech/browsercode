import type { BinaryFile, BrowserPod, TextFile } from '@leaningtech/browserpod';

/** Project files live directly under the pod user's home, mirroring the template layout. */
export const POD_HOME = '/home/user';

export async function readPodFile(pod: BrowserPod, path: string): Promise<string> {
	const file = (await pod.openFile(`${POD_HOME}/${path}`, 'utf-8')) as TextFile;
	const size = await file.getSize();
	const content = await file.read(size);
	await file.close();
	return content;
}

export async function writePodFile(pod: BrowserPod, path: string, content: string): Promise<void> {
	await ensureParentDirectory(pod, path);
	const file = (await pod.createFile(`${POD_HOME}/${path}`, 'utf-8')) as TextFile;
	await file.write(content);
	await file.close();
}

export async function writePodBinaryFile(
	pod: BrowserPod,
	path: string,
	content: ArrayBuffer
): Promise<void> {
	await ensureParentDirectory(pod, path);
	const file = (await pod.createFile(`${POD_HOME}/${path}`, 'binary')) as BinaryFile;
	await file.write(content);
	await file.close();
}

async function ensureParentDirectory(pod: BrowserPod, path: string): Promise<void> {
	const parts = path.split('/');
	parts.pop();
	if (parts.length) {
		await pod.createDirectory(`${POD_HOME}/${parts.join('/')}`, { recursive: true });
	}
}
