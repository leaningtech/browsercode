/** Project source for a shallow GitHub clone. */
import { fetchRepoTree } from '$lib/github/api';
import { POD_HOME } from '$lib/pod/fs';
import { trackEvent } from '$lib/utils/useLazyTracking';
import { nodeProject } from './node-project';
import { projectLink } from './project-link';
import type { BootContext, ProjectSource } from './project-source';

export type RepoRef = { owner: string; repo: string; ref: string; dir: string };

export function repoSource({ owner, repo, ref, dir }: RepoRef): ProjectSource {
	const url = `https://github.com/${owner}/${repo}`;
	const repoDir = `${POD_HOME}/${repo}`;

	return {
		id: 'github',
		runtime: 'pod',
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
		initialFile: (files: string[]) => findReadme(files) ?? files[0],
		...nodeProject(repoDir),
		trackBoot: () => trackEvent('Booted Playground GitHub', { repo: `${owner}/${repo}` }),
		share: (files) => projectLink(files)
	};
}

/** The top-level README the repo page on GitHub would show, preferring Markdown. */
function findReadme(files: string[]): string | undefined {
	const readmes = files.filter((path) => /^readme(\.[^/]*)?$/i.test(path));
	return readmes.find((path) => /\.(md|markdown)$/i.test(path)) ?? readmes[0];
}
