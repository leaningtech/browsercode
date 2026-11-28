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
	| 'java-swing'
	| 'java-mandelbrot'
	| 'java-guess'
	| 'java-words'
	| 'java-shapes'
	| 'java-life'
	| 'java-tictactoe'
	| 'java-calculator'
	| 'java-sorting'
	| 'java-maze'
	| 'java-reflection';

/** A BrowserPod, or CheerpJ for Java. */
export type RuntimeId = 'pod' | 'cheerpj';

/** The part of the app a template is offered in: the JavaScript playground, or the Java one. */
export type SectionId = 'ide' | 'java';

/**
 * The heading a template is listed under within its section. Twelve Java examples in one flat
 * list are a wall of names, so they are sorted by what the code is *about* rather than left in
 * registry order. The JavaScript section has one list and so needs no groups.
 */
export type GroupId = 'basics' | 'graphics' | 'algorithms' | 'language';

/** Group headings, in the order every menu lists them. */
export const groupLabels: Record<GroupId, string> = {
	basics: 'Basics',
	graphics: 'Graphics',
	algorithms: 'Algorithms',
	language: 'Language features'
};

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
	/** Which heading it is listed under. Only the Java section groups its templates. */
	group?: GroupId;
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
	/** A link, relative to the site, that reopens `files`; defaults to an `/ide` project link. */
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
		label: 'Hello World',
		sourceRoot: '/templates/java-helloworld',
		defaultFile: 'Main.java',
		icon: 'mingcute:terminal-box-line',
		runtime: 'cheerpj',
		section: 'java',
		group: 'basics',
		example: 'helloworld',
		javaVersion: 25,
		mainClass: 'Main',
		// `void main()` and `IO` are Java 25.
		olderJava: { below: 25, sourceRoot: '/templates/java-helloworld-classic' },
		share: (files, java, main) => sharedProjectLink('', files, java, main)
	},
	'java-swing': {
		id: 'java-swing',
		label: 'Swing',
		sourceRoot: '/templates/java-swing',
		defaultFile: 'Main.java',
		icon: 'mingcute:button-line',
		runtime: 'cheerpj',
		section: 'java',
		group: 'graphics',
		example: 'swing',
		javaVersion: 25,
		mainClass: 'Main',
		share: (files, java, main) => sharedProjectLink('', files, java, main)
	},
	'java-mandelbrot': {
		id: 'java-mandelbrot',
		label: 'Mandelbrot',
		sourceRoot: '/templates/java-mandelbrot',
		defaultFile: 'Main.java',
		icon: 'mingcute:snowflake-line',
		runtime: 'cheerpj',
		section: 'java',
		group: 'graphics',
		example: 'mandelbrot',
		javaVersion: 25,
		mainClass: 'Main',
		share: (files, java, main) => sharedProjectLink('', files, java, main)
	},
	'java-guess': {
		id: 'java-guess',
		label: 'Guessing Game',
		sourceRoot: '/templates/java-guess',
		defaultFile: 'Main.java',
		icon: 'mingcute:question-2-line',
		runtime: 'cheerpj',
		section: 'java',
		group: 'basics',
		example: 'guess',
		javaVersion: 25,
		mainClass: 'Main',
		share: (files, java, main) => sharedProjectLink('', files, java, main)
	},
	'java-words': {
		id: 'java-words',
		label: 'Word Count',
		sourceRoot: '/templates/java-words',
		defaultFile: 'Main.java',
		icon: 'mingcute:text-line',
		runtime: 'cheerpj',
		section: 'java',
		group: 'basics',
		example: 'words',
		javaVersion: 25,
		mainClass: 'Main',
		share: (files, java, main) => sharedProjectLink('', files, java, main)
	},
	'java-shapes': {
		id: 'java-shapes',
		label: 'Shapes',
		sourceRoot: '/templates/java-shapes',
		defaultFile: 'Main.java',
		icon: 'mingcute:triangle-line',
		runtime: 'cheerpj',
		section: 'java',
		group: 'graphics',
		example: 'shapes',
		javaVersion: 25,
		mainClass: 'Main',
		// Record patterns in `switch` are Java 21.
		olderJava: { below: 21, sourceRoot: '/templates/java-shapes-classic' },
		share: (files, java, main) => sharedProjectLink('', files, java, main)
	},
	'java-life': {
		id: 'java-life',
		label: 'Game of Life',
		sourceRoot: '/templates/java-life',
		defaultFile: 'Main.java',
		icon: 'mingcute:grid-line',
		runtime: 'cheerpj',
		section: 'java',
		group: 'graphics',
		example: 'life',
		javaVersion: 25,
		mainClass: 'Main',
		share: (files, java, main) => sharedProjectLink('', files, java, main)
	},
	'java-tictactoe': {
		id: 'java-tictactoe',
		label: 'Tic-Tac-Toe',
		sourceRoot: '/templates/java-tictactoe',
		defaultFile: 'Main.java',
		icon: 'mingcute:hashtag-line',
		runtime: 'cheerpj',
		section: 'java',
		group: 'algorithms',
		example: 'tictactoe',
		javaVersion: 25,
		mainClass: 'Main',
		share: (files, java, main) => sharedProjectLink('', files, java, main)
	},
	'java-calculator': {
		id: 'java-calculator',
		label: 'Calculator',
		sourceRoot: '/templates/java-calculator',
		defaultFile: 'Main.java',
		icon: 'mingcute:counter-line',
		runtime: 'cheerpj',
		section: 'java',
		group: 'basics',
		example: 'calculator',
		javaVersion: 25,
		mainClass: 'Main',
		share: (files, java, main) => sharedProjectLink('', files, java, main)
	},
	'java-sorting': {
		id: 'java-sorting',
		label: 'Sorting',
		sourceRoot: '/templates/java-sorting',
		defaultFile: 'Main.java',
		icon: 'mingcute:sort-ascending-line',
		runtime: 'cheerpj',
		section: 'java',
		group: 'algorithms',
		example: 'sorting',
		javaVersion: 25,
		mainClass: 'Main',
		share: (files, java, main) => sharedProjectLink('', files, java, main)
	},
	'java-maze': {
		id: 'java-maze',
		label: 'Maze',
		sourceRoot: '/templates/java-maze',
		defaultFile: 'Main.java',
		icon: 'mingcute:route-line',
		runtime: 'cheerpj',
		section: 'java',
		group: 'algorithms',
		example: 'maze',
		javaVersion: 25,
		mainClass: 'Main',
		share: (files, java, main) => sharedProjectLink('', files, java, main)
	},
	'java-reflection': {
		id: 'java-reflection',
		label: 'Reflection',
		sourceRoot: '/templates/java-reflection',
		defaultFile: 'Main.java',
		icon: 'mingcute:mirror-line',
		runtime: 'cheerpj',
		section: 'java',
		group: 'language',
		example: 'reflection',
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

export type RailItem = {
	id: FrameworkId;
	icon: string;
	label: string;
	example: string;
	group?: GroupId;
};

function railItems(section: SectionId): RailItem[] {
	return sectionIds(section).map((id) => ({
		id,
		icon: frameworkConfigs[id].icon,
		label: frameworkConfigs[id].label,
		example: frameworkConfigs[id].example ?? id,
		group: frameworkConfigs[id].group
	}));
}

export const frameworkRailItems = railItems('ide');
export const javaRailItems = railItems('java');

/** A language the IDE offers, as its own page. Not `SectionId`: that names where a template is
 *  listed, this names the thing a person picks. They happen to line up today. */
export type LanguageId = 'js' | 'java';

export type Language = {
	id: LanguageId;
	label: string;
	/** What this language calls its templates, for menu footers and accessible names. */
	noun: string;
	icon: string;
	path: '/ide' | '/java';
};

/**
 * One page per language, not per runtime: a runtime doesn't line up with what you write, so the
 * axis wouldn't survive growth (Python and Rust would both be BrowserPod, and nobody wants a page
 * called CheerpJ).
 *
 * Here rather than in either component because both the sidebar's nested rail and the pages' own
 * switcher draw from it, and a language wearing two different icons would be worse than either.
 */
export const languages: Language[] = [
	{
		id: 'js',
		label: 'JavaScript',
		noun: 'templates',
		icon: 'simple-icons:nodedotjs',
		path: '/ide'
	},
	{ id: 'java', label: 'Java', noun: 'examples', icon: 'simple-icons:openjdk', path: '/java' }
];

export const languageById = Object.fromEntries(languages.map((l) => [l.id, l])) as Record<
	LanguageId,
	Language
>;

/**
 * A heading and the templates under it. `id` is only a render key, so it is a plain string: the
 * JavaScript section has one heading of its own that is no `GroupId`.
 */
export type RailGroup = { id: string; label: string; items: RailItem[] };

/**
 * The Java examples under their headings, in `groupLabels` order and, within a heading, in
 * registry order. Shared by the sidebar rail and the picker grid so the two can't drift.
 *
 * Grouping by filter means a template with no `group` would silently vanish from both, so a
 * missing one throws here instead — at module load, which fails the build rather than shipping a
 * list with a hole in it. `group` can't be required by the type without splitting
 * `FrameworkConfig` per section, which the other fields don't warrant.
 */
export const javaGroups: RailGroup[] = (() => {
	const ungrouped = javaRailItems.filter((item) => !item.group);
	if (ungrouped.length > 0) {
		throw new Error(
			`Java templates missing a group: ${ungrouped.map((item) => item.id).join(', ')}`
		);
	}
	return (Object.keys(groupLabels) as GroupId[])
		.map((id) => ({
			id,
			label: groupLabels[id],
			items: javaRailItems.filter((i) => i.group === id)
		}))
		.filter((group) => group.items.length > 0);
})();

/**
 * The name to use where a label stands on its own, away from its section's heading. Java labels
 * are short because the menus they live in already say "Java"; the tour's single merged list and
 * the embed builder's summary line don't, so "Mandelbrot" alone would say nothing there.
 */
export function qualifiedLabel(id: FrameworkId): string {
	const { label, section } = frameworkConfigs[id];
	return (section ?? 'ide') === 'java' ? `Java ${label}` : label;
}
