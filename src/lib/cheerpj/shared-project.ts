/**
 * The format a Java project travels in when it is shared: JSON, compressed by lz-string into the
 * URL hash. The format is fixed, byte for byte, so every link already shared keeps opening.
 */
import LZString from 'lz-string';

export type SharedProject = {
	title: string;
	/** An ISO date, stamped on every edit. */
	updated?: string;
	files: { path: string; content: string }[];
};

/** Keys go in a fixed order, so the same project always encodes to the same hash. */
export function encodeSharedProject({ title, updated, files }: SharedProject): string {
	return LZString.compressToEncodedURIComponent(
		JSON.stringify({ title, updated, files: files.map(({ path, content }) => ({ path, content })) })
	);
}

/** Null when `hash` is not a shared project, or names a file outside the project. */
export function decodeSharedProject(hash: string): SharedProject | null {
	let data: unknown;
	try {
		data = JSON.parse(LZString.decompressFromEncodedURIComponent(hash) ?? '');
	} catch {
		return null;
	}
	if (typeof data !== 'object' || data === null) return null;
	const { title, updated, files } = data as Record<string, unknown>;
	if (typeof title !== 'string' || (updated !== undefined && typeof updated !== 'string')) {
		return null;
	}
	if (!Array.isArray(files) || !files.every(isFile)) return null;
	return {
		title,
		...(updated !== undefined && { updated }),
		files: files.map(({ path, content }) => ({ path, content }))
	};
}

function isFile(value: unknown): value is { path: string; content: string } {
	if (typeof value !== 'object' || value === null) return false;
	const { path, content } = value as Record<string, unknown>;
	return (
		typeof path === 'string' &&
		typeof content === 'string' &&
		path.split('/').every((part) => part !== '' && part !== '.' && part !== '..')
	);
}

/** The `/java` link that reopens `files`, stamped as edited now. */
export function sharedProjectLink(title: string, files: SharedProject['files']): string {
	return `/java#${encodeSharedProject({ title, updated: new Date().toISOString(), files })}`;
}
