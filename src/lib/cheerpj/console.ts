/**
 * The console every Java process writes to and reads from. CheerpJ routes all console I/O
 * through the global `ConInodeOps`; `attach` takes it over so the IDE can show output in an
 * xterm.js terminal and feed `System.in` from it. CheerpJ gives stdout and stderr one stream, so
 * they render alike.
 */
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';

/** `output` is the program's; the rest is what the IDE adds around it. */
export type ConsoleKind = 'output' | 'info' | 'error';

/** ANSI colors the app stylesheet maps onto the bc-* palette, as it does for the pod's terminals. */
const STYLE: Record<ConsoleKind | 'input', string> = {
	output: '',
	info: '\x1b[2m',
	error: '\x1b[31m',
	input: '\x1b[36m'
};
const RESET = '\x1b[0m';

type PendingRead = {
	target: Uint8Array;
	cb: (n: number) => void;
};

const encoder = new TextEncoder();

export class JavaConsole {
	/** Matches the pod's terminals; the app stylesheet pins their rows to 12px. */
	private readonly terminal = new Terminal({
		convertEol: true,
		fontFamily: 'monospace',
		fontSize: 12
	});
	private readonly fit = new FitAddon();
	private resizeObserver: ResizeObserver | null = null;

	/** One streaming decoder per process, so a character split across writes survives. */
	private decoders = new WeakMap<object, TextDecoder>();
	/** The line being typed; like a terminal in cooked mode, a read sees it only on Enter. */
	private line = '';
	/** Typed input no read has consumed yet. */
	private queued: Uint8Array = new Uint8Array(0);
	/** Set by Ctrl+D on an empty line until a read reports it. */
	private eof = false;
	/**
	 * A single slot, though a run never waits for the previous program, so two may read at once:
	 * the later read replaces the earlier, whose process then never wakes. A terminal per process
	 * would fix it, once CheerpJ ties each `fileData` to the `cheerpjRunMain` that started it.
	 */
	private pendingRead: PendingRead | null = null;

	constructor() {
		this.terminal.loadAddon(this.fit);
		this.terminal.onData((data) => this.type(data));
	}

	/** Renders into `el`, keeping the terminal sized to it. */
	open(el: HTMLElement): void {
		this.terminal.open(el);
		this.fit.fit();
		this.resizeObserver = new ResizeObserver(() => this.fit.fit());
		this.resizeObserver.observe(el);
	}

	dispose(): void {
		this.resizeObserver?.disconnect();
		this.terminal.dispose();
	}

	write(text: string, kind: ConsoleKind = 'output'): void {
		this.terminal.write(STYLE[kind] ? `${STYLE[kind]}${text}${RESET}` : text);
	}

	/** Routes every Java process's console through this one. */
	attach(): void {
		ConInodeOps.writeAsync = (fileData, _offset, buf, off, len, cb) => {
			let decoder = this.decoders.get(fileData);
			if (!decoder) this.decoders.set(fileData, (decoder = new TextDecoder()));
			const bytes = new Uint8Array(buf.buffer, buf.byteOffset + off, len);
			this.write(decoder.decode(bytes, { stream: true }));
			cb(len);
		};
		ConInodeOps.readAsync = (_fileData, _offset, buf, off, len, _flags, cb) => {
			const target = new Uint8Array(buf.buffer, buf.byteOffset + off, len);
			this.pendingRead = { target, cb };
			this.serveRead();
		};
	}

	/** Edits the typed line: Enter sends it, Backspace erases, Ctrl+D ends input when it is empty. */
	private type(data: string): void {
		// Arrows and other escape sequences have no meaning without a line editor.
		if (data.startsWith('\x1b')) return;
		for (const char of data) {
			if (char === '\r') {
				this.terminal.write('\r\n');
				this.send(`${this.line}\n`);
				this.line = '';
			} else if (char === '\x7f' || char === '\b') {
				if (!this.line) continue;
				this.line = [...this.line].slice(0, -1).join('');
				this.terminal.write('\b \b');
			} else if (char === '\x04') {
				// As in a terminal: a partial line goes through as is, an empty one ends input.
				if (this.line) this.send(this.line);
				else this.eof = true;
				this.line = '';
				this.serveRead();
			} else if (char >= ' ') {
				this.line += char;
				this.terminal.write(`${STYLE.input}${char}${RESET}`);
			}
		}
	}

	private send(text: string): void {
		const bytes = encoder.encode(text);
		const next = new Uint8Array(this.queued.length + bytes.length);
		next.set(this.queued);
		next.set(bytes, this.queued.length);
		this.queued = next;
		this.serveRead();
	}

	/** Completes the pending read from queued input, or with end of input once requested. */
	private serveRead(): void {
		const read = this.pendingRead;
		if (!read || (this.queued.length === 0 && !this.eof)) return;
		this.pendingRead = null;
		if (this.queued.length === 0) {
			this.eof = false;
			read.cb(0);
			return;
		}
		const n = Math.min(read.target.length, this.queued.length);
		read.target.set(this.queued.subarray(0, n));
		this.queued = this.queued.subarray(n);
		read.cb(n);
	}
}
