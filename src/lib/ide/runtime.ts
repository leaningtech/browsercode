/**
 * The backend an `IdeSession` runs its project on. The session owns the UI state (tree, tabs,
 * boot stage) and the order of the boot pipeline; the runtime owns the machine underneath it and
 * hands the source hooks the context they reach it through.
 */
import type { PortalUpdate } from '$lib/pod/portals';
import type { PodBlocker } from '$lib/utils/platform';
import type { BootContext } from './project-source';
import type { WorkspaceFs } from './workspace-fs';

/**
 * Indices into `IdeRuntime.stages`. The session reports the first two for every runtime; the
 * runtime reports the last two through `onStage`, naming them in `stages`: `SETUP` readies the
 * project (a pod's install step, CheerpJ's `javac`), `STARTING` starts it. A `run` goes back
 * to `SETUP`.
 */
export const BOOTING = 0;
export const HYDRATING = 1;
export const SETUP = 2;
export const STARTING = 3;

/** A build message pinned to a project file, by its workdir-relative path; counts from 1. */
export type Diagnostic = {
	path: string;
	line: number;
	column: number;
	severity: 'error' | 'warning';
	message: string;
};

/** What the session hands a runtime for one boot. */
export type RuntimeEnv = {
	/** Where the runtime mounts its output view. */
	outputEl: HTMLElement;
	onPortal: (update: PortalUpdate) => void;
	/** Fires whenever the output view prints, including while it is hidden. */
	onOutput: () => void;
	/** Says saves are safe from now on; until then the editor keeps edits to itself. */
	onSavable: () => void;
	/** Reports a stage past `HYDRATING`, as an index into `stages`. */
	onStage: (index: number) => void;
	/** True once the boot was superseded or the session unmounted; the runtime must stop. */
	cancelled: () => boolean;
};

export interface IdeRuntime {
	/** Throws until `boot` has brought the machine up; holds the project once the source hydrates it. */
	readonly fs: WorkspaceFs;
	/**
	 * The loader's boot lines. The session reports the first two itself: `BOOTING` while `boot`
	 * runs, `HYDRATING` while the source hydrates. `launch` and `run` report the rest.
	 */
	readonly stages: readonly string[];
	/** The image URL of the mark the loader shows while this runtime boots: its own logo. */
	readonly loaderMark: string;
	/** What the last build reported against the sources; absent where nothing reports any. */
	readonly diagnostics?: readonly Diagnostic[];
	/** Why this runtime cannot run in this browser, or null when it can. */
	blocker(): PodBlocker | null;
	/**
	 * Brings the machine up and returns the context the source hooks run against; null when the
	 * boot was cancelled in flight.
	 */
	boot(env: RuntimeEnv): Promise<BootContext | null>;
	/** Starts whatever the project runs. */
	launch(): Promise<void>;
	/**
	 * Builds and starts the project again from its current files, resolving once it has started
	 * or failed to; absent where a dev server picks up saved files by itself. The session never
	 * calls it before `launch` resolves or while another run is under way. `focus` is the
	 * workdir-relative path of the file in front of the user.
	 */
	run?(focus?: string): Promise<void>;
	/**
	 * Hands the program's own windows `el` to draw into, which the shell shows in place of a
	 * preview; absent where the preview is a served app. `onWindows` hears whether any window is
	 * open, as programs open them and runs clear them.
	 */
	mountDisplay?(el: HTMLElement, onWindows: (open: boolean) => void): Promise<void>;
	/** Attaches an interactive shell to `el`; absent on runtimes without one. */
	startBash?(el: HTMLElement): Promise<void>;
	/** Tears the machine down; safe to call before or during `boot`. */
	shutdown(): void;
}
