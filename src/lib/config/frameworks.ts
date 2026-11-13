import { sharedProjectLink } from '$lib/java/shared-project';
import type { JavaVersion } from '$lib/java/versions';

export type FrameworkId =
	| 'vite'
	| 'svelte'
	| 'react'
	| 'vue'
	| 'nextjs'
	| 'nuxt'
	| 'express'
	| 'java'
	| 'java-swing';

/** A BrowserPod, or CheerpJ for Java. */
export type RuntimeId = 'pod' | 'cheerpj';

/** The part of the app a template is offered in: the Playground IDE, or the Java playground. */
export type SectionId = 'ide' | 'java';

export type FrameworkConfig = {
	id: FrameworkId;
	label: string;
	/** Static-asset path the template is served from (manifest.txt + project files). */
	sourceRoot: string;
	/** File opened in the editor after boot. */
	defaultFile: string;
	icon: string;
	/** pnpm invocations run before the dev server, e.g. [['install']]. Only a pod runs them. */
	setupCommandArgs?: string[][];
	/** pnpm invocation that starts the dev server. Defaults to ['run', 'dev']. */
	devCommandArgs?: string[];
	/** When set, only a portal on this port is auto-selected for the preview. */
	appPort?: number;
	/** Defaults to `pod`. */
	runtime?: RuntimeId;
	/** Defaults to `ide`. */
	section?: SectionId;
	/**
	 * The name `/java?example=` and `/embed?runtime=` know it by. The embed's `helloworld`
	 * predates the registry, so the ids alone would break the URL the blog embeds.
	 */
	example?: string;
	/** The Java a CheerpJ template boots on. */
	javaVersion?: JavaVersion;
	/** The class a CheerpJ template starts from, as its binary name. */
	mainClass?: string;
	/**
	 * The same starter for Javas older than `below`, for a template written with newer language
	 * features. A version switch swaps an untouched starter for the one that compiles there.
	 */
	olderJava?: { below: JavaVersion; sourceRoot: string };
	/** A link, relative to the site, that reopens `files`; absent where there is no format for one. */
	share?: (
		files: { path: string; content: string }[],
		javaVersion?: JavaVersion,
		mainClass?: string
	) => string;
};

export const frameworkConfigs: Record<FrameworkId, FrameworkConfig> = {
	vite: {
		id: 'vite',
		label: 'Vite',
		sourceRoot: '/templates/vite',
		defaultFile: 'src/main.js',
		icon: 'simple-icons:vite',
		setupCommandArgs: [['install']],
		devCommandArgs: ['run', 'dev']
	},
	svelte: {
		id: 'svelte',
		label: 'Vite + Svelte',
		sourceRoot: '/templates/vite-svelte',
		defaultFile: 'src/App.svelte',
		icon: 'simple-icons:svelte',
		setupCommandArgs: [['install']],
		devCommandArgs: ['run', 'dev']
	},
	react: {
		id: 'react',
		label: 'Vite + React',
		sourceRoot: '/templates/vite-react',
		defaultFile: 'src/App.jsx',
		icon: 'simple-icons:react',
		setupCommandArgs: [['install']],
		devCommandArgs: ['run', 'dev']
	},
	vue: {
		id: 'vue',
		label: 'Vite + Vue',
		sourceRoot: '/templates/vite-vue',
		defaultFile: 'src/App.vue',
		icon: 'simple-icons:vuedotjs',
		setupCommandArgs: [['install']],
		devCommandArgs: ['run', 'dev']
	},
	nextjs: {
		id: 'nextjs',
		label: 'Next.js',
		sourceRoot: '/templates/nextjs',
		defaultFile: 'app/page.jsx',
		icon: 'simple-icons:nextdotjs',
		setupCommandArgs: [['install']],
		devCommandArgs: ['run', 'dev']
	},
	nuxt: {
		id: 'nuxt',
		label: 'Nuxt',
		sourceRoot: '/templates/nuxt',
		defaultFile: 'app/app.vue',
		icon: 'simple-icons:nuxtdotjs',
		setupCommandArgs: [['pkg', 'get', 'dependencies.nuxt'], ['install']],
		devCommandArgs: ['run', 'dev'],
		appPort: 3000
	},
	// Astro is blocked upstream (image too large for BrowserPod); Angular tries to
	// serve via `ng serve`, which is also unsupported. Re-add here once unblocked.
	express: {
		id: 'express',
		label: 'Express',
		sourceRoot: '/templates/express',
		defaultFile: 'server.js',
		icon: 'simple-icons:nodedotjs',
		setupCommandArgs: [['install']],
		devCommandArgs: ['run', 'dev'],
		appPort: 4000
	},
	java: {
		id: 'java',
		label: 'Java',
		sourceRoot: '/templates/java-helloworld',
		defaultFile: 'Main.java',
		icon: 'simple-icons:openjdk',
		runtime: 'cheerpj',
		section: 'java',
		example: 'helloworld',
		javaVersion: 25,
		mainClass: 'Main',
		// `void main()` and `IO` are Java 25.
		olderJava: { below: 25, sourceRoot: '/templates/java-helloworld-classic' },
		share: (files, java, main) => sharedProjectLink('', files, java, main)
	},
	'java-swing': {
		id: 'java-swing',
		label: 'Java Swing',
		sourceRoot: '/templates/java-swing',
		defaultFile: 'Main.java',
		icon: 'simple-icons:openjdk',
		runtime: 'cheerpj',
		section: 'java',
		example: 'swing',
		javaVersion: 25,
		mainClass: 'Main',
		share: (files, java, main) => sharedProjectLink('', files, java, main)
	}
};

