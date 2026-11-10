/**
 * The CheerpJ runtime: a JVM in the page. The editor's project lives in a `MemoryFs`; each run
 * copies it into CheerpJ's `/files/`, compiles it with `javac` and runs `java <main class>`.
 *
 * `/files/` is IndexedDB, shared by every page on the origin and kept across reloads, and nothing
 * guarantees two sessions can use it at once, so Java runs in one tab or embed at a time.
 */
import cheerpjMark from '$lib/assets/cheerpj-wordmark.svg';
import { loadCheerpj } from '$lib/cheerpj/cheerpj';
import type { JavaConsole } from '$lib/cheerpj/console';
import { listDirectory, makeDirectory, removeTree, writeFiles } from '$lib/cheerpj/fs';
import { runJava, runJavac } from '$lib/cheerpj/process';
import type { JavaVersion } from '$lib/java/versions';
import { requestSingleTabLock, type TabLock } from '$lib/utils/tabLock';
import { MemoryFs } from './memory-fs';
import type { BootContext, ProjectSource } from './project-source';
import { SETUP, STARTING, type IdeRuntime, type RuntimeEnv } from './runtime';

const ROOT = '/files/browsercode';
const PROJECT_DIR = `${ROOT}/project`;
/** A folder per run, since an earlier program may still be loading classes from its own. */
const RUNS_DIR = `${ROOT}/runs`;
/** Reserved for uploaded JARs, so clearing `ROOT` leaves it. */
const LIBRARIES = 'libraries';
/** Build roots the earlier design left in `/files/`, one per page load, never removed. */
const LEGACY_ROOT = /^browsercode-[0-9a-f-]{36}$/;

const IN_USE_ELSEWHERE =
	'Java runs in one BrowserCode tab or embed at a time, and another one has it.';

export class CheerpjRuntime implements IdeRuntime {
	readonly fs = new MemoryFs();
	readonly stages: readonly string[];
	readonly loaderMark = cheerpjMark;
	inUseElsewhere = $state<string | null>(null);

	/** Created by `boot`, so xterm.js only loads once a project picks CheerpJ. */
	private console: JavaConsole | null = null;
	private env: RuntimeEnv | null = null;
	/** Held for the tab's life, so only one tab or embed at a time uses `/files/`. */
	private lock: TabLock | null = null;
	private runs = 0;
	private readonly version: JavaVersion;

	constructor(private readonly source: ProjectSource) {
		this.stages = ['loading CheerpJ', source.hydrateLabel, 'compiling', 'running'];
		// The newest, for a source that names none.
		this.version = source.javaVersion ?? 25;
	}

	async boot(env: RuntimeEnv): Promise<BootContext | null> {
		this.env = env;
		if (!(await this.claim()) || env.cancelled()) return null;
		const { JavaConsole } = await import('$lib/cheerpj/console');
		if (env.cancelled()) return null;
		this.console = new JavaConsole();
		this.console.open(env.outputEl);
		this.console.onOutput(env.onOutput);
		this.console.write(
			`BrowserCode: running Java ${this.version} with CheerpJ. Type here to feed System.in; Ctrl+D ends it.\n`,
			'info'
		);
		try {
			await loadCheerpj(PROJECT_DIR, this.version);
		} catch (error) {
			this.console.write(`${error instanceof Error ? error.message : String(error)}\n`, 'error');
			throw error;
		}
		if (env.cancelled()) return null;
		this.console.attach();
		await this.clearLeftovers();
		return this.context();
	}

	async launch(): Promise<void> {
		// Without a dev server to wait for, saves are safe as soon as the files are in.
		this.env?.onSavable();
		await this.run();
	}

