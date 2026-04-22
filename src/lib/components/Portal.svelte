<script lang="ts">
	let { src = '' } = $props();
</script>

<div class="h-full min-h-0 w-full min-w-0 border-t border-white/10 bg-white">
	<iframe {src} id="portal" title="Portal content" class="h-full w-full px-5"></iframe>
</div>
