<script lang="ts">
	import Icon from '@iconify/svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import type { IdeSession } from '$lib/ide/session.svelte';

	let { session, onFileOpen }: { session: IdeSession; onFileOpen?: () => void } = $props();

	type TreeNode = { name: string; path: string; children?: TreeNode[] };

	function buildTree(files: string[]): TreeNode[] {
		const root: TreeNode[] = [];
		for (const file of files) {
			const parts = file.split('/');
			let current = root;
			let pathSoFar = '';
			for (let i = 0; i < parts.length; i++) {
				const part = parts[i];
				pathSoFar = pathSoFar ? `${pathSoFar}/${part}` : part;
				const isFile = i === parts.length - 1;
				let node = current.find((n) => n.name === part);
				if (!node) {
					node = isFile
						? { name: part, path: file }
						: { name: part, path: pathSoFar, children: [] };
					current.push(node);
				}
				if (!isFile) current = node.children!;
			}
		}
		return root;
	}

	let fileTree = $derived(buildTree(session.projectFiles));
	const expandedFolders = new SvelteSet(['src', 'src/lib', 'public']);

	function toggleFolder(path: string) {
		if (expandedFolders.has(path)) expandedFolders.delete(path);
		else expandedFolders.add(path);
	}

	function openFile(path: string) {
		void session.loadFile(path);
		onFileOpen?.();
	}
</script>

{#snippet treeNode(nodes: TreeNode[], depth: number)}
	{#each nodes as node (node.path)}
		{#if node.children}
			<button
				onclick={() => toggleFolder(node.path)}
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
			{#if expandedFolders.has(node.path)}
				{@render treeNode(node.children, depth + 1)}
			{/if}
		{:else}
			<button
				onclick={() => openFile(node.path)}
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

{@render treeNode(fileTree, 0)}
