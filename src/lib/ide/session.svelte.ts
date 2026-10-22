import { SvelteSet } from 'svelte/reactivity';
import type { PortalUpdate } from '$lib/pod/portals';
import { isBinaryContent, isImagePath, loadImage, releaseImage, type ImagePayload } from './media';
import { PodRuntime } from './pod-runtime';
import type { ProjectSource } from './project-source';
import { BOOTING, HYDRATING, type IdeRuntime } from './runtime';
import type { WorkspaceFs } from './workspace-fs';

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
	/** Set when `content` is a lossy decode of non-text bytes; the tab never saves. */
	binary?: boolean;
};

/**
 * Runs the playground IDE's boot pipeline over the `ProjectSource` it is given: boots the runtime,
 * hydrates the project, launches it and exposes file/terminal/portal state. UI components render
 * from this; it holds no editor state of its own, so Monaco lives entirely in the component layer.
 */
export class IdeSession {
	/** How this session's project gets in, and everything the UI reads about it. */
	readonly source: ProjectSource;
	/** The machine the project runs on. */
	readonly runtime: IdeRuntime;
	/** Directory the project lives in on the runtime; file paths resolve against it. */
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
	/** Set once the runtime says saves are safe. */
	canSave = $state(false);
	/** True once the project is on disk, so files can be read and changed. */
	fsReady = $state(false);
	/** Index into `runtime.stages`; drives the preview loader's stage readout. */
	bootStage = $state(BOOTING);

	/** Paths with a save in flight; a second save of the same file waits for the next edit. */
	private savingPaths = new SvelteSet<string>();
	/** Tabs pinned (double-clicked) while their first read was still in flight. */
	private pendingPins = new SvelteSet<string>();

	private unmounted = false;
	private bootToken = 0;
	private booting = false;
	private booted = false;

	constructor(source: ProjectSource) {
		this.source = source;
		this.workdir = source.workdir;
		this.runtime = new PodRuntime(source);
	}

