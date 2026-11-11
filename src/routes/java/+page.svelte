<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import IdeShell from '$lib/components/ide/IdeShell.svelte';
	import IdeLanding from '$lib/components/ide/IdeLanding.svelte';
	import { IdeSession } from '$lib/ide/session.svelte';
	import { sharedProjectSource } from '$lib/ide/shared-project-source';
	import { templateSource } from '$lib/ide/template-source';
	import { resolveExample } from '$lib/config/frameworks';
	import { decodeSharedProject } from '$lib/java/shared-project';

	// A shared project link carries the project in the hash, and wins over `?example=`. As on /ide, an
	// unknown name lands on the picker rather than booting something the URL didn't ask for.
	const requested = $page.url.searchParams.get('example');
	const example = requested === null ? undefined : resolveExample('java', requested);
	const hash = $page.url.hash.slice(1);
	const shared = hash ? decodeSharedProject(hash) : null;

	const session = shared
		? new IdeSession(sharedProjectSource(shared, example))
		: !hash && example
			? new IdeSession(templateSource(example))
			: null;

	// Bare /java has nothing of its own to say: the IDE picker's Java tab is the same page, so send
	// people there rather than keeping a second landing in step with it. A URL that asked for
	// something we couldn't resolve keeps its address and explains itself on the picker in place.
	const askedForSomething = requested !== null || !!hash;
	const redirecting = !session && !askedForSomething;

	// Same entrances as /ide: the landing fades in, a booted session slides up.
	let entered = $state(false);
	onMount(() => {
		if (redirecting) {
			location.replace('/ide?lang=java');
			return;
		}
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
{:else if !redirecting}
	<div class="bc-page-bg relative h-full w-full overflow-hidden">
		<div
			class="panel-sheet absolute inset-0 flex flex-col overflow-hidden"
			style="opacity: {entered ? 1 : 0}; transition: opacity 0.5s ease;"
		>
			<IdeLanding
				lang="java"
				unknownExample={hash || example ? undefined : (requested ?? undefined)}
				unreadableLink={!!hash}
			/>
		</div>
	</div>
{/if}
