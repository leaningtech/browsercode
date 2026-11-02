/**
 * Project source for the curated framework templates served out of `static/templates/<id>/`.
 */
import { frameworkConfigs, type FrameworkId } from '$lib/config/frameworks';
import { POD_HOME } from '$lib/pod/fs';
import { trackEvent } from '$lib/utils/useLazyTracking';
import type { BootContext, ProjectSource } from './project-source';

export function templateSource(framework: FrameworkId): ProjectSource {
	const config = frameworkConfigs[framework];

	return {
		id: 'framework',
		runtime: config.runtime ?? 'pod',
		label: config.label,
		hydrateLabel: 'copying project files',
		workdir: POD_HOME,
		appPort: config.appPort,
		listFiles: () => fetchManifest(config.sourceRoot),
		hydrate: (ctx: BootContext, files: string[]) => copyTemplate(ctx, config.sourceRoot, files),
		initialFile: (files: string[]) =>
			files.includes(config.defaultFile) ? config.defaultFile : files[0],
		installCommands: () =>
			(config.setupCommandArgs ?? [['install']]).map((args) => ({ command: ['npm', ...args] })),
		startCommand: async (ctx: BootContext) => {
			if (!config.startCommand) {
				return { command: ['npm', ...(config.devCommandArgs ?? ['run', 'dev'])] };
			}
			const command = config.startCommand(await readProjectFiles(ctx), ctx.focus);
			if (command) return { command };
			ctx.write('Found nothing in the project to start.\n');
			return null;
		},
		trackBoot: () => trackEvent('Booted Playground', { framework: config.label })
	};
}

/** The files a template served from `sourceRoot` lists in its `manifest.txt`. */
export async function fetchManifest(sourceRoot: string): Promise<string[]> {
	const response = await fetch(`${sourceRoot}/manifest.txt`);
	if (!response.ok) {
		throw new Error(
			`Failed to load manifest for ${sourceRoot}: ${response.status} ${response.statusText}`
		);
	}
	const text = await response.text();
	return text
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);
}

/** Copies a template's `files` from `sourceRoot` into the workdir, stopping if the boot is. */
export async function copyTemplate(
	ctx: BootContext,
	sourceRoot: string,
	files: string[]
): Promise<void> {
	for (const file of files) {
		if (ctx.cancelled()) return;
		const content = await fetchTemplateFile(sourceRoot, file);
		if (ctx.cancelled()) return;
		await ctx.fs.writeBinaryFile(`${ctx.workdir}/${file}`, content);
	}
}

/**
 * The project's files as text, paths relative to the workdir. Empty on a filesystem that cannot
 * list them.
 */
export async function readProjectFiles(
	ctx: BootContext
): Promise<{ path: string; content: string }[]> {
	const paths = ctx.fs.filesUnder?.(ctx.workdir) ?? [];
	return Promise.all(
		paths.map(async (path) => ({
			path: path.slice(ctx.workdir.length + 1),
			content: await ctx.fs.readFile(path)
		}))
	);
}

async function fetchTemplateFile(sourceRoot: string, fileName: string): Promise<ArrayBuffer> {
	const response = await fetch(`${sourceRoot}/${fileName}`);
	if (!response.ok) {
		throw new Error(
			`Failed to fetch ${fileName} from ${sourceRoot}: ${response.status} ${response.statusText}`
		);
	}
	return response.arrayBuffer();
}
