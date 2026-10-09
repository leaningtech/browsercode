<script lang="ts">
	// The pod's terminal is attached to `consoleEl` by the host page's boot call.
	let { consoleEl = $bindable(null) }: { consoleEl?: HTMLElement | null } = $props();
</script>

<div class="flex h-full min-h-0 w-full min-w-0 flex-col bg-bc-terminal">
	<div bind:this={consoleEl} class="min-h-0 flex-1 bg-bc-terminal p-4"></div>
</div>
