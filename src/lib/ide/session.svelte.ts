import type { BrowserPod, Terminal } from '@leaningtech/browserpod';
import { SvelteSet } from 'svelte/reactivity';
import {
	frameworkConfigs,
	defaultFrameworkId,
	type FrameworkConfig,
	type FrameworkId
} from '$lib/config/frameworks';
import {
	POD_HOME,
	readPodFile,
	writePodFile,
	writePodBinaryFile,
	writeToTerminal
} from '$lib/pod/fs';
import { ANSI, BP_RC, BP_RC_PATH } from './shell-rc';
import { patchClonedManifest, resolveInstallArgs } from './native-deps';
import { fetchRepoTree } from '$lib/github/api';
import { trackEvent } from '$lib/utils/useLazyTracking';
import type { PortalUpdate } from '$lib/pod/portals';

// Re-exported so the boot-owning routes keep a single import site for session types.
export type { PortalUpdate };

/** Force color: npm/vite print plain text with no TTY in the pod. */
const COLOR_ENV = ['FORCE_COLOR=3', 'COLORTERM=truecolor'];

/**
 * A file open as an editor tab. A `preview` tab (opened by single-click)
 * is reused by the next preview open; double-clicking or editing pins it.
 */
export type OpenFile = { path: string; content: string; savedContent: string; preview: boolean };

/** Where the boot pipeline currently is; drives the loader's progress readout. `copying` is
 * framework-only, `cloning` GitHub-only. */
export type BootStage = 'booting' | 'copying' | 'cloning' | 'installing' | 'starting';

/**
 * Owns the BrowserPod lifecycle for the playground IDE: boots the pod, hydrates
 * the selected framework template into its filesystem, starts the dev server and
 * exposes file/terminal/portal state. UI components render from this; the editor
 * implementation (Monaco today, VS Code Web later) stays swappable on top.
 */
export class IdeSession {
	framework = $state<FrameworkId>(defaultFrameworkId);
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

	/** Which boot path produced this session; drives the label, appPort and workdir. */
	mode = $state<'framework' | 'github'>('framework');
	/** Directory the project lives in inside the pod; pod file paths resolve against it. */
	workdir = POD_HOME;
	private githubSlug = $state('');
	/** Repo URL this session clones from: `git clone` appends `.git`, bug reports link it as-is. */
	private githubUrl = $state('');
	private githubRef = $state('');

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

	get config(): FrameworkConfig {
		return frameworkConfigs[this.framework];
	}

	/** Label shown in the IDE shell; framework label, or owner/repo[/dir] in GitHub mode. */
	get displayLabel(): string {
		return this.mode === 'github' ? this.githubSlug : this.config.label;
	}

	/** What this session cloned; null in framework mode. Carried into bug reports. */
	get repo(): { url: string; ref: string } | null {
		if (this.mode !== 'github' || !this.githubUrl) return null;
		return { url: this.githubUrl, ref: this.githubRef };
	}

