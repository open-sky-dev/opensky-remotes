<script lang="ts">
	import ExampleShell from '$lib/components/ExampleShell.svelte'
	import Demo from './Demo.svelte'

	let { data } = $props()
</script>

<ExampleShell title="Draft persistence" files={data.files}>
	{#snippet blurb()}
		Fill in a few fields — including some checkboxes — then reload the page. The draft comes back,
		checkbox selections included. Submitting or discarding clears it.
	{/snippet}

	{#snippet explanation()}
		<p>
			Every field spreads <code>.persist</code>, which is the entire opt-in: values save to local
			storage as you type (debounced, flushed when a value commits) and restore when the inputs
			mount. Restored fields are marked dirty, since a restored draft is user input rather than
			pristine state. <code>persist.maxAgeMs</code> here drops drafts older than seven days.
		</p>
		<p>
			The draft clears itself on a successful submission, and the "Discard draft" button calls
			<code>form.reset()</code> — which resets the form element, the validation state, and the saved
			draft in one go.
		</p>
	{/snippet}

	<Demo />
</ExampleShell>
