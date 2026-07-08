<script lang="ts">
	let { command = 'npm i @opensky/remotes' }: { command?: string } = $props()

	let copied = $state(false)
	let resetTimer: ReturnType<typeof setTimeout>

	async function copy() {
		await navigator.clipboard.writeText(command)
		copied = true
		clearTimeout(resetTimer)
		resetTimer = setTimeout(() => (copied = false), 1400)
	}
</script>

<button type="button" class="press press-dark install-pill" onclick={copy}>
	<span class="command">{command}</span>
	{#if copied}
		<svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<path
				d="M5 12.5 10 17.5 19 7"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	{:else}
		<svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<rect x="9" y="9" width="11" height="11" rx="2.5" stroke="currentColor" stroke-width="2" />
			<path
				d="M5.5 14.5A1.5 1.5 0 0 1 4 13V5.5A1.5 1.5 0 0 1 5.5 4H13a1.5 1.5 0 0 1 1.5 1.5"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
			/>
		</svg>
	{/if}
</button>

<style>
	.install-pill .command {
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: 500;
	}

	.install-pill svg {
		opacity: 0.7;
	}
</style>
