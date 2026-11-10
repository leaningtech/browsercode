/**
 * How a project gets onto its runtime. `IdeSession` runs one boot pipeline over these hooks.
 */
import type { RuntimeId } from '$lib/config/frameworks';
import type { JavaVersion } from '$lib/java/versions';
import type { WorkspaceFs } from './workspace-fs';

/** Runtime-side handles the hooks work against; the session owns the boot token. */
export type BootContext = {
	fs: WorkspaceFs;
	workdir: string;
	/** Writes raw text to the Output terminal. */
	write: (data: string) => void;
	/**
	 * Runs a program on the runtime, echoed on the Output terminal. A runtime ignores the options
	 * it has no use for.
	 */
	run: (
		command: string,
		args: string[],
		options?: { cwd?: string; color?: boolean }
	) => Promise<void>;
	/** True once the boot was superseded or the session unmounted; a hook must return early. */
	cancelled: () => boolean;
};

/**
 * One program invocation a source asks the runtime to run, as `[program, ...args]`, plus any
 * environment that invocation needs on top of whatever the runtime already sets.
 */
export type ProjectCommand = { command: string[]; env?: string[] };

export type ProjectSource = {
	/** The runtime the project boots on. */
	runtime: RuntimeId;
	/** Carried into analytics and bug reports as the boot mode. */
	id: string;
	/** Doubles as the filename the project downloads under. */
	label: string;
	/** Names the hydrate step in the preview loader's boot log. */
	hydrateLabel: string;
	/** Where the project lands; runtime paths resolve against it. */
	workdir: string;
	/** Preview is pinned to this port when set. Unknown for an arbitrary repo. */
	appPort?: number;
	/** What this session cloned, for the bug report's repo field. */
	repo?: { url: string; ref: string };
	/** Fetched before the runtime boots, so the file tree renders while the project arrives. */
	listFiles: () => Promise<string[]>;
	hydrate: (ctx: BootContext, files: string[]) => Promise<void>;
	/** Runs once the files are readable, before the first tab opens. */
	prepare?: (ctx: BootContext) => Promise<void>;
	initialFile: (files: string[]) => string | undefined;
	/** Commands run in order before the start command. */
	installCommands: () => ProjectCommand[];
	/**
	 * Command that starts the project, or null when there is nothing to run. A source returning
	 * null has already said so on the terminal.
	 */
	startCommand: (ctx: BootContext) => Promise<ProjectCommand | null>;
	/** Called once the files are readable, so a boot that dies earlier is not counted. */
	trackBoot: () => void;
	/** The Java CheerpJ boots; absent for a project that isn't Java. */
	javaVersion?: JavaVersion;
	/** The binary name of the class a Java project starts from; absent when it names none. */
	mainClass?: string;
	/**
	 * A link, relative to the site, that reopens `files` with the Java version and main class;
	 * absent where there is no format for one.
	 */
	share?: (
		files: { path: string; content: string }[],
		javaVersion?: JavaVersion,
		mainClass?: string
	) => string;
};
