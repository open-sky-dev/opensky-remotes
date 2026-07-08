<script lang="ts">
	import type { Snippet } from 'svelte'
	import type { HighlightedFile } from '$lib/server/highlight'
	import CodeBlock from './CodeBlock.svelte'

	let {
		title,
		blurb,
		files,
		explanation,
		children
	}: {
		title: string
		blurb: Snippet
		files: HighlightedFile[]
		explanation: Snippet
		children: Snippet
	} = $props()
</script>

<div class="doc rise-in">
	<h1>{title}</h1>
	<p>{@render blurb()}</p>
</div>

<!-- The demo itself: a tall white stage so the example gets room to breathe -->
<div class="stage">
	{@render children()}
</div>

<details class="explanation">
	<summary>
		<svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<path
				d="m9 6 6 6-6 6"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
		What's going on here
	</summary>
	<div class="explanation-body doc">
		{@render explanation()}
	</div>
</details>

<!-- The code, right on the page -->
<div class="well">
	{#each files as file (file.name)}
		<CodeBlock title={file.name} html={file.html} code={file.code} onWell />
	{/each}
</div>

<style>
	.stage {
		display: grid;
		place-items: center;
		min-height: 80vh;
		padding: 48px 0;
		background: #fff;
	}

	.stage > :global(*) {
		width: 100%;
		max-width: 480px;
	}

	.explanation {
		border-top: 1px solid var(--color-line);
		border-bottom: 1px solid var(--color-line);
		padding: 14px 2px;
	}

	.explanation summary {
		display: flex;
		align-items: center;
		gap: 8px;
		list-style: none;
		cursor: pointer;
		font-size: 13px;
		line-height: 18px;
		font-weight: 550;
		font-variation-settings: 'wght' 550;
		letter-spacing: -0.18px;
		color: var(--color-ink);
		-webkit-tap-highlight-color: transparent;
	}

	.explanation summary::-webkit-details-marker {
		display: none;
	}

	.explanation summary svg {
		color: var(--color-faint);
		transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
	}

	.explanation[open] summary svg {
		transform: rotate(90deg);
	}

	.explanation-body {
		padding: 4px 0 8px 20px;
	}

	.well {
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin-top: 32px;
		padding: 24px;
		border-radius: 16px;
		background: var(--color-well);
	}
</style>
