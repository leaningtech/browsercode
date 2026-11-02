<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import IdeShell from '$lib/components/ide/IdeShell.svelte';
	import JavaLanding from '$lib/components/java/JavaLanding.svelte';
	import { IdeSession } from '$lib/ide/session.svelte';
	import { templateSource } from '$lib/ide/template-source';
	import { resolveExample } from '$lib/config/frameworks';

	// As on /ide, an unknown name lands on the picker rather than booting something the URL didn't
	// ask for.
	const requested = $page.url.searchParams.get('example');
	const example = requested === null ? undefined : resolveExample('java', requested);

	const session = example ? new IdeSession(templateSource(example)) : null;

	// Same entrances as /ide: the landing fades in, a booted session slides up.
	let entered = $state(false);
	onMount(() => {
		requestAnimationFrame(() => {
			entered = true;
		});
	});
</script>

{#if session}
	<div
		class="panel-sheet flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-t-[20px] border-t border-bc-border"
		style="transform: translateY({entered
			? '0%'
			: '101%'}); transition: transform 0.62s cubic-bezier(0.22,1,0.36,1);"
	>
		<IdeShell {session} />
	</div>
{:else}
	<div class="bc-page-bg relative h-full w-full overflow-hidden">
		<div
			class="panel-sheet absolute inset-0 flex flex-col overflow-hidden"
			style="opacity: {entered ? 1 : 0}; transition: opacity 0.5s ease;"
		>
			<JavaLanding unknownExample={example ? undefined : (requested ?? undefined)} />
		</div>
	</div>
{/if}
