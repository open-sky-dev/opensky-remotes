<script lang="ts">
	import { page } from '$app/state'

	const url = $derived(`${page.url.origin}/llms.txt`)

	let copied = $state(false)
	let resetTimer: ReturnType<typeof setTimeout>

	async function copyLink() {
		await navigator.clipboard.writeText(url)
		copied = true
		clearTimeout(resetTimer)
		resetTimer = setTimeout(() => (copied = false), 1400)
	}
</script>

<div class="doc rise-in">
	<section style="margin-top: 0">
		<h1>llms.txt</h1>
		<p>
			<code>@opensky/remotes</code> ships a machine-readable copy of its documentation at
			<a href="/llms.txt">/llms.txt</a>, following the
			<a href="https://llmstxt.org" target="_blank" rel="noreferrer">llms.txt convention</a>. Point a
			coding agent at it and it gets the full API — spreads, options, callbacks, and gotchas — as
			plain text, without scraping the rendered site.
		</p>

		<div class="block llms-actions">
			<a class="press press-dark" href="/llms.txt">
				Open llms.txt
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
					<path
						d="M7 17 17 7M9 7h8v8"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</a>
			<button type="button" class="press press-ghost" onclick={copyLink}>
				{#if copied}
					Copied
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<path
							d="M5 12.5 10 17.5 19 7"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				{:else}
					Copy link
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
		</div>
	</section>

	<section>
		<h2>Using it with an agent</h2>
		<p>
			The fastest path is the <strong>Copy prompt</strong> button on the
			<a href="/">home page</a> — it copies a ready-to-paste instruction that already links here, so
			Claude, Codex, or Cursor can read the docs and scaffold a form for you. Or add the URL to your
			agent's context directly:
		</p>
		<ul>
			<li>
				<strong>Claude Code / Cursor</strong> — paste <code>{url}</code> into the chat, or reference
				it from an <code>AGENTS.md</code> / rules file
			</li>
			<li>
				<strong>Codex</strong> — include the link in your prompt and let it fetch the page
			</li>
		</ul>
	</section>

	<section>
		<h2>What's inside</h2>
		<p>
			A single plain-text document: a one-line summary, a link index (docs, changelog, source), then
			the full written guide — installation, the three spreads, every creation option, validation,
			draft persistence, auto-submit, and the state/callbacks reference. It's generated from the same
			source as this site, so it never drifts.
		</p>
	</section>
</div>

<style>
	.llms-actions {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}
</style>
