<script lang="ts">
	import Icon from '@iconify/svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';

	let notFound = $derived($page.status === 404);

	// Plain links rather than buttons so they can be opened in a new tab; `data-sveltekit-reload`
	// keeps the full page load that cross-section navigation relies on.
	const DESTINATIONS = [
		{ href: resolve('/'), label: 'Home', icon: 'mingcute:home-4-line' },
		{ href: resolve('/ide'), label: 'IDE playground', icon: 'mingcute:code-line' },
		{ href: resolve('/agents'), label: 'Coding agents', icon: 'mingcute:robot-line' }
	];
</script>

<div class="bc-page-bg flex h-full w-full overflow-y-auto text-bc-mist">
	<!-- Sized in px, not rem: below 850px layout.css scales the root font with the viewport, which
	     would shrink this page to unreadable on a phone. -->
	<div class="m-auto flex w-full max-w-[672px] flex-col px-[24px] py-[64px]">
		<!-- What the pod's own shell prints for a missing path, so the page speaks in the product's
		     voice; the path is the real one from the address bar. -->
		<pre
			class="mb-[40px] rounded-[12px] border border-bc-border bg-bc-terminal px-[20px] py-[16px] font-mono text-[13px] leading-relaxed break-words whitespace-pre-wrap"><span
				class="text-bc-azure">~ $</span
			> <span class="text-bc-text">cd {$page.url.pathname}</span>
<span class="text-bc-coral"
				>bash: cd: {$page.url.pathname}: {notFound
					? 'No such file or directory'
					: ($page.error?.message ?? 'Error')}</span
			>
<span class="text-bc-azure">~ $</span> <span class="cursor" aria-hidden="true"></span></pre>

		<h1
			class="mb-[12px] font-display text-[30px] leading-tight font-bold tracking-tight text-bc-text sm:text-[36px]"
		>
			{notFound ? 'Page not found' : 'This page failed to load'}
		</h1>
		<p class="mb-[32px] text-[15px] leading-relaxed">
			{notFound
				? 'Nothing lives at this address. The link may be out of date or mistyped.'
				: 'Reload to try again, or start from one of these.'}
		</p>

		<nav aria-label="Where to go next" class="grid gap-[12px] sm:grid-cols-3">
			{#each DESTINATIONS as destination (destination.href)}
				<a
					href={destination.href}
					data-sveltekit-reload
					style="background: rgb(var(--bc-tint) / 4%)"
					class="glass-panel group flex items-center gap-[10px] rounded-[12px] border border-bc-tint/20 p-[12px] text-[14px] font-medium text-bc-text transition hover:border-bc-tint/35 focus-visible:border-bc-azure focus-visible:outline-none"
				>
					<span
						class="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[8px] bg-bc-tint/8 text-bc-text"
					>
						<Icon icon={destination.icon} width="18" height="18" />
					</span>
					<span class="flex-1 whitespace-nowrap">{destination.label}</span>
					<Icon
						icon="mingcute:arrow-right-line"
						width="16"
						height="16"
						class="shrink-0 text-bc-text-muted transition group-hover:translate-x-[2px] group-hover:text-bc-text"
					/>
				</a>
			{/each}
		</nav>
	</div>
</div>

<style>
	.cursor {
		display: inline-block;
		width: 0.6em;
		height: 1.15em;
		vertical-align: text-bottom;
		background-color: var(--color-bc-mist);
		animation: blink 1.1s steps(1) infinite;
	}

	@keyframes blink {
		50% {
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.cursor {
			animation: none;
		}
	}
</style>
