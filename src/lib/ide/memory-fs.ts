/**
 * A `WorkspaceFs` held in page memory, for runtimes whose own filesystem the page cannot write
 * freely. The runtime copies files out of it when it needs them.
 */
import type { WorkspaceFs } from './workspace-fs';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

type Entry = { kind: 'file'; bytes: Uint8Array<ArrayBuffer> } | { kind: 'directory' };

export class MemoryFs implements WorkspaceFs {
	private entries = new Map<string, Entry>();

	async readFile(path: string): Promise<string> {
		return decoder.decode(this.file(path));
	}

	async readFileWithinLimit(path: string, maxBytes: number): Promise<string | null> {
		const bytes = this.file(path);
		return bytes.byteLength > maxBytes ? null : decoder.decode(bytes);
	}

	async readBinaryFile(path: string): Promise<Uint8Array<ArrayBuffer>> {
		return this.file(path).slice();
	}

	async fileSize(path: string): Promise<number> {
		return this.file(path).byteLength;
	}

	async writeFile(path: string, content: string): Promise<void> {
		this.store(path, encoder.encode(content));
	}

	async writeBinaryFile(path: string, content: ArrayBuffer): Promise<void> {
		this.store(path, new Uint8Array(content.slice(0)));
	}

	async createDirectory(path: string): Promise<void> {
		this.addDirectory(path);
	}

	async renameEntry(from: string, to: string): Promise<void> {
		if (!this.entries.has(from)) throw new Error(`No such file or directory: ${from}`);
		// `WorkspaceFs` rules out an existing `to`; checked so a caller breaking that fails
		// instead of accidentally merging directories.
		if (this.entries.has(to)) throw new Error(`Already exists: ${to}`);
		if (to.startsWith(`${from}/`)) throw new Error(`Cannot move ${from} into itself`);
		const parent = to.slice(0, to.lastIndexOf('/'));
		if (parent && this.entries.get(parent)?.kind !== 'directory') {
			throw new Error(`No such directory: ${parent}`);
		}
		// `from` itself and everything under it move; the rest stay put.
		const moves = (p: string): boolean => p === from || p.startsWith(`${from}/`);
		for (const [path, entry] of [...this.entries]) {
			if (!moves(path)) continue;
			this.entries.delete(path);
			this.entries.set(to + path.slice(from.length), entry);
		}
	}

	async deleteEntry(path: string): Promise<void> {
		const gone = (p: string): boolean => p === path || p.startsWith(`${path}/`);
		for (const p of [...this.entries.keys()]) if (gone(p)) this.entries.delete(p);
	}

	/** Every file under `dir`, as absolute paths. */
	filesUnder(dir: string): string[] {
		return [...this.entries]
			.filter(([path, entry]) => entry.kind === 'file' && path.startsWith(`${dir}/`))
			.map(([path]) => path);
	}

	private file(path: string): Uint8Array<ArrayBuffer> {
		const entry = this.entries.get(path);
		if (entry?.kind !== 'file') throw new Error(`No such file: ${path}`);
		return entry.bytes;
	}

	/** Missing parent directories come into being, as they do in `PodFs`. */
	private store(path: string, bytes: Uint8Array<ArrayBuffer>): void {
		if (this.entries.get(path)?.kind === 'directory') throw new Error(`Is a directory: ${path}`);
		this.addDirectory(path.slice(0, path.lastIndexOf('/')));
		this.entries.set(path, { kind: 'file', bytes });
	}

	private addDirectory(path: string): void {
		const missing: string[] = [];
		let dir = path;
		for (; dir && !this.entries.has(dir); dir = dir.slice(0, dir.lastIndexOf('/'))) {
			missing.push(dir);
		}
		// `dir` is now the nearest existing entry at or above `path`; if it is a file, nothing can
		// go under it. Checked before anything is added, so a failure leaves the tree as it was.
		if (this.entries.get(dir)?.kind === 'file') throw new Error(`Not a directory: ${dir}`);
		for (const d of missing) this.entries.set(d, { kind: 'directory' });
	}
}
