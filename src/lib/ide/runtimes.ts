import type { RuntimeId } from '$lib/config/frameworks';
import { CheerpjRuntime } from './cheerpj-runtime.svelte';
import { PodRuntime } from './pod-runtime';
import type { ProjectSource } from './project-source';
import type { IdeRuntime } from './runtime';

/**
 * How each runtime a source can name gets built. `IdeSession` looks its runtime up here, so a new
 * runtime is one entry rather than another branch in the session.
 */
export const RUNTIMES: Record<
	RuntimeId,
	(source: ProjectSource, apiKey: string | undefined) => IdeRuntime
> = {
	pod: (source, apiKey) => new PodRuntime(source, apiKey),
	cheerpj: (source) => new CheerpjRuntime(source)
};
