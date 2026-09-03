import type { BrowserPod, Terminal } from '@leaningtech/browserpod';
import { SvelteSet } from 'svelte/reactivity';
import { readPodFile, writePodFile, writeToTerminal } from '$lib/pod/fs';
import type { PortalUpdate } from '$lib/pod/portals';
import { ANSI, BP_RC, BP_RC_PATH } from './shell-rc';
import { isImagePath, loadPodImage, releaseImage, type ImagePayload } from './media';
import type { BootContext, ProjectSource } from './project-source';

/** Force color: npm/vite print plain text with no TTY in the pod. */
const COLOR_ENV = ['FORCE_COLOR=3', 'COLORTERM=truecolor'];

/**
 * A file open as an editor tab. A `preview` tab (opened by single-click)
 * is reused by the next preview open; double-clicking or editing pins it.
 */
export type OpenFile = {
	path: string;
	content: string;
	savedContent: string;
	preview: boolean;
	/** Set on image tabs, which render as a picture and never save. */
	image?: ImagePayload;
};

/** Where the boot pipeline currently is; drives the loader's progress readout. */
export type BootStage = 'booting' | 'hydrating' | 'installing' | 'starting';

/**
 * Owns the BrowserPod lifecycle for the playground IDE: boots the pod, hydrates the project its
 * `ProjectSource` describes, starts the dev server and exposes file/terminal/portal state. UI
 * components render from this; it holds no editor state of its own, so Monaco lives entirely in
 * the component layer.
 */
export class IdeSession {
	/** How this session's project gets in, and everything the UI reads about it. */
	readonly source: ProjectSource;
	/** Directory the project lives in inside the pod; pod file paths resolve against it. */
	readonly workdir: string;

	projectFiles = $state<string[]>([]);
	/** Explicitly-known directories (from UI folder actions); lets empty folders render in the tree. */
	projectDirs = $state<string[]>([]);
	/** Files open as editor tabs, in tab-strip order. */
	openFiles = $state<OpenFile[]>([]);
	/** Path of the active tab; '' when no tab is open. */
	selectedFile = $state('');
	/** Pending scroll-to-location (1-based) the editor consumes once the file's model is active. */
	revealRequest = $state<{ path: string; line: number; column: number } | null>(null);
	loading = $state(true);
	isSaving = $state(false);
	hasPortal = $state(false);
	podReady = $state(false);
	/** Current boot pipeline step; drives the preview loader's stage readout. */
	bootStage = $state<BootStage>('booting');

	pod: BrowserPod | null = null;
	outputTerminal: Terminal | null = null;
	/** Lazily created hidden terminal that carries UI-initiated fs commands. */
	private fsTerminal: Terminal | null = null;
	/** Serializes fs commands so two never share the hidden terminal at once. */
	private fsQueue: Promise<unknown> = Promise.resolve();
	/** Paths with a save in flight; a second save of the same file waits for the next edit. */
	private savingPaths = new SvelteSet<string>();
	/** Tabs pinned (double-clicked) while their first read was still in flight. */
	private pendingPins = new SvelteSet<string>();

	private unmounted = false;
	private bootToken = 0;
	private booting = false;

	constructor(source: ProjectSource) {
		this.source = source;
		this.workdir = source.workdir;
	}

	private get activeFile(): OpenFile | undefined {
		return this.openFiles.find((file) => file.path === this.selectedFile);
	}

	/** True when the active tab has unsaved edits. */
	get dirty(): boolean {
		const file = this.activeFile;
		return !!file && file.content !== file.savedContent;
	}

	private cancelled(token: number): boolean {
		return this.unmounted || token !== this.bootToken;
	}

	/** The source fills in each step; the pipeline itself is the same for all of them. */
	async boot(
		terminalEl: HTMLElement,
		onPortalUpdate: (update: PortalUpdate) => void
	): Promise<void> {
		if (this.booting || this.pod) return;
		this.booting = true;
		const token = ++this.bootToken;
		try {
			this.bootStage = 'booting';
			this.projectFiles = await this.source.listFiles();
			if (this.cancelled(token)) return;

			const pod = await this.bootPod(terminalEl, onPortalUpdate, token);
			if (!pod) return;
			const ctx = this.bootContext(pod, token);

			this.bootStage = 'hydrating';
			await this.source.hydrate(ctx, this.projectFiles);
			if (this.cancelled(token)) return;

			// The project exists on disk now, so the editor may read from the pod.
			this.podReady = true;
			await this.source.prepare?.(ctx);
			if (this.cancelled(token)) return;

			const initialFile = this.source.initialFile(this.projectFiles);
			if (initialFile) await this.openFile(initialFile);
			else this.loading = false;

			this.source.trackBoot();

			this.bootStage = 'installing';
			for (const args of this.source.installCommands()) {
				if (this.cancelled(token)) return;
				await this.runInOutput('npm', args);
			}
			if (this.cancelled(token)) return;

			const startArgs = await this.source.startCommand(ctx);
			if (this.cancelled(token) || !startArgs) return;

			this.bootStage = 'starting';
			await this.runInOutput('npm', startArgs);
		} finally {
			this.booting = false;
		}
	}