/** In registry order, which is the order every menu lists them in. */
function sectionIds(section: SectionId): FrameworkId[] {
	return (Object.keys(frameworkConfigs) as FrameworkId[]).filter(
		(id) => (frameworkConfigs[id].section ?? 'ide') === section
	);
}

export const defaultFrameworkId: FrameworkId = 'express';

export function isFrameworkId(value: string | null): value is FrameworkId {
	return value !== null && value in frameworkConfigs;
}

/* Spellings a generated or hand-typed URL is likely to use for a template we really do have.
   Deliberately limited to variants of the same framework's own name: `sveltekit` is NOT mapped to
   `svelte`, because handing someone a Vite + Svelte app when they asked for SvelteKit is the same
   confidently-wrong answer as the default fallback this exists to replace. Anything not listed
   here belongs on the picker, where the real names are on screen. */
const frameworkAliases: Record<string, FrameworkId> = {
	'next.js': 'nextjs',
	next: 'nextjs',
	'nuxt.js': 'nuxt',
	nuxtjs: 'nuxt',
	'svelte.js': 'svelte',
	sveltejs: 'svelte',
	'vue.js': 'vue',
	vuejs: 'vue',
	vue3: 'vue',
	'react.js': 'react',
	reactjs: 'react',
	'express.js': 'express',
	expressjs: 'express',
	'vite.js': 'vite',
	vitejs: 'vite'
};

/**
 * Resolves a `?framework=` value to one of the IDE's template ids, accepting the aliases above and
 * ignoring case and surrounding whitespace. Returns undefined when nothing matches — the caller's
 * cue to show the picker rather than substitute a default.
 */
export function resolveFrameworkId(value: string | null): FrameworkId | undefined {
	if (value === null) return undefined;
	const key = value.trim().toLowerCase();
	const id = isFrameworkId(key) ? key : frameworkAliases[key];
	return id && sectionIds('ide').includes(id) ? id : undefined;
}

/** Resolves a `?example=` value to one of `section`'s templates, by example name or id. */
export function resolveExample(section: SectionId, value: string): FrameworkId | undefined {
	const key = value.trim().toLowerCase();
	return sectionIds(section).find((id) => id === key || frameworkConfigs[id].example === key);
}

/**
 * Resolves `/embed?runtime=<runtime>&framework=<value>` to one of that runtime's templates, by id
 * or alias, or to its first when `value` is null.
 */
export function resolveRuntimeTemplate(
	runtime: string,
	value: string | null
): FrameworkId | undefined {
	const ids = (Object.keys(frameworkConfigs) as FrameworkId[]).filter(
		(id) => (frameworkConfigs[id].runtime ?? 'pod') === runtime
	);
	if (value === null) return ids[0];
	const key = value.trim().toLowerCase();
	return ids.find((id) => id === key || frameworkConfigs[id].example === key);
}

function railItems(
	section: SectionId
): { id: FrameworkId; icon: string; label: string; example: string }[] {
	return sectionIds(section).map((id) => ({
		id,
		icon: frameworkConfigs[id].icon,
		label: frameworkConfigs[id].label,
		example: frameworkConfigs[id].example ?? id
	}));
}

export const frameworkRailItems = railItems('ide');
export const javaRailItems = railItems('java');
