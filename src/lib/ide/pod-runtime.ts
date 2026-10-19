/**
 * The BrowserPod runtime: a Linux pod with npm, a real shell and portals. Sources hydrate it by
 * writing files or running git, then it installs and starts the project's dev server.
 */
import type { BrowserPod, Terminal } from '@leaningtech/browserpod';
import { writePodFile, writeToTerminal } from '$lib/pod/fs';
import { podBlocker, type PodBlocker } from '$lib/utils/platform';
import { PodFs } from './pod-fs';
import { ANSI, BP_RC, BP_RC_PATH } from './shell-rc';
import type { BootContext, ProjectSource } from './project-source';
import { INSTALLING, STARTING, type IdeRuntime, type RuntimeEnv } from './runtime';
import type { WorkspaceFs } from './workspace-fs';

/** Force color: npm/vite print plain text with no TTY in the pod. */
const COLOR_ENV = ['FORCE_COLOR=3', 'COLORTERM=truecolor'];

export class PodRuntime implements IdeRuntime {
	readonly stages: readonly string[];

	private pod: BrowserPod | null = null;
	/** Created with the pod, so it never sees a pod that is not there. */
	private podFs: PodFs | null = null;
	private outputTerminal: Terminal | null = null;
	/** Set by `boot`; every later hook runs against the boot that set it. */
	private env: RuntimeEnv | null = null;

	constructor(private readonly source: ProjectSource) {
		this.stages = [
			'booting BrowserPod',
			source.hydrateLabel,
			'installing dependencies',
			'starting dev server'
		];
	}

	get fs(): WorkspaceFs {
		if (!this.podFs) throw new Error('Pod is not ready yet');
		return this.podFs;
	}

	blocker(): PodBlocker | null {
		return podBlocker();
	}

	/** Boots the pod and attaches the Output terminal, with the banner and branded shell rc. */
	async boot(env: RuntimeEnv): Promise<BootContext | null> {
		this.env = env;
		const { BrowserPod } = await import('@leaningtech/browserpod');
		if (env.cancelled()) return null;

		const pod = await BrowserPod.boot({
			apiKey: import.meta.env.VITE_API_KEY as string
		});
		if (env.cancelled()) {
			void shutdownPod(pod);
			return null;
		}
		this.pod = pod;
		this.podFs = new PodFs(pod);

		this.outputTerminal = await pod.createDefaultTerminal(env.outputEl);
		this.writeBanner();
		await this.writeShellRc(pod);
		if (env.cancelled()) return null;

		pod.onPortal(({ url, port }) => {
			if (env.cancelled()) return;
			const portNumber = Number(port);
			if (!Number.isInteger(portNumber) || portNumber <= 0) return;
			const trimmedUrl = typeof url === 'string' ? url.trim() : '';
			const active = trimmedUrl.length > 0;
			env.onPortal({ port: portNumber, url: active ? trimmedUrl : null, active });
			// Saves are safe once a portal is live; earlier ones would race the hydrate.
			if (active) env.onSavable();
		});

		return this.context();
	}

	/** Installs, then starts the dev server. */
	async launch(): Promise<void> {
		const ctx = this.context();
		this.env?.onStage(INSTALLING);
		for (const [command, ...args] of this.source.installCommands()) {
			if (ctx.cancelled()) return;
			await this.runInOutput(command, args);
		}
		if (ctx.cancelled()) return;

		const start = await this.source.startCommand(ctx);
		if (ctx.cancelled() || !start) return;

		this.env?.onStage(STARTING);
		const [command, ...args] = start;
		await this.runInOutput(command, args);
	}

	/**
	 * Spawns an interactive bash shell into a freshly mounted terminal element. The shell runs
	 * until pod teardown even if its tab is closed.
	 */
	async startBash(el: HTMLElement): Promise<void> {
		if (!this.pod) return;
		try {
			const terminal = await this.pod.createDefaultTerminal(el);
			// --rcfile picks up the branded prompt/banner written by writeShellRc at boot.
			void this.pod.run('bash', ['--rcfile', BP_RC_PATH, '-i'], {
				terminal,
				cwd: this.source.workdir
			});
		} catch (error) {
			console.error('Failed to start bash:', error);
		}
	}

	shutdown(): void {
		if (this.pod) void shutdownPod(this.pod);
	}

	/** All a source gets of the pod; `cancelled` stays bound to the boot that set `env`. */
	private context(): BootContext {
		return {
			fs: this.fs,
			workdir: this.source.workdir,
			write: (data) => this.termWrite(data),
			run: (command, args, options) => this.runInOutput(command, args, options),
			cancelled: () => this.env?.cancelled() ?? true
		};
	}

	/** Echoes the command with the branded ❯ prompt, then runs it against the Output terminal. */
	private async runInOutput(
		command: string,
		args: string[],
		{ cwd = this.source.workdir, color = true }: { cwd?: string; color?: boolean } = {}
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
}

// shutdown() is not part of the published type definitions yet.
async function shutdownPod(pod: BrowserPod): Promise<void> {
	try {
		await (pod as BrowserPod & { shutdown?: () => Promise<void> }).shutdown?.();
	} catch (error) {
		console.error('Failed to shut down pod:', error);
	}
}
