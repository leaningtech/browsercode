/**
 * File-type icon mapping for the IDE file tree and editor tabs.
 *
 * Icons come from the Catppuccin icon set (MIT, https://github.com/catppuccin/vscode-icons),
 * served through the existing @iconify/svelte runtime.
 */

/** Exact-filename matches (checked case-insensitively, before extension). */
const nameIcons: Record<string, string> = {
	'package.json': 'catppuccin:npm',
	'package-lock.json': 'catppuccin:npm-lock',
	'pnpm-lock.yaml': 'catppuccin:pnpm-lock',
	'tsconfig.json': 'catppuccin:typescript-config',
	'jsconfig.json': 'catppuccin:typescript-config',
	'.gitignore': 'catppuccin:git',
	'.gitattributes': 'catppuccin:git',
	'.npmrc': 'catppuccin:properties',
	'.editorconfig': 'catppuccin:editorconfig',
	'.env': 'catppuccin:env',
	dockerfile: 'catppuccin:docker',
	license: 'catppuccin:license',
	'license.md': 'catppuccin:license',
	'license.txt': 'catppuccin:license',
	'readme.md': 'catppuccin:readme',
	'robots.txt': 'catppuccin:robots',
	'vercel.json': 'catppuccin:vercel'
};

/** Config files matched by prefix, e.g. `vite.config.js` / `vite.config.mts`. */
const prefixIcons: [string, string][] = [
	['vite.config.', 'catppuccin:vite'],
	['svelte.config.', 'catppuccin:svelte-config'],
	['astro.config.', 'catppuccin:astro-config'],
	['next.config.', 'catppuccin:next'],
	['nuxt.config.', 'catppuccin:nuxt'],
	['tailwind.config.', 'catppuccin:tailwind'],
	['eslint.config.', 'catppuccin:eslint'],
	['.eslintrc', 'catppuccin:eslint'],
	['.prettierrc', 'catppuccin:prettier'],
	['prettier.config.', 'catppuccin:prettier'],
	['tsconfig.', 'catppuccin:typescript-config'],
	['.env.', 'catppuccin:env']
];

const extensionIcons: Record<string, string> = {
	svelte: 'catppuccin:svelte',
	js: 'catppuccin:javascript',
	mjs: 'catppuccin:javascript',
	cjs: 'catppuccin:javascript',
	ts: 'catppuccin:typescript',
	mts: 'catppuccin:typescript',
	cts: 'catppuccin:typescript',
	jsx: 'catppuccin:javascript-react',
	tsx: 'catppuccin:typescript-react',
	vue: 'catppuccin:vue',
	astro: 'catppuccin:astro',
	json: 'catppuccin:json',
	html: 'catppuccin:html',
	htm: 'catppuccin:html',
	css: 'catppuccin:css',
	scss: 'catppuccin:sass',
	sass: 'catppuccin:sass',
	less: 'catppuccin:less',
	md: 'catppuccin:markdown',
	mdx: 'catppuccin:markdown-mdx',
	svg: 'catppuccin:svg',
	png: 'catppuccin:image',
	jpg: 'catppuccin:image',
	jpeg: 'catppuccin:image',
	gif: 'catppuccin:image',
	webp: 'catppuccin:image',
	avif: 'catppuccin:image',
	ico: 'catppuccin:favicon',
	yaml: 'catppuccin:yaml',
	yml: 'catppuccin:yaml',
	toml: 'catppuccin:toml',
	xml: 'catppuccin:xml',
	txt: 'catppuccin:text',
	lock: 'catppuccin:lock',
	sh: 'catppuccin:bash',
	bash: 'catppuccin:bash',
	py: 'catppuccin:python',
	rs: 'catppuccin:rust',
	go: 'catppuccin:go',
	java: 'catppuccin:java',
	graphql: 'catppuccin:graphql',
	gql: 'catppuccin:graphql',
	prisma: 'catppuccin:prisma',
	sql: 'catppuccin:database',
	sqlite: 'catppuccin:database',
	db: 'catppuccin:database',
	wasm: 'catppuccin:binary',
	pdf: 'catppuccin:pdf',
	zip: 'catppuccin:zip',
	gz: 'catppuccin:zip',
	tar: 'catppuccin:zip',
	mp3: 'catppuccin:audio',
	wav: 'catppuccin:audio',
	ogg: 'catppuccin:audio',
	mp4: 'catppuccin:video',
	webm: 'catppuccin:video',
	mov: 'catppuccin:video',
	woff: 'catppuccin:font',
	woff2: 'catppuccin:font',
	ttf: 'catppuccin:font',
	otf: 'catppuccin:font'
};

/** Folders with a dedicated Catppuccin icon (closed variant; `-open` is appended). */
const folderNames = new Set(['src', 'public', 'lib', 'node_modules']);

const folderVariant: Record<string, string> = { node_modules: 'node' };

export const DEFAULT_FILE_ICON = 'catppuccin:file';

/** Resolves the icon for a file, by exact name, config prefix, then extension. */
export function fileIcon(nameOrPath: string): string {
	const name = (nameOrPath.split('/').pop() ?? nameOrPath).toLowerCase();
	const byName = nameIcons[name];
	if (byName) return byName;
	for (const [prefix, icon] of prefixIcons) if (name.startsWith(prefix)) return icon;
	if (name.endsWith('.d.ts')) return 'catppuccin:typescript-def';
	const dot = name.lastIndexOf('.');
	if (dot <= 0) return DEFAULT_FILE_ICON;
	return extensionIcons[name.slice(dot + 1)] ?? DEFAULT_FILE_ICON;
}

/** Resolves the icon for a folder row, with open/closed variants. */
export function folderIcon(name: string, open: boolean): string {
	const key = name.toLowerCase();
	const variant = folderNames.has(key) ? `-${folderVariant[key] ?? key}` : '';
	return `catppuccin:folder${variant}${open ? '-open' : ''}`;
}
