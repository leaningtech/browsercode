import type { BrowserPod, Terminal, TextFile } from '@leaningtech/browserpod';
import {
	POD_HOME,
	podFileSize,
	writePodBinaryFile,
	writePodFile,
	writeToTerminal
} from '$lib/pod/fs';

/**
 * Pinned, with the binary's SHA-512, since it is fetched at launch rather than baked into a
 * reviewed disk image. Bump both together.
 */
const CODEX_VERSION = '0.163.0';
/**
 * opt.browserpod.io only sends CORS headers to browsercode.io, *.browsercode.pages.dev and
 * localhost:5173, so a dev server on any other port fails the download with "Failed to fetch".
 */
const CODEX_URL = `https://opt.browserpod.io/agents/codex/${CODEX_VERSION}/codex`;
const CODEX_SHA512 =
	'2ae3d4af8faaa1dbdf935372961ac4e50286523ec8b6d8f5b60d319305f74e26686363393cf597cafb6bd11aec02c09ec84f76a3fb7e2425a7e1faf2c11854f5';

/** Versioned, so a bump installs alongside rather than over a half-written older copy. */
const CODEX_DIR = `${POD_HOME}/.browsercode/codex-${CODEX_VERSION}`;
export const CODEX_BIN_PATH = `${CODEX_DIR}/codex`;
/** Written last, so an install cut short by a reload is redone rather than launched. */
const INSTALLED_MARKER = `${CODEX_DIR}/.installed`;

const CODEX_CONFIG_PATH = '/home/user/.codex/config.toml';
const API_KEY_STORAGE = 'codex-api-key';

/**
 * The built-in OpenAI provider shows Codex's own login screen even with the key in the env; a
 * custom provider that reads it from `env_key` skips straight to the prompt.
 */
const CODEX_CONFIG = `sandbox_mode = "danger-full-access"
model_provider = "openai-http"

[model_providers.openai-http]
name = "OpenAI"
env_key = "OPENAI_API_KEY"

[analytics]
enabled = false
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

export async function prepareCodexPod(pod: BrowserPod, terminal: Terminal): Promise<void> {
	if (!(await isCodexInstalled(pod))) await installCodex(pod, terminal);
	if (!(await hasCodexConfig(pod))) await writePodFile(pod, CODEX_CONFIG_PATH, CODEX_CONFIG);
}

/**
 * Fetched by the page, not the pod: the pod's network only reaches allowlisted hosts, and this way
 * the download can report progress.
 */
async function installCodex(pod: BrowserPod, terminal: Terminal): Promise<void> {
	writeToTerminal(terminal, `Downloading Codex ${CODEX_VERSION} (first launch only)...\r\n`);
	const binary = await download(CODEX_URL, (received, total) => {
		const progress = total ? `${formatMB(received)} / ${formatMB(total)}` : formatMB(received);
		writeToTerminal(terminal, `\r\x1b[K${progress}`);
	});
	writeToTerminal(terminal, '\r\n');

	if ((await sha512Hex(binary)) !== CODEX_SHA512) {
		throw new Error(`Codex ${CODEX_VERSION} failed its checksum; the download may be corrupt.`);
	}

	await writePodBinaryFile(pod, CODEX_BIN_PATH, binary);
	// The file API has no mode argument, so the binary lands non-executable.
	const chmodTerminal = await pod.createCustomTerminal({ onOutput: () => {} });
	// Typed as an opaque `Process`, but awaiting it yields the exit code.
	const exitCode = (await pod.run('chmod', ['755', CODEX_BIN_PATH], {
		terminal: chmodTerminal,
		echo: false
	})) as unknown as number;
	if (exitCode !== 0) throw new Error(`Could not make Codex executable (exit code ${exitCode})`);

	await writePodFile(pod, INSTALLED_MARKER, CODEX_VERSION);
}

async function download(
	url: string,
	onProgress: (received: number, total: number | null) => void
): Promise<ArrayBuffer> {
	const response = await fetch(url);
	if (!response.ok || !response.body) {
		throw new Error(`Failed to download "${url}" (${response.status} ${response.statusText})`);
	}
	const total = Number(response.headers.get('content-length')) || null;
	const chunks: Uint8Array[] = [];
	let received = 0;
	const reader = response.body.getReader();
	for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
		chunks.push(chunk.value);
		received += chunk.value.byteLength;
		onProgress(received, total);
	}

	const binary = new Uint8Array(received);
	let offset = 0;
	for (const chunk of chunks) {
		binary.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return binary.buffer;
}

async function sha512Hex(data: ArrayBuffer): Promise<string> {
	const digest = new Uint8Array(await crypto.subtle.digest('SHA-512', data));
	return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function formatMB(bytes: number): string {
	return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

async function isCodexInstalled(pod: BrowserPod): Promise<boolean> {
	try {
		return (await podFileSize(pod, INSTALLED_MARKER)) > 0;
	} catch {
		return false;
	}
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