	/**
	 * Copies the project to `PROJECT_DIR`, compiles it and runs the start command with the build
	 * output on its classpath. Compiling is this runtime's build step, so the command must be
	 * `java <main class> [args]`.
	 */
	async run(): Promise<void> {
		const env = this.env;
		if (!env || env.cancelled()) return;
		env.onStage(SETUP);
		const start = await this.source.startCommand(this.context());
		if (!start) return;
		// A Java process takes no environment, so `start.env` goes unused.
		const [command, mainClass, ...args] = start.command;
		if (command !== 'java' || !mainClass) {
			this.console!.write(
				`CheerpJ only runs \`java <main class>\`, not: ${start.command.join(' ')}\n`,
				'error'
			);
			return;
		}
		const sources = this.projectPaths().filter((path) => path.endsWith('.java'));
		if (sources.length === 0) {
			this.console!.write('No .java files to compile.\n', 'error');
			return;
		}
		const runDir = `${RUNS_DIR}/${++this.runs}`;
		const out = `${runDir}/classes`;
		try {
			await this.copyProject();
			// javac 8 won't create its output directory.
			await makeDirectory(out);
		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error);
			console.error('Failed to copy the project for Java:', error);
			this.console!.write(`Could not copy the project for Java: ${reason}\n`, 'error');
			return;
		}
		const exit = await this.exec('javac', [
			'-d',
			out,
			...sources.map((path) => `${PROJECT_DIR}/${path}`)
		]);
		if (exit !== 0) {
			this.console!.write(`javac exited with code ${exit}\n`, 'error');
			void this.discard(runDir);
			return;
		}
		env.onStage(STARTING);
		void this.exec('java', ['-cp', out, mainClass, ...args]).then((code) => {
			this.console!.write(`${mainClass} exited with code ${code}\n`, 'info');
			void this.discard(runDir);
		});
	}

	shutdown(): void {
		this.console?.dispose();
		this.lock?.release();
	}

	/** Asked before CheerpJ loads, so a tab that can't run never starts a JVM. */
	private async claim(): Promise<boolean> {
		this.lock ??= requestSingleTabLock(`cheerpj:${ROOT}`);
		const held = await this.lock.acquired;
		if (!held) this.inUseElsewhere = IN_USE_ELSEWHERE;
		return held;
	}

	/**
	 * A closed tab never deletes its runs, and older builds left a root per page load. Safe only
	 * while this tab holds the lock.
	 */
	private async clearLeftovers(): Promise<void> {
		try {
			for (const name of await listDirectory(ROOT)) {
				if (name !== LIBRARIES) await removeTree(`${ROOT}/${name}`);
			}
			for (const name of await listDirectory('/files')) {
				if (LEGACY_ROOT.test(name)) await removeTree(`/files/${name}`);
			}
		} catch (error) {
			// Leftovers only cost storage, so the project still boots.
			console.error('Failed to clear earlier Java sessions:', error);
		}
	}

	private projectPaths(): string[] {
		const { workdir } = this.source;
		return this.fs.filesUnder(workdir).map((path) => path.slice(workdir.length + 1));
	}

	/** Wiped first, so deleted and moved files don't linger. */
	private async copyProject(): Promise<void> {
		const { workdir } = this.source;
		const files = await Promise.all(
			this.projectPaths().map(async (path) => ({
				path: `${PROJECT_DIR}/${path}`,
				bytes: await this.fs.readBinaryFile(`${workdir}/${path}`)
			}))
		);
		await checkRoom(files.reduce((total, { bytes }) => total + bytes.byteLength, 0));
		await removeTree(PROJECT_DIR);
		await writeFiles(files);
	}

	private async discard(runDir: string): Promise<void> {
		try {
			await removeTree(runDir);
		} catch (error) {
			// Left for the next boot's `clearLeftovers`.
			console.error('Failed to delete a finished run:', error);
		}
	}

	private context(): BootContext {
		return {
			fs: this.fs,
			workdir: this.source.workdir,
			write: (data) => this.console!.write(data),
			// The working directory is fixed at `PROJECT_DIR` and there is no color environment,
			// so `run`'s options go unused.
			run: async (command, args) => {
				await this.exec(command, args);
			},
			cancelled: () => this.env?.cancelled() ?? true
		};
	}

	/**
	 * Runs `javac` or `java -cp <classpath> <main> [args]` as a CheerpJ process and resolves with
	 * its exit code; there is no other program to run.
	 */
	private exec(command: string, args: string[]): Promise<number> {
		this.console!.write(`❯ ${[command, ...args].join(' ')}\n`, 'info');
		if (command === 'javac') return runJavac(this.version, args);
		if (command === 'java') {
			const [classPath, mainClass, ...programArgs] =
				args[0] === '-cp' ? args.slice(1) : ['', ...args];
			return runJava(mainClass, classPath, programArgs);
		}
		this.console!.write(`${command}: not available on CheerpJ\n`, 'error');
		return Promise.resolve(127);
	}
}

/**
 * Refuses up front: CheerpJ never reports a write IndexedDB refuses once storage is full, so the
 * write would just never finish. The old copy still counts as used, so this errs towards refusing
 * when storage is nearly full.
 */
async function checkRoom(bytes: number): Promise<void> {
	const estimate = await navigator.storage?.estimate?.();
	if (estimate?.quota === undefined || estimate.usage === undefined) return;
	if (estimate.quota - estimate.usage >= bytes) return;
	throw new Error('browser storage is full. Free some space, then run again.');
}
