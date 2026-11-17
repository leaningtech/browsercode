/** Builds `/embed` URLs, the inverse of `parseEmbedOptions`. */
import type { FrameworkId } from '$lib/config/frameworks';
import type { ToolId } from '$lib/config/tools';
import type { ParsedRepo } from '$lib/github/parse';
import { decodeProjectLink } from '$lib/ide/project-link';
import { decodeSharedProject } from '$lib/java/shared-project';
import { VIEWS, type View } from './options';

export type EmbedTarget =
	| { kind: 'framework'; id: FrameworkId }
	| { kind: 'java'; example: string }
	| { kind: 'repo'; repo: ParsedRepo }
	| { kind: 'agent'; id: ToolId }
	/** A Share link's hash; `java` when it came from `/java`. */
	| { kind: 'link'; hash: string; java: boolean };

/** CheerpJ needs no cross-origin isolation, so a Java embed works on any page. */
export function runsOnCheerpj(target: EmbedTarget): boolean {
	return target.kind === 'java' || (target.kind === 'link' && target.java);
}

/** The target for a link copied with Share, from the IDE or the Java playground. */
export function shareLinkTarget(input: string, origin: string): EmbedTarget | null {
	let link: URL;
	try {
		link = new URL(input.trim(), origin);
	} catch {
		return null;
	}
	const hash = link.hash.slice(1);
	if (link.pathname === '/java' && hash && decodeSharedProject(hash)) {
		return { kind: 'link', hash, java: true };
	}
	if (link.pathname === '/ide' && hash && decodeProjectLink(hash)) {
		return { kind: 'link', hash, java: false };
	}
	return null;
}

/** Clipboard access for Share, plus the isolation BrowserPod needs. */
export function iframeAllow(target: EmbedTarget): string {
	return runsOnCheerpj(target) ? 'clipboard-write' : 'cross-origin-isolated; clipboard-write';
}

/** The `<iframe>` a host page pastes in to show `src`. */
export function embedSnippet(src: string, target: EmbedTarget, height: number): string {
	return [
		'<iframe',
		`  src="${src}"`,
		`  allow="${iframeAllow(target)}"`,
		`  style="width: 100%; height: ${height}px; border: 0"`,
		'></iframe>'
	].join('\n');
}

/** Ids, view names and repo paths need no escaping, so the query reads like the docs. */
export function embedUrl(target: EmbedTarget, views: readonly View[], keyless: boolean): string {
	const params: string[] = [];
	if (target.kind === 'framework') params.push(`framework=${target.id}`);
	if (target.kind === 'java') params.push('runtime=cheerpj', `framework=${target.example}`);
	if (target.kind === 'repo') params.push(`repo=${repoPath(target.repo)}`);
	if (target.kind === 'agent') params.push(`agent=${target.id}`);
	if (target.kind === 'link' && target.java) params.push('runtime=cheerpj');
	if (views.length < VIEWS.length)
		params.push(`view=${VIEWS.filter((v) => views.includes(v)).join(',')}`);
	if (keyless) params.push('apiKey=');
	const query = params.length ? `?${params.join('&')}` : '';
	return `/embed${query}${target.kind === 'link' ? `#${target.hash}` : ''}`;
}

function repoPath({ owner, repo, ref, dir }: ParsedRepo): string {
	return `${owner}/${repo}/tree/${ref}${dir ? `/${dir}` : ''}`;
}
