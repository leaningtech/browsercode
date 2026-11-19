/**
 * Turns the project into a link that reopens it, for sources that can encode one. Files created
 * outside the IDE aren't tracked in `session.projectFiles`, so the link leaves them out.
 */
import type { JavaVersion } from '$lib/java/versions';
import type { ProjectFile } from '$lib/utils/project-file';
import { isBinaryContent } from './media';
import type { IdeSession } from './session.svelte';

/** Chat apps and mail tend to cut longer links short. */
export const MAX_LINK_LENGTH = 65_536;

/** An absolute Share link, and the binary files it carries empty. */
export type ProjectLink = { url: string; emptied: string[] };

/** Null where the source has no share format or the files aren't in yet. */
export async function shareLink(session: IdeSession): Promise<ProjectLink | null> {
	const share = session.source.share;
	if (!share || !session.fsReady) return null;
	const mainClass = session.runtime.mainClass ?? undefined;
	const { files, emptied } = await currentFiles(session);
	const url = new URL(share(files, session.source.javaVersion, mainClass), location.origin).href;
	return { url, emptied };
}

/** Names at most three of the emptied files, e.g. "2 files open empty: hero.png, inter.woff2." */
export function emptiedNote(paths: string[]): string {
	const names = paths.slice(0, 3).map((path) => path.split('/').pop());
	const more = paths.length > 3 ? ` and ${paths.length - 3} more` : '';
	const count = paths.length === 1 ? '1 file opens' : `${paths.length} files open`;
	return `${count} empty: ${names.join(', ')}${more}.`;
}

/**
 * Only the hash changes, so an embed keeps the options in its query string. A starter nobody has
 * touched becomes the one written for `javaVersion`, so it still compiles there.
 */
export async function javaVersionLink(
	session: IdeSession,
	javaVersion: JavaVersion
): Promise<string | null> {
	const share = session.source.share;
	if (!share || !session.fsReady) return null;
	const { files } = await currentFiles(session);
	const url = new URL(location.href);
	url.hash = new URL(
		share(
			(await starterFor(session, files, javaVersion)) ?? files,
			javaVersion,
			session.runtime.mainClass ?? undefined
		),
		location.origin
	).hash;
	return url.href;
}

/** Binary files go in empty, as their bytes don't survive as text. */
async function currentFiles(
	session: IdeSession
): Promise<{ files: ProjectFile[]; emptied: string[] }> {
	// Flush unsaved edits first so the link matches the editor.
	await session.saveAll();
	const read = await Promise.all(
		session.projectFiles.map(async (path) => {
			// Saves wait for the runtime to be up, so open tabs are read from the editor.
			const tab = session.openFiles.find((file) => file.path === path && !file.image);
			const content = tab?.content ?? (await session.fs.readFile(`${session.workdir}/${path}`));
			return { path, content };
		})
	);
	return {
		files: read.map(({ path, content }) => ({
			path,
			content: isBinaryContent(content) ? '' : content
		})),
		emptied: read.filter((file) => isBinaryContent(file.content)).map((file) => file.path)
	};
}

/** Null when `files` aren't the current version's untouched starter, or it can't be fetched. */
async function starterFor(
	session: IdeSession,
	files: ProjectFile[],
	javaVersion: JavaVersion
): Promise<ProjectFile[] | null> {
	const { starterFiles, javaVersion: current } = session.source;
	if (!starterFiles || !current) return null;
	try {
		if (!sameFiles(files, await starterFiles(current))) return null;
		return await starterFiles(javaVersion);
	} catch (error) {
		// The switch still goes ahead, with the files as they are.
		console.error('Failed to fetch the starter project:', error);
		return null;
	}
}

function sameFiles(a: ProjectFile[], b: ProjectFile[]): boolean {
	const contents = new Map(b.map((file) => [file.path, file.content]));
	return a.length === b.length && a.every((file) => contents.get(file.path) === file.content);
}
