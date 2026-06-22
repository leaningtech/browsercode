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

export const frameworkRailItems = (Object.keys(frameworkConfigs) as FrameworkId[]).map((id) => ({
	id,
	icon: frameworkConfigs[id].icon,
	label: frameworkConfigs[id].label
}));
