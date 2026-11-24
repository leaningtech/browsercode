<script lang="ts">
	import { page } from '$app/stores';
	import LessonPlayer from '$lib/learn/LessonPlayer.svelte';

	let { data } = $props();

	// `?record` is the frame a recorder captures for video; visitors never see it.
	const mode = $page.url.searchParams.has('record') ? 'record' : 'live';
</script>

{#key data.lesson.id}
	<LessonPlayer lesson={data.lesson} {mode} />
{/key}
