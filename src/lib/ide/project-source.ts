/**
 * How a project gets into the pod. `IdeSession` runs one boot pipeline over these hooks.
 */
import type { BrowserPod } from '@leaningtech/browserpod';

/** Pod-side handles the hooks work against; the session owns the terminal and the boot token. */
export type BootContext = {
	pod: BrowserPod;
	workdir: string;
	/** Writes raw text to the Output terminal. */
	write: (data: string) => void;
	run: (
		command: string,
		args: string[],
		options?: { cwd?: string; color?: boolean }
	) => Promise<void>;
	/** True once the boot was superseded or the session unmounted; a hook must return early. */
	cancelled: () => boolean;
};

export type ProjectSource = {
	/** Carried into analytics and bug reports as the boot mode. */
	id: string;
	/** Doubles as the filename the project downloads under. */
	label: string;
	/** Names the hydrate step in the preview loader's boot log. */
	hydrateLabel: string;
	/** Where the project lands; pod paths resolve against it. */
	workdir: string;
	/** Preview is pinned to this port when set. Unknown for an arbitrary repo. */
	appPort?: number;
	/** What this session cloned, for the bug report's repo field. */
	repo?: { url: string; ref: string };
	/** Fetched before the pod boots, so the file tree renders while the project arrives. */
	listFiles: () => Promise<string[]>;
	hydrate: (ctx: BootContext, files: string[]) => Promise<void>;
	/** Runs once the pod is readable, before the first tab opens. */
	prepare?: (ctx: BootContext) => Promise<void>;
	initialFile: (files: string[]) => string | undefined;
	/** npm invocations run before the dev server. */
	installCommands: () => string[][];
	/**
	 * npm invocation that starts the dev server, or null when there is nothing to run. A source
	 * returning null has already said so on the terminal.
	 */
	startCommand: (ctx: BootContext) => Promise<string[] | null>;
	/** Called once the pod is readable, so a boot that dies earlier is not counted. */
	trackBoot: () => void;
};
