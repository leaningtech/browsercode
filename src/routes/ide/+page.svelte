<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import IdeShell from '$lib/components/ide/IdeShell.svelte';
	import IdeLanding from '$lib/components/ide/IdeLanding.svelte';
	import { IdeSession } from '$lib/ide/session.svelte';
	import { templateSource } from '$lib/ide/template-source';
	import { sharedFilesSource } from '$lib/ide/shared-project-source';
	import { decodeProjectLink } from '$lib/ide/project-link';
	import { defaultFrameworkId, resolveFrameworkId, type FrameworkId } from '$lib/config/frameworks';
	import { SITE_API_KEY } from '$lib/pod/api-key';

	// Bare /ide (no ?framework=) shows the landing instead of auto-booting a template, and so does
	// an id we don't recognise. Falling back to the default template silently handed anyone who
	// asked for, say, `sveltekit` an Express app with nothing on screen saying so — the worst
	// outcome for a URL somebody generated rather than clicked.
	const requested = $page.url.searchParams.get('framework');
	const resolved = resolveFrameworkId(requested);
	const framework: FrameworkId = resolved ?? defaultFrameworkId;
	// A shared link carries the whole project in the hash; an unreadable one lands on the picker.
	const hash = $page.url.hash.slice(1);
	const shared = hash ? decodeProjectLink(hash) : null;
	const unreadableLink = !!hash && !shared;
	const showLanding = !shared && (!resolved || unreadableLink);

	// `?lang=java` named the Java tab back when both languages shared this page. Java has its own
	// route now, so the old address still lands where it always did. Only on the bare picker: a
	// URL that also names a template or carries a project has something to open here.
	const redirectingToJava = showLanding && $page.url.searchParams.get('lang') === 'java';

	const session = new IdeSession(
		shared ? sharedFilesSource(shared) : templateSource(framework),
		SITE_API_KEY
	);

	// Landing (pre-boot) fades the glass panel in, full coverage from the start. Once booted,
	// IdeShell keeps the sheet-slide-up entrance instead (see below).
	let entered = $state(false);
	onMount(() => {
		if (redirectingToJava) {
			location.replace('/java');
			return;
		}
		requestAnimationFrame(() => {
			entered = true;
		});
	});
</script>

{#if redirectingToJava}
	<!-- Nothing to draw: onMount replaces the URL. -->
{:else if showLanding}
	<div class="bc-page-bg relative h-full w-full overflow-hidden">
		<div
			class="panel-sheet absolute inset-0 flex flex-col overflow-hidden"
			style="opacity: {entered ? 1 : 0}; transition: opacity 0.5s ease;"
		>
			<IdeLanding
				lang="js"
				unknownFramework={resolved || unreadableLink ? undefined : (requested ?? undefined)}
				{unreadableLink}
			/>
		</div>
	</div>
{:else}
	<div
		class="panel-sheet flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-t-[20px] border-t border-bc-border"
		style="transform: translateY({entered
			? '0%'
			: '101%'}); transition: transform 0.62s cubic-bezier(0.22,1,0.36,1);"
	>
		<IdeShell {session} />
	</div>
{/if}
