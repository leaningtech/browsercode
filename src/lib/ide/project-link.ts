/** A shared project: its files as deflated JSON in the URL hash, lockfiles left out. */
import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';
import { isProjectFile, type ProjectFile } from '$lib/utils/project-file';

/** `port` pins the preview, for a project that serves more than its app. */
export type SharedFiles = { files: ProjectFile[]; port?: number };

const LOCKFILES = new Set([
	'pnpm-lock.yaml',
	'package-lock.json',
	'yarn.lock',
	'bun.lock',
	'bun.lockb'
]);

/** The `/ide` link that reopens `files`. */
export function projectLink(files: ProjectFile[], port?: number): string {
	const kept = files.filter((file) => !LOCKFILES.has(file.path.split('/').pop() ?? ''));
	const bytes = deflateSync(strToU8(JSON.stringify({ files: kept, port })), { level: 9 });
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	const hash = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
	return `/ide#${hash}`;
}

/** Null when `hash` is not a project link or names a file outside the project. */
export function decodeProjectLink(hash: string): SharedFiles | null {
	let data: unknown;
	try {
		const binary = atob(hash.replace(/-/g, '+').replace(/_/g, '/'));
		const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
		data = JSON.parse(strFromU8(inflateSync(bytes)));
	} catch {
		return null;
	}
	const { files, port } = (data ?? {}) as Record<string, unknown>;
	if (!Array.isArray(files) || !files.every(isProjectFile)) return null;
	if (port !== undefined && typeof port !== 'number') return null;
	return { files: files.map(({ path, content }) => ({ path, content })), port };
}
