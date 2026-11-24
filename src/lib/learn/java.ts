/**
 * Compiles and runs a lesson's Java with CheerpJ. Leaner than the IDE's runtime: a lesson names
 * its main class and needs no file tree, so this writes the files, runs `javac` and `java`, and
 * hands back the console as text the page styles itself, large enough to read in a video.
 */
import { cheerpj, loadCheerpj } from '$lib/cheerpj/cheerpj';
import { createDisplay, type CheerpjDisplay } from '$lib/cheerpj/display';
import { makeDirectory, removeTree, writeFiles } from '$lib/cheerpj/fs';
import { runJava, runJavac } from '$lib/cheerpj/process';
import { JAVA_TAB_LOCK } from '$lib/ide/cheerpj-runtime.svelte';
import { closeOrReloadTab } from '$lib/stores/leaveWarning.svelte';
import { requestSingleTabLock, type TabLock } from '$lib/utils/tabLock';

/** Inside the IDE's root, which the lock covers and which the IDE clears when it boots. */
const ROOT = '/files/browsercode/learn';

/** `compiler` is what `javac` printed; `input` echoes what was typed into the program. */
export type OutputKind = 'output' | 'compiler' | 'input';

export type RunResult =
	| { ok: false }
	/** `exit` settles when the program ends, which a program with a window never does. */
	| { ok: true; exit: Promise<number> };

type PendingRead = { target: Uint8Array; cb: (n: number) => void };

const encoder = new TextEncoder();

export class LessonJava {
	/** Hears everything the console prints. */
	onOutput: (text: string, kind: OutputKind) => void = () => {};
	/** Hears the program start and stop waiting for input. */
	onWaiting: (waiting: boolean) => void = () => {};

	private lock: TabLock | null = null;
	private loaded: Promise<boolean> | null = null;
	private display: CheerpjDisplay | null = null;
	private runs = 0;
	private compiling = false;
	private queued: Uint8Array = new Uint8Array(0);
	private pendingRead: PendingRead | null = null;
	private decoders = new WeakMap<object, TextDecoder>();
	/** Settles once the first, slow `javac` is out of the way. */
	private warm: Promise<void> = Promise.resolve();

	constructor(private readonly version: number) {}

	/** False when another tab holds Java; CheerpJ is then never loaded. */
	load(): Promise<boolean> {
		this.loaded ??= (async () => {
			// A tab that takes Java over unloads this one, as it does the IDE.
			this.lock = requestSingleTabLock(JAVA_TAB_LOCK, closeOrReloadTab);
			if (!(await this.lock.acquired)) return false;
			await loadCheerpj(ROOT, this.version);
			this.attachConsole();
			try {
				await removeTree(ROOT);
			} catch (error) {
				// Leftovers only cost storage.
				console.error('Failed to clear earlier lessons:', error);
			}
			this.warm = this.warmUp();
			return true;
		})();
		return this.loaded;
	}

	/** Gives AWT and Swing windows `el` to draw in; `onWindows` hears whether any is open. */
	async mountDisplay(el: HTMLElement, onWindows: (open: boolean) => void): Promise<void> {
		if (!(await this.load())) return;
		this.display ??= createDisplay(el, onWindows);
	}

	/** Builds `files` and starts `mainClass`. Resolves once it has started, or failed to compile. */
	async run(files: { path: string; content: string }[], mainClass: string): Promise<RunResult> {
		if (!(await this.load())) return { ok: false };
		await this.warm;
		// CheerpJ can't stop a program, so an earlier one may still be running: only its windows go.
		this.display?.clearWindows();
		const dir = `${ROOT}/${++this.runs}`;
		const out = `${dir}/classes`;
		await writeFiles(
			files.map(({ path, content }) => ({
				path: `${dir}/src/${path}`,
				bytes: encoder.encode(content)
			}))
		);
		// javac 8 won't create its output directory.
		await makeDirectory(out);
		this.compiling = true;
		let exit: number;
		try {
			exit = await runJavac(this.version, [
				'-d',
				out,
				...files
					.filter(({ path }) => path.endsWith('.java'))
					.map(({ path }) => `${dir}/src/${path}`)
			]);
		} finally {
			this.compiling = false;
		}
		if (exit !== 0) return { ok: false };
		return { ok: true, exit: runJava(mainClass, out, []) };
	}

	/**
	 * Compiles a class nobody runs, silently. CheerpJ's first `javac` takes many times longer than
	 * the ones after it, and a visitor is watching the lesson type itself meanwhile, so the wait
	 * moves to where nobody notices it.
	 */
	private async warmUp(): Promise<void> {
		const dir = `${ROOT}/warm-up`;
		const listener = this.onOutput;
		this.onOutput = () => {};
		try {
			await writeFiles([{ path: `${dir}/Warm.java`, bytes: encoder.encode('class Warm {}\n') }]);
			await makeDirectory(`${dir}/classes`);
			await runJavac(this.version, ['-d', `${dir}/classes`, `${dir}/Warm.java`]);
		} catch (error) {
			console.error('Java warm-up failed:', error);
		} finally {
			this.onOutput = listener;
		}
	}

	/** Feeds the program's `System.in`. The caller shows what was typed: a video types it slowly. */
	send(text: string): void {
		const bytes = encoder.encode(text);
		const next = new Uint8Array(this.queued.length + bytes.length);
		next.set(this.queued);
		next.set(bytes, this.queued.length);
		this.queued = next;
		this.serveRead();
	}

	dispose(): void {
		this.display?.dispose();
		this.lock?.release();
	}

	private attachConsole(): void {
		cheerpj.ConInodeOps.writeAsync = (fileData, _offset, buf, off, len, cb) => {
			let decoder = this.decoders.get(fileData);
			if (!decoder) this.decoders.set(fileData, (decoder = new TextDecoder()));
			const text = decoder.decode(new Uint8Array(buf.buffer, buf.byteOffset + off, len), {
				stream: true
			});
			this.onOutput(text, this.compiling ? 'compiler' : 'output');
			cb(len);
		};
		cheerpj.ConInodeOps.readAsync = (_fileData, _offset, buf, off, len, _flags, cb) => {
			this.pendingRead = { target: new Uint8Array(buf.buffer, buf.byteOffset + off, len), cb };
			if (!this.serveRead()) this.onWaiting(true);
		};
	}

	/** Answers the waiting read from queued input; false when there is none to give yet. */
	private serveRead(): boolean {
		const read = this.pendingRead;
		if (!read || this.queued.length === 0) return false;
		this.pendingRead = null;
		const n = Math.min(read.target.length, this.queued.length);
		read.target.set(this.queued.subarray(0, n));
		this.queued = this.queued.subarray(n);
		this.onWaiting(false);
		read.cb(n);
		return true;
	}
}
