/** Parses the `/embed` query string, so a host page composes an embed entirely from the URL. */
import { defaultFrameworkId, isFrameworkId, type FrameworkId } from '$lib/config/frameworks';
import { isEnabledTool, type ToolId } from '$lib/config/tools';
import { parseGitHubUrl, type ParsedRepo } from '$lib/github/parse';
import { defaultJavaExample, isJavaExample, type JavaExample } from '$lib/ide/java-source';
import type { ShellOptions } from '$lib/ide/shell-options';

export type EmbedSource =
	| { kind: 'framework'; id: FrameworkId }
	| { kind: 'repo'; ref: ParsedRepo }
	| { kind: 'agent'; id: ToolId }
	| { kind: 'java'; example: JavaExample };

export type EmbedOptions = { source: EmbedSource; shell: ShellOptions };

const VIEWS = ['files', 'search', 'editor', 'terminal', 'preview'] as const;
type View = (typeof VIEWS)[number];
/** Java prints to the Output tab and has nothing to preview. */
const JAVA_VIEWS = VIEWS.filter((view) => view !== 'preview');

/** Narrows a raw `view=` entry, so unknown names fall out of the list rather than throwing. */
function isView(value: string): value is View {
	return (VIEWS as readonly string[]).includes(value);
}

/** Null when the URL names a project we cannot boot, so the route can report the bad parameter. */
export function parseEmbedOptions(url: URL): EmbedOptions | null {
	const source = parseSource(url);
	return source && { source, shell: parseShell(url, source.kind === 'java' ? JAVA_VIEWS : VIEWS) };
}

/**
 * `agent` then `runtime` then `repo` then `framework`; a bad value of any is an error, not a
 * silent fallback.
 */
function parseSource(url: URL): EmbedSource | null {
	const agent = url.searchParams.get('agent');
	if (agent !== null) return isEnabledTool(agent) ? { kind: 'agent', id: agent } : null;

	// CheerpJ is the only runtime to pick so far; `framework` then names one of its Java examples.
	const runtime = url.searchParams.get('runtime');
	if (runtime !== null) {
		if (runtime !== 'cheerpj') return null;
		const example = url.searchParams.get('framework') ?? defaultJavaExample;
		return isJavaExample(example) ? { kind: 'java', example } : null;
	}

	const repo = url.searchParams.get('repo');
	if (repo) {
		const ref = parseGitHubUrl(repo);
		return ref && { kind: 'repo', ref };
	}
	const framework = url.searchParams.get('framework');
	if (framework === null) return { kind: 'framework', id: defaultFrameworkId };
	return isFrameworkId(framework) ? { kind: 'framework', id: framework } : null;
}

/**
 * Turns `view=` into the shell's panes, out of those `available` to the project, leaving the
 * playground-only chrome off throughout.
 */
function parseShell(url: URL, available: readonly View[]): ShellOptions {
	const requested = url.searchParams.get('view');
	const views = requested ? requested.split(',').map((view) => view.trim()) : [...available];
	const shown = new Set<View>(views.filter(isView).filter((view) => available.includes(view)));
	// An unrecognised or unavailable `view` would otherwise render an empty shell.
	if (shown.size === 0) available.forEach((view) => shown.add(view));

	return {
		// Names the project and open file, which is chrome without an editor.
		header: shown.has('editor'),
		fileTree: shown.has('files'),
		search: shown.has('search'),
		editor: shown.has('editor'),
		terminal: shown.has('terminal'),
		preview: shown.has('preview'),
		tools: false,
		// The host page has none of our chrome, so the embed carries the attribution itself.
		brand: true,
		// An embed is often framed narrower than the mobile breakpoint even on a desktop, which
		// leaves one pane showing. Opening on the running app says what this is far better than
		// an editor does; the tab bar, and its activity cues, lead back to the rest.
		initialPane: 'preview',
		leaveGuard: false
	};
}
