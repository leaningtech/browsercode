import type { BrowserPod } from '@leaningtech/browserpod';
import { POD_HOME, writePodFile } from '$lib/pod/fs';

const PRELOAD_PATH = `${POD_HOME}/.browsercode/claude-preload.cjs`;

/** The pod's zlib can't decode brotli or deflate, so requests ask Anthropic for gzip instead. */
const PRELOAD = [
	"for (const mod of [require('http'), require('https')]) {",
	'\tconst request = mod.request;',
	'\tmod.request = function (...args) {',
	'\t\tconst req = request.apply(this, args);',
	"\t\tif (/br|deflate/.test(String(req.getHeader('accept-encoding') ?? ''))) req.setHeader('accept-encoding', 'gzip');",
	'\t\treturn req;',
	'\t};',
	'}',
	''
].join('\n');

export async function prepareClaudePod(pod: BrowserPod): Promise<void> {
	await writePodFile(pod, PRELOAD_PATH, PRELOAD);
}

export function claudeEnv(): string[] {
	return [`NODE_OPTIONS=--require ${PRELOAD_PATH}`];
}