	/** All a source gets of the pod; `cancelled` stays bound to the boot that handed it over. */
	private bootContext(pod: BrowserPod, token: number): BootContext {
		return {
			pod,
			workdir: this.workdir,
			write: (data) => this.termWrite(data),
			run: (command, args, options) => this.runInOutput(command, args, options),
			cancelled: () => this.cancelled(token)
		};
	}

	/**
	 * Boots the pod and attaches the Output terminal, with the banner and branded shell rc.
	 * Returns null when the boot was cancelled in flight.
	 */
	private async bootPod(
		terminalEl: HTMLElement,
		onPortalUpdate: (update: PortalUpdate) => void,
		token: number
	): Promise<BrowserPod | null> {
		const { BrowserPod } = await import('@leaningtech/browserpod');
		if (this.cancelled(token)) return null;

		const pod = await BrowserPod.boot({
			apiKey: import.meta.env.VITE_API_KEY as string
		});
		if (this.cancelled(token)) {
			void shutdownPod(pod);
			return null;
		}
		this.pod = pod;

		this.outputTerminal = await pod.createDefaultTerminal(terminalEl);
		this.writeBanner();
		await this.writeShellRc(pod);
		if (this.cancelled(token)) return null;

		pod.onPortal(({ url, port }) => {
			if (this.cancelled(token)) return;
			const portNumber = Number(port);
			if (!Number.isInteger(portNumber) || portNumber <= 0) return;
			const trimmedUrl = typeof url === 'string' ? url.trim() : '';
			const active = trimmedUrl.length > 0;
			if (active) this.hasPortal = true;
			onPortalUpdate({ port: portNumber, url: active ? trimmedUrl : null, active });
		});

		return pod;
	}

	/** Echoes the command with the branded ❯ prompt, then runs it against the Output terminal. */
	private async runInOutput(
		command: string,
		args: string[],
		{ cwd = this.workdir, color = true }: { cwd?: string; color?: boolean } = {}
	): Promise<void> {
		if (!this.pod || !this.outputTerminal) return;
		this.logCommand(command, args);
		await this.pod.run(command, args, {
			echo: false,
			terminal: this.outputTerminal,
			cwd,
			...(color ? { env: COLOR_ENV } : {})
		});
	}

	/** Writes raw text to the Output terminal. */
	private termWrite(data: string): void {
		writeToTerminal(this.outputTerminal, data);
	}

	/** Echo a real command with the interactive tabs' blue ❯ */
	private logCommand(command: string, args: string[]): void {
		const line = [command, ...args].join(' ');
		this.termWrite(`\r\n${ANSI.blue}❯${ANSI.reset} ${line}\r\n`);
	}

	/** The only text the Output tab injects; everything below is real commands. */
	private writeBanner(): void {
		this.termWrite(
			`\r\n  ${ANSI.bold}BrowserCode${ANSI.reset}\r\n` +
				`  ${ANSI.dim}Booting your workspace with ${ANSI.blue}BrowserPod${ANSI.reset}\r\n`
		);
	}

	/** Best-effort write of the branded shell rc; a failure never blocks boot. */
	private async writeShellRc(pod: BrowserPod): Promise<void> {
		try {
			await writePodFile(pod, BP_RC_PATH, BP_RC);
		} catch (error) {
			console.warn('Could not write shell rc:', error);
		}
	}

	/** True if the tree already knows an entry at `path` (or something nested under it). */
	private entryExists(path: string): boolean {
		const under = (p: string) => p === path || p.startsWith(`${path}/`);
		return this.projectFiles.some(under) || this.projectDirs.some(under);
	}

