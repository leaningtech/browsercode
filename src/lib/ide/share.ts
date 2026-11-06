/**
 * Turns the project into a link that reopens it, for sources that can encode one. Files created
 * outside the IDE aren't tracked in `session.projectFiles`, so the link leaves them out.
 */
import type { JavaVersion } from '$lib/java/versions';
import type { IdeSession } from './session.svelte';

/** The absolute link, or null where the source has no share format or the files aren't in yet. */
export async function shareLink(
	session: IdeSession,
	javaVersion = session.source.javaVersion
): Promise<string | null> {
	const share = session.source.share;
	if (!share || !session.fsReady) return null;

	// Flush unsaved edits first so the link matches the editor.
	await session.saveAll();

	const files = await Promise.all(
		session.projectFiles.map(async (path) => ({
			path,
			content: await session.fs.readFile(`${session.workdir}/${path}`)
		}))
	);
	return new URL(share(files, javaVersion), location.origin).href;
}

/** Only the hash changes, so an embed keeps the options in its query string. */
export async function javaVersionLink(
	session: IdeSession,
	javaVersion: JavaVersion
): Promise<string | null> {
	const link = await shareLink(session, javaVersion);
	if (!link) return null;
	const url = new URL(location.href);
	url.hash = new URL(link).hash;
	return url.href;
}
