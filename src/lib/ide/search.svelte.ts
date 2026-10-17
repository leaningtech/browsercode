import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import type { IdeSession } from '$lib/ide/session.svelte';

/** A project file whose name/path matched the query. */
export type FileMatch = { path: string };

/** A single matching line inside a file; `line`/`col` are 1-based, used to jump the editor there. */
export type ContentMatch = { path: string; line: number; col: number; preview: string };

/** Result caps; the panel notes when it truncated. Sized for large GitHub clones. */
const MAX_RESULTS = 200;
const MAX_MATCHES_PER_FILE = 40;
/**
 * Files larger than this are skipped for content search (read size-first, so the bytes are never
 * pulled into memory). Exported so the panel's "large file" note stays in sync with the limit.
 */
export const MAX_FILE_BYTES = 1_000_000;
const PREVIEW_LENGTH = 200;
const DEBOUNCE_MS = 150;

/** Extensions we never read for a content search (binary or non-text). */
const SKIP_EXT = new Set([
	// images
	'png',
	'jpg',
	'jpeg',
	'gif',
	'bmp',
	'ico',
	'webp',
	'avif',
	'tiff',
	'psd',
	// fonts
	'woff',
	'woff2',
	'ttf',
	'otf',
	'eot',
	// audio / video
	'mp3',
	'wav',
	'ogg',
	'flac',
	'aac',
	'mp4',
	'webm',
	'mov',
	'avi',
	'mkv',
	'm4a',
	// archives
	'zip',
	'gz',
	'tgz',
	'tar',
	'rar',
	'7z',
	'bz2',
	'xz',
	// binaries / data
	'wasm',
	'exe',
	'dll',
	'so',
	'dylib',
	'bin',
	'dat',
	'class',
	'jar',
	'pdf',
	'sqlite',
	'db',
	'lockb',
	'node'
]);

/** Exact filenames we skip; generated or oversized files with no search value. */
const SKIP_NAME = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb']);

const basename = (path: string): string => path.slice(path.lastIndexOf('/') + 1);

/**
 * BrowserPod has no stdout capture or directory listing, so grep is not possible; matching runs
 * in JS over file contents, cached in `index` so debounced keystrokes don't re-read the tree.
 */
export class ProjectSearch {
	query = $state('');
	fileMatches = $state<FileMatch[]>([]);
	contentMatches = $state<ContentMatch[]>([]);
	busy = $state(false);
	/** True when results were capped at {@link MAX_RESULTS}. */
	truncated = $state(false);
	/** How many text files were skipped this run for exceeding {@link MAX_FILE_BYTES}. */
	skippedLarge = $state(0);

	/** Cached file contents; `null` marks a file skipped as too large (so it isn't re-read needlessly). */
	private index = new SvelteMap<string, string | null>();
	private debounceTimer: ReturnType<typeof setTimeout> | undefined;
	/** Bumped per run so a superseded async search bails after its next await. */
	private runToken = 0;

	constructor(private session: IdeSession) {}

	/** Updates the query and schedules a debounced search. */
	setQuery = (value: string): void => {
		this.query = value;
		clearTimeout(this.debounceTimer);
		this.debounceTimer = setTimeout(() => void this.run(), DEBOUNCE_MS);
	};

	/** Runs the current query immediately (skips the debounce), e.g. on Enter. */
	runNow = (): void => {
		clearTimeout(this.debounceTimer);
		void this.run();
	};

	/** True when there is nothing to show for a non-empty, settled query. */
	get empty(): boolean {
		return !this.busy && this.fileMatches.length === 0 && this.contentMatches.length === 0;
	}

	private isTextCandidate(path: string): boolean {
		const name = basename(path).toLowerCase();
		if (SKIP_NAME.has(name)) return false;
		if (name.endsWith('.map') || name.endsWith('.min.js') || name.endsWith('.min.css'))
			return false;
		const dot = name.lastIndexOf('.');
		const ext = dot >= 0 ? name.slice(dot + 1) : '';
		return !SKIP_EXT.has(ext);
	}

	/** Content for `path`, preferring the live editor buffer and caching workspace reads. */
	private async contentOf(path: string): Promise<string | null> {
		const open = this.session.openFiles.find((file) => file.path === path);
		if (open) {
			// The live buffer wins; drop any cached copy so the next read after close is fresh.
			this.index.delete(path);
			return open.content;
		}
		const cached = this.index.get(path);
		if (cached !== undefined) return cached;
		if (!this.session.fsReady) return null;
		try {
			const content = await this.session.fs.readFileWithinLimit(
				`${this.session.workdir}/${path}`,
				MAX_FILE_BYTES
			);
			this.index.set(path, content);
			return content;
		} catch {
			return null;
		}
	}

	private async run(): Promise<void> {
		const token = ++this.runToken;
		const raw = this.query.trim();
		if (!raw) {
			this.fileMatches = [];
			this.contentMatches = [];
			this.truncated = false;
			this.skippedLarge = 0;
			this.busy = false;
			return;
		}
		this.busy = true;
		const needle = raw.toLowerCase();
		const files = this.session.projectFiles;

		// Prune entries for files that were deleted or renamed away.
		const known = new SvelteSet(files);
		for (const key of this.index.keys()) if (!known.has(key)) this.index.delete(key);

		// Filename matches
		const fileMatches: { path: string; rank: number }[] = [];
		for (const path of files) {
			const base = basename(path).toLowerCase();
			const inBase = base.includes(needle);
			if (!inBase && !path.toLowerCase().includes(needle)) continue;
			fileMatches.push({ path, rank: inBase ? (base.startsWith(needle) ? 0 : 1) : 2 });
		}
		fileMatches.sort((a, b) => a.rank - b.rank || a.path.length - b.path.length);

		// Content matches
		const contentMatches: ContentMatch[] = [];
		let truncated = false;
		let skippedLarge = 0;
		for (const path of files) {
			if (contentMatches.length >= MAX_RESULTS) {
				truncated = true;
				break;
			}
			if (!this.isTextCandidate(path)) continue;
			const content = await this.contentOf(path);
			if (token !== this.runToken) return; // superseded by a newer query
			if (content === null) {
				// Oversized files are cached as null; read errors stay uncached (get returns undefined).
				if (this.index.get(path) === null) skippedLarge++;
				continue;
			}

			const lines = content.split('\n');
			let perFile = 0;
			for (let i = 0; i < lines.length; i++) {
				const col = lines[i].toLowerCase().indexOf(needle);
				if (col < 0) continue;
				contentMatches.push({
					path,
					line: i + 1,
					col: col + 1,
					preview: lines[i].trim().slice(0, PREVIEW_LENGTH)
				});
				if (++perFile >= MAX_MATCHES_PER_FILE) break;
				if (contentMatches.length >= MAX_RESULTS) {
					truncated = true;
					break;
				}
			}
			if (truncated) break;
		}

		if (token !== this.runToken) return;
		this.fileMatches = fileMatches.slice(0, MAX_RESULTS).map(({ path }) => ({ path }));
		this.contentMatches = contentMatches;
		this.truncated = truncated;
		this.skippedLarge = skippedLarge;
		this.busy = false;
	}

	/** Clears the debounce timer; call on host unmount. */
	dispose = (): void => {
		clearTimeout(this.debounceTimer);
	};
}
