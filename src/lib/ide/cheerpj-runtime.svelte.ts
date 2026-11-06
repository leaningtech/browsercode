/**
 * The CheerpJ runtime: a JVM in the page. The project lives in a `MemoryFs`, since the page can
 * only hand files to Java through CheerpJ's flat `/str/` mount; each run copies the sources there,
 * compiles them with `javac` and runs the source's start command, `java <main class>`.
 *
 * Builds go to `/files/`, which is IndexedDB, shared by every page on the origin and kept across
 * reloads, and nothing guarantees two sessions can use it at once, so Java runs in one tab or
 * embed at a time.
 */
import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import cheerpjMark from '$lib/assets/cheerpj-wordmark.svg';
import { loadCheerpj } from '$lib/cheerpj/cheerpj';
import type { JavaConsole } from '$lib/cheerpj/console';
import { createDisplay, type CheerpjDisplay } from '$lib/cheerpj/display';
import { addStringFile, removeStringFile } from '$lib/cheerpj/fs';
import { runJava, runJavac } from '$lib/cheerpj/process';
import { parseJavacOutput } from '$lib/java/javac-diagnostics';
import { requestSingleTabLock, type TabLock } from '$lib/utils/tabLock';
import { MemoryFs } from './memory-fs';
import type { BootContext, ProjectSource } from './project-source';
import { SETUP, STARTING, type Diagnostic, type IdeRuntime, type RuntimeEnv } from './runtime';

/** The mount the sources are copied to for `javac`; only paths under it are the project's. */
const STR_MOUNT = '/str/';

const ROOT = '/files/browsercode';

const IN_USE_ELSEWHERE =
	'Java runs in one BrowserCode tab or embed at a time, and another one has it.';

export class CheerpjRuntime implements IdeRuntime {
	readonly fs = new MemoryFs();
	readonly stages: readonly string[];
	readonly loaderMark = cheerpjMark;
	diagnostics = $state.raw<readonly Diagnostic[]>([]);
	inUseElsewhere = $state<string | null>(null);

	/** Created by `boot`, so xterm.js only loads once a project picks CheerpJ. */
	private console: JavaConsole | null = null;
	/** Holds the windows of every program run so far. */
	private display: CheerpjDisplay | null = null;
	private env: RuntimeEnv | null = null;
	/** Held for the tab's life, so only one tab or embed at a time uses `/files/`. */
	private lock: TabLock | null = null;
	/** Build output stays in IndexedDB, so a random root keeps sessions apart. */
	private readonly buildRoot = `/files/browsercode-${crypto.randomUUID()}`;
	private runs = 0;
	/** File names last copied to `/str/`, so a deleted source leaves it too. */
	private pushed = new SvelteSet<string>();

	constructor(private readonly source: ProjectSource) {
		this.stages = ['loading CheerpJ', source.hydrateLabel, 'compiling', 'running'];
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
			'BrowserCode: running Java with CheerpJ. Type here to feed System.in; Ctrl+D ends it.\n',
			'info'
		);
		try {
			await loadCheerpj();
		} catch (error) {
			this.console.write(`${error instanceof Error ? error.message : String(error)}\n`, 'error');
			throw error;
		}
		if (env.cancelled()) return null;
		this.console.attach();
		return this.context();
	}

	async mountDisplay(el: HTMLElement, onWindows: (open: boolean) => void): Promise<void> {
		if (!(await this.claim())) return;
		await loadCheerpj();
		this.display ??= createDisplay(el, onWindows);
	}

	async launch(): Promise<void> {
		// Without a dev server to wait for, saves are safe as soon as the files are in.
		this.env?.onSavable();
		await this.run();
	}

	/**
	 * Copies the sources to `/str/`, compiles them and runs the start command with the build
	 * output on its classpath. Compiling is this runtime's build step, so the command must be
	 * `java <main class> [args]`.
	 */
	async run(focus?: string): Promise<void> {
		const env = this.env;
		if (!env || env.cancelled()) return;
		env.onStage(SETUP);
		// CheerpJ cannot stop a program, so the last run's keeps going and only its windows are
		// cleared.
		this.display?.clearWindows();
		const start = await this.source.startCommand(this.context(focus));
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
		const sources = await this.pushSources();
		if (!sources) return;
		const out = `${this.buildRoot}/run-${++this.runs}`;
		let log = '';
		const stopListening = this.console!.listen((text) => (log += text));
		// Without `-Xlint`, warnings shrink to a `Note:` with no line to mark.
		const exit = await this.exec('javac', [
			'-d',
			out,
			'-Xlint',
			...[...sources.keys()].map((name) => `${STR_MOUNT}${name}`)
		]);
		stopListening();
		this.diagnostics = parseJavacOutput(log).flatMap((diagnostic) => {
			const path = diagnostic.path.startsWith(STR_MOUNT)
				? sources.get(diagnostic.path.slice(STR_MOUNT.length))
				: undefined;
			return path ? [{ ...diagnostic, path: path.slice(this.source.workdir.length + 1) }] : [];
		});
		if (exit !== 0) {
			this.console!.write(`javac exited with code ${exit}\n`, 'error');
			return;
		}
		env.onStage(STARTING);
		void this.exec('java', ['-cp', out, mainClass, ...args]).then((code) => {
			this.console!.write(`${mainClass} exited with code ${code}\n`, 'info');
		});
	}

	shutdown(): void {
		this.display?.dispose();
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

	private context(focus?: string): BootContext {
		return {
			focus,
			fs: this.fs,
			workdir: this.source.workdir,
			write: (data) => this.console!.write(data),
			// No working directory or color environment here, so `run`'s options go unused.
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
		if (command === 'javac') return runJavac(args);
		if (command === 'java') {
			const [classPath, mainClass, ...programArgs] =
				args[0] === '-cp' ? args.slice(1) : ['', ...args];
			return runJava(mainClass, classPath, programArgs);
		}
		this.console!.write(`${command}: not available on CheerpJ\n`, 'error');
		return Promise.resolve(127);
	}

	/**
	 * Copies every `.java` file to `/str/` and returns each one's path by its file name,
	 * or null after saying why it could not. `/str/` has no directories, and `javac` wants a
	 * public class in a file of its own name, so sources keep their file name and two of a name
	 * cannot coexist.
	 */
	private async pushSources(): Promise<SvelteMap<string, string> | null> {
		const { workdir } = this.source;
		const byName = new SvelteMap<string, string>();
		for (const path of this.fs.filesUnder(workdir).filter((p) => p.endsWith('.java'))) {
			const name = path.slice(path.lastIndexOf('/') + 1);
			const clash = byName.get(name);
			if (clash) {
				const rel = (p: string) => p.slice(workdir.length + 1);
				this.console!.write(
					`${rel(clash)} and ${rel(path)} share a file name; CheerpJ needs every .java file to have its own.\n`,
					'error'
				);
				return null;
			}
			byName.set(name, path);
		}
		if (byName.size === 0) {
			this.console!.write('No .java files to compile.\n', 'error');
			return null;
		}
		for (const name of this.pushed) if (!byName.has(name)) removeStringFile(`${STR_MOUNT}${name}`);
		for (const [name, path] of byName) {
			addStringFile(`${STR_MOUNT}${name}`, await this.fs.readBinaryFile(path));
		}
		this.pushed = new SvelteSet(byName.keys());
		return byName;
	}
}
