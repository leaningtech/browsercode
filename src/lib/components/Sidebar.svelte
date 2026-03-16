<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<aside class="w-64 h-full bg-gray-900 text-gray-100 flex flex-col">
	<div class="p-4 border-b border-gray-700 font-semibold text-lg">App</div>
	<nav class="flex-1 p-2 space-y-1">
		<a href={resolve('/')} class="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-700 transition-colors">
			Home
		</a>
	</nav>
</aside>
