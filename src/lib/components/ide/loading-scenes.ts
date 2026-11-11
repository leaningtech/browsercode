import type { Component } from 'svelte';
import type { RuntimeId } from '$lib/config/frameworks';
import CheerpjLoadingScene from './CheerpjLoadingScene.svelte';
import PodLoadingScene from './PodLoadingScene.svelte';

/** What the shell hands a loading scene while its runtime boots. */
export type LoadingSceneProps = {
	/** The runtime's boot lines, dmesg-style (lowercase). */
	lines: readonly string[];
	/** Highest line index real progress justifies revealing (-1 before boot starts). */
	activeLine: number;
	/** The project is up: play the arrival, then call `onFlashComplete` to hand over. */
	flash: boolean;
	onFlashComplete: () => void;
};

/** Each runtime's scene, so the loader says which machine is starting. */
export const LOADING_SCENES: Record<RuntimeId, Component<LoadingSceneProps>> = {
	pod: PodLoadingScene,
	cheerpj: CheerpjLoadingScene
};
