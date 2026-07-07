<script lang="ts">
	import { enhancedForm } from '@opensky/remotes'
	import CodeViewer from '$lib/CodeViewer.svelte'

	import { profileForm } from './form.remote'
	import { profileSchema } from './schema'

	import pageSource from './+page.svelte?raw'
	import remoteSource from './form.remote.ts?raw-source'
	import schemaSource from './schema.ts?raw'

	// No save button anywhere: edits submit on their own once input settles.
	// autoSubmit implies the form never resets after a successful save.
	const form = enhancedForm(profileForm, {
		autoSubmit: { debounceMs: 800 },
		delayMs: 300
	})
</script>

<svelte:head>
	<title>Profile settings — @opensky/remotes</title>
</svelte:head>

<main>
	<h1>Profile settings</h1>
	<p class="hint">
		There is no save button. Edit a field and pause — the form auto-submits once you stop typing
		(or immediately when a field commits on blur). Unchanged data is never re-submitted.
	</p>

	<form
		{...form.handlers}
		{...profileForm.preflight(profileSchema).enhance((instance) => form.enhance(instance))}
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
			{:else if form.result}
				<span class="saved">Saved at {profileForm.result?.savedAt}</span>
			{:else if form.issues}
				<span class="error">Fix the highlighted fields to save</span>
			{:else}
				<span class="idle">Changes save automatically</span>
			{/if}
		</p>
	</form>

	<CodeViewer
		files={[
			{ name: '+page.svelte', source: pageSource },
			{ name: 'form.remote.ts', source: remoteSource },
			{ name: 'schema.ts', source: schemaSource }
		]}
	/>
</main>

<style>
	main {
		padding-top: 2rem;
	}

	h1 {
		margin: 0 0 0.5rem;
		font-size: 1.5rem;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.875rem;
		font-weight: 500;
	}

	input,
	textarea {
		padding: 0.5rem;
		font: inherit;
		font-weight: normal;
		border: 1px solid #ccc;
		border-radius: 0.375rem;
	}

	.invalid {
		border-color: #e11d48;
	}

	.hint {
		font-size: 0.875rem;
		color: #666;
	}

	.error {
		margin: 0;
		font-size: 0.875rem;
		color: #e11d48;
	}

	.status {
		margin: 0.25rem 0 0;
		font-size: 0.875rem;
		min-height: 1.25rem;
	}

	.saving {
		color: #b45309;
	}

	.saved {
		color: #059669;
	}

	.idle {
		color: #888;
	}
</style>
