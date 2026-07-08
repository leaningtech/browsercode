<script lang="ts">
	import Icon from '@iconify/svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import type { IdeSession } from '$lib/ide/session.svelte';

	let { session, onFileOpen }: { session: IdeSession; onFileOpen?: () => void } = $props();

	type TreeNode = { name: string; path: string; children?: TreeNode[] };

	/** Builds the nested tree from flat file and dir lists; dirs are inserted first so empty folders still appear. */
	function buildTree(files: string[], dirs: string[]): TreeNode[] {
		const root: TreeNode[] = [];
		function insert(path: string, isDir: boolean) {
			const parts = path.split('/');
			let current = root;
			let pathSoFar = '';
			for (let i = 0; i < parts.length; i++) {
				const part = parts[i];
				pathSoFar = pathSoFar ? `${pathSoFar}/${part}` : part;
				const isLeafFile = !isDir && i === parts.length - 1;
				let node = current.find((n) => n.name === part);
				if (!node) {
					node = isLeafFile ? { name: part, path } : { name: part, path: pathSoFar, children: [] };
					current.push(node);
				}
				if (!isLeafFile) current = node.children ??= [];
			}
		}
		for (const dir of dirs) insert(dir, true);
		for (const file of files) insert(file, false);
		sortNodes(root);
		return root;
	}

	/** Folders first, then case-insensitive alphabetical — at every level. */
	function sortNodes(nodes: TreeNode[]) {
		nodes.sort((a, b) =>
			!!a.children === !!b.children ? a.name.localeCompare(b.name) : a.children ? -1 : 1
		);
		for (const node of nodes) if (node.children) sortNodes(node.children);
	}

	let fileTree = $derived(buildTree(session.projectFiles, session.projectDirs));
	const expandedFolders = new SvelteSet(['src', 'src/lib', 'public']);

	function toggleFolder(path: string) {
		if (expandedFolders.has(path)) expandedFolders.delete(path);
		else expandedFolders.add(path);
	}

	function openFile(path: string) {
		void session.openFile(path);
		onFileOpen?.();
	}

	// ── File/folder management ────────────────────────────────────────────────
	let pendingCreate = $state<{ kind: 'file' | 'folder'; parent: string } | null>(null);
	let renaming = $state<{ path: string; isDir: boolean } | null>(null);
	let actionName = $state('');
	let actionError = $state('');
	let actionBusy = $state(false);
	let confirmDelete = $state<{ path: string; isDir: boolean } | null>(null);
	let deleteBusy = $state(false);
	let deleteError = $state('');
	let menu = $state<{ x: number; y: number; path: string; isDir: boolean } | null>(null);

	let deleteChildCount = $derived.by(() => {
		if (!confirmDelete?.isDir) return 0;
		const prefix = `${confirmDelete.path}/`;
		return session.projectFiles.filter((file) => file.startsWith(prefix)).length;
	});

	const parentOf = (path: string) =>
		path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';

	/** True if `name` is already taken among the direct children of `parent`. */
	function siblingExists(parent: string, name: string): boolean {
		const target = parent ? `${parent}/${name}` : name;
		const matches = (path: string) => path === target || path.startsWith(`${target}/`);
		return session.projectFiles.some(matches) || session.projectDirs.some(matches);
	}

	/** Checks a proposed name; returns an error message, or '' when valid. */
	function validateName(name: string, parent: string): string {
		if (!name) return 'Name is required';
		if (name === '.' || name === '..') return 'Invalid name';
		if (/[/\\]/.test(name)) return 'Name cannot contain slashes';
		if (siblingExists(parent, name)) return `'${name}' already exists here`;
		return '';
	}

	/** Kicks off inline creation; without `parent`, targets the open file's folder. */
	export function startCreate(kind: 'file' | 'folder', parent?: string) {
		if (!session.podReady) return;
		closeMenu();
		renaming = null;
		const target = parent ?? (session.selectedFile ? parentOf(session.selectedFile) : '');
		pendingCreate = { kind, parent: target };
		actionName = '';
		actionError = '';
		if (target) expandedFolders.add(target);
	}

	/** Kicks off inline rename of an existing file or folder. */
	function startRename(path: string, isDir: boolean) {
		closeMenu();
		pendingCreate = null;
		renaming = { path, isDir };
		actionName = path.split('/').pop() ?? '';
		actionError = '';
	}

	function cancelAction() {
		if (actionBusy) return;
		pendingCreate = null;
		renaming = null;
		actionError = '';
	}

	async function commitCreate() {
		if (!pendingCreate || actionBusy) return;
		const name = actionName.trim();
		const error = validateName(name, pendingCreate.parent);
		if (error) {
			actionError = error;
			return;
		}
		const { kind, parent } = pendingCreate;
		const path = parent ? `${parent}/${name}` : name;
		actionBusy = true;
		const failure =
			kind === 'file' ? await session.createFile(path) : await session.createFolder(path);
		actionBusy = false;
		if (failure) {
			actionError = failure;
			return;
		}
		pendingCreate = null;
		if (kind === 'file') onFileOpen?.();
		else expandedFolders.add(path);
	}

	async function commitRename() {
		if (!renaming || actionBusy) return;
		const target = renaming;
		const name = actionName.trim();
		const oldName = target.path.split('/').pop() ?? '';
		if (name === oldName) {
			renaming = null;
			return;
		}
		const parent = parentOf(target.path);
		const error = validateName(name, parent);
		if (error) {
			actionError = error;
			return;
		}
		const to = parent ? `${parent}/${name}` : name;
		actionBusy = true;
		const failure = await session.renameEntry(target.path, to);
		actionBusy = false;
		if (failure) {
			actionError = failure;
			return;
		}
		if (target.isDir && expandedFolders.has(target.path)) {
			expandedFolders.delete(target.path);
			expandedFolders.add(to);
		}
		renaming = null;
	}

	function requestDelete(path: string, isDir: boolean) {
		closeMenu();
		deleteError = '';
		confirmDelete = { path, isDir };
	}

	async function performDelete() {
		if (!confirmDelete || deleteBusy) return;
		deleteBusy = true;
		const failure = await session.deleteEntry(confirmDelete.path);
		deleteBusy = false;
		if (failure) {
			deleteError = failure;
			return;
		}
		confirmDelete = null;
	}

	function openMenu(event: MouseEvent, path: string, isDir: boolean) {
		if (!session.podReady) return;
		event.preventDefault();
		// Clamp to the viewport so the menu (≈184×152px) never spills off the edge.
		menu = {
			x: Math.min(event.clientX, window.innerWidth - 184),
			y: Math.min(event.clientY, window.innerHeight - 152),
			path,
			isDir
		};
	}

	function closeMenu() {
		menu = null;
	}

	/** Focuses a freshly mounted inline input, selecting the name sans extension. */
	function focusInput(el: HTMLInputElement) {
		el.focus();
		const dot = el.value.lastIndexOf('.');
		el.setSelectionRange(0, dot > 0 ? dot : el.value.length);
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key !== 'Escape') return;
		closeMenu();
		cancelAction();
		if (!deleteBusy) confirmDelete = null;
	}}
