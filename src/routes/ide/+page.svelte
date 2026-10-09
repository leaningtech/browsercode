<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import IdeShell from '$lib/components/ide/IdeShell.svelte';
	import IdeLanding from '$lib/components/ide/IdeLanding.svelte';
	import { IdeSession } from '$lib/ide/session.svelte';
	import { templateSource } from '$lib/ide/template-source';
	import { defaultFrameworkId, isFrameworkId, type FrameworkId } from '$lib/config/frameworks';

	// Bare /ide (no ?framework=) shows the landing instead of auto-booting a template.
	const requested = $page.url.searchParams.get('framework');
	const showLanding = !requested;
	const framework: FrameworkId = isFrameworkId(requested) ? requested : defaultFrameworkId;

	const session = new IdeSession(templateSource(framework));

	// Landing (pre-boot) fades the glass panel in, full coverage from the start. Once booted,
	// IdeShell keeps the sheet-slide-up entrance instead (see below).
	let entered = $state(false);
	onMount(() => {
		requestAnimationFrame(() => {
			entered = true;
		});
	});
</script>

{#if showLanding}
	<div class="bc-page-bg relative h-full w-full overflow-hidden">
		<div
			class="panel-sheet absolute inset-0 flex flex-col overflow-hidden"
			style="opacity: {entered ? 1 : 0}; transition: opacity 0.5s ease;"
		>
			<IdeLanding />
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
