<script lang="ts">
	import { fade, fly } from 'svelte/transition'
	import { page } from '$app/state'
	import { docSections, examples, resources } from '$lib/nav'
	import { navState } from '$lib/nav-state.svelte'
	import Sidebar from './Sidebar.svelte'

	let open = $state(false)

	const label = $derived.by(() => {
		const entry = [...examples, ...resources].find(({ href }) => href === page.url.pathname)
		if (entry) return entry.title
		return docSections.find(({ id }) => id === navState.active)?.title ?? docSections[0].title
	})

	// Lock scroll and close on Escape while the sheet is open
	$effect(() => {
		if (!open) return

		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') open = false
		}

		document.body.style.overflow = 'hidden'
		window.addEventListener('keydown', onKey)
		return () => {
			document.body.style.overflow = ''
			window.removeEventListener('keydown', onKey)
		}
	})

	// Following any link in the sheet closes it
	function closeOnLink(node: HTMLElement) {
		const onClick = (event: MouseEvent) => {
			if ((event.target as HTMLElement).closest('a')) open = false
		}
		node.addEventListener('click', onClick)
		return () => node.removeEventListener('click', onClick)
	}
</script>

<button
	type="button"
	class="trigger"
	aria-expanded={open}
	aria-label="Navigation"
	onclick={() => (open = !open)}
>
	{label}
	<svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" class:open>
		<path
			d="m6 9 6 6 6-6"
			stroke="currentColor"
			stroke-width="2.2"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	</svg>
</button>

{#if open}
	<button
		type="button"
		class="backdrop"
		aria-label="Close navigation"
		onclick={() => (open = false)}
		transition:fade={{ duration: 160 }}
	></button>
	<div class="sheet" transition:fly={{ y: -16, duration: 220 }} {@attach closeOnLink}>
		<Sidebar spy={false} />
	</div>
{/if}

<style>
	.trigger {
		display: none;
		position: fixed;
		top: 16px;
		right: 16px;
		z-index: 60;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border: none;
		border-radius: 999px;
		background: transparent;
		cursor: pointer;
		font-family: var(--font-sans);
		font-size: 13px;
		line-height: 18px;
		font-weight: 550;
		font-variation-settings: 'wght' 550;
		letter-spacing: -0.18px;
		color: var(--color-ink);
		-webkit-tap-highlight-color: transparent;
	}

	.trigger svg {
		color: var(--color-faint);
		transition: transform 200ms cubic-bezier(0.23, 1, 0.32, 1);
	}

	.trigger svg.open {
		transform: rotate(180deg);
	}

	.backdrop {
		display: none;
		position: fixed;
		inset: 0;
		z-index: 54;
		border: none;
		padding: 0;
		background: rgb(255 255 255 / 0.55);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		cursor: default;
	}

	.sheet {
		display: none;
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 55;
		padding: 64px 32px 28px;
		background: #fff;
		border-bottom: 1px solid var(--color-line);
		box-shadow: 0 24px 48px -24px rgb(0 0 0 / 0.12);
		max-height: 85vh;
		overflow-y: auto;
	}

	@media (max-width: 960px) {
		.trigger {
			display: inline-flex;
		}

		.backdrop,
		.sheet {
			display: block;
		}
	}
</style>
