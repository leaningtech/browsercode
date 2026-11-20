/**
 * Turns the project into a link that reopens it, for sources that can encode one. Files created
 * outside the IDE aren't tracked in `session.projectFiles`, so the link leaves them out.
 */
import { projectUrl, type EmbedTarget } from '$lib/embed/url';
import type { JavaVersion } from '$lib/java/versions';
import type { ProjectFile } from '$lib/utils/project-file';
import { isBinaryContent } from './media';
import type { IdeSession } from './session.svelte';

/** Chat apps and mail tend to cut longer links short. */
export const MAX_LINK_LENGTH = 65_536;

/**
 * An absolute Share link, what the same project embeds as, and the binary files the link
 * carries empty. A project still exactly as its source shipped it gets that source's own URL
 * rather than every file in a hash, so `emptied` is empty and nothing is lost.
 */
export type ProjectLink = { url: string; target: EmbedTarget; emptied: string[] };

/** Null where the source has no share format or the files aren't in yet. */
export async function shareLink(session: IdeSession): Promise<ProjectLink | null> {
	const share = session.source.share;
	if (!share || !session.fsReady) return null;
	const mainClass = session.runtime.mainClass ?? undefined;
	const { files, emptied } = await currentFiles(session);

	const asShipped = await shippedTarget(session, files);
	const asShippedUrl = asShipped && projectUrl(asShipped);
	if (asShipped && asShippedUrl) {
		return { url: new URL(asShippedUrl, location.origin).href, target: asShipped, emptied: [] };
	}

	// As `shareLinkTarget` reads it back: the format is the route the link opens.
	const link = new URL(share(files, session.source.javaVersion, mainClass), location.origin);
	const target: EmbedTarget = {
		kind: 'link',
		hash: link.hash.slice(1),
		java: link.pathname === '/java'
	};
	return { url: link.href, target, emptied };
}

/**
 * The source's own target when `files` are still exactly what it shipped, else null. Comparing
 * contents rather than watching for edits is what makes an edit that was undone count as
 * untouched — and it is the only thing that notices a change made from the terminal.
 */
async function shippedTarget(
	session: IdeSession,
	files: ProjectFile[]
): Promise<EmbedTarget | null> {
	const { pristineFiles, embedTarget } = session.source;
	if (!pristineFiles || !embedTarget) return null;
	try {
		// `currentFiles` blanks binaries, so the shipped side has to be read the same way or a
		// template with an image never matches itself.
		const shipped = (await pristineFiles()).map(({ path, content }) => ({
			path,
			content: isBinaryContent(content) ? '' : content
		}));
		return sameFiles(files, shipped) ? embedTarget : null;
	} catch (error) {
		// A link that carries the files still works; only the shorter URL is lost.
		console.warn('Could not read the files this project shipped with:', error);
		return null;
	}
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
