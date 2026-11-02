/**
 * Project source for the Java examples served out of `static/templates/java-<example>/`, run on
 * CheerpJ. A stopgap until templates support Java in general: it borrows `templateSource`'s
 * fetching, and should fold into it once a template can say which runtime it boots on and spell
 * out its own commands.
 */
import { findMainClass } from '$lib/cheerpj/main-class';
import { trackEvent } from '$lib/utils/useLazyTracking';
import type { ProjectSource } from './project-source';
import { copyTemplate, fetchManifest, readProjectFiles } from './template-source';

const JAVA_EXAMPLES = ['helloworld'] as const;
export type JavaExample = (typeof JAVA_EXAMPLES)[number];
export const defaultJavaExample: JavaExample = 'helloworld';

export function isJavaExample(value: string): value is JavaExample {
	return (JAVA_EXAMPLES as readonly string[]).includes(value);
}

const MAIN_FILE = 'Main.java';

export function javaSource(example: JavaExample): ProjectSource {
	const sourceRoot = `/templates/java-${example}`;

	return {
		id: 'java',
		runtime: 'cheerpj',
		label: 'Java',
		hydrateLabel: 'copying project files',
		workdir: '/project',
		listFiles: () => fetchManifest(sourceRoot),
		hydrate: (ctx, files) => copyTemplate(ctx, sourceRoot, files),
		initialFile: (files) => (files.includes(MAIN_FILE) ? MAIN_FILE : files[0]),
		installCommands: () => [],
		startCommand: async (ctx) => {
			const mainClass = findMainClass(await readProjectFiles(ctx), ctx.focus);
			if (mainClass) return { command: ['java', mainClass] };
			ctx.write('No .java file to run.\n');
			return null;
		},
		trackBoot: () => trackEvent('Booted Playground', { framework: 'Java' })
	};
}
