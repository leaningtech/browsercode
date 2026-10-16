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
 * rest are the steps each runtime's `launch` reports through `onStage`.
 */
export const BOOTING = 0;
export const HYDRATING = 1;
/** BrowserPod: `npm install`, then the dev server. */
export const INSTALLING = 2;
export const STARTING = 3;

/** What the session hands a runtime for one boot. */
export type RuntimeEnv = {
	/** Where the runtime mounts its output view. */
	outputEl: HTMLElement;
	onPortal: (update: PortalUpdate) => void;
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
	 * runs, `HYDRATING` while the source hydrates. `launch` reports the rest through `onStage`.
	 */
	readonly stages: readonly string[];
	/** Why this runtime cannot run in this browser, or null when it can. */
	blocker(): PodBlocker | null;
	/**
	 * Brings the machine up and returns the context the source hooks run against; null when the
	 * boot was cancelled in flight.
	 */
	boot(env: RuntimeEnv): Promise<BootContext | null>;
	/** Starts whatever the project runs. */
	launch(): Promise<void>;
	/** Attaches an interactive shell to `el`; absent on runtimes without one. */
	startBash?(el: HTMLElement): Promise<void>;
	/** Tears the machine down; safe to call before or during `boot`. */
	shutdown(): void;
}
