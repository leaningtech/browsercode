/**
 * Per-framework patches applied to a cloned GitHub repo's package.json before install.
 */

type Manifest = {
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	[key: string]: unknown;
};

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
	patches: (deps: DeclaredDeps, current: CurrentValue) => SectionPatch[];
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

const FRAMEWORK_RULES: FrameworkRule[] = [
	// Vite 8.2+
	{
		applies: (deps) => minorAtLeast(deps, 'vite', 8, 2),
		patches: () => [fill('devDependencies', { '@rolldown/binding-wasm32-wasi': '1.2.5' })]
	},
	// Vite 7 and earlier
	{
		applies: (deps) => majorBelow(deps, 'vite', 8),
		patches: () => [force('overrides', WASM_BUNDLERS)]
	},
	// Next.js
	{
		applies: (deps) => deps.has('next'),
		patches: (deps, current) => {
			const dev = nextDevWithWebpack(current('scripts', 'dev'), deps);
			return dev ? [force('scripts', { dev })] : [];
		}
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

/** True when `name` is declared and cannot install `major` or newer. */
function majorBelow(deps: DeclaredDeps, name: string, major: number): boolean {
	const spec = deps.get(name);
	if (spec === undefined) return false;
	const highest = highestMajor(spec);
	return highest !== null && highest < major;
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
	let manifest: Manifest;
	try {
		manifest = JSON.parse(manifestRaw) as Manifest;
	} catch {
		return null;
	}
	const deps: DeclaredDeps = new Map(
		Object.entries({ ...manifest.dependencies, ...manifest.devDependencies })
	);
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
		if (!rule.applies(deps)) continue;
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
