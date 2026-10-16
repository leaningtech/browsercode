/** A `WorkspaceFs` over a BrowserPod: its file API, plus a hidden shell for what that API lacks. */
import type { BrowserPod, Terminal } from '@leaningtech/browserpod';
import {
	POD_HOME,
	podFileSize,
	readPodBinaryFile,
	readPodFile,
	readPodFileWithinLimit,
	writePodBinaryFile,
	writePodFile
} from '$lib/pod/fs';
import type { WorkspaceFs } from './workspace-fs';

export class PodFs implements WorkspaceFs {
	/** Lazily created hidden terminal that carries the shell-backed operations. */
	private fsTerminal: Terminal | null = null;
	/** Serializes shell commands so two never share the hidden terminal at once. */
	private fsQueue: Promise<unknown> = Promise.resolve();

	constructor(private readonly pod: BrowserPod) {}

	async readFile(path: string): Promise<string> {
		return readPodFile(this.pod, path);
	}

	async readFileWithinLimit(path: string, maxBytes: number): Promise<string | null> {
		return readPodFileWithinLimit(this.pod, path, maxBytes);
	}

	async readBinaryFile(path: string): Promise<Uint8Array<ArrayBuffer>> {
		return readPodBinaryFile(this.pod, path);
	}

	async fileSize(path: string): Promise<number> {
		return podFileSize(this.pod, path);
	}

	async writeFile(path: string, content: string): Promise<void> {
		return writePodFile(this.pod, path, content);
	}

	async writeBinaryFile(path: string, content: ArrayBuffer): Promise<void> {
		return writePodBinaryFile(this.pod, path, content);
	}

	async createDirectory(path: string): Promise<void> {
		await this.pod.createDirectory(path, { recursive: true });
	}

	renameEntry(from: string, to: string): Promise<void> {
		return this.runFsCommand(`mv -- ${shQuote(from)} ${shQuote(to)}`);
	}

	deleteEntry(path: string): Promise<void> {
		return this.runFsCommand(`rm -rf -- ${shQuote(path)}`);
	}

	/**
	 * Runs a shell command in the hidden terminal (BrowserPod has no rename/delete API).
	 * Fire-and-trust: `run` resolves on process exit but exposes no exit code, and probing the
	 * result through the file API is unreliable (its view can lag the process world), so callers
	 * update the tree optimistically once the command finishes.
	 */
	private runFsCommand(command: string): Promise<void> {
		const task = async (): Promise<void> => {
			if (!this.fsTerminal) {
				const decoder = new TextDecoder();
				this.fsTerminal = await this.pod.createCustomTerminal({
					onOutput: (chunk) => console.debug('[ide-fs]', decoder.decode(chunk, { stream: true }))
				});
			}
			await this.pod.run('bash', ['-c', command], {
				echo: true,
				terminal: this.fsTerminal,
				cwd: POD_HOME
			});
		};
		const result = this.fsQueue.then(task, task);
		this.fsQueue = result.catch(() => undefined);
		return result;
	}
}

/** Single-quotes a path for `bash -c`. */
function shQuote(value: string): string {
	return `'${value.replace(/'/g, `'\\''`)}'`;
}
