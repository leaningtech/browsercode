/**
 * Turns the project into a link that reopens it, for sources that can encode one. Files created
 * outside the IDE aren't tracked in `session.projectFiles`, so the link leaves them out.
 */
import type { IdeSession } from './session.svelte';

/** The absolute link, or null where the source has no share format or the files aren't in yet. */
export async function shareLink(session: IdeSession): Promise<string | null> {
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
	return new URL(share(files), location.origin).href;
}
