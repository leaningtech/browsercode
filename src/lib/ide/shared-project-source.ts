/**
 * Project source for a shared Java project link: the link's files, run exactly as the Java
 * template runs its own.
 */
import type { FrameworkId } from '$lib/config/frameworks';
import { sharedProjectLink, type SharedProject } from '$lib/java/shared-project';
import { trackEvent } from '$lib/utils/useLazyTracking';
import type { ProjectSource } from './project-source';
import { templateSource } from './template-source';

/**
 * `template` is the example the project is still sitting in, which only a switch of Java version
 * knows: it reloads the project through this source and keeps `?example=` in the URL. The link
 * itself can't say, since it carries files and a title rather than an example name, so a link
 * someone shared still opens as a shared project.
 */
export function sharedProjectSource(project: SharedProject, template?: FrameworkId): ProjectSource {
	const base = templateSource(template ?? 'java');
	return {
		...base,
		id: 'shared-project',
		label: project.title || (template ? base.label : 'Shared project'),
		listFiles: async () => project.files.map((file) => file.path),
		hydrate: async (ctx) => {
			for (const file of project.files) {
				if (ctx.cancelled()) return;
				await ctx.fs.writeFile(`${ctx.workdir}/${file.path}`, file.content);
			}
		},
		javaVersion: project.java ?? 8,
		// A link from before the key names none; the build then finds the class to start.
		mainClass: project.main,
		share: (files, java, main) => sharedProjectLink(project.title, files, java, main),
		trackBoot: () => trackEvent('Booted Playground', { framework: 'Shared Java project' })
	};
}
