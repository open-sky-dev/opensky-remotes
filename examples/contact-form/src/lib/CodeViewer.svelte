<script lang="ts">
	let { files }: { files: Array<{ name: string; source: string }> } = $props()

	let open = $state(false)
	let active = $state(0)
</script>

<section class="code-viewer">
	<button type="button" class="toggle" onclick={() => (open = !open)}>
		{open ? 'Hide code' : 'View the code for this example'}
	</button>

	{#if open}
		<div class="tabs" role="tablist">
			{#each files as file, index (file.name)}
				<button
					type="button"
					role="tab"
					aria-selected={index === active}
					class:active={index === active}
					onclick={() => (active = index)}
				>
					{file.name}
				</button>
			{/each}
		</div>
		<pre><code>{files[active].source}</code></pre>
	{/if}
</section>

<style>
	.code-viewer {
		margin-top: 2.5rem;
	}

	.toggle {
		padding: 0.5rem 1rem;
		font: inherit;
		font-size: 0.875rem;
		border: 1px solid #ccc;
		border-radius: 0.375rem;
		background: white;
		cursor: pointer;
	}

	.toggle:hover {
		background: #f5f5f5;
	}

	.tabs {
		display: flex;
		gap: 0.25rem;
		margin-top: 0.75rem;
	}

	.tabs button {
		padding: 0.375rem 0.75rem;
		font: inherit;
		font-size: 0.8125rem;
		border: 1px solid #ddd;
		border-bottom: none;
		border-radius: 0.375rem 0.375rem 0 0;
		background: #f5f5f5;
		color: #666;
		cursor: pointer;
	}

	.tabs button.active {
		background: #1e1e1e;
		border-color: #1e1e1e;
		color: white;
	}

	pre {
		margin: 0;
		padding: 1rem;
		max-height: 32rem;
		overflow: auto;
		font-size: 0.8125rem;
		line-height: 1.5;
		border-radius: 0 0.375rem 0.375rem 0.375rem;
		background: #1e1e1e;
		color: #e6e6e6;
		tab-size: 2;
	}
</style>
