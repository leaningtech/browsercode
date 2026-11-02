/**
 * JavaFiddle's share format, byte for byte, so its links open here unchanged and ours open there:
 * the fiddle as JSON, compressed by lz-string into the URL hash.
 */
import LZString from 'lz-string';

export type Fiddle = {
	title: string;
	/** An ISO date; JavaFiddle sets it on every edit and sorts favourites by it. */
	updated?: string;
	files: { path: string; content: string }[];
};

/** Keys go in the order JavaFiddle writes them, so the same fiddle encodes to the same hash. */
export function encodeFiddle({ title, updated, files }: Fiddle): string {
	return LZString.compressToEncodedURIComponent(
		JSON.stringify({ title, updated, files: files.map(({ path, content }) => ({ path, content })) })
	);
}

/** Null when `hash` is not a fiddle, or names a file outside the project. */
export function decodeFiddle(hash: string): Fiddle | null {
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

/** The `/java` link that reopens `files`, stamped as edited now, as JavaFiddle stamps every edit. */
export function fiddleLink(title: string, files: Fiddle['files']): string {
	return `/java#${encodeFiddle({ title, updated: new Date().toISOString(), files })}`;
}
