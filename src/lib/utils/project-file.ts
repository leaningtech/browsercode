/** A file in a shared project link, with its path relative to the project root. */
export type ProjectFile = { path: string; content: string };

/** Rejects a path that would write outside the project, so a crafted link can't. */
export function isProjectFile(value: unknown): value is ProjectFile {
	if (typeof value !== 'object' || value === null) return false;
	const { path, content } = value as Record<string, unknown>;
	return (
		typeof path === 'string' &&
		typeof content === 'string' &&
		path.split('/').every((part) => part !== '' && part !== '.' && part !== '..')
	);
}
