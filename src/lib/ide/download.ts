/**
 * Pulls files out of the pod and into the user's downloads: the whole project as a zip,
 * or one file on its own. Files created outside the IDE (e.g. the terminal) aren't tracked
 * in `session.projectFiles`, so the zip skips them.
 */
import { zipSync } from 'fflate';
import { readPodBinaryFile } from '$lib/pod/fs';
import type { IdeSession } from './session.svelte';

/** Turn a display label into a safe zip filename. */
function zipFilename(label: string): string {
	const slug = label
		.trim()
		.replace(/[^a-zA-Z0-9._-]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return `${slug || 'project'}.zip`;
}

/** Hands `bytes` to the browser as a download. */
function triggerDownload(bytes: Uint8Array<ArrayBuffer>, filename: string, mimeType: string): void {
	const blob = new Blob([bytes], { type: mimeType });
	const url = URL.createObjectURL(blob);
	try {
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = filename;
		document.body.appendChild(anchor);
		anchor.click();
		anchor.remove();
	} finally {
		URL.revokeObjectURL(url);
	}
}

export async function downloadProject(session: IdeSession): Promise<void> {
	const pod = session.pod;
	if (!pod) return;

	// Flush unsaved edits first so the zip matches the editor.
	await session.saveAll();

	// Read sequentially; projects are small.
	const files: Record<string, Uint8Array> = {};
	for (const path of session.projectFiles) {
		files[path] = await readPodBinaryFile(pod, `${session.workdir}/${path}`);
	}

	triggerDownload(zipSync(files), zipFilename(session.source.label), 'application/zip');
}

/** Downloads a single project-relative file under its own name. */
export async function downloadFile(session: IdeSession, path: string): Promise<void> {
	const pod = session.pod;
	if (!pod) return;

	// Flush this file's pending edits so the download matches the editor.
	await session.saveFile(path);

	const bytes = await readPodBinaryFile(pod, `${session.workdir}/${path}`);
	const name = path.split('/').pop() || 'download';
	triggerDownload(bytes, name, 'application/octet-stream');
}