/>

{#snippet nameInput(pad: number, icon: string, onCommit: () => void)}
	<div class="flex flex-col gap-1 py-0.5 pr-2" style="padding-left: {pad}rem">
		<div class="flex items-center gap-1">
			<Icon {icon} width="12" height="12" class="shrink-0 text-zinc-500" />
			<input
				use:focusInput
				bind:value={actionName}
				disabled={actionBusy}
				spellcheck="false"
				autocomplete="off"
				onkeydown={(e) => {
					if (e.key === 'Enter') onCommit();
					else if (e.key === 'Escape') cancelAction();
				}}
				onblur={cancelAction}
				oninput={() => (actionError = '')}
				class="min-w-0 flex-1 rounded border bg-zinc-900 px-1 py-0.5 text-[11px] text-zinc-100 outline-none disabled:opacity-60 {actionError
					? 'border-rose-500/60'
					: 'border-emerald-500/50'}"
			/>
		</div>
		{#if actionError}
			<p class="text-[10px] leading-tight text-rose-300/90">{actionError}</p>
		{/if}
	</div>
{/snippet}

{#snippet menuItem(icon: string, label: string, onSelect: () => void, danger = false)}
	<button
		type="button"
		role="menuitem"
		onclick={onSelect}
		class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition {danger
			? 'text-rose-300/80 hover:bg-rose-500/10 hover:text-rose-200'
			: 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}"
	>
		<Icon {icon} width="13" height="13" class="shrink-0" />
		<span class="truncate">{label}</span>
	</button>
{/snippet}

{#snippet treeNode(nodes: TreeNode[], depth: number, parentPath: string)}
	{#if pendingCreate && pendingCreate.parent === parentPath}
		{@render nameInput(
			0.75 + depth * 0.75,
			pendingCreate.kind === 'folder' ? 'mingcute:folder-line' : 'mingcute:file-line',
			commitCreate
		)}
	{/if}
	{#each nodes as node (node.path)}
		{#if node.children}
			{#if renaming?.path === node.path}
				{@render nameInput(0.5 + depth * 0.75, 'mingcute:folder-line', commitRename)}
			{:else}
				<button
					onclick={() => toggleFolder(node.path)}
					oncontextmenu={(e) => openMenu(e, node.path, true)}
					class="flex w-full items-center gap-1 rounded px-2 py-0.5 text-left text-[11px] text-zinc-500 transition hover:bg-white/5 hover:text-zinc-300"
					style="padding-left: {0.5 + depth * 0.75}rem"
				>
					<Icon
						icon={expandedFolders.has(node.path) ? 'mingcute:down-fill' : 'mingcute:right-fill'}
						width="10"
						height="10"
						class="shrink-0 text-zinc-600"
					/>
					<Icon icon="mingcute:folder-line" width="12" height="12" class="shrink-0 text-zinc-500" />
					<span class="truncate">{node.name}</span>
				</button>
			{/if}
			{#if expandedFolders.has(node.path)}
				{@render treeNode(node.children, depth + 1, node.path)}
			{/if}
		{:else if renaming?.path === node.path}
			{@render nameInput(0.75 + depth * 0.75, 'mingcute:file-line', commitRename)}
		{:else}
			<button
				onclick={() => openFile(node.path)}
				oncontextmenu={(e) => openMenu(e, node.path, false)}
				class="flex w-full items-center gap-1 rounded px-2 py-0.5 text-left text-[11px] transition {session.selectedFile ===
				node.path
					? 'bg-white/8 text-zinc-100'
					: 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'}"
				style="padding-left: {0.75 + depth * 0.75}rem"
			>
				<Icon icon="mingcute:file-line" width="12" height="12" class="shrink-0" />
				<span class="truncate">{node.name}</span>
			</button>
		{/if}
	{/each}
{/snippet}

{@render treeNode(fileTree, 0, '')}

{#if menu}
	{@const target = menu}
	<button
		type="button"
		aria-label="Close menu"
		class="fixed inset-0 z-40 cursor-default"
		onclick={closeMenu}
		oncontextmenu={(e) => {
			e.preventDefault();
			closeMenu();
		}}
	></button>
	<div
		role="menu"
		class="fixed z-50 w-44 rounded-lg border border-white/8 bg-[#0e0e0e] p-1 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
		style="left: {target.x}px; top: {target.y}px;"
	>
		{#if target.isDir}
			{@render menuItem('mingcute:file-new-line', 'New file…', () =>
				startCreate('file', target.path)
			)}
			{@render menuItem('mingcute:new-folder-line', 'New folder…', () =>
				startCreate('folder', target.path)
			)}
			<div class="my-1 h-px bg-white/[0.06]"></div>
		{/if}
		{@render menuItem('mingcute:edit-2-line', 'Rename…', () =>
			startRename(target.path, target.isDir)
		)}
		{@render menuItem(
			'mingcute:delete-2-line',
			'Delete',
			() => requestDelete(target.path, target.isDir),
			true
		)}
	</div>
{/if}

{#if confirmDelete}
	{@const entryName = confirmDelete.path.split('/').pop()}
	<div class="fixed inset-0 z-70 flex items-center justify-center bg-black/60 p-4">
		<div class="w-full max-w-xs rounded-xl border border-white/8 bg-[#111111] p-5">
			<h3 class="mb-1.5 text-[13px] font-semibold text-zinc-100">
				Delete {confirmDelete.isDir ? 'folder' : 'file'} “{entryName}”?
			</h3>
			<p class="mb-4 text-[11.5px] leading-relaxed text-zinc-500">
				{#if deleteChildCount > 0}
					It contains {deleteChildCount} file{deleteChildCount === 1 ? '' : 's'}. This cannot be
					undone.
				{:else}
					This cannot be undone.
				{/if}
			</p>
			{#if deleteError}
				<p class="mb-3 text-[11px] text-rose-300/90">{deleteError}</p>
			{/if}
			<div class="flex justify-end gap-2">
				<button
					type="button"
					disabled={deleteBusy}
					onclick={() => (confirmDelete = null)}
					class="rounded-md px-3 py-1.5 text-[11.5px] text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200 disabled:opacity-50"
				>
					Cancel
				</button>
				<button
					type="button"
					disabled={deleteBusy}
					onclick={performDelete}
					class="rounded-md bg-rose-600/90 px-3 py-1.5 text-[11.5px] font-medium text-white transition hover:bg-rose-500 disabled:opacity-60"
				>
					{deleteBusy ? 'Deleting…' : 'Delete'}
				</button>
			</div>
		</div>
	</div>
{/if}
