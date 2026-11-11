/**
 * The format a Java project travels in when it is shared: JSON, compressed by lz-string into the
 * URL hash. The format is fixed, byte for byte, so every link already shared keeps opening.
 */
import LZString from 'lz-string';
import { isJavaVersion, type JavaVersion } from './versions';

export type SharedProject = {
	title: string;
	/** An ISO date, stamped on every edit. */
	updated?: string;
	files: { path: string; content: string }[];
	/**
	 * Absent means Java 8, which links from before this key always ran on, so they open unchanged
	 * and a Java 8 project still encodes to the same bytes.
	 */
	java?: JavaVersion;
	/** The binary name of the class to start. Absent in older links, which encode unchanged. */
	main?: string;
};

/** Keys go in a fixed order, so the same project always encodes to the same hash. */
export function encodeSharedProject({ title, updated, files, java, main }: SharedProject): string {
	return LZString.compressToEncodedURIComponent(
		JSON.stringify({
			title,
			updated,
			files: files.map(({ path, content }) => ({ path, content })),
			java: java === 8 ? undefined : java,
			main
		})
	);
}

/** Null when `hash` is not a shared project, names a file outside the project or an unknown Java. */
export function decodeSharedProject(hash: string): SharedProject | null {
	let data: unknown;
	try {
		data = JSON.parse(LZString.decompressFromEncodedURIComponent(hash) ?? '');
	} catch {
		return null;
	}
	if (typeof data !== 'object' || data === null) return null;
	const { title, updated, files, java, main } = data as Record<string, unknown>;
	if (typeof title !== 'string' || (updated !== undefined && typeof updated !== 'string')) {
		return null;
	}
	if (!Array.isArray(files) || !files.every(isFile)) return null;
	if (java !== undefined && !isJavaVersion(java)) return null;
	if (main !== undefined && typeof main !== 'string') return null;
	return {
		title,
		...(updated !== undefined && { updated }),
		files: files.map(({ path, content }) => ({ path, content })),
		...(java !== undefined && { java }),
		...(main !== undefined && { main })
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

/** The `/java` link that reopens `files` on `java`, starting `main`, stamped as edited now. */
export function sharedProjectLink(
	title: string,
	files: SharedProject['files'],
	java?: JavaVersion,
	main?: string
): string {
	const updated = new Date().toISOString();
	return `/java#${encodeSharedProject({ title, updated, files, java, main })}`;
}
