import type { BrowserPod, Terminal } from '@leaningtech/browserpod';
import {
	frameworkConfigs,
	defaultFrameworkId,
	type FrameworkConfig,
	type FrameworkId
} from '$lib/config/frameworks';
import { readPodFile, writePodFile, writePodBinaryFile } from './pod-fs';
import { trackEvent } from '$lib/utils/useLazyTracking';

export type PortalUpdate = { port: number; url: string | null; active: boolean };

export type TerminalElements = { output: HTMLElement; bash: HTMLElement };

/**
 * Owns the BrowserPod lifecycle for the playground IDE: boots the pod, hydrates
 * the selected framework template into its filesystem, starts the dev server and
 * exposes file/terminal/portal state. UI components render from this; the editor
 * implementation (CodeMirror today, VS Code Web later) stays swappable on top.
 */
export class IdeSession {
	framework = $state<FrameworkId>(defaultFrameworkId);
	projectFiles = $state<string[]>([]);
	selectedFile = $state('');
	fileContent = $state('');
	savedFileContent = $state('');
	loading = $state(true);
	isSaving = $state(false);
	hasPortal = $state(false);

	pod: BrowserPod | null = null;
	outputTerminal: Terminal | null = null;
	bashTerminal: Terminal | null = null;

	private bashStarted = false;
	private unmounted = false;
	private bootToken = 0;
	private booting = false;

	get config(): FrameworkConfig {
		return frameworkConfigs[this.framework];
	}

	/** Label shown in the IDE shell. Becomes mode-aware later; framework label for now. */
	get displayLabel(): string {
		return this.config.label;
	}

	/** Preview is pinned to this port when set. Framework-specific right now. */
	get appPort(): number | undefined {
		return this.config.appPort;
	}

	get dirty(): boolean {
		return this.fileContent !== this.savedFileContent;
	}

	private cancelled(token: number): boolean {
		return this.unmounted || token !== this.bootToken;
	}

	async boot(
		framework: FrameworkId,
		terminals: TerminalElements,
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

			this.outputTerminal = await pod.createDefaultTerminal(terminals.output);
			this.bashTerminal = await pod.createDefaultTerminal(terminals.bash);

			for (const file of this.projectFiles) {
				if (this.cancelled(token)) return;
				const content = await fetchTemplateFile(this.config, file);
				if (this.cancelled(token)) return;
				await writePodBinaryFile(pod, file, content);
			}

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
					cwd: '/home/user'
				});
			}

			if (this.cancelled(token)) return;
			await pod.run('npm', this.config.devCommandArgs ?? ['run', 'dev'], {
				echo: true,
				terminal: this.outputTerminal,
				cwd: '/home/user'
			});
		} finally {
			this.booting = false;
		}
	}

	async loadFile(path: string): Promise<void> {
		if (!this.pod || this.unmounted) return;
		this.loading = true;
		this.selectedFile = path;
		try {
			const content = await readPodFile(this.pod, path);
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
			await writePodFile(this.pod, path, content);
			if (this.selectedFile === path) this.savedFileContent = content;
		} catch (error) {
			console.error('Failed to save file:', error);
		} finally {
			this.isSaving = false;
		}
	}

	/** Starts an interactive bash shell in the bash terminal (first call only). */
	startBash(): void {
		if (this.bashStarted || !this.pod || !this.bashTerminal) return;
		this.bashStarted = true;
		try {
			void this.pod.run('bash', ['-i'], { terminal: this.bashTerminal, cwd: '/home/user' });
		} catch (error) {
			console.error('Failed to start bash:', error);
			this.bashStarted = false;
		}
	}

	shutdown(): void {
		this.unmounted = true;
		this.bootToken += 1;
		if (this.pod) void shutdownPod(this.pod);
	}
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
