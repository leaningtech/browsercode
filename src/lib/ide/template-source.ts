/**
 * Project source for the curated framework templates served out of `static/templates/<id>/`.
 */
import { frameworkConfigs, type FrameworkConfig, type FrameworkId } from '$lib/config/frameworks';
import { POD_HOME, writePodBinaryFile } from '$lib/pod/fs';
import { trackEvent } from '$lib/utils/useLazyTracking';
import type { BootContext, ProjectSource } from './project-source';

export function templateSource(framework: FrameworkId): ProjectSource {
	const config = frameworkConfigs[framework];

	return {
		id: 'framework',
		label: config.label,
		hydrateLabel: 'copying project files',
		workdir: POD_HOME,
		appPort: config.appPort,
		listFiles: () => fetchManifest(config),
		hydrate: async (ctx: BootContext, files: string[]): Promise<void> => {
			for (const file of files) {
				if (ctx.cancelled()) return;
				const content = await fetchTemplateFile(config, file);
				if (ctx.cancelled()) return;
				await writePodBinaryFile(ctx.pod, `${ctx.workdir}/${file}`, content);
			}
		},
		initialFile: (files: string[]) =>
			files.includes(config.defaultFile) ? config.defaultFile : files[0],
		installCommands: () => config.setupCommandArgs ?? [['install']],
		startCommand: async () => config.devCommandArgs ?? ['run', 'dev'],
		trackBoot: () => trackEvent('Booted Playground', { framework: config.label })
	};
}

async function fetchManifest(config: FrameworkConfig): Promise<string[]> {
	const response = await fetch(`${config.sourceRoot}/manifest.txt`);
	if (!response.ok) {
		throw new Error(
			`Failed to load manifest for ${config.id}: ${response.status} ${response.statusText}`
		);
	}
	const text = await response.text();
	return text
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);
}

async function fetchTemplateFile(config: FrameworkConfig, fileName: string): Promise<ArrayBuffer> {
	const response = await fetch(`${config.sourceRoot}/${fileName}`);
	if (!response.ok) {
		throw new Error(
			`Failed to fetch ${fileName} for ${config.id}: ${response.status} ${response.statusText}`
		);
	}
	return response.arrayBuffer();
}
