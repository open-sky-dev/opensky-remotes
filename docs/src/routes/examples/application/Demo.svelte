<script lang="ts">
	import { enhancedForm } from '@opensky/remotes'

	import { applicationForm } from './form.remote'
	import { applicationSchema } from './schema'

	const skills = ['Svelte', 'TypeScript', 'Design systems', 'Databases']

	// Every field below spreads `.persist`, so the whole application survives
	// a reload. The draft is dropped on submit, on discard, or after 7 days.
	const form = enhancedForm(applicationForm, {
		delayMs: 300,
		timeoutMs: 5000,
		persist: { maxAgeMs: 7 * 24 * 60 * 60 * 1000 }
	})
</script>

<form
	class="demo"
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
		<button type="submit" class="press press-dark" disabled={form.pending}>
			{form.delayed ? 'Submitting…' : 'Submit application'}
		</button>
		<!-- reset() clears the form, the validation state, and the saved draft -->
		<button type="button" class="press press-ghost" onclick={() => form.reset()}>
			Discard draft
		</button>
	</div>

	{#if form.result}
		<p class="success">Application submitted — the draft has been cleared.</p>
	{/if}
	{#if form.timeout}
		<p class="pending">The request is taking longer than expected.</p>
	{/if}
</form>
