/**
 * The wasm bundler swap, written where pnpm will actually read it.
 *
 * npm takes its `overrides` from package.json; pnpm ignores that field entirely and reads its own
 * from `pnpm-workspace.yaml`. Rather than parse YAML, this edits the `overrides` block by line:
 * only the entries we own are touched, so a repo's other blocks, comments, quoting and key order
 * survive untouched.
 */
import { WASM_BUNDLERS } from './native-deps';

export const PNPM_WORKSPACE_FILE = 'pnpm-workspace.yaml';

const BLOCK = 'overrides';

/** Explains the file (or block) to whoever opens it in the editor, since we created it. */
const PREAMBLE = [
	'# Added by BrowserCode: the pod cannot execute native binaries, so esbuild and rollup',
	'# resolve to their WebAssembly builds instead.'
];

/**
 * Adds the wasm bundler overrides to `raw`, or builds the file when the repo has none (`null`).
 * Returns null when every entry already holds the value we want. Throws when the file has an
 * `overrides` key we cannot safely edit, rather than writing a second one alongside it.
 */
export function patchPnpmOverrides(
	raw: string | null
): { patched: string; notes: string[] } | null {
	const entries = Object.entries(WASM_BUNDLERS);
	if (raw === null) {
		return {
			patched:
				[...PREAMBLE, `${BLOCK}:`, ...entries.map(([n, v]) => render('  ', n, v))].join('\n') +
				'\n',
			notes: entries.map(([name, value]) => note('added', name, value))
		};
	}

	// A file committed from Windows ends its lines in `\r\n`, which would keep every line-anchored
	// pattern below from matching. Lines are split without it and rejoined with it.
	const eol = raw.includes('\r\n') ? '\r\n' : '\n';
	const lines = raw.split(/\r?\n/);
	// A block header is `overrides:` with nothing after it but a comment. Any other top-level
	// `overrides` key is flow style (`overrides: { ... }`) or an alias, which this cannot edit —
	// and appending a second one would give the file a duplicate key, so bail instead.
	const header = lines.findIndex((line) => /^overrides[ \t]*:[ \t]*(#.*)?$/.test(line));
	if (header === -1) {
		if (lines.some((line) => /^overrides[ \t]*:/.test(line))) {
			throw new Error('pnpm-workspace.yaml holds an overrides key this cannot edit');
		}
		const body = [...PREAMBLE, `${BLOCK}:`, ...entries.map(([n, v]) => render('  ', n, v))];
		const separator = raw.endsWith('\n') ? '' : eol;
		return {
			patched: `${raw}${separator}${body.join(eol)}${eol}`,
			notes: entries.map(([name, value]) => note('added', name, value))
		};
	}

	// The block runs to the next line at column zero; blanks and comments inside it belong to it.
	let end = header + 1;
	while (end < lines.length && (lines[end].trim() === '' || /^[ \t]/.test(lines[end]))) end++;
	const indent =
		lines
			.slice(header + 1, end)
			.find(isEntry)
			?.match(/^[ \t]+/)?.[0] ?? '  ';

	const notes: string[] = [];
	// New entries go directly under the header, clear of any comment attached to a later entry.
	const additions: string[] = [];
	for (const [name, value] of entries) {
		const at = lines.slice(header + 1, end).findIndex((line) => isKey(line, indent, name));
		if (at === -1) {
			additions.push(render(indent, name, value));
			notes.push(note('added', name, value));
			continue;
		}
		const index = header + 1 + at;
		if (declaredValue(lines[index], indent, name) === value) continue;
		lines[index] = render(indent, name, value);
		notes.push(note('replaced', name, value));
	}
	// A selector (`esbuild@<=0.24.2`, `vite>esbuild`) outranks the plain entry for what it covers,
	// so a repo's own security pin would bring native esbuild back. Those point at the wasm build
	// too, except `-`, which drops the package there and is the repo's call to make.
	for (let index = header + 1; index < end; index++) {
		const entry = parseEntry(lines[index], indent);
		if (!entry) continue;
		for (const [name, value] of entries) {
			if (entry.key === name || !selectorPattern(name).test(entry.key)) continue;
			const current = scalarValue(entry.rest);
			if (current === value || current === '-') continue;
			lines[index] = render(indent, entry.written, value);
			notes.push(note('replaced', entry.key, value));
		}
	}
	if (notes.length === 0) return null;
	lines.splice(header + 1, 0, ...additions);
	return { patched: lines.join(eol), notes };
}

/** True for a line that declares something, rather than being blank or comment-only. */
function isEntry(line: string): boolean {
	const trimmed = line.trim();
	return trimmed !== '' && !trimmed.startsWith('#');
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Matches `name:` at `indent`, however the file chose to quote it. */
function keyPattern(indent: string, name: string): RegExp {
	const key = escapeRegExp(name);
	return new RegExp(`^${indent}(?:'${key}'|"${key}"|${key})[ \t]*:[ \t]*(.*)$`);
}

function isKey(line: string, indent: string, name: string): boolean {
	return keyPattern(indent, name).test(line);
}

/** The value the file currently gives `name`, unquoted and with any trailing comment dropped. */
function declaredValue(line: string, indent: string, name: string): string {
	return scalarValue(keyPattern(indent, name).exec(line)?.[1] ?? '');
}

function scalarValue(text: string): string {
	const quoted = /^'((?:[^']|'')*)'|^"((?:[^"\\]|\\.)*)"/.exec(text);
	if (quoted) return (quoted[1] ?? quoted[2] ?? '').replace(/''/g, "'");
	return text.split(/[ \t]+#/)[0].trim();
}

/** An entry at exactly `indent`: its key as the file wrote it, that key unquoted, and its value. */
function parseEntry(
	line: string,
	indent: string
): { written: string; key: string; rest: string } | null {
	if (!line.startsWith(indent) || /^[ \t]/.test(line.slice(indent.length))) return null;
	const match = /^('(?:[^']|'')*'|"(?:[^"\\]|\\.)*"|[^'"#\s]\S*?)[ \t]*:(?:[ \t]+(.*))?$/.exec(
		line.slice(indent.length)
	);
	if (!match) return null;
	return { written: match[1], key: scalarValue(match[1]), rest: match[2] ?? '' };
}

/**
 * Matches a selector whose overridden package is `name`, alone or under a parent. The range may
 * hold only comparator characters, so `esbuild@1>foo` (foo under esbuild) is not mistaken for one.
 */
function selectorPattern(name: string): RegExp {
	return new RegExp(`(?:^|>)${escapeRegExp(name)}(?:@[\\d.<>=^~xX*| -]*)?$`);
}

/** Values are quoted because ours carry `:` and `@`, which plain scalars make a gamble. */
function render(indent: string, name: string, value: string): string {
	return `${indent}${name}: '${value}'`;
}

function note(verb: 'added' | 'replaced', name: string, value: string): string {
	return `${verb} ${BLOCK}.${name}: ${value}`;
}
