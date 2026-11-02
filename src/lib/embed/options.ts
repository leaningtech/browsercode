/** Parses the `/embed` query string, so a host page composes an embed entirely from the URL. */
import {
	defaultFrameworkId,
	resolveFrameworkId,
	resolveRuntimeTemplate,
	type FrameworkId
} from '$lib/config/frameworks';
import { isEnabledTool, type ToolId } from '$lib/config/tools';
import { parseGitHubUrl, type ParsedRepo } from '$lib/github/parse';
import type { ShellOptions } from '$lib/ide/shell-options';

export type EmbedSource =
	| { kind: 'framework'; id: FrameworkId }
	| { kind: 'repo'; ref: ParsedRepo }
	| { kind: 'agent'; id: ToolId };

const VIEWS = ['files', 'search', 'editor', 'terminal', 'preview'] as const;
type View = (typeof VIEWS)[number];

/** Narrows a raw `view=` entry, so unknown names fall out of the list rather than throwing. */
function isView(value: string): value is View {
	return (VIEWS as readonly string[]).includes(value);
}

/**
 * Null when the URL names a project we cannot boot, so the route can report the bad parameter.
 * `agent` then `runtime` then `repo` then `framework`; a bad value of any is an error, not a
 * silent fallback.
 */
export function parseEmbedSource(url: URL): EmbedSource | null {
	const agent = url.searchParams.get('agent');
	if (agent !== null) return isEnabledTool(agent) ? { kind: 'agent', id: agent } : null;

	const runtime = url.searchParams.get('runtime');
	if (runtime !== null) {
		const id = resolveRuntimeTemplate(runtime, url.searchParams.get('framework'));
		return id ? { kind: 'framework', id } : null;
	}

	const repo = url.searchParams.get('repo');
	if (repo) {
		const ref = parseGitHubUrl(repo);
		return ref && { kind: 'repo', ref };
	}
	const framework = url.searchParams.get('framework');
	if (framework === null) return { kind: 'framework', id: defaultFrameworkId };
	const id = resolveFrameworkId(framework);
	return id ? { kind: 'framework', id } : null;
}

/**
 * Turns `view=` into the shell's panes, leaving the playground-only chrome off throughout.
 * `preview` is false when the project has nothing to preview, which takes the pane out of `view=`.
 */
export function parseEmbedShell(url: URL, preview: boolean): ShellOptions {
	const available: readonly View[] = preview ? VIEWS : VIEWS.filter((view) => view !== 'preview');
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
