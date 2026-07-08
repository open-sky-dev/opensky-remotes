<script lang="ts">
	import type { Snippet } from 'svelte'

	let { title, children }: { title: string; children: Snippet } = $props()
</script>

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
		{title}
	</summary>
	<div class="explanation-body doc">
		{@render children()}
	</div>
</details>

<style>
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
</style>
