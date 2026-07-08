<script lang="ts">
	let {
		title,
		html,
		code,
		onWell = false
	}: { title?: string; html: string; code: string; onWell?: boolean } = $props()

	let copied = $state(false)
	let resetTimer: ReturnType<typeof setTimeout>

	async function copy() {
		await navigator.clipboard.writeText(code)
		copied = true
		clearTimeout(resetTimer)
		resetTimer = setTimeout(() => (copied = false), 1400)
	}
</script>

<figure class="code-card" class:on-well={onWell}>
	<figcaption class="code-card-header">
		<span>{title}</span>
		<button type="button" class="icon-button" aria-label="Copy code" onclick={copy}>
			{#if copied}
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<path
						d="M5 12.5 10 17.5 19 7"
						stroke="currentColor"
						stroke-width="1.8"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			{:else}
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<rect
						x="9"
						y="9"
						width="11"
						height="11"
						rx="2.5"
						stroke="currentColor"
						stroke-width="1.6"
					/>
					<path
						d="M5.5 14.5A1.5 1.5 0 0 1 4 13V5.5A1.5 1.5 0 0 1 5.5 4H13a1.5 1.5 0 0 1 1.5 1.5"
						stroke="currentColor"
						stroke-width="1.6"
						stroke-linecap="round"
					/>
				</svg>
			{/if}
		</button>
	</figcaption>
	<div class="code-card-body">
		<!-- eslint-disable-next-line svelte/no-at-html-tags — server-highlighted, trusted -->
		{@html html}
	</div>
</figure>
