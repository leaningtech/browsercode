/**
 * Per-framework patches applied to a cloned GitHub repo's package.json before install, and the
 * `npm install` flags it needs.
 */

type Manifest = {
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	[key: string]: unknown;
};

/** The package managers the pod can install a cloned repo with. */
export type PackageManager = 'npm' | 'pnpm';

/** What the repo declares, package name to version spec, dependencies and devDependencies. */
type DeclaredDeps = Map<string, string>;

/** Reads the repo's own value for an entry, never an earlier patch's, so rule order cannot matter. */
type CurrentValue = (section: string, name: string) => string | undefined;

type SectionPatch = {
	/** Top-level manifest key holding a name to value map. */
	section: string;
	/** `force` wins over the repo's value; `fill` only writes where the repo has none. */
	mode: 'force' | 'fill';
	entries: Record<string, string>;
};

type FrameworkRule = {
	applies: (deps: DeclaredDeps) => boolean;
	patches?: (deps: DeclaredDeps, current: CurrentValue) => SectionPatch[];
	/** Install flags, keyed by package manager; a manager with no entry here needs none. */
	installFlags?: Partial<Record<PackageManager, string[]>>;
};

/** Ours wins: for where the repo's own value is the thing that breaks the pod. */
function force(section: string, entries: Record<string, string>): SectionPatch {
	return { section, mode: 'force', entries };
}

/** Theirs wins: for where we only supply something the repo left out. */
function fill(section: string, entries: Record<string, string>): SectionPatch {
	return { section, mode: 'fill', entries };
}

/** Dependency sections share one namespace, so a `fill` into one checks the others too. */
const DEP_SECTIONS = new Set([
	'dependencies',
	'devDependencies',
	'optionalDependencies',
	'peerDependencies'
]);

/** Native binaries the pod cannot execute. */
const WASM_BUNDLERS = {
	esbuild: 'npm:esbuild-wasm@*',
	rollup: 'npm:@rollup/wasm-node@*'
};

const ROLLDOWN_WASM = { '@rolldown/binding-wasm32-wasi': '*' };

const FRAMEWORK_RULES: FrameworkRule[] = [
	// Every repo: esbuild/rollup can end up in the tree transitively (a plugin, a test runner, a
	// framework CLI) even when nothing at the top level names them, so this isn't conditional on
	// what the manifest declares. A repo that already depends on either directly needs that entry
	// rewritten to match too, or npm rejects the override as conflicting with a direct dependency.
	{
		applies: () => true,
		patches: (_deps, current) => {
			const patches = [force('overrides', WASM_BUNDLERS)];
			for (const section of DEP_SECTIONS) {
				const direct: Record<string, string> = {};
				for (const [name, value] of Object.entries(WASM_BUNDLERS)) {
					if (current(section, name) !== undefined) direct[name] = value;
				}
				if (Object.keys(direct).length > 0) patches.push(force(section, direct));
			}
			return patches;
		}
	},
	// Vite 8.2+: its own config/dep bundling needs a wasm32 binding for Rolldown to resolve to.
	{
		applies: (deps) => minorAtLeast(deps, 'vite', 8, 2),
		patches: () => [fill('devDependencies', ROLLDOWN_WASM)]
	},
	// Next.js
	{
		applies: (deps) => deps.has('next'),
		patches: (deps, current) => {
			const dev = nextDevWithWebpack(current('scripts', 'dev'), deps);
			return dev ? [force('scripts', { dev })] : [];
		}
	},
	// Nuxt 4+
	{
		applies: (deps) => majorAtLeast(deps, 'nuxt', 4),
		patches: () => [fill('dependencies', ROLLDOWN_WASM)],
		// npm 7+ fails hard on a peer mismatch unless told not to; pnpm only warns by default, so
		// it needs no equivalent flag here.
		installFlags: { npm: ['--legacy-peer-deps'] }
	}
];

/**
 * Turbopack needs native bindings the pod cannot execute. Dropping its flags is enough through Next
 * 15; 16 defaults to it and needs `--webpack` to opt out.
 */
function nextDevWithWebpack(script: string | undefined, deps: DeclaredDeps): string | undefined {
	if (!script) return undefined;
	const withoutTurbopack = script.replace(/ --turbo(?:pack)?\b/g, '');
	if (!majorAtLeast(deps, 'next', 16) || withoutTurbopack.includes('--webpack')) {
		return withoutTurbopack;
	}
	return withoutTurbopack.replace(/\bnext\b(?:\s+dev\b)?(?!\s+[a-z])/, '$& --webpack');
}

/** Highest major the spec could install. Null means no ceiling at all. */
function highestMajor(spec: string): number | null {
	if (spec.includes('>') && !spec.includes('<')) return null;
	const versions = spec.match(/\d+(?:\.\d+)*/g);
	if (!versions) return null;
	return Math.max(...versions.map((version) => Number.parseInt(version, 10)));
}

/** Highest minor the spec could install within `major`, Infinity when it leaves the minor free. */
function highestMinor(spec: string, major: number): number {
	// A caret or a bare major floats the minor: `^8.1.1` installs 8.2 today, so it reads as 8.x.
	if (spec.includes('^')) return Infinity;
	const minors = (spec.match(/\d+(?:\.\d+)*/g) ?? [])
		.map((version) => version.split('.').map(Number))
		.filter(([declared]) => declared === major)
		.map(([, minor]) => minor ?? Infinity);
	return minors.length > 0 ? Math.max(...minors) : Infinity;
}

