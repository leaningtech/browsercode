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

	/** `getPod` is read per call, so the fs can exist before the pod boots and rejects until then. */
	constructor(private readonly getPod: () => BrowserPod | null) {}

	async readFile(path: string): Promise<string> {
		return readPodFile(this.requirePod(), path);
	}

	async readFileWithinLimit(path: string, maxBytes: number): Promise<string | null> {
		return readPodFileWithinLimit(this.requirePod(), path, maxBytes);
	}

	async readBinaryFile(path: string): Promise<Uint8Array<ArrayBuffer>> {
		return readPodBinaryFile(this.requirePod(), path);
	}

	async fileSize(path: string): Promise<number> {
		return podFileSize(this.requirePod(), path);
	}

	async writeFile(path: string, content: string): Promise<void> {
		return writePodFile(this.requirePod(), path, content);
	}

	async writeBinaryFile(path: string, content: ArrayBuffer): Promise<void> {
		return writePodBinaryFile(this.requirePod(), path, content);
	}

	async createDirectory(path: string): Promise<void> {
		await this.requirePod().createDirectory(path, { recursive: true });
	}

	renameEntry(from: string, to: string): Promise<void> {
		return this.runFsCommand(`mv -- ${shQuote(from)} ${shQuote(to)}`);
	}

	deleteEntry(path: string): Promise<void> {
		return this.runFsCommand(`rm -rf -- ${shQuote(path)}`);
	}

	private requirePod(): BrowserPod {
		const pod = this.getPod();
		if (!pod) throw new Error('Pod is not ready yet');
		return pod;
	}

	/**
	 * Runs a shell command in the hidden terminal (BrowserPod has no rename/delete API).
	 * Fire-and-trust: `run` resolves on process exit but exposes no exit code, and probing the
	 * result through the file API is unreliable (its view can lag the process world), so callers
	 * update the tree optimistically once the command finishes.
	 */
	private runFsCommand(command: string): Promise<void> {
		const task = async (): Promise<void> => {
			const pod = this.requirePod();
			if (!this.fsTerminal) {
				const decoder = new TextDecoder();
				this.fsTerminal = await pod.createCustomTerminal({
					onOutput: (chunk) => console.debug('[ide-fs]', decoder.decode(chunk, { stream: true }))
				});
			}
			await pod.run('bash', ['-c', command], {
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
