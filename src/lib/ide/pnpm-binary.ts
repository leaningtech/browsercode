/**
 * The pod's own pnpm, /bin/pnpm on the BrowserPod 4.0.0 disk, hosted as one file. Fetched by the
 * page, it starts far sooner than the disk's first read of a 25 MB binary, and the browser caches
 * it. Anything short of an exact copy is skipped, so the disk's pnpm runs instead.
 */
import type { BrowserPod } from '@leaningtech/browserpod';
import { POD_HOME, writePodBinaryFile } from '$lib/pod/fs';

/**
 * opt.browserpod.io only sends CORS headers to browsercode.io, *.browsercode.pages.dev and
 * localhost:5173, so a dev server on any other port always falls back to the disk's pnpm.
 */
const PNPM_URL = 'https://opt.browserpod.io/bin/pnpm/12.8.2/pnpm';
/** Of the disk's copy, so refresh it whenever a BrowserPod release rebuilds the disk. */
const PNPM_SHA256 = '8a7704447ffba4609f69c8b7f0176391febe46f17ba13f34f97dcb0458fdffe0';

/** Not on the pod's default PATH, so the IDE runs pnpm from here by its full path. */
export const LOCAL_BIN = `${POD_HOME}/.local/bin`;

/** The bytes, or null when they cannot be fetched or are not the disk's exact copy. */
export async function fetchPnpm(): Promise<ArrayBuffer | null> {
	try {
		const response = await fetch(PNPM_URL);
		if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
		const bytes = await response.arrayBuffer();
		if ((await sha256Hex(bytes)) !== PNPM_SHA256) throw new Error('checksum mismatch');
		return bytes;
	} catch (error) {
		console.warn("Could not fetch pnpm; the disk's own will run:", error);
		return null;
	}
}

/** Best effort: false leaves the disk's pnpm in place rather than blocking boot. */
export async function installPnpm(pod: BrowserPod, bytes: ArrayBuffer): Promise<boolean> {
	const path = `${LOCAL_BIN}/pnpm`;
	try {
		await writePodBinaryFile(pod, path, bytes);
		// The file API has no mode argument, so the binary lands non-executable.
		const terminal = await pod.createCustomTerminal({ onOutput: () => {} });
		// Typed as an opaque `Process`, but awaiting it yields the exit code.
		const exitCode = (await pod.run('chmod', ['755', path], {
			terminal,
			echo: false
		})) as unknown as number;
		if (exitCode !== 0) throw new Error(`chmod exited with ${exitCode}`);
		return true;
	} catch (error) {
		console.warn("Could not install pnpm; the disk's own will run:", error);
		return false;
	}
}

async function sha256Hex(data: ArrayBuffer): Promise<string> {
	const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
	return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
