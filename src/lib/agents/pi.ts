import type { BrowserPod, Terminal } from '@leaningtech/browserpod';
import { POD_HOME, podFileSize, raceWithTimeout, writeToTerminal } from '$lib/pod/fs';

/**
 * Pinned, with npm's own integrity hash (its `dist.integrity`, as hex for `sha512sum`), since the
 * package is fetched straight from the registry rather than baked into a reviewed disk image.
 * Bump both together.
 */
const PI_VERSION = '1.0.4';
const PI_TARBALL = `https://registry.npmjs.org/@earendil-works/pi-coding-agent/-/pi-coding-agent-${PI_VERSION}.tgz`;
const PI_SHA512 =
	'fbde7a9df3051ebe650d4558ff643893e633a23cc1b826815c5823d1e4a55d51abed056589575d29d7353f3eb2560d5d3a525099bebb768395ae532c21c21d6b';

/** Versioned, so a bump installs alongside rather than over a half-written older copy. */
const PI_DIR = `${POD_HOME}/.browsercode/pi-${PI_VERSION}`;
/** The package's own `bin`. Its CLI is a self-contained bundle, so no node_modules are needed. */
export const PI_CLI_PATH = `${PI_DIR}/dist/bundle/cli.js`;
/** Written last, so an install cut short by a reload is redone rather than launched. */
const INSTALLED_MARKER = `${PI_DIR}/.installed`;

/** Built from parts by the script, so the echoed command line can never match it. */
const DONE = 'PI_INSTALL-OK';
const FAILED = 'PI_INSTALL-FAILED';

/**
 * Chained with `&&` rather than `set -e`, which bash ignores in a command whose status is tested.
 * Decompressed to a file first: BrowserPod truncates a pipe this large, which fails both
 * `gunzip | tar` and `tar -z`.
 */
const INSTALL_SCRIPT =
	[
		`rm -rf '${PI_DIR}'`,
		`mkdir -p '${PI_DIR}'`,
		`cd '${PI_DIR}'`,
		`curl -fsS --max-time 300 -o pi.tgz '${PI_TARBALL}'`,
		`echo '${PI_SHA512}  pi.tgz' | sha512sum -c`,
		'gunzip -c pi.tgz > pi.tar',
		'tar -xf pi.tar --strip-components=1',
		'rm pi.tgz pi.tar',
		`echo '${PI_VERSION}' > .installed`,
		"printf '%s-%s\\n' PI_INSTALL OK"
	].join(' && ') + " || printf '%s-%s\\n' PI_INSTALL FAILED";

/** Download and unpack take seconds; well past that, the script is never going to report back. */
const INSTALL_TIMEOUT_MS = 300_000;

/**
 * The version is pinned here, and `pi update` cannot replace a copy it did not install, so its
 * "update available" notice would be a dead end. The rest of Pi's network use stays on: the pod
 * ships the `fd` and `rg` it would otherwise download.
 */
export function piEnv(): string[] {
	return ['PI_SKIP_VERSION_CHECK=1'];
}

/** Pi signs in from its own `/login`, which hands the provider's page to `xdg-open`. */
export function openPiUrl(urlOrPath: string): void {
	if (urlOrPath.startsWith('https://')) window.open(urlOrPath, '_blank', 'noopener');
}

/**
 * Installs the pinned package into the pod's persistent /home, once per storage key. The script's
 * output is the only completion signal, as `pod.run` exposes no exit code; it is mirrored into
 * `terminal`, so a failing step is shown where the user is looking.
 */
export async function preparePiPod(pod: BrowserPod, terminal: Terminal): Promise<void> {
	if (await isInstalled(pod)) return;

	writeToTerminal(terminal, `Installing Pi ${PI_VERSION} (first launch only)...\r\n`);

	const decoder = new TextDecoder();
	let output = '';
	let onResult!: (ok: boolean) => void;
	const result = new Promise<boolean>((resolve) => (onResult = resolve));
	const installTerminal = await pod.createCustomTerminal({
		onOutput: (buffer) => {
			// Copied: the pod hands over a resizable buffer, which TextDecoder refuses.
			const text = decoder.decode(new Uint8Array(buffer).slice(), { stream: true });
			output += text;
			writeToTerminal(terminal, text.replace(DONE, '').replace(FAILED, ''));
			if (output.includes(DONE)) onResult(true);
			else if (output.includes(FAILED)) onResult(false);
		}
	});

	await pod.run('bash', ['-c', INSTALL_SCRIPT], { terminal: installTerminal, echo: false });

	const ok = await raceWithTimeout(result, INSTALL_TIMEOUT_MS, () => false);
	if (!ok) {
		throw new Error(`Pi ${PI_VERSION} failed to install; the terminal shows the step that failed.`);
	}
}

async function isInstalled(pod: BrowserPod): Promise<boolean> {
	try {
		return (await podFileSize(pod, INSTALLED_MARKER)) > 0;
	} catch {
		return false;
	}
}
