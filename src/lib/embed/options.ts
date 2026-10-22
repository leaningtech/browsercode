/** Parses the `/embed` query string, so a host page composes an embed entirely from the URL. */
import { defaultFrameworkId, isFrameworkId, type FrameworkId } from '$lib/config/frameworks';
import { isEnabledTool, type ToolId } from '$lib/config/tools';
import { parseGitHubUrl, type ParsedRepo } from '$lib/github/parse';
import type { ShellOptions } from '$lib/ide/shell-options';

export type EmbedSource =
	| { kind: 'framework'; id: FrameworkId }
	| { kind: 'repo'; ref: ParsedRepo }
	| { kind: 'agent'; id: ToolId };

export type EmbedOptions = { source: EmbedSource; shell: ShellOptions };

const VIEWS = ['files', 'search', 'editor', 'terminal', 'preview'] as const;
type View = (typeof VIEWS)[number];

/** Narrows a raw `view=` entry, so unknown names fall out of the list rather than throwing. */
function isView(value: string): value is View {
	return (VIEWS as readonly string[]).includes(value);
}

/** Null when the URL names a project we cannot boot, so the route can report the bad parameter. */
export function parseEmbedOptions(url: URL): EmbedOptions | null {
	const source = parseSource(url);
	return source && { source, shell: parseShell(url) };
}

/** `agent` then `repo` then `framework`; a bad value of any is an error, not a silent fallback. */
function parseSource(url: URL): EmbedSource | null {
	const agent = url.searchParams.get('agent');
	if (agent !== null) return isEnabledTool(agent) ? { kind: 'agent', id: agent } : null;

	const repo = url.searchParams.get('repo');
	if (repo) {
		const ref = parseGitHubUrl(repo);
		return ref && { kind: 'repo', ref };
	}
	const framework = url.searchParams.get('framework');
	if (framework === null) return { kind: 'framework', id: defaultFrameworkId };
	return isFrameworkId(framework) ? { kind: 'framework', id: framework } : null;
}

/** Turns `view=` into the shell's panes, leaving the playground-only chrome off throughout. */
function parseShell(url: URL): ShellOptions {
	const requested = url.searchParams.get('view');
	const views = requested ? requested.split(',').map((view) => view.trim()) : [...VIEWS];
	const shown = new Set<View>(views.filter(isView));
	// An unrecognised `view` would otherwise render an empty shell.
	if (shown.size === 0) VIEWS.forEach((view) => shown.add(view));

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
		leaveGuard: false
	};
}