	/** Preview is pinned to this port when set. Unknown for arbitrary GitHub repos. */
	get appPort(): number | undefined {
		return this.mode === 'github' ? undefined : this.config.appPort;
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

	/**
	 * Boots a pod from a curated framework template: hydrate the template files,
	 * `npm install` (per the framework's setup commands), then the dev server.
	 */
	async boot(
		framework: FrameworkId,
		terminalEl: HTMLElement,
		onPortalUpdate: (update: PortalUpdate) => void
	): Promise<void> {
		if (this.booting || this.pod) return;
		this.booting = true;
		const token = ++this.bootToken;
		try {
			this.framework = framework;
			this.bootStage = 'booting';
			this.projectFiles = await fetchManifest(this.config);
			if (this.cancelled(token)) return;

			const pod = await this.bootPod(terminalEl, onPortalUpdate, token);
			if (!pod) return;

			this.bootStage = 'copying';
			for (const file of this.projectFiles) {
				if (this.cancelled(token)) return;
				const content = await fetchTemplateFile(this.config, file);
				if (this.cancelled(token)) return;
				await writePodBinaryFile(pod, `${this.workdir}/${file}`, content);
			}
			if (this.cancelled(token)) return;

			this.podReady = true;
			const initialFile = this.projectFiles.includes(this.config.defaultFile)
				? this.config.defaultFile
				: this.projectFiles[0];
			if (initialFile) await this.openFile(initialFile);

			trackEvent('Booted Playground', { framework: this.config.label });

			this.bootStage = 'installing';
			for (const setupCommandArgs of this.config.setupCommandArgs ?? [['install']]) {
				if (this.cancelled(token)) return;
				await this.runInOutput('npm', setupCommandArgs);
			}

			if (this.cancelled(token)) return;
			this.bootStage = 'starting';
			await this.runInOutput('npm', this.config.devCommandArgs ?? ['run', 'dev']);
		} finally {
			this.booting = false;
		}
	}

	/**
	 * Boots a pod from a GitHub repo: shallow clone, `npm install`, then the
	 * project's dev/start script.
	 * The file tree is fetched up front so it renders while the clone runs.
	 */
	async bootFromGitHub(
		owner: string,
		repo: string,
		ref: string,
		dir: string,
		terminalEl: HTMLElement,
		onPortalUpdate: (update: PortalUpdate) => void
	): Promise<void> {
		if (this.booting || this.pod) return;
		this.booting = true;
		this.mode = 'github';
		this.githubSlug = dir ? `${owner}/${repo}/${dir}` : `${owner}/${repo}`;
		this.githubUrl = `https://github.com/${owner}/${repo}`;
		this.githubRef = ref;
		const token = ++this.bootToken;
		try {
			this.bootStage = 'booting';
			// File list up front (before the pod) so the tree renders while we clone.
			try {
				const files = await fetchRepoTree(owner, repo, ref, dir);
				if (this.cancelled(token)) return;
				this.projectFiles = files;
			} catch (error) {
				console.error('Failed to fetch repo file tree:', error);
			}

			const pod = await this.bootPod(terminalEl, onPortalUpdate, token);
			if (!pod) return;

			const repoDir = `${POD_HOME}/${repo}`;
			this.workdir = dir ? `${repoDir}/${dir}` : repoDir;

			// Plain shallow clone: fetch only the tip commit (--depth 1) of the requested branch
			// and check out the full working tree. For a subdir boot we just point `workdir` at
			// the subtree afterwards. (BrowserPod 2.12+ handles the packfile memory footprint, so
			// the earlier --filter=blob:none / --sparse workaround is no longer needed.)
			this.bootStage = 'cloning';
			// git manages its own colors (no TTY here, so none) — forcing COLOR_ENV would change nothing.
			await this.runInOutput(
				'git',
				['clone', '--depth', '1', '--branch', ref, `${this.githubUrl}.git`],
				{ cwd: POD_HOME, color: false }
			);
			if (this.cancelled(token)) return;

			// The working tree exists now — let the editor read from the pod.
			this.podReady = true;

			// Patch package.json before the first tab opens, so the editor shows the
			// manifest install will actually see.
			await this.applyManifestPatches();
			if (this.cancelled(token)) return;

			const initialFile = this.projectFiles[0];
			if (initialFile) await this.openFile(initialFile);
			else this.loading = false;

			trackEvent('Booted Playground GitHub', { repo: `${owner}/${repo}` });

			this.bootStage = 'installing';
			const installArgs = await this.installArgs();
			if (this.cancelled(token)) return;
			await this.runInOutput('npm', installArgs);
			if (this.cancelled(token)) return;

			const script = await this.resolveStartScript();
			if (this.cancelled(token)) return;
			if (!script) {
				this.termWrite(
					`\r\n${ANSI.coral}No "dev" or "start" script in package.json — nothing to run.${ANSI.reset}\r\n`
				);
				return;
			}

			this.bootStage = 'starting';
			await this.runInOutput('npm', ['run', script]);
		} finally {
			this.booting = false;
		}
	}

	/**
	 * Shared front half of both boot paths: dynamic-import BrowserPod, boot the pod,
	 * attach the Output terminal (with the banner and branded shell rc) and wire portal
	 * events through to the host. Returns null when the boot was cancelled in flight.
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

	private async applyManifestPatches(): Promise<void> {
		if (!this.pod) return;
		const manifestPath = `${this.workdir}/package.json`;
		try {
			const raw = await readPodFile(this.pod, manifestPath);
			const result = patchClonedManifest(raw);
			if (!result) {
				this.termWrite(`\r\n${ANSI.dim}No dependency patches apply to this repo.${ANSI.reset}\r\n`);
				return;
			}
			await writePodFile(this.pod, manifestPath, result.patched);
			// Header takes the leading blank line; the changes follow indented under it as one block.
			this.termWrite(`\r\n${ANSI.dim}Modified package.json${ANSI.reset}\r\n`);
			for (const note of result.notes) this.termWrite(`${ANSI.dim}  ${note}${ANSI.reset}\r\n`);
		} catch (error) {
			this.termWrite(
				`\r\n${ANSI.coral}Could not patch package.json; installing the repo as cloned.${ANSI.reset}\r\n`
			);
			console.warn('Could not patch the cloned manifest:', error);
		}
	}

	/** A read failure falls back to a plain install. */
	private async installArgs(): Promise<string[]> {
		if (!this.pod) return ['install'];
		try {
			const raw = await readPodFile(this.pod, `${this.workdir}/package.json`);
			return resolveInstallArgs(raw);
		} catch (error) {
			console.error('Failed to read package.json:', error);
			return ['install'];
		}
	}

	/** Pick the dev-server script from the cloned package.json: prefer `dev`, then `start`. */
	private async resolveStartScript(): Promise<string | null> {
		if (!this.pod) return null;
		try {
			const raw = await readPodFile(this.pod, `${this.workdir}/package.json`);
			const scripts = (JSON.parse(raw) as { scripts?: Record<string, string> }).scripts ?? {};
			if (scripts.dev) return 'dev';
			if (scripts.start) return 'start';
			return null;
		} catch (error) {
			console.error('Failed to read package.json:', error);
			return null;
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
			const content = await readPodFile(this.pod, `${this.workdir}/${path}`);
			if (this.unmounted || this.openFiles.some((file) => file.path === path)) return;
			// A pin that arrived while the read was in flight wins over the preview flag.
			const entry: OpenFile = {
				path,
				content,
				savedContent: content,
				preview: preview && !this.pendingPins.delete(path)
			};
			const previewIndex = entry.preview ? this.openFiles.findIndex((file) => file.preview) : -1;
			this.openFiles =
				previewIndex >= 0
					? this.openFiles.map((file, i) => (i === previewIndex ? entry : file))
					: [...this.openFiles, entry];
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
		this.bootToken += 1;
		if (this.pod) void shutdownPod(this.pod);
	}
}

/** Single-quotes a path for `bash -c`. */
function shQuote(value: string): string {
	return `'${value.replace(/'/g, `'\\''`)}'`;
}

async function fetchManifest(config: FrameworkConfig): Promise<string[]> {
	const response = await fetch(`${config.sourceRoot}/manifest.txt`);
	if (!response.ok) {
		throw new Error(
			`Failed to load manifest for ${config.id}: ${response.status} ${response.statusText}`
		);
	}
	const text = await response.text();
	return text
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);
}

async function fetchTemplateFile(config: FrameworkConfig, fileName: string): Promise<ArrayBuffer> {
	const response = await fetch(`${config.sourceRoot}/${fileName}`);
	if (!response.ok) {
		throw new Error(
			`Failed to fetch ${fileName} for ${config.id}: ${response.status} ${response.statusText}`
		);
	}
	return response.arrayBuffer();
}

// shutdown() is not part of the published type definitions yet.
async function shutdownPod(pod: BrowserPod): Promise<void> {
	try {
		await (pod as BrowserPod & { shutdown?: () => Promise<void> }).shutdown?.();
	} catch (error) {
		console.error('Failed to shut down pod:', error);
	}
}
