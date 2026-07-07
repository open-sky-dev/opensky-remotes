<script lang="ts">
	import { enhancedForm } from '@opensky/remotes'
	import CodeViewer from '$lib/CodeViewer.svelte'

	import { applicationForm } from './form.remote'
	import { applicationSchema } from './schema'

	import pageSource from './+page.svelte?raw'
	import remoteSource from './form.remote.ts?raw-source'
	import schemaSource from './schema.ts?raw'

	const skills = ['Svelte', 'TypeScript', 'Design systems', 'Databases']

	// Every field below spreads `.persist`, so the whole application survives
	// a reload. The draft is dropped on submit, on discard, or after 7 days.
	const form = enhancedForm(applicationForm, {
		delayMs: 300,
		timeoutMs: 5000,
		persist: { maxAgeMs: 7 * 24 * 60 * 60 * 1000 }
	})
</script>

<svelte:head>
	<title>Job application — @opensky/remotes</title>
</svelte:head>

<main>
	<h1>Job application</h1>
	<p class="hint">
		Fill in a few fields — including some checkboxes — then <strong>reload the page</strong>. The
		draft comes back, checkbox selections included. Submitting or discarding clears it.
	</p>

	<form
		{...form.handlers}
		{...applicationForm.preflight(applicationSchema).enhance((instance) =>
			form.enhance(instance, {
				onReturn: () => console.log('application submitted')
			})
		)}
	>
		<label>
			Full name
			<input
				{...applicationForm.fields.name.as('text')}
				{...form.fields.name.validate}
				{...form.fields.name.persist}
				autocomplete="name"
				class:invalid={form.fields.name.issues}
			/>
		</label>
		{#if form.fields.name.issues}
			{#each form.fields.name.issues as issue (issue)}
				<p class="error">{issue}</p>
			{/each}
		{/if}

		<label>
			Email
			<input
				{...applicationForm.fields.email.as('email')}
				{...form.fields.email.validate}
				{...form.fields.email.persist}
				autocomplete="email"
				class:invalid={form.fields.email.issues}
			/>
		</label>
		{#if form.fields.email.issues}
			{#each form.fields.email.issues as issue (issue)}
				<p class="error">{issue}</p>
			{/each}
		{/if}

		<label>
			Role
			<select
				{...applicationForm.fields.role.as('select')}
				{...form.fields.role.validate}
				{...form.fields.role.persist}
				class:invalid={form.fields.role.issues}
			>
				<option value="">Choose a role…</option>
				<option value="engineer">Engineer</option>
				<option value="designer">Designer</option>
				<option value="product">Product manager</option>
			</select>
		</label>
		{#if form.fields.role.issues}
			{#each form.fields.role.issues as issue (issue)}
				<p class="error">{issue}</p>
			{/each}
		{/if}

		<fieldset>
			<legend>Skills</legend>
			{#each skills as skill (skill)}
				<label class="checkbox">
					<input
						{...applicationForm.fields.skills.as('checkbox', skill)}
						{...form.fields.skills.validate}
						{...form.fields.skills.persist}
					/>
					{skill}
				</label>
			{/each}
		</fieldset>
		{#if form.fields.skills.issues}
			{#each form.fields.skills.issues as issue (issue)}
				<p class="error">{issue}</p>
			{/each}
		{/if}

		<label>
			Cover letter
			<textarea
				{...applicationForm.fields.coverLetter.as('text')}
				{...form.fields.coverLetter.validate}
				{...form.fields.coverLetter.persist}
				rows="6"
				placeholder="Why do you want to work with us?"
				class:invalid={form.fields.coverLetter.issues}
			></textarea>
		</label>
		{#if form.fields.coverLetter.issues}
			{#each form.fields.coverLetter.issues as issue (issue)}
				<p class="error">{issue}</p>
			{/each}
		{/if}

		<div class="actions">
			<button type="submit" disabled={form.pending}>
				{form.delayed ? 'Submitting…' : 'Submit application'}
			</button>
			<!-- reset() clears the form, the validation state, and the saved draft -->
			<button type="button" onclick={() => form.reset()}>Discard draft</button>
		</div>
	</form>

	<aside>
		{#if form.result}
			<p class="success">Application submitted — the draft has been cleared.</p>
		{/if}
		{#if form.timeout}
			<p>The request is taking longer than expected.</p>
		{/if}
	</aside>

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
	textarea,
	select {
		padding: 0.5rem;
		font: inherit;
		font-weight: normal;
		border: 1px solid #ccc;
		border-radius: 0.375rem;
		background: white;
	}

	fieldset {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1rem;
		padding: 0.75rem;
		border: 1px solid #ccc;
		border-radius: 0.375rem;
	}

	legend {
		padding: 0 0.25rem;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.checkbox {
		flex-direction: row;
		align-items: center;
		gap: 0.375rem;
		font-weight: normal;
	}

	.checkbox input {
		padding: 0;
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

	.success {
		color: #059669;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	button {
		padding: 0.5rem 1rem;
		font: inherit;
		border: 1px solid #ccc;
		border-radius: 0.375rem;
		background: white;
		cursor: pointer;
	}

	button[type='submit'] {
		background: #2563eb;
		border-color: #2563eb;
		color: white;
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	aside {
		margin-top: 1.5rem;
		font-size: 0.875rem;
	}
</style>
