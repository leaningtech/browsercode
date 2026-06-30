/**
 * Minimal GitHub REST helper for the IDE's GitHub-clone boot mode. Browser `fetch`,
 * unauthenticated (60 req/hr). `fetchRepoTree` returns the repo's file list so the tree
 * can render before/while the pod clones.
 *
 * For a sub-directory boot we resolve that directory's tree SHA first and fetch
 * recursively from there: the request stays small (matters for big monorepos), dodges the
 * recursive-tree truncation cap, and yields paths already relative to `dir`.
 */

const API_ROOT = 'https://api.github.com';

// Bounds for the truncated-tree fallback walk (only reached for huge repo roots).
const MAX_TREE_REQUESTS = 200;
const MAX_FILES = 20_000;

type GitTreeEntry = { path: string; type: 'blob' | 'tree' | 'commit'; sha: string };
type GitTreeResponse = { sha: string; tree: GitTreeEntry[]; truncated: boolean };

function enc(segment: string): string {
	return encodeURIComponent(segment);
}

/** Strip leading/trailing slashes and `.`/empty segments so `dir` is a clean a/b/c. */
function normalizeDir(dir: string): string {
	return dir
		.split('/')
		.map((segment) => segment.trim())
		.filter((segment) => segment.length > 0 && segment !== '.')
		.join('/');
}

async function githubFetch(path: string): Promise<unknown> {
	let response: Response;
	try {
		response = await fetch(`${API_ROOT}${path}`, {
			headers: { Accept: 'application/vnd.github+json' }
		});
	} catch (cause) {
		throw new Error('Network request to GitHub failed', { cause });
	}

	if (response.ok) return response.json();

	if (response.status === 404) throw new Error('Repository, ref or path not found');
	if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0')
		throw new Error('GitHub API rate limit exceeded (unauthenticated requests are limited to 60/hour)');
	throw new Error(`GitHub API request failed (${response.status})`);
}

/** Walk `dir` one segment at a time from `ref`, returning the tree SHA of the sub-directory. */
async function resolveSubtreeSha(
	owner: string,
	repo: string,
	ref: string,
	dir: string
): Promise<string> {
	let sha = ref;
	for (const segment of dir.split('/')) {
		const tree = (await githubFetch(
			`/repos/${enc(owner)}/${enc(repo)}/git/trees/${enc(sha)}`
		)) as GitTreeResponse;
		const match = tree.tree.find((entry) => entry.type === 'tree' && entry.path === segment);
		if (!match) throw new Error(`Directory "${dir}" not found in ${owner}/${repo}@${ref}`);
		sha = match.sha;
	}
	return sha;
}

/** Capped breadth-first walk used when the recursive tree comes back truncated. */
async function walkTree(owner: string, repo: string, rootSha: string): Promise<string[]> {
	const files: string[] = [];
	const queue: Array<{ sha: string; prefix: string }> = [{ sha: rootSha, prefix: '' }];
	let requests = 0;

	while (queue.length > 0) {
		if (requests >= MAX_TREE_REQUESTS || files.length >= MAX_FILES) break;
		const { sha, prefix } = queue.shift()!;
		requests++;
		const tree = (await githubFetch(
			`/repos/${enc(owner)}/${enc(repo)}/git/trees/${enc(sha)}`
		)) as GitTreeResponse;
		for (const entry of tree.tree) {
			const path = prefix ? `${prefix}/${entry.path}` : entry.path;
			if (entry.type === 'blob') files.push(path);
			else if (entry.type === 'tree') queue.push({ sha: entry.sha, prefix: path });
		}
	}

	files.sort();
	return files;
}

/** Returns the repo's blob paths relative to `dir` (repo root when `dir` is empty), sorted. */
export async function fetchRepoTree(
	owner: string,
	repo: string,
	ref: string,
	dir = ''
): Promise<string[]> {
	const normalizedDir = normalizeDir(dir);

	// Scope to the sub-directory so paths come back relative to `dir` and the request stays
	// small; the repo root is fetched straight from `ref`.
	const startSha = normalizedDir ? await resolveSubtreeSha(owner, repo, ref, normalizedDir) : ref;

	const recursive = (await githubFetch(
		`/repos/${enc(owner)}/${enc(repo)}/git/trees/${enc(startSha)}?recursive=1`
	)) as GitTreeResponse;

	if (!recursive.truncated)
		return recursive.tree
			.filter((entry) => entry.type === 'blob')
			.map((entry) => entry.path)
			.sort();

	return walkTree(owner, repo, startSha);
}
