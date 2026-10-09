import type { BrowserPod, TextFile } from '@leaningtech/browserpod';
import { raceWithTimeout, writePodFile } from '$lib/pod/fs';

/** The disk image mounts at /home, not /home/user. */
export const CODEX_BIN_PATH = '/home/.bin/codex';
const CODEX_CONFIG_PATH = '/home/user/.codex/config.toml';
const API_KEY_STORAGE = 'codex-api-key';

/** API-key auth against the Responses API, per the BrowserPod team. */
const CODEX_CONFIG = `sandbox_mode = "danger-full-access"
model_provider = "openai-http"
analytics_enabled = false

[model_providers.openai-http]
name = "OpenAI"
base_url = "https://api.openai.com/v1"
wire_api = "responses"
env_key = "OPENAI_API_KEY"

[features]
code_mode = false
code_mode_only = false
`;

/** Embedded in a third-party frame the browser may partition storage away, or refuse it outright. */
export function getCodexApiKey(): string | null {
	try {
		return localStorage.getItem(API_KEY_STORAGE);
	} catch (error) {
		console.warn('Could not read the stored API key:', error);
		return null;
	}
}

export function setCodexApiKey(key: string): void {
	try {
		localStorage.setItem(API_KEY_STORAGE, key);
	} catch (error) {
		console.warn('Could not persist the API key:', error);
	}
}

/** Codex reads the key from its environment, so it is only injectable at launch. */
export function codexEnv(): string[] {
	const key = getCodexApiKey();
	return key ? [`OPENAI_API_KEY=${key}`] : [];
}

export async function prepareCodexPod(pod: BrowserPod): Promise<void> {
	if (!(await hasCodexConfig(pod))) await writePodFile(pod, CODEX_CONFIG_PATH, CODEX_CONFIG);
	await warmCodexBinary(pod);
}

/**
 * Streaming the image's blocks over a cold cache is the slow part; well past that, the probe is
 * never going to answer and waiting forever would just spin the loading card silently.
 */
const WARMUP_TIMEOUT_MS = 120_000;

/**
 * Pulls the image's blocks in behind the loading card, since they stream lazily on first exec.
 * Output is the only completion signal: `pod.run` resolves on spawn, not exit — so a missing or
 * broken binary shows up as silence, not as a rejection. Time it out rather than hang.
 */
async function warmCodexBinary(pod: BrowserPod): Promise<void> {
	let onFirstOutput!: () => void;
	const ran = new Promise<void>((resolve) => (onFirstOutput = resolve));
	const terminal = await pod.createCustomTerminal({
		onOutput: (buffer) => {
			if (buffer.byteLength > 0) onFirstOutput();
		}
	});

	await pod.run(CODEX_BIN_PATH, ['--version'], { terminal });

	await raceWithTimeout(ran, WARMUP_TIMEOUT_MS, () => {
		throw new Error(
			`Codex did not respond within ${WARMUP_TIMEOUT_MS / 1000}s. The disk image may still ` +
				`be streaming on a slow connection, or ${CODEX_BIN_PATH} is missing from it.`
		);
	});
}

async function hasCodexConfig(pod: BrowserPod): Promise<boolean> {
	try {
		const file = (await pod.openFile(CODEX_CONFIG_PATH, 'utf-8')) as TextFile;
		const size = await file.getSize();
		await file.close();
		return size > 0;
	} catch {
		return false;
	}
}
