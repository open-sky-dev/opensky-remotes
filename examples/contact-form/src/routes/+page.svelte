<script lang="ts">
	import { createEnhancedForm, createValidation } from '@opensky/remotes'

	import { contactForm } from './form.remote'
	import { contactSchema } from './schema'

	const valid = createValidation(contactForm)

	// Async client-side validator — runs on blur, exposes `pending` while it waits
	valid.fields.email.addValidator(async ({ value, issue }) => {
		await new Promise((resolve) => setTimeout(resolve, 900))

		if (value === 'test@test.com') {
			return issue('Email is not allowed')
		}
	})

	// Sync client-side validator
	valid.fields.message.addValidator(({ value, issue }) => {
		if (value?.includes('spam')) return issue('No spam please')
	})

	const enhanced = createEnhancedForm(contactForm, {
		validation: valid,
		delayMs: 300,
		timeoutMs: 5000
	})

	function resetForm() {
		enhanced.reset()
		contactForm.element?.reset()
	}
</script>

<svelte:head>
	<title>Contact Form — @opensky/remotes</title>
</svelte:head>

<main>
	<h1>Contact Form</h1>
	<p class="hint">
		Try <code>test@test.com</code> (async validator), <code>taken@test.com</code> (server-only
		issue), or the word <code>spam</code> in the message.
	</p>

	<form
		{...valid.formHandler}
		{...contactForm.preflight(contactSchema).enhance((form) =>
			enhanced.enhance(form, {
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
				{...valid.fields.name.handlers}
				autocomplete="name"
				placeholder="Ada Lovelace"
				aria-invalid={valid.fields.name.issues ? 'true' : undefined}
				class:invalid={valid.fields.name.issues}
			/>
		</label>
		{#if valid.fields.name.issues}
			{#each valid.fields.name.issues as issue (issue)}
				<p class="error">{issue}</p>
			{/each}
		{/if}

		<label>
			Email
			<input
				{...contactForm.fields.email.as('email')}
				{...valid.fields.email.handlers}
				autocomplete="email"
				placeholder="ada@example.com"
				aria-invalid={valid.fields.email.issues ? 'true' : undefined}
				class:invalid={valid.fields.email.issues}
			/>
		</label>
		{#if valid.fields.email.issues}
			{#each valid.fields.email.issues as issue (issue)}
				<p class="error">{issue}</p>
			{/each}
		{/if}
		{#if valid.fields.email.pending}
			<p class="pending">Checking...</p>
		{/if}

		<label>
			Message
			<textarea
				{...contactForm.fields.message.as('text')}
				{...valid.fields.message.handlers}
				rows="5"
				placeholder="Write at least 10 characters"
				aria-invalid={valid.fields.message.issues ? 'true' : undefined}
				class:invalid={valid.fields.message.issues}
			></textarea>
		</label>
		{#if valid.fields.message.issues}
			{#each valid.fields.message.issues as issue (issue)}
				<p class="error">{issue}</p>
			{/each}
		{/if}

		<div class="actions">
			<button type="submit" disabled={enhanced.pending || enhanced.delayed}>
				{enhanced.delayed ? 'Submitting...' : 'Send message'}
			</button>
			<button type="button" onclick={resetForm}>Reset</button>
		</div>
	</form>

	<aside>
		<p>State: <code>{enhanced.state}</code></p>
		{#if enhanced.timeout}
			<p>The request is taking longer than expected.</p>
		{/if}
		{#if enhanced.error}
			<p class="error">The form hit an unexpected error. Check the console for details.</p>
		{/if}
		{#if enhanced.result}
			<p class="success">Submitted!</p>
		{/if}
	</aside>
</main>

<style>
	main {
		max-width: 28rem;
		margin: 3rem auto;
		padding: 0 1rem;
		font-family: system-ui, sans-serif;
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

	.pending {
		margin: 0;
		font-size: 0.875rem;
		color: #666;
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
