/**
 * Turns the project into a link that reopens it, for sources that can encode one. Files created
 * outside the IDE aren't tracked in `session.projectFiles`, so the link leaves them out.
 */
import type { JavaVersion } from '$lib/java/versions';
import { isBinaryContent } from './media';
import type { ProjectFile } from './project-link';
import type { IdeSession } from './session.svelte';

/** Chat apps and mail tend to cut longer links short. */
export const MAX_LINK_LENGTH = 65_536;

/** The absolute link, or null where the source has no share format or the files aren't in yet. */
export async function shareLink(session: IdeSession): Promise<string | null> {
	const share = session.source.share;
	if (!share || !session.fsReady) return null;
	const mainClass = session.runtime.mainClass ?? undefined;
	const files = await currentFiles(session);
	return new URL(share(files, session.source.javaVersion, mainClass), location.origin).href;
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
	const files = await currentFiles(session);
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

async function currentFiles(session: IdeSession): Promise<ProjectFile[]> {
	// Flush unsaved edits first so the link matches the editor.
	await session.saveAll();
	return Promise.all(
		session.projectFiles.map(async (path) => {
			// Saves wait for the runtime to be up, so open tabs are read from the editor.
			const tab = session.openFiles.find((file) => file.path === path && !file.image);
			const content = tab?.content ?? (await session.fs.readFile(`${session.workdir}/${path}`));
			// Binary bytes don't survive as text.
			return { path, content: isBinaryContent(content) ? '' : content };
		})
	);
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
