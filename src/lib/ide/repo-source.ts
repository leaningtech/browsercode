/** Project source for a shallow GitHub clone. */
import { fetchRepoTree } from '$lib/github/api';
import { POD_HOME } from '$lib/pod/fs';
import { trackEvent } from '$lib/utils/useLazyTracking';
import {
	PACKAGE_MANAGER_ENV,
	declaresPnpm,
	patchClonedManifest,
	resolveInstallArgs,
	usesWorkspaceProtocol,
	type PackageManager
} from './native-deps';
import { ANSI } from './shell-rc';
import type { BootContext, ProjectCommand, ProjectSource } from './project-source';

export type RepoRef = { owner: string; repo: string; ref: string; dir: string };

export function repoSource({ owner, repo, ref, dir }: RepoRef): ProjectSource {
	const url = `https://github.com/${owner}/${repo}`;
	const repoDir = `${POD_HOME}/${repo}`;
	// Filled by prepare(), from the one manifest read both the package manager and the install
	// flags are resolved from. Until then, what a repo with nothing special about it would get.
	let packageManager: PackageManager = 'npm';
	let install: ProjectCommand = packageManagerCommand('npm', ['install']);

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
		prepare: async (ctx: BootContext): Promise<void> => {
			const prepared = await prepareManifest(ctx, repoDir);
			packageManager = prepared.packageManager;
			install = packageManagerCommand(packageManager, prepared.installArgs);
		},
		initialFile: (files: string[]) => files[0],
		installCommands: () => [install],
		startCommand: (ctx: BootContext) => resolveStartScript(ctx, packageManager),
		trackBoot: () => trackEvent('Booted Playground GitHub', { repo: `${owner}/${repo}` })
	};
}

/** Runs `args` under `pm`, carrying whatever environment that package manager needs in the pod. */
function packageManagerCommand(pm: PackageManager, args: string[]): ProjectCommand {
	return { command: [pm, ...args], env: PACKAGE_MANAGER_ENV[pm] };
}

/** True when something is readable at `path`; the size itself is never used. */
async function fileExists(ctx: BootContext, path: string): Promise<boolean> {
	try {
		await ctx.fs.fileSize(path);
		return true;
	} catch {
		return false;
	}
}

/**
 * A `workspace:` dependency is unresolvable by plain npm regardless of where it's declared, so that
 * alone is reason enough to use pnpm. Failing that, pnpm-specific markers (`pnpm-workspace.yaml`,
 * the `packageManager` field) only count at the clone root, not for an arbitrary subdirectory: they
 * conventionally live at the workspace root and are not copied into every subpackage, but nor does
 * every directory under a pnpm-workspace root belong to that workspace. `vitejs/vite`'s own
 * `template-*` scaffolds, for instance, sit under a pnpm-workspace root but are deliberately left
 * out of its `packages:` glob — switching them to pnpm would risk the root's own workspace-wide
 * `overrides` (e.g. `vite: workspace:*`) leaking into a manifest that was never a workspace member.
 */
async function resolvePackageManager(
	ctx: BootContext,
	repoDir: string,
	raw: string
): Promise<PackageManager> {
	if (declaresPnpm(raw) || usesWorkspaceProtocol(raw)) return 'pnpm';
	if (ctx.workdir !== repoDir) return 'npm';
	return (await fileExists(ctx, `${repoDir}/pnpm-workspace.yaml`)) ? 'pnpm' : 'npm';
}

/**
 * Patches the cloned manifest and returns the install args and package manager for it. All three
 * come from the one read, so install does not re-read the file prepare() just wrote.
 */
async function prepareManifest(
	ctx: BootContext,
	repoDir: string
): Promise<{ installArgs: string[]; packageManager: PackageManager }> {
	const manifestPath = `${ctx.workdir}/package.json`;
	let raw: string;
	try {
		raw = await ctx.fs.readFile(manifestPath);
	} catch (error) {
		ctx.write(
			`\r\n${ANSI.coral}Could not patch package.json; installing the repo as cloned.${ANSI.reset}\r\n`
		);
		console.warn('Could not patch the cloned manifest:', error);
		return { installArgs: ['install'], packageManager: 'npm' };
	}
	const packageManager = await resolvePackageManager(ctx, repoDir, raw);
	const result = patchClonedManifest(raw);
	if (!result) {
		ctx.write(`\r\n${ANSI.dim}No dependency patches apply to this repo.${ANSI.reset}\r\n`);
		return { installArgs: resolveInstallArgs(raw, packageManager), packageManager };
	}
	await ctx.fs.writeFile(manifestPath, result.patched);
	// Header takes the leading blank line; the changes follow indented under it as one block.
	ctx.write(`\r\n${ANSI.dim}Modified package.json${ANSI.reset}\r\n`);
	for (const note of result.notes) ctx.write(`${ANSI.dim}  ${note}${ANSI.reset}\r\n`);
	return { installArgs: resolveInstallArgs(result.patched, packageManager), packageManager };
}

async function resolveStartScript(
	ctx: BootContext,
	packageManager: PackageManager
): Promise<ProjectCommand | null> {
	let scripts: Record<string, string> = {};
	try {
		const raw = await ctx.fs.readFile(`${ctx.workdir}/package.json`);
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
	return packageManagerCommand(packageManager, ['run', script]);
}
