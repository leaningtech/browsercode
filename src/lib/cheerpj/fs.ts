/**
 * CheerpJ's filesystem, as far as the page can write it. JavaScript may only add files to the
 * in-memory `/str/` mount, which Java reads but can't write.
 */

/** `path` must sit directly under `/str/`: that mount has no directories. */
export function addStringFile(path: string, content: Uint8Array): void {
	cheerpOSAddStringFile(path, content);
}

export function removeStringFile(path: string): void {
	cheerpOSRemoveStringFile(path);
}
