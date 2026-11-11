<script lang="ts">
	import { replaceState } from '$app/navigation';
	import type { IdeSession } from '$lib/ide/session.svelte';
	import { javaVersionLink } from '$lib/ide/share';
	import { JAVA_VERSIONS, type JavaVersion } from '$lib/java/versions';
	import { markIntentionalNavigation } from '$lib/stores/leaveWarning.svelte';
	import RunBarMenu from './RunBarMenu.svelte';

	let { session, current }: { session: IdeSession; current: JavaVersion } = $props();

	/**
	 * CheerpJ starts one Java per page, so switching reloads with the project in the hash. The
	 * edits travel with it, so there is nothing to confirm.
	 */
	async function switchJava(version: JavaVersion): Promise<void> {
		if (version === current) return;
		try {
			const url = await javaVersionLink(session, version);
			if (!url) return;
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			replaceState(url, {});
			markIntentionalNavigation();
			location.reload();
		} catch (error) {
			console.error('Failed to switch Java version:', error);
		}
	}
</script>

<RunBarMenu
	label="Java version"
	options={JAVA_VERSIONS}
	selected={current}
	disabled={!session.fsReady}
	note="Switching reloads the page and keeps your edits."
	onselect={switchJava}
>
	{#snippet option(version)}
		Java <span class="tabular-nums">{version}</span>
	{/snippet}
</RunBarMenu>
