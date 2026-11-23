/**
 * Project source for the curated framework templates served out of `static/templates/<id>/`.
 */
import { frameworkConfigs, type FrameworkConfig, type FrameworkId } from '$lib/config/frameworks';
import type { EmbedTarget } from '$lib/embed/url';
import type { JavaVersion } from '$lib/java/versions';
import { POD_HOME } from '$lib/pod/fs';
import { trackEvent } from '$lib/utils/useLazyTracking';
import type { ProjectFile } from '$lib/utils/project-file';
import { packageManagerCommand } from './native-deps';
import { projectLink } from './project-link';
import type { BootContext, ProjectSource } from './project-source';

export function templateSource(framework: FrameworkId): ProjectSource {
	const config = frameworkConfigs[framework];
	// Held across clicks: Share and Embed both ask whether the project is still as shipped, and
	// the answer is a fixed set of static files.
	let shipped: Promise<ProjectFile[]> | undefined;

	return {
		id: 'framework',
		runtime: config.runtime ?? 'pod',
		keyless: true,
		label: config.label,
		hydrateLabel: 'copying project files',
		workdir: POD_HOME,
		appPort: config.appPort,
		listFiles: () => fetchManifest(config.sourceRoot),
		hydrate: (ctx: BootContext, files: string[]) => copyTemplate(ctx, config.sourceRoot, files),
		initialFile: (files: string[]) =>
			files.includes(config.defaultFile) ? config.defaultFile : files[0],
		installCommands: () =>
			(config.setupCommandArgs ?? [['install']]).map((args) => packageManagerCommand('pnpm', args)),
		startCommand: async () =>
			packageManagerCommand('pnpm', config.devCommandArgs ?? ['run', 'dev']),
		trackBoot: () => trackEvent('Booted Playground', { framework: config.label }),
		javaVersion: config.javaVersion,
		mainClass: config.mainClass,
		starterFiles: config.olderJava && starterFiles(config.sourceRoot, config.olderJava),
		pristineFiles: () => (shipped ??= templateFiles(config.sourceRoot)),
		// `/java` knows its examples by name, the IDE its templates by id.
		embedTarget:
			config.section === 'java'
				? ({ kind: 'java', example: config.example ?? framework } satisfies EmbedTarget)
				: ({ kind: 'framework', id: framework } satisfies EmbedTarget),
		share: config.share ?? ((files) => projectLink(files, config.appPort))
	};
}

function starterFiles(
	sourceRoot: string,
	older: NonNullable<FrameworkConfig['olderJava']>
): (java: JavaVersion) => Promise<ProjectFile[]> {
	return (java) => templateFiles(java < older.below ? older.sourceRoot : sourceRoot);
}

/** Every file a template ships, as text; binaries decode to junk and are compared as blanks. */
async function templateFiles(sourceRoot: string): Promise<ProjectFile[]> {
	const paths = await fetchManifest(sourceRoot);
	return Promise.all(
		paths.map(async (path) => ({
			path,
			content: new TextDecoder().decode(await fetchTemplateFile(sourceRoot, path))
		}))
	);
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

async function fetchTemplateFile(sourceRoot: string, fileName: string): Promise<ArrayBuffer> {
	const response = await fetch(`${sourceRoot}/${fileName}`);
	if (!response.ok) {
		throw new Error(
			`Failed to fetch ${fileName} from ${sourceRoot}: ${response.status} ${response.statusText}`
		);
	}
	return response.arrayBuffer();
}
