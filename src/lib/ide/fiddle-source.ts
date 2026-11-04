/**
 * Project source for a JavaFiddle share link: the fiddle's files, run exactly as the Java template
 * runs its own.
 */
import { fiddleLink, type Fiddle } from '$lib/fiddle/codec';
import { trackEvent } from '$lib/utils/useLazyTracking';
import type { ProjectSource } from './project-source';
import { templateSource } from './template-source';

export function fiddleSource(fiddle: Fiddle): ProjectSource {
	return {
		...templateSource('java'),
		id: 'fiddle',
		label: fiddle.title || 'JavaFiddle',
		listFiles: async () => fiddle.files.map((file) => file.path),
		hydrate: async (ctx) => {
			for (const file of fiddle.files) {
				if (ctx.cancelled()) return;
				await ctx.fs.writeFile(`${ctx.workdir}/${file.path}`, file.content);
			}
		},
		share: (files) => fiddleLink(fiddle.title, files),
		trackBoot: () => trackEvent('Booted Playground', { framework: 'JavaFiddle' })
	};
}
