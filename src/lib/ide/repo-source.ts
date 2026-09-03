/** Project source for a shallow GitHub clone. */
import { fetchRepoTree } from '$lib/github/api';
import { POD_HOME, readPodFile, writePodFile } from '$lib/pod/fs';
import { trackEvent } from '$lib/utils/useLazyTracking';
import { patchClonedManifest } from './native-deps';
import { ANSI } from './shell-rc';
import type { BootContext, ProjectSource } from './project-source';

export type RepoRef = { owner: string; repo: string; ref: string; dir: string };

export function repoSource({ owner, repo, ref, dir }: RepoRef): ProjectSource {
	const url = `https://github.com/${owner}/${repo}`;
	const repoDir = `${POD_HOME}/${repo}`;

	return {
		id: 'github',
		label: dir ? `${owner}/${repo}/${dir}` : `${owner}/${repo}`,
		hydrateLabel: 'cloning repository',
		workdir: dir ? `${repoDir}/${dir}` : repoDir,
		repo: { url, ref },
		listFiles: async (): Promise<string[]> => {
			try {
				return await fetchRepoTree(owner, repo, ref, dir);
			} catch (error) {
				// The tree only renders the file list early; the clone still produces it.
				console.error('Failed to fetch repo file tree:', error);
				return [];
			}
		},
		hydrate: (ctx: BootContext): Promise<void> =>
			ctx.run('git', ['clone', '--depth', '1', '--branch', ref, `${url}.git`], {
				cwd: POD_HOME,
				color: false
			}),
		// Patched before the first tab opens, so the editor shows the manifest install will see.
		prepare: patchManifest,
		initialFile: (files: string[]) => files[0],
		installCommands: () => [['install']],
		startCommand: resolveStartScript,
		trackBoot: () => trackEvent('Booted Playground GitHub', { repo: `${owner}/${repo}` })
	};
}

async function patchManifest(ctx: BootContext): Promise<void> {
	const manifestPath = `${ctx.workdir}/package.json`;
	try {
		const raw = await readPodFile(ctx.pod, manifestPath);
		const result = patchClonedManifest(raw);
		if (!result) {
			ctx.write(`\r\n${ANSI.dim}No dependency patches apply to this repo.${ANSI.reset}\r\n`);
			return;
		}
		await writePodFile(ctx.pod, manifestPath, result.patched);
		// Header takes the leading blank line; the changes follow indented under it as one block.
		ctx.write(`\r\n${ANSI.dim}Modified package.json${ANSI.reset}\r\n`);
		for (const note of result.notes) ctx.write(`${ANSI.dim}  ${note}${ANSI.reset}\r\n`);
	} catch (error) {
		ctx.write(
			`\r\n${ANSI.coral}Could not patch package.json; installing the repo as cloned.${ANSI.reset}\r\n`
		);
		console.warn('Could not patch the cloned manifest:', error);
	}
}

async function resolveStartScript(ctx: BootContext): Promise<string[] | null> {
	let scripts: Record<string, string> = {};
	try {
		const raw = await readPodFile(ctx.pod, `${ctx.workdir}/package.json`);
		scripts = (JSON.parse(raw) as { scripts?: Record<string, string> }).scripts ?? {};
	} catch (error) {
		console.error('Failed to read package.json:', error);
	}
	const script = scripts.dev ? 'dev' : scripts.start ? 'start' : null;
	if (!script) {
		ctx.write(
			`\r\n${ANSI.coral}No "dev" or "start" script in package.json — nothing to run.${ANSI.reset}\r\n`
		);
		return null;
	}
	return ['run', script];
}
