<script lang="ts">
	import { Spring } from 'svelte/motion'
	import { page } from '$app/state'
	import { packageManagers, type PackageManager } from '$lib/package-managers'
	import AgentIcon from './AgentIcon.svelte'

	type Tab = 'prompt' | PackageManager

	// The copy-prompt button is the default; the package managers follow it.
	const tabs: { id: Tab; label: string }[] = [
		{ id: 'prompt', label: 'prompt' },
		...packageManagers.map((m) => ({ id: m.id as Tab, label: m.label }))
	]

	let selected = $state<Tab>('prompt')
	const isPrompt = $derived(selected === 'prompt')
	const command = $derived(
		isPrompt ? '' : packageManagers.find((m) => m.id === selected)!.command
	)

	// A ready-to-paste prompt that points an agent at the machine-readable docs.
	const promptText = $derived(
		`Set up @opensky/remotes in my SvelteKit project. It wraps SvelteKit's remote form ` +
			`functions with submission state, inline validation UX, draft persistence, and auto-submit. ` +
			`Read the docs for LLMs at ${page.url.origin}/llms.txt, then install the package, enable ` +
			`async compilation and remoteFunctions in vite.config.ts, and wire up a form with enhancedForm.`
	)

	let copied = $state(false)
	let resetTimer: ReturnType<typeof setTimeout>

	async function copy(text: string) {
		await navigator.clipboard.writeText(text)
		copied = true
		clearTimeout(resetTimer)
		resetTimer = setTimeout(() => (copied = false), 1400)
	}

	function copyCurrent() {
		copy(isPrompt ? promptText : command)
	}

	// Selecting a tab only changes what the pill will copy — copying happens on the
	// pill button itself.
	function pick(tab: Tab) {
		selected = tab
	}

	// Fluidly resize the button to its content: measure the natural width of the
	// inner row and spring the button width toward it. The inner row is pulled out
	// of flow once measured so the button can shrink/grow independently of it.
	let innerWidth = $state(0)
	const width = new Spring(0, { stiffness: 0.15, damping: 0.8 })
	const initialized = $derived(innerWidth > 0)

	// Snap to the first measurement, then spring toward every change after it
	let firstMeasure = true
	$effect(() => {
		if (innerWidth === 0) return
		if (firstMeasure) {
			firstMeasure = false
			width.set(innerWidth, { instant: true })
		} else {
			width.target = innerWidth
		}
	})
</script>

<div class="install-row">
	<button
		type="button"
		class="press press-dark install-pill"
		class:measured={initialized}
		style:width={initialized ? `${width.current}px` : 'fit-content'}
		onclick={copyCurrent}
	>
		<span class="pill-inner" bind:offsetWidth={innerWidth}>
			{#if isPrompt}
				<span class="agents" aria-hidden="true">
					<AgentIcon id="claude" />
					<AgentIcon id="codex" />
					<AgentIcon id="cursor" />
				</span>
				<span class="command">Copy prompt</span>
			{:else}
				<span class="command">{command}</span>
			{/if}
			{#if copied}
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<path
						d="M5 12.5 10 17.5 19 7"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			{:else}
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<rect x="9" y="9" width="11" height="11" rx="2.5" stroke="currentColor" stroke-width="2" />
					<path
						d="M5.5 14.5A1.5 1.5 0 0 1 4 13V5.5A1.5 1.5 0 0 1 5.5 4H13a1.5 1.5 0 0 1 1.5 1.5"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					/>
				</svg>
			{/if}
		</span>
	</button>

	<div class="pm-tabs" role="group" aria-label="Install or copy an agent prompt">
		{#each tabs as tab (tab.id)}
			<button
				type="button"
				class="pm-tab"
				class:tab-prompt={tab.id === 'prompt'}
				class:active={selected === tab.id}
				aria-pressed={selected === tab.id}
				onclick={() => pick(tab.id)}
			>
				{tab.label}
			</button>
		{/each}
	</div>
</div>

<style>
	.install-row {
		display: flex;
		align-items: center;
		gap: 16px;
		flex-wrap: wrap;
	}

	/* Larger than the default press pill, and a container for the measured row */
	.install-pill {
		position: relative;
		height: 40px;
		padding: 0;
		border-radius: 16px;
		overflow: hidden;
	}

	.pill-inner {
		display: inline-flex;
		align-items: center;
		gap: 9px;
		height: 100%;
		padding: 0 18px;
		white-space: nowrap;
	}

	/* Once measured, take the inner row out of flow so the springy button width
	 * clips it fluidly instead of the content forcing the width */
	.install-pill.measured .pill-inner {
		position: absolute;
		top: 0;
		left: 0;
	}

	.install-pill .command {
		font-family: var(--font-mono);
		font-size: 13px;
		font-weight: 500;
	}

	/* The prompt label reads as UI text, not a shell command */
	.install-pill .agents + .command {
		font-family: var(--font-sans);
		font-weight: 550;
		font-variation-settings: 'wght' 550;
	}

	/* Agent marks sit directly on the dark pill (Codex/Cursor use light variants) */
	.agents {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		margin-right: 1px;
	}

	.agents :global(svg) {
		display: block;
	}

	/* Dim only the trailing copy/check glyph — a direct child of the row — so the
	 * agent marks on their chip keep full color */
	.pill-inner > svg {
		opacity: 0.7;
	}

	.pm-tabs {
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.pm-tab {
		border: none;
		background: transparent;
		padding: 0;
		font-family: var(--font-mono);
		font-size: 13px;
		font-weight: 500;
		letter-spacing: -0.1px;
		color: var(--color-muted);
		cursor: pointer;
		transition: color 150ms ease;
		-webkit-tap-highlight-color: transparent;
	}

	.pm-tab.tab-prompt {
		font-family: var(--font-sans);
		font-weight: 550;
		font-variation-settings: 'wght' 550;
	}

	.pm-tab:hover {
		color: var(--color-body);
	}

	.pm-tab.active {
		color: var(--color-ink);
	}
</style>
