export type FrameworkId = 'vite' | 'svelte' | 'react' | 'vue' | 'nextjs' | 'nuxt' | 'express';

export type FrameworkConfig = {
	id: FrameworkId;
	label: string;
	/** Static-asset path the template is served from (manifest.txt + project files). */
	sourceRoot: string;
	/** File opened in the editor after boot. */
	defaultFile: string;
	icon: string;
	/** npm invocations run before the dev server, e.g. [['install']]. */
	setupCommandArgs?: string[][];
	/** npm invocation that starts the dev server. Defaults to ['run', 'dev']. */
	devCommandArgs?: string[];
	/** When set, only a portal on this port is auto-selected for the preview. */
	appPort?: number;
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
	}
};

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
 * Resolves a `?framework=` value to a template id, accepting the aliases above and ignoring case
 * and surrounding whitespace. Returns undefined when nothing matches — the caller's cue to show
 * the picker rather than substitute a default.
 */
export function resolveFrameworkId(value: string | null): FrameworkId | undefined {
	if (value === null) return undefined;
	const key = value.trim().toLowerCase();
	if (isFrameworkId(key)) return key;
	return frameworkAliases[key];
}

export const frameworkRailItems = (Object.keys(frameworkConfigs) as FrameworkId[]).map((id) => ({
	id,
	icon: frameworkConfigs[id].icon,
	label: frameworkConfigs[id].label
}));
