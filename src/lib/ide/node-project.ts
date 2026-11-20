/** How a Node project installs and starts, worked out from its own manifest. */
import {
	declaresPnpm,
	packageManagerCommand,
	patchClonedManifest,
	resolveInstallArgs,
	usesWorkspaceProtocol,
	type PackageManager
} from './native-deps';
import { PNPM_WORKSPACE_FILE, patchPnpmOverrides } from './pnpm-workspace';
import { ANSI } from './shell-rc';
import type { BootContext, ProjectCommand, ProjectSource } from './project-source';

/** Installs and starts a Node project as its manifest asks; `repoDir` is the project root. */
export function nodeProject(
	repoDir: string
): Pick<ProjectSource, 'prepare' | 'installCommands' | 'startCommand'> {
	// prepare() fills these from the manifest; until then, what a plain repo gets.
	let packageManager: PackageManager = 'npm';
	let install: ProjectCommand = packageManagerCommand('npm', ['install']);

	return {
		// Patched before the first tab opens, so the editor shows the manifest install will see.
		prepare: async (ctx: BootContext): Promise<void> => {
			const prepared = await prepareManifest(ctx, repoDir);
			packageManager = prepared.packageManager;
			install = packageManagerCommand(packageManager, prepared.installArgs);
			if (packageManager === 'pnpm') await preparePnpmOverrides(ctx, repoDir);
		},
		installCommands: () => [install],
		startCommand: (ctx: BootContext) => resolveStartScript(ctx, packageManager)
	};
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
 * `workspace:` dependencies need pnpm. Other pnpm markers only count at the root: a subfolder of a
 * pnpm workspace, like vite's `template-*`, may not belong to it.
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
 * Patches the manifest and resolves the package manager and install args from that one read. Any
 * failure leaves the project to install as cloned.
 */
async function prepareManifest(
	ctx: BootContext,
	repoDir: string
): Promise<{ installArgs: string[]; packageManager: PackageManager }> {
	const manifestPath = `${ctx.workdir}/package.json`;
	// Outside the try, so a later failure still installs with the right manager.
	let packageManager: PackageManager = 'npm';
	try {
		const raw = await ctx.fs.readFile(manifestPath);
		packageManager = await resolvePackageManager(ctx, repoDir, raw);
		const result = patchClonedManifest(raw, packageManager);
		if (!result) {
			// Rare on npm: the repo already has our values, or its package.json doesn't parse.
			ctx.write(`\r\n${ANSI.dim}Left package.json as cloned.${ANSI.reset}\r\n`);
			return { installArgs: resolveInstallArgs(raw, packageManager), packageManager };
		}
		await ctx.fs.writeFile(manifestPath, result.patched);
		// Header takes the leading blank line; the changes follow indented under it as one block.
		ctx.write(`\r\n${ANSI.dim}Modified package.json${ANSI.reset}\r\n`);
		for (const note of result.notes) ctx.write(`${ANSI.dim}  ${note}${ANSI.reset}\r\n`);
		return { installArgs: resolveInstallArgs(result.patched, packageManager), packageManager };
	} catch (error) {
		ctx.write(
			`\r\n${ANSI.coral}Could not patch package.json; installing the repo as cloned.${ANSI.reset}\r\n`
		);
		console.warn('Could not patch the cloned manifest:', error);
		return { installArgs: ['install'], packageManager };
	}
}

/**
 * Writes the wasm bundler overrides into the `pnpm-workspace.yaml` pnpm will read: the workdir's,
 * else the clone root's, else a new one in the workdir.
 */
async function preparePnpmOverrides(ctx: BootContext, repoDir: string): Promise<void> {
	const inWorkdir = `${ctx.workdir}/${PNPM_WORKSPACE_FILE}`;
	const atRoot = `${repoDir}/${PNPM_WORKSPACE_FILE}`;
	try {
		const path = (await fileExists(ctx, inWorkdir))
			? inWorkdir
			: ctx.workdir !== repoDir && (await fileExists(ctx, atRoot))
				? atRoot
				: null;
		const result = patchPnpmOverrides(path === null ? null : await ctx.fs.readFile(path));
		if (!result) return;
		await ctx.fs.writeFile(path ?? inWorkdir, result.patched);
		const verb = path === null ? 'Created' : 'Modified';
		ctx.write(`\r\n${ANSI.dim}${verb} ${PNPM_WORKSPACE_FILE}${ANSI.reset}\r\n`);
		for (const note of result.notes) ctx.write(`${ANSI.dim}  ${note}${ANSI.reset}\r\n`);
	} catch (error) {
		ctx.write(
			`\r\n${ANSI.coral}Could not patch ${PNPM_WORKSPACE_FILE}; esbuild and rollup may not run in the pod.${ANSI.reset}\r\n`
		);
		console.warn(`Could not patch ${PNPM_WORKSPACE_FILE}:`, error);
	}
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
