<script lang="ts">
	import CodeBlock from './CodeBlock.svelte'
	import PmIcon from './PmIcon.svelte'
	import { packageManagers, type PackageManager } from '$lib/package-managers'

	let {
		snippets
	}: { snippets: Record<PackageManager, { html: string; code: string }> } = $props()

	let selected = $state<PackageManager>('bun')
	const current = $derived(snippets[selected])
</script>

<div class="install-block">
	<div class="pm-icon-tabs" role="group" aria-label="Package manager">
		{#each packageManagers as manager (manager.id)}
			<button
				type="button"
				class="pm-icon-tab"
				class:active={selected === manager.id}
				aria-pressed={selected === manager.id}
				onclick={() => (selected = manager.id)}
			>
				<PmIcon id={manager.id} />
				<span>{manager.label}</span>
			</button>
		{/each}
	</div>
	<CodeBlock title="terminal" html={current.html} code={current.code} />
</div>

<style>
	.pm-icon-tabs {
		display: flex;
		align-items: center;
		gap: 18px;
		margin-bottom: 12px;
	}

	.pm-icon-tab {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		border: none;
		background: transparent;
		padding: 0;
		font-family: var(--font-sans);
		font-size: 14px;
		font-weight: 500;
		letter-spacing: -0.1px;
		color: var(--color-muted);
		cursor: pointer;
		transition: color 150ms ease;
		-webkit-tap-highlight-color: transparent;
	}

	.pm-icon-tab :global(svg) {
		opacity: 0.55;
		transition: opacity 150ms ease;
	}

	.pm-icon-tab:hover {
		color: var(--color-body);
	}

	.pm-icon-tab:hover :global(svg),
	.pm-icon-tab.active :global(svg) {
		opacity: 1;
	}

	.pm-icon-tab.active {
		color: var(--color-ink);
	}
</style>
