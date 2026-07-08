<script lang="ts">
	import type { Snippet } from 'svelte'
	import type { HighlightedFile } from '$lib/server/highlight'
	import CodeBlock from './CodeBlock.svelte'
	import Disclosure from './Disclosure.svelte'

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

<Disclosure title="What's going on here">
	{@render explanation()}
</Disclosure>

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
