import type { BrowserPod, Terminal } from '@leaningtech/browserpod';
import {
	frameworkConfigs,
	defaultFrameworkId,
	type FrameworkConfig,
	type FrameworkId
} from '$lib/config/frameworks';
import { POD_HOME, readPodFile, writePodFile, writePodBinaryFile } from './pod-fs';
import { fetchRepoTree } from '$lib/github/api';
import { trackEvent } from '$lib/utils/useLazyTracking';

export type PortalUpdate = { port: number; url: string | null; active: boolean };

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
	selectedFile = $state('');
	fileContent = $state('');
	savedFileContent = $state('');
	loading = $state(true);
	isSaving = $state(false);
	hasPortal = $state(false);
	podReady = $state(false);

	/** Which boot path produced this session; drives the label, appPort and workdir. */
	mode = $state<'framework' | 'github'>('framework');
	/** Directory the project lives in inside the pod; pod-fs paths resolve against it. */
	workdir = POD_HOME;
	private githubSlug = $state('');

	pod: BrowserPod | null = null;
	outputTerminal: Terminal | null = null;
	/** Lazily created hidden terminal that carries UI-initiated fs commands. */
	private fsTerminal: Terminal | null = null;
	/** Serializes fs commands so two never share the hidden terminal at once. */
	private fsQueue: Promise<unknown> = Promise.resolve();

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

	/** Preview is pinned to this port when set. Unknown for arbitrary GitHub repos. */
	get appPort(): number | undefined {
		return this.mode === 'github' ? undefined : this.config.appPort;
	}

	get dirty(): boolean {
		return this.fileContent !== this.savedFileContent;
	}

	private cancelled(token: number): boolean {
		return this.unmounted || token !== this.bootToken;
	}

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
			this.projectFiles = await fetchManifest(this.config);
			if (this.cancelled(token)) return;

			const { BrowserPod } = await import('@leaningtech/browserpod');
			if (this.cancelled(token)) return;

			const pod = await BrowserPod.boot({
				apiKey: import.meta.env.VITE_API_KEY as string
			});
			if (this.cancelled(token)) {
				void shutdownPod(pod);
				return;
			}
			this.pod = pod;

			this.outputTerminal = await pod.createDefaultTerminal(terminalEl);

			for (const file of this.projectFiles) {
				if (this.cancelled(token)) return;
				const content = await fetchTemplateFile(this.config, file);
				if (this.cancelled(token)) return;
				await writePodBinaryFile(pod, `${this.workdir}/${file}`, content);
			}

			this.podReady = true;
			const initialFile = this.projectFiles.includes(this.config.defaultFile)
				? this.config.defaultFile
				: this.projectFiles[0];
			if (initialFile) await this.loadFile(initialFile);

			pod.onPortal(({ url, port }) => {
				if (this.cancelled(token)) return;
				const portNumber = Number(port);
				if (!Number.isInteger(portNumber) || portNumber <= 0) return;
				const trimmedUrl = typeof url === 'string' ? url.trim() : '';
				const active = trimmedUrl.length > 0;
				if (active) this.hasPortal = true;
				onPortalUpdate({ port: portNumber, url: active ? trimmedUrl : null, active });
			});

			trackEvent('Booted Playground', { framework: this.config.label });

			for (const setupCommandArgs of this.config.setupCommandArgs ?? [['install']]) {
				if (this.cancelled(token)) return;
				await pod.run('npm', setupCommandArgs, {
					echo: true,
					terminal: this.outputTerminal,
					cwd: this.workdir
				});
			}

			if (this.cancelled(token)) return;
			await pod.run('npm', this.config.devCommandArgs ?? ['run', 'dev'], {
				echo: true,
				terminal: this.outputTerminal,
				cwd: this.workdir
			});
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
		const token = ++this.bootToken;
		try {
			// File list up front (before the pod) so the tree renders while we clone.
			try {
				const files = await fetchRepoTree(owner, repo, ref, dir);
				if (this.cancelled(token)) return;
				this.projectFiles = files;
			} catch (error) {
				console.error('Failed to fetch repo file tree:', error);
			}

			const { BrowserPod } = await import('@leaningtech/browserpod');
			if (this.cancelled(token)) return;

			const pod = await BrowserPod.boot({
				apiKey: import.meta.env.VITE_API_KEY as string
			});
			if (this.cancelled(token)) {
				void shutdownPod(pod);
				return;
			}
			this.pod = pod;

			this.outputTerminal = await pod.createDefaultTerminal(terminalEl);

			pod.onPortal(({ url, port }) => {
				if (this.cancelled(token)) return;
				const portNumber = Number(port);
				if (!Number.isInteger(portNumber) || portNumber <= 0) return;
				const trimmedUrl = typeof url === 'string' ? url.trim() : '';
				const active = trimmedUrl.length > 0;
				if (active) this.hasPortal = true;
				onPortalUpdate({ port: portNumber, url: active ? trimmedUrl : null, active });
			});

			const repoDir = `${POD_HOME}/${repo}`;
			this.workdir = dir ? `${repoDir}/${dir}` : repoDir;

			// Plain shallow clone: fetch only the tip commit (--depth 1) of the requested branch
			// and check out the full working tree. For a subdir boot we just point `workdir` at
			// the subtree afterwards. (BrowserPod 2.12+ handles the packfile memory footprint, so
			// the earlier --filter=blob:none / --sparse workaround is no longer needed.)
			await pod.run(
				'git',
				['clone', '--depth', '1', '--branch', ref, `https://github.com/${owner}/${repo}.git`],
				{
					echo: true,
					terminal: this.outputTerminal,
					cwd: POD_HOME
				}
			);
			if (this.cancelled(token)) return;

			// The working tree exists now — let the editor read from the pod.
			this.podReady = true;
			const initialFile = this.projectFiles[0];
			if (initialFile) await this.loadFile(initialFile);
			else this.loading = false;

			trackEvent('Booted Playground GitHub', { repo: `${owner}/${repo}` });

			await pod.run('npm', ['install'], {
				echo: true,
				terminal: this.outputTerminal,
				cwd: this.workdir
			});
			if (this.cancelled(token)) return;

			const script = await this.resolveStartScript();
			if (this.cancelled(token)) return;
			if (!script) {
				if (this.outputTerminal)
					(this.outputTerminal as Terminal & { write?: (data: string) => void }).write?.(
						'\r\nNo "dev" or "start" script in package.json — nothing to run.\r\n'
					);
				return;
			}

			await pod.run('npm', ['run', script], {
				echo: true,
				terminal: this.outputTerminal,
				cwd: this.workdir
			});
		} finally {
			this.booting = false;
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

	private clearSelection(): void {
		this.selectedFile = '';
		this.fileContent = '';
		this.savedFileContent = '';
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
		await this.loadFile(path);
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

	/** Renames a file or folder; the editor selection follows the moved path. Returns an error message or null. */
	async renameEntry(from: string, to: string, isDir: boolean): Promise<string | null> {
		if (this.entryExists(to)) return 'Something with that name already exists';
		const failure = await this.runFsCommand(`mv -- ${shQuote(from)} ${shQuote(to)}`);
		if (failure) return failure;
		const remap = (p: string) =>
			p === from ? to : p.startsWith(`${from}/`) ? to + p.slice(from.length) : p;
		this.projectFiles = this.projectFiles.map(remap);
		this.projectDirs = this.projectDirs.map(remap);
		if (!isDir && this.selectedFile === from) this.selectedFile = to;
		else if (isDir && this.selectedFile.startsWith(`${from}/`))
			this.selectedFile = to + this.selectedFile.slice(from.length);
		return null;
	}

	/** Deletes a file or folder recursively. Returns an error message or null. */
	async deleteEntry(path: string): Promise<string | null> {
		const failure = await this.runFsCommand(`rm -rf -- ${shQuote(path)}`);
		if (failure) return failure;
		const gone = (p: string) => p === path || p.startsWith(`${path}/`);
		this.projectFiles = this.projectFiles.filter((p) => !gone(p));
		this.projectDirs = this.projectDirs.filter((p) => !gone(p));
		if (gone(this.selectedFile)) this.clearSelection();
		return null;
	}

	async loadFile(path: string): Promise<void> {
		if (!this.pod || !this.podReady || this.unmounted) return;
		this.loading = true;
		this.selectedFile = path;
		try {
			const content = await readPodFile(this.pod, `${this.workdir}/${path}`);
			if (this.unmounted || this.selectedFile !== path) return;
			this.savedFileContent = content;
			this.fileContent = content;
		} catch (error) {
			console.error('Failed to load file:', error);
		} finally {
			this.loading = false;
		}
	}

	async saveFile(): Promise<void> {
		// Saving only makes sense once the dev server is reachable; earlier writes
		// would race the template hydration.
		if (!this.pod || !this.selectedFile || !this.hasPortal || this.unmounted) return;
		if (this.isSaving) return;
		this.isSaving = true;
		const path = this.selectedFile;
		const content = this.fileContent;
		try {
			await writePodFile(this.pod, `${this.workdir}/${path}`, content);
			if (this.selectedFile === path) this.savedFileContent = content;
		} catch (error) {
			console.error('Failed to save file:', error);
		} finally {
			this.isSaving = false;
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
			void this.pod.run('bash', ['-i'], { terminal, cwd: this.workdir });
		} catch (error) {
			console.error('Failed to start bash:', error);
		}
	}

	shutdown(): void {
		this.unmounted = true;
		this.bootToken += 1;
		if (this.pod) void shutdownPod(this.pod);
	}
}

/** Single-quotes a path for `bash -c`*/
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