	/**
	 * Where the project's files live. Paths are absolute: resolve project paths against `workdir`.
	 * Throws until the runtime has booted, so read it only once `fsReady` is set.
	 */
	get fs(): WorkspaceFs {
		return this.runtime.fs;
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

	/** The source and runtime fill in each step; the pipeline itself is the same for all of them. */
	async boot(
		terminalEl: HTMLElement,
		onPortalUpdate: (update: PortalUpdate) => void,
		onOutput: () => void
	): Promise<void> {
		if (this.booting || this.booted) return;
		this.booting = true;
		const token = ++this.bootToken;
		try {
			this.bootStage = BOOTING;
			this.projectFiles = await this.source.listFiles();
			if (this.cancelled(token)) return;

			const ctx = await this.runtime.boot({
				outputEl: terminalEl,
				onPortal: onPortalUpdate,
				onOutput,
				onSavable: () => (this.canSave = true),
				onStage: (index) => (this.bootStage = index),
				cancelled: () => this.cancelled(token)
			});
			if (!ctx) return;
			this.booted = true;

			this.bootStage = HYDRATING;
			await this.source.hydrate(ctx, this.projectFiles);
			if (this.cancelled(token)) return;

			// The project exists on disk now, so the editor may read from it.
			this.fsReady = true;
			await this.source.prepare?.(ctx);
			if (this.cancelled(token)) return;

			const initialFile = this.source.initialFile(this.projectFiles);
			if (initialFile) await this.openFile(initialFile);
			else this.loading = false;

			this.source.trackBoot();

			await this.runtime.launch();
		} finally {
			this.booting = false;
		}
	}

	/** True if the tree already knows an entry at `path` (or something nested under it). */
	private entryExists(path: string): boolean {
		const under = (p: string) => p === path || p.startsWith(`${path}/`);
		return this.projectFiles.some(under) || this.projectDirs.some(under);
	}

	/** Absolute path of a project-relative one. */
	private abs(path: string): string {
		return `${this.workdir}/${path}`;
	}

	/** Creates an empty file and opens it in the editor. Returns an error message or null. */
	async createFile(path: string): Promise<string | null> {
		if (!this.fsReady) return 'Project files are not ready yet';
		if (this.entryExists(path)) return 'Something with that name already exists';
		try {
			await this.fs.writeFile(this.abs(path), '');
		} catch (error) {
			return error instanceof Error ? error.message : String(error);
		}
		this.projectFiles = [...this.projectFiles, path];
		await this.openFile(path);
		return null;
	}

	/** Creates a folder. Returns an error message or null. */
	async createFolder(path: string): Promise<string | null> {
		if (!this.fsReady) return 'Project files are not ready yet';
		if (this.entryExists(path)) return 'Something with that name already exists';
		try {
			await this.fs.createDirectory(this.abs(path));
		} catch (error) {
			return error instanceof Error ? error.message : String(error);
		}
		this.projectDirs = [...this.projectDirs, path];
		return null;
	}

	/** Renames a file or folder; open tabs and the selection follow the moved path. Returns an error message or null. */
	async renameEntry(from: string, to: string): Promise<string | null> {
		if (this.entryExists(to)) return 'Something with that name already exists';
		if (!this.fsReady) return 'Project files are not ready yet';
		try {
			await this.fs.renameEntry(this.abs(from), this.abs(to));
		} catch (error) {
			return error instanceof Error ? error.message : String(error);
		}
		const remap = (p: string) =>
			p === from ? to : p.startsWith(`${from}/`) ? to + p.slice(from.length) : p;
		this.projectFiles = this.projectFiles.map(remap);
		this.projectDirs = this.projectDirs.map(remap);
		const moved = this.openFiles.filter((file) => remap(file.path) !== file.path);
		for (const file of this.openFiles) file.path = remap(file.path);
		this.selectedFile = remap(this.selectedFile);
		// A tab renders by extension, so a rename across the image/text line has to re-read.
		await Promise.all(
			moved
				.filter((file) => isImagePath(file.path) !== (file.image !== undefined))
				.map((file) => this.reloadTab(file))
		);
		return null;
	}

	/** Re-reads a tab as picture or text per its new path; unsaved edits are dropped. */
	private async reloadTab(entry: OpenFile): Promise<void> {
		if (!this.fsReady) return;
		try {
			const absPath = this.abs(entry.path);
			const image = isImagePath(entry.path) ? await loadImage(this.fs, absPath) : undefined;
			const content = image ? '' : await this.fs.readFile(absPath);
			if (this.unmounted || !this.openFiles.includes(entry)) {
				releaseImage(image);
				return;
			}
			releaseImage(entry.image);
			entry.content = content;
			entry.savedContent = content;
			entry.image = image;
			entry.binary = !image && isBinaryContent(content);
		} catch (error) {
			console.error('Failed to reload file:', error);
		}
	}

	/** Deletes a file or folder recursively; tabs under the path close. Returns an error message or null. */
	async deleteEntry(path: string): Promise<string | null> {
		if (!this.fsReady) return 'Project files are not ready yet';
		try {
			await this.fs.deleteEntry(this.abs(path));
		} catch (error) {
			return error instanceof Error ? error.message : String(error);
		}
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
		if (!this.fsReady || this.unmounted) return;
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
			const absPath = this.abs(path);
			const image = isImagePath(path) ? await loadImage(this.fs, absPath) : undefined;
			const content = image ? '' : await this.fs.readFile(absPath);
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
				image,
				binary: !image && isBinaryContent(content)
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

	/** Flushes every tab with unsaved edits to the workspace. */
	async saveAll(): Promise<void> {
		const dirty = this.openFiles.filter((file) => file.content !== file.savedContent);
		await Promise.all(dirty.map((entry) => this.saveEntry(entry)));
	}

	private async saveEntry(entry: OpenFile): Promise<void> {
		// Neither carries writable text: an image tab has none, a binary tab's is a lossy decode.
		if (entry.image || entry.binary) return;
		if (!this.canSave || this.unmounted) return;
		if (this.savingPaths.has(entry.path)) return;
		this.savingPaths.add(entry.path);
		this.isSaving = true;
		const content = entry.content;
		try {
			await this.fs.writeFile(this.abs(entry.path), content);
			entry.savedContent = content;
		} catch (error) {
			console.error('Failed to save file:', error);
		} finally {
			this.savingPaths.delete(entry.path);
			this.isSaving = this.savingPaths.size > 0;
		}
	}

	/**
	 * Attaches an interactive shell to a freshly mounted terminal element, on runtimes that have
	 * one. One call per terminal tab; the shell outlives its tab until runtime teardown.
	 */
	async startBash(el: HTMLElement): Promise<void> {
		if (!this.fsReady) return;
		await this.runtime.startBash?.(el);
	}

	/** Tears down the runtime and cancels any in-flight boot. */
	shutdown(): void {
		this.unmounted = true;
		for (const file of this.openFiles) releaseImage(file.image);
		this.bootToken += 1;
		this.runtime.shutdown();
	}
}
