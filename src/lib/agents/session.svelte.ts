import type { PortalUpdate } from '$lib/pod/portals';
import {
	cliConfigs,
	isEnabledTool,
	resolveToolId,
	toolItems,
	type CredentialSpec,
	type ToolId,
	type ToolItem
} from '$lib/config/tools';
import {
	installLeaveGuard,
	markIntentionalNavigation,
	navigateWithLeaveGuard
} from '$lib/stores/leaveWarning.svelte';
import { requestSingleTabLock } from '$lib/utils/tabLock';
import { bootCLI } from './boot';
import { CredentialGate } from './credential-gate.svelte';

/** `pending` covers the wait on the lock, which resolves after a grace period rather than at once. */
export type LockState = 'pending' | 'held' | 'taken';

/** Owns one agent CLI session. */
export class AgentSession {
	readonly id: ToolId;
	readonly tool: ToolItem;
	readonly credential: CredentialSpec | undefined;
	/** Null for a CLI that declares no credential; those boot with no overlay at all. */
	readonly gate: CredentialGate | null;

	lock = $state<LockState>('pending');

	private releaseLock: () => void = () => {};
	private disposeLeaveGuard: () => void = () => {};

	constructor(requestedTool: string | undefined) {
		this.id = resolveToolId(requestedTool);
		// resolveToolId only ever returns an id that is in toolItems, so this always resolves.
		this.tool = toolItems.find((item) => item.id === this.id)!;
		// Mirrors bootCLI's own resolution, so the gate matches the config that actually launches.
		this.credential = (cliConfigs[this.id] ?? cliConfigs.claude).credential;
		this.gate = this.credential
			? new CredentialGate(this.credential, { onRestart: this.restart })
			: null;
	}

	async boot(
		terminalEl: HTMLElement,
		onPortalUpdate: (update: PortalUpdate) => void
	): Promise<void> {
		const lock = requestSingleTabLock(`agent-session:${this.id}`);
		this.releaseLock = lock.release;

		if (!(await lock.acquired)) {
			this.lock = 'taken';
			return;
		}
		this.lock = 'held';

		// Only warn on tab close/refresh/back-button once there is work here to lose.
		this.disposeLeaveGuard = installLeaveGuard();

		// Covers pod boot, the image streaming in, and any warm-up probe.
		this.gate?.begin();

		try {
			await bootCLI(
				this.id,
				terminalEl,
				onPortalUpdate,
				this.gate ? { beforeLaunch: this.gate.beforeLaunch } : undefined
			);
		} catch (error) {
			// bootCLI already logged this and wrote it into the terminal, but a gated boot's overlay
			// covers that terminal until it is told to show the failure.
			this.gate?.reportBootFailure(error);
		}
	}

	/** The CLI reads its credential at launch, so both a new secret and a retry need a fresh load. */
	restart = (): void => {
		markIntentionalNavigation();
		window.location.reload();
	};

	/** Always confirms: there is a live session here to tear down. */
	switchTo = (id: string): void => {
		if (isEnabledTool(id)) navigateWithLeaveGuard(`/agents/${id}`, true);
	};

	/** No confirmation, unlike `switchTo` */
	leave = (): void => navigateWithLeaveGuard('/agents', false);

	shutdown(): void {
		this.disposeLeaveGuard();
		this.releaseLock();
	}
}
