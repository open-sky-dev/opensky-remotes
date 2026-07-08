<script lang="ts">
	import { enhancedForm } from '@opensky/remotes'

	import { contactForm } from './form.remote'
	import { contactSchema } from './schema'

	const form = enhancedForm(contactForm, {
		delayMs: 300,
		timeoutMs: 5000,
		// Fields opt into draft persistence below by spreading `.persist` —
		// reload mid-draft and the values come back
		persist: { maxAgeMs: 24 * 60 * 60 * 1000 }
	})

	// Async client-side validator — runs on blur, exposes `pending` while it waits
	form.fields.email.addValidator(async ({ value, issue }) => {
		await new Promise((resolve) => setTimeout(resolve, 900))

		if (value === 'test@test.com') {
			return issue('Email is not allowed')
		}
	})

	// Sync client-side validator
	form.fields.message.addValidator(({ value, issue }) => {
		if (value?.includes('spam')) return issue('No spam please')
	})
</script>

<form
	class="demo"
	{...form.handlers}
	{...contactForm.preflight(contactSchema).enhance((instance) =>
		form.enhance(instance, {
			onReturn: ({ result }) => console.log('success', result),
			onIssues: () => console.log('validation issues'),
			onError: ({ error }) => console.error(error)
		})
	)}
>
	<label>
		Name
		<input
			{...contactForm.fields.name.as('text')}
			{...form.fields.name.validate}
			{...form.fields.name.persist}
			autocomplete="name"
			placeholder="Ada Lovelace"
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
			{...contactForm.fields.email.as('email')}
			{...form.fields.email.validate}
			{...form.fields.email.persist}
			autocomplete="email"
			placeholder="ada@example.com"
			class:invalid={form.fields.email.issues}
		/>
	</label>
	{#if form.fields.email.issues}
		{#each form.fields.email.issues as issue (issue)}
			<p class="error">{issue}</p>
		{/each}
	{/if}
	{#if form.fields.email.pending}
		<p class="pending">Checking...</p>
	{/if}

	<label>
		Message
		<textarea
			{...contactForm.fields.message.as('text')}
			{...form.fields.message.validate}
			{...form.fields.message.persist}
			rows="5"
			placeholder="Write at least 10 characters"
			class:invalid={form.fields.message.issues}
		></textarea>
	</label>
	{#if form.fields.message.issues}
		{#each form.fields.message.issues as issue (issue)}
			<p class="error">{issue}</p>
		{/each}
	{/if}

	<div class="actions">
		<button type="submit" class="press press-dark" disabled={form.pending}>
			{form.delayed ? 'Submitting...' : 'Send message'}
		</button>
		<button type="button" class="press press-ghost" onclick={() => form.reset()}>Reset</button>
	</div>

	<p class="status" aria-live="polite">
		State: <code>{form.state}</code>
		{#if form.timeout}
			— the request is taking longer than expected
		{/if}
	</p>
	{#if form.error}
		<p class="error">The form hit an unexpected error. Check the console for details.</p>
	{/if}
	{#if form.result}
		<p class="success">Submitted!</p>
	{/if}
</form>
