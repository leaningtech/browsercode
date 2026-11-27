/**
 * The docs tree, in reading order. One source for the in-page navigation, the sidebar's Docs
 * flyout and every docs page's <title> (seo.ts), so a new page means an entry here plus its
 * route, so the three cannot drift.
 *
 * `path` is a literal union rather than `string` because `resolve()` only accepts a known route
 * id; a typo here is a type error instead of a dead link.
 */
export type DocsPath =
	| '/docs'
	| '/docs/ide'
	| '/docs/ide/javascript'
	| '/docs/ide/java'
	| '/docs/agents'
	| '/docs/agents/claude'
	| '/docs/agents/codex'
	| '/docs/agents/pi'
	| '/docs/linking'
	| '/docs/embedding'
	| '/docs/self-hosting'
	| '/docs/licensing'
	| '/privacy';

export type DocsEntry = {
	path: DocsPath;
	/** Nav label, and the page's own <h1>. */
	label: string;
	/** The nav's one-line hint, and the page's meta description. */
	description: string;
	/** Rendered indented under their parent, which is itself a page. */
	children?: DocsEntry[];
};

export const docsNav: DocsEntry[] = [
	{
		path: '/docs',
		label: 'Overview',
		description: 'What BrowserCode is, and the two runtimes underneath it.'
	},
	{
		path: '/docs/ide',
		label: 'The IDE playground',
		description: 'Templates, GitHub clones, and what each pane does.',
		children: [
			{
				path: '/docs/ide/javascript',
				label: 'Running JavaScript projects',
				description: 'Templates, package managers, overrides, and getting a preview on screen.'
			},
			{
				path: '/docs/ide/java',
				label: 'Running Java projects',
				description: 'Compiling and running Java on CheerpJ, and sharing a project by link.'
			}
		]
	},
	{
		path: '/docs/agents',
		label: 'Running coding agents',
		description: 'Run an unmodified coding CLI in a sandbox, with no access to your machine.',
		children: [
			{
				path: '/docs/agents/claude',
				label: 'Claude Code',
				description: 'Signing in to Claude Code with a code instead of a redirect.'
			},
			{
				path: '/docs/agents/codex',
				label: 'Codex CLI',
				description: 'Running Codex CLI with an OpenAI API key kept in your browser.'
			},
			{
				path: '/docs/agents/pi',
				label: 'Pi',
				description: 'Installing Pi, and signing in to a provider through /login.'
			}
		]
	},
	{
		path: '/docs/linking',
		label: 'Linking to BrowserCode',
		description: 'Send someone straight to a project with a URL, from a README or anywhere else.'
	},
	{
		path: '/docs/embedding',
		label: 'Embedding BrowserCode',
		description: 'Put a runnable example in your own page, and the headers it needs.'
	},
	{
		path: '/docs/self-hosting',
		label: 'Making it your own',
		description: 'Clone BrowserCode, run it locally, change it and deploy your own copy.'
	},
	{
		path: '/docs/licensing',
		label: 'Licensing',
		description: 'How BrowserCode is licensed, and where BrowserPod and CheerpJ differ.'
	},
	{
		path: '/privacy',
		label: 'Privacy Policy',
		description: 'How Leaning Technologies handles your data when you use BrowserCode.'
	}
];

/** Every entry, parents and children alike, flattened in reading order. */
export const docsEntries: DocsEntry[] = docsNav.flatMap((entry) => [
	entry,
	...(entry.children ?? [])
]);

export function findDocsEntry(path: string | null | undefined): DocsEntry | undefined {
	return docsEntries.find((entry) => entry.path === path);
}

/** The next page in reading order, for the footer link; undefined on the last one. */
export function nextDocsEntry(path: string): DocsEntry | undefined {
	const index = docsEntries.findIndex((entry) => entry.path === path);
	return index === -1 ? undefined : docsEntries[index + 1];
}
