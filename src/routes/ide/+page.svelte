<script lang="ts">
	import IdeShell from '$lib/components/ide/IdeShell.svelte';
	import { IdeSession, type PortalUpdate, type TerminalElements } from '$lib/ide/session.svelte';
	import { defaultFrameworkId, isFrameworkId, type FrameworkId } from '$lib/config/frameworks';

	const session = new IdeSession();

	function getFrameworkFromUrl(): FrameworkId {
		const requested = new URL(window.location.href).searchParams.get('framework');
		return isFrameworkId(requested) ? requested : defaultFrameworkId;
	}

	// Full reload tears the pod down cleanly
	function selectFramework(framework: FrameworkId) {
		const url = new URL(window.location.href);
		url.searchParams.set('framework', framework);
		window.location.href = url.toString();
	}

	function boot(terminals: TerminalElements, onPortalUpdate: (update: PortalUpdate) => void) {
		return session.boot(getFrameworkFromUrl(), terminals, onPortalUpdate);
	}
</script>

<IdeShell {session} {boot} onSelectFramework={selectFramework} />
