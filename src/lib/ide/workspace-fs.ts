/**
 * The filesystem a runtime keeps the project in. Paths are absolute inside that runtime; the
 * session resolves project-relative paths against its workdir before calling in. Every method
 * rejects with an `Error` the UI can show as is.
 */
export interface WorkspaceFs {
	/** The whole file, decoded as UTF-8. */
	readFile(path: string): Promise<string>;
	/** Resolves null, without reading the file, when it is larger than `maxBytes`. */
	readFileWithinLimit(path: string, maxBytes: number): Promise<string | null>;
	/** Raw bytes, so binary assets survive intact. */
	readBinaryFile(path: string): Promise<Uint8Array<ArrayBuffer>>;
	/** Byte size, without reading the contents. */
	fileSize(path: string): Promise<number>;
	/** Creates missing parent directories. */
	writeFile(path: string, content: string): Promise<void>;
	/** Creates missing parent directories. */
	writeBinaryFile(path: string, content: ArrayBuffer): Promise<void>;
	/** Recursive, so an existing directory or missing parents are not an error. */
	createDirectory(path: string): Promise<void>;
	/** Moves a file or directory; `to` must not exist yet. */
	renameEntry(from: string, to: string): Promise<void>;
	/** Recursive for directories. */
	deleteEntry(path: string): Promise<void>;
}
