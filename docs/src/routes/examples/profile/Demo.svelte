<script lang="ts">
	import { enhancedForm } from '@opensky/remotes'

	import { profileForm } from './form.remote'
	import { profileSchema } from './schema'

	// No save button anywhere: edits submit on their own once input settles.
	// autoSubmit implies the form never resets after a successful save.
	const form = enhancedForm(profileForm, {
		autoSubmit: { debounceMs: 800 },
		delayMs: 300
	})

	const initialProfile = {
		displayName: 'Ada Lovelace',
		bio: 'Wrote the first computer program.'
	}

	// `form.result` stays true until the next submission begins, so the page
	// tracks unsaved edits itself by comparing against the last saved values —
	// otherwise "Saved" would show over unsaved edits while the debounce settles
	let saved = $state(initialProfile)
	let editing = $state(false)

	function checkEditing(element: HTMLFormElement) {
		const data = new FormData(element)
		editing = data.get('displayName') !== saved.displayName || data.get('bio') !== saved.bio
	}

	$effect(() => {
		if (form.pending) {
			editing = false
		}
	})
</script>

<form
	class="demo"
	{...form.handlers}
	{...profileForm.preflight(profileSchema).enhance((instance) =>
		form.enhance(instance, {
			onReturn: ({ form: submitted }) => {
				saved = { ...saved, ...submitted.fields.value() }
			}
		})
	)}
	oninput={(event) => checkEditing(event.currentTarget)}
>
	<label>
		Display name
		<input
			{...profileForm.fields.displayName.as('text', 'Ada Lovelace')}
			{...form.fields.displayName.validate}
			autocomplete="nickname"
			class:invalid={form.fields.displayName.issues}
		/>
	</label>
	{#if form.fields.displayName.issues}
		{#each form.fields.displayName.issues as issue (issue)}
			<p class="error">{issue}</p>
		{/each}
	{/if}

	<label>
		Bio
		<textarea
			{...profileForm.fields.bio.as('text', 'Wrote the first computer program.')}
			{...form.fields.bio.validate}
			rows="3"
			class:invalid={form.fields.bio.issues}
		></textarea>
	</label>
	{#if form.fields.bio.issues}
		{#each form.fields.bio.issues as issue (issue)}
			<p class="error">{issue}</p>
		{/each}
	{/if}

	<p class="status" aria-live="polite">
		{#if form.pending}
			<span class="saving">Saving…</span>
		{:else if form.issues}
			<span class="error">Fix the highlighted fields to save</span>
		{:else if editing}
			<span class="saving">Unsaved changes — pausing will save them</span>
		{:else if form.result}
			<span class="saved">Saved at {profileForm.result?.savedAt}</span>
		{:else}
			<span class="idle">Changes save automatically</span>
		{/if}
	</p>
</form>