	/**
	 * Runs a shell command in a hidden terminal (BrowserPod has no rename/delete
	 * API). Fire-and-trust: `run` resolves on process exit but exposes no exit
	 * code, and probing the result through the file API is unreliable (its view
	 * can lag the process world), so callers update the tree optimistically once
	 * the command finishes. Serialized on a queue so two commands never share the
	 * hidden terminal at once. Returns an error message or null.
	 */
	private runFsCommand(command: string): Promise<string | null> {
		const task = async (): Promise<string | null> => {
			if (!this.pod || !this.podReady) return 'Pod is not ready yet';
			try {
				if (!this.fsTerminal) {
					const decoder = new TextDecoder();
					this.fsTerminal = await this.pod.createCustomTerminal({
						onOutput: (chunk) => console.debug('[ide-fs]', decoder.decode(chunk, { stream: true }))
					});
				}
				await this.pod.run('bash', ['-c', command], {
					echo: true,
					terminal: this.fsTerminal,
					cwd: this.workdir
				});
				return null;
			} catch (error) {
				return error instanceof Error ? error.message : String(error);
			}
		};
		const result = this.fsQueue.then(task, task);
		this.fsQueue = result.catch(() => undefined);
		return result;
	}

	/** Creates an empty file and opens it in the editor. Returns an error message or null. */
	async createFile(path: string): Promise<string | null> {
		if (!this.pod || !this.podReady) return 'Pod is not ready yet';
		if (this.entryExists(path)) return 'Something with that name already exists';
		try {
			await writePodFile(this.pod, `${this.workdir}/${path}`, '');
		} catch (error) {
			return error instanceof Error ? error.message : String(error);
		}
		this.projectFiles = [...this.projectFiles, path];
		await this.openFile(path);
		return null;
	}

	/** Creates a folder. Returns an error message or null. */
	async createFolder(path: string): Promise<string | null> {
		if (!this.pod || !this.podReady) return 'Pod is not ready yet';
		if (this.entryExists(path)) return 'Something with that name already exists';
		try {
			await this.pod.createDirectory(`${this.workdir}/${path}`, { recursive: true });
		} catch (error) {
			return error instanceof Error ? error.message : String(error);
		}
		this.projectDirs = [...this.projectDirs, path];
		return null;
	}

	/** Renames a file or folder; open tabs and the selection follow the moved path. Returns an error message or null. */
	async renameEntry(from: string, to: string): Promise<string | null> {
		if (this.entryExists(to)) return 'Something with that name already exists';
		const failure = await this.runFsCommand(`mv -- ${shQuote(from)} ${shQuote(to)}`);
		if (failure) return failure;
		const remap = (p: string) =>
			p === from ? to : p.startsWith(`${from}/`) ? to + p.slice(from.length) : p;
		this.projectFiles = this.projectFiles.map(remap);
		this.projectDirs = this.projectDirs.map(remap);
		for (const file of this.openFiles) file.path = remap(file.path);
		this.selectedFile = remap(this.selectedFile);
		return null;
	}

	/** Deletes a file or folder recursively; tabs under the path close. Returns an error message or null. */
	async deleteEntry(path: string): Promise<string | null> {
		const failure = await this.runFsCommand(`rm -rf -- ${shQuote(path)}`);
		if (failure) return failure;
		const gone = (p: string) => p === path || p.startsWith(`${path}/`);
		this.projectFiles = this.projectFiles.filter((p) => !gone(p));
		this.projectDirs = this.projectDirs.filter((p) => !gone(p));
		for (const file of this.openFiles) if (gone(file.path)) releaseImage(file.image);
		this.openFiles = this.openFiles.filter((file) => !gone(file.path));
		if (gone(this.selectedFile)) this.selectedFile = this.openFiles.at(-1)?.path ?? '';
		return null;
	}

