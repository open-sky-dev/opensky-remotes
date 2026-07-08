<script lang="ts">
	import ExampleShell from '$lib/components/ExampleShell.svelte'
	import Demo from './Demo.svelte'

	let { data } = $props()
</script>

<svelte:head>
	<title>Auto-save profile — @opensky/remotes</title>
</svelte:head>

<ExampleShell title="Auto-save profile" files={data.files}>
	{#snippet blurb()}
		There is no save button. Edit a field and pause — the form auto-submits once you stop typing
		(or immediately when a field commits on blur). Unchanged data is never re-submitted.
	{/snippet}

	{#snippet explanation()}
		<p>
			<code>autoSubmit: {'{ debounceMs: 800 }'}</code> makes the form submit itself via
			<code>requestSubmit()</code> once input settles — a real submit event, so preflight
			validation and the enhance callbacks run exactly as they would for a button press. A
			<code>change</code> event (like a text field blur) flushes immediately instead of waiting out
			the debounce, and data identical to the last submission is never re-submitted.
		</p>
		<p>
			The status line is driven by the form's state machine plus one page-local flag:
			<code>form.result</code> stays true until the next submission starts, so the page compares the
			current values against the last saved ones to avoid showing "Saved" over unsaved edits while
			the debounce is still settling.
		</p>
	{/snippet}

	<Demo />
</ExampleShell>