/** True when `name` is declared and can install `major.minor` or newer. */
function minorAtLeast(deps: DeclaredDeps, name: string, major: number, minor: number): boolean {
	const spec = deps.get(name);
	if (spec === undefined) return false;
	const highest = highestMajor(spec);
	if (highest === null) return true;
	if (highest !== major) return highest > major;
	return highestMinor(spec, major) >= minor;
}

/** True when `name` is declared and can install `major` or newer, an unversioned spec included. */
function majorAtLeast(deps: DeclaredDeps, name: string, major: number): boolean {
	const spec = deps.get(name);
	if (spec === undefined) return false;
	const highest = highestMajor(spec);
	return highest === null || highest >= major;
}

function parseManifest(manifestRaw: string): Manifest | null {
	try {
		return JSON.parse(manifestRaw) as Manifest;
	} catch {
		return null;
	}
}

function declaredDeps(manifest: Manifest): DeclaredDeps {
	return new Map(Object.entries({ ...manifest.dependencies, ...manifest.devDependencies }));
}

function isRecord(value: unknown): value is Record<string, string> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Whether a `fill` should stand aside: the repo has this entry, or declares it as a sibling dep. */
function alreadyPresent(
	section: Record<string, string>,
	sectionName: string,
	name: string,
	deps: DeclaredDeps
): boolean {
	return name in section || (DEP_SECTIONS.has(sectionName) && deps.has(name));
}

/**
 * Applies every matching rule's patches to the manifest. Returns the rewritten manifest plus one
 * note per entry changed, or null when nothing changed: no rule matched, every entry already held
 * the value we wanted, or the manifest would not parse. Sections the rules never touch, and the
 * file's indentation and trailing newline, are preserved.
 */
export function patchClonedManifest(
	manifestRaw: string
): { patched: string; notes: string[] } | null {
	const manifest = parseManifest(manifestRaw);
	if (!manifest) return null;
	const deps = declaredDeps(manifest);
	const currentValue: CurrentValue = (section, name) => {
		const held = manifest[section];
		return isRecord(held) ? held[name] : undefined;
	};
	// Working copies, seeded from the manifest the first time a rule touches the section. A section
	// holding anything other than a map is treated as absent; npm would reject it anyway.
	const sections = new Map<string, Record<string, string>>();
	const workingCopy = (name: string): Record<string, string> => {
		let section = sections.get(name);
		if (!section) {
			const current = manifest[name];
			section = isRecord(current) ? { ...current } : {};
			sections.set(name, section);
		}
		return section;
	};

	const notes: string[] = [];
	for (const rule of FRAMEWORK_RULES) {
		if (!rule.applies(deps) || !rule.patches) continue;
		for (const { section: sectionName, mode, entries } of rule.patches(deps, currentValue)) {
			const section = workingCopy(sectionName);
			for (const [name, value] of Object.entries(entries)) {
				if (mode === 'fill' && alreadyPresent(section, sectionName, name, deps)) continue;
				if (section[name] === value) continue;
				section[name] = value;
				notes.push(`${mode === 'fill' ? 'added' : 'replaced'} ${sectionName}.${name}: ${value}`);
			}
		}
	}
	if (notes.length === 0) return null;
	// Written back only when non-empty, so a section nobody contributed to is never created.
	for (const [name, section] of sections) {
		if (Object.keys(section).length > 0) manifest[name] = section;
	}
	const indent = manifestRaw.match(/^([ \t]+)"/m)?.[1] ?? '  ';
	const patched = JSON.stringify(manifest, null, indent) + (manifestRaw.endsWith('\n') ? '\n' : '');
	return { patched, notes };
}

/** Deduplicated so two matching rules asking for the same flag pass it once. */
export function resolveInstallArgs(manifestRaw: string, packageManager: PackageManager): string[] {
	const manifest = parseManifest(manifestRaw);
	if (!manifest) return ['install'];
	const deps = declaredDeps(manifest);
	const flags = new Set<string>();
	for (const rule of FRAMEWORK_RULES) {
		if (!rule.applies(deps)) continue;
		for (const flag of rule.installFlags?.[packageManager] ?? []) flags.add(flag);
	}
	return ['install', ...flags];
}

/** True when the manifest pins pnpm as its package manager (`"packageManager": "pnpm@..."`). */
export function declaresPnpm(manifestRaw: string): boolean {
	const pm = parseManifest(manifestRaw)?.packageManager;
	return typeof pm === 'string' && pm.startsWith('pnpm@');
}

/** True when a declared dependency uses the `workspace:` protocol, which plain npm can't resolve. */
export function usesWorkspaceProtocol(manifestRaw: string): boolean {
	const manifest = parseManifest(manifestRaw);
	if (!manifest) return false;
	return [...declaredDeps(manifest).values()].some((spec) => spec.startsWith('workspace:'));
}

/** Environment each package manager needs to run in the pod; empty for one that needs none. */
export const PACKAGE_MANAGER_ENV: Record<PackageManager, string[]> = {
	npm: [],
	// pnpm pins an exact version via `packageManager` and otherwise refuses to run, but the pod's
	// own pnpm has no native binary to switch to for an arbitrary pinned version. This tells pnpm to
	// use whatever is already on PATH instead of trying to fetch that exact pin.
	pnpm: ['pnpm_config_pm_on_fail=ignore']
};