	/**
	 * Opens `path` as a tab (or focuses its existing tab) and makes it the active
	 * file. A preview open reuses the current preview tab's slot instead of adding
	 * a tab; a permanent open pins the tab. An already-open tab keeps its pin
	 * state on a preview open, so focusing tabs never re-previews them.
	 */
	async openFile(path: string, preview = false): Promise<void> {
		if (!this.pod || !this.podReady || this.unmounted) return;
		const existing = this.openFiles.find((file) => file.path === path);
		if (existing) {
			if (!preview) existing.preview = false;
			if (this.selectedFile === path) return;
			this.flushActive();
			this.selectedFile = path;
			return;
		}
		this.flushActive();
		this.loading = true;
		this.selectedFile = path;
		try {
			const absPath = `${this.workdir}/${path}`;
			const image = isImagePath(path) ? await loadPodImage(this.pod, absPath) : undefined;
			const content = image ? '' : await readPodFile(this.pod, absPath);
			if (this.unmounted || this.openFiles.some((file) => file.path === path)) {
				releaseImage(image);
				return;
			}
			// A pin that arrived while the read was in flight wins over the preview flag.
			const entry: OpenFile = {
				path,
				content,
				savedContent: content,
				preview: preview && !this.pendingPins.delete(path),
				image
			};
			const previewIndex = entry.preview ? this.openFiles.findIndex((file) => file.preview) : -1;
			if (previewIndex >= 0) {
				releaseImage(this.openFiles[previewIndex].image);
				this.openFiles = this.openFiles.map((file, i) => (i === previewIndex ? entry : file));
			} else {
				this.openFiles = [...this.openFiles, entry];
			}
		} catch (error) {
			console.error('Failed to load file:', error);
			this.pendingPins.delete(path);
			if (this.selectedFile === path) this.selectedFile = this.openFiles.at(-1)?.path ?? '';
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Opens `path` as a preview tab and reveals `line`/`column` (1-based). The request is set
	 * before opening so it survives an already-open file, applied once the model attaches.
	 */
	async openAt(path: string, line: number, column = 1): Promise<void> {
		this.revealRequest = { path, line, column };
		await this.openFile(path, true);
	}

	/** Promotes a preview tab to a permanent one; safe to call while the tab is still loading. */
	pinFile(path: string): void {
		const entry = this.openFiles.find((file) => file.path === path);
		if (entry) entry.preview = false;
		else this.pendingPins.add(path);
	}

	/** Closes a tab, flushing unsaved edits first; the neighbour tab (next, else previous) becomes active. */
	closeFile(path: string): void {
		const index = this.openFiles.findIndex((file) => file.path === path);
		if (index < 0) return;
		const entry = this.openFiles[index];
		if (entry.content !== entry.savedContent) void this.saveEntry(entry);
		releaseImage(entry.image);
		this.openFiles = this.openFiles.filter((file) => file.path !== path);
		if (this.selectedFile === path)
			this.selectedFile = (this.openFiles[index] ?? this.openFiles[index - 1])?.path ?? '';
	}

	/** Best-effort save of the active tab before it loses focus, so a pending autosave can't be lost. */
	private flushActive(): void {
		const file = this.activeFile;
		if (file && file.content !== file.savedContent) void this.saveEntry(file);
	}

	async saveFile(path = this.selectedFile): Promise<void> {
		const entry = this.openFiles.find((file) => file.path === path);
		if (entry) await this.saveEntry(entry);
	}

	/** Flushes every tab with unsaved edits to the pod. */
	async saveAll(): Promise<void> {
		const dirty = this.openFiles.filter((file) => file.content !== file.savedContent);
		await Promise.all(dirty.map((entry) => this.saveEntry(entry)));
	}

	private async saveEntry(entry: OpenFile): Promise<void> {
		// An image tab carries no text, so writing its content back would truncate the file.
		if (entry.image) return;
		// Saving only makes sense once the dev server is reachable; earlier writes
		// would race the template hydration.
		if (!this.pod || !this.hasPortal || this.unmounted) return;
		if (this.savingPaths.has(entry.path)) return;
		this.savingPaths.add(entry.path);
		this.isSaving = true;
		const content = entry.content;
		try {
			await writePodFile(this.pod, `${this.workdir}/${entry.path}`, content);
			entry.savedContent = content;
		} catch (error) {
			console.error('Failed to save file:', error);
		} finally {
			this.savingPaths.delete(entry.path);
			this.isSaving = this.savingPaths.size > 0;
		}
	}

	/**
	 * Spawns an interactive bash shell into a freshly mounted terminal element.
	 * One call per terminal tab. The shell runs until pod teardown even if its
	 * tab is closed.
	 */
	async startBash(el: HTMLElement): Promise<void> {
		if (!this.pod || !this.podReady) return;
		try {
			const terminal = await this.pod.createDefaultTerminal(el);
			// --rcfile picks up the branded prompt/banner written by writeShellRc at boot.
			void this.pod.run('bash', ['--rcfile', BP_RC_PATH, '-i'], {
				terminal,
				cwd: this.workdir
			});
		} catch (error) {
			console.error('Failed to start bash:', error);
		}
	}

	/** Tears down the pod and cancels any in-flight boot. */
	shutdown(): void {
		this.unmounted = true;
		for (const file of this.openFiles) releaseImage(file.image);
		this.bootToken += 1;
		if (this.pod) void shutdownPod(this.pod);
	}
}

/** Single-quotes a path for `bash -c`. */
function shQuote(value: string): string {
	return `'${value.replace(/'/g, `'\\''`)}'`;
}

// shutdown() is not part of the published type definitions yet.
async function shutdownPod(pod: BrowserPod): Promise<void> {
	try {
		await (pod as BrowserPod & { shutdown?: () => Promise<void> }).shutdown?.();
	} catch (error) {
		console.error('Failed to shut down pod:', error);
	}
}
