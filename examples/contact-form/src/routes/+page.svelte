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
				aria-invalid={form.fields.name.issues ? 'true' : undefined}
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
				aria-invalid={form.fields.email.issues ? 'true' : undefined}
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
				aria-invalid={form.fields.message.issues ? 'true' : undefined}
				class:invalid={form.fields.message.issues}
			></textarea>
		</label>
		{#if form.fields.message.issues}
			{#each form.fields.message.issues as issue (issue)}
				<p class="error">{issue}</p>
			{/each}
		{/if}

		<div class="actions">
			<button type="submit" disabled={form.pending}>
				{form.delayed ? 'Submitting...' : 'Send message'}
			</button>
			<button type="button" onclick={() => form.reset()}>Reset</button>
		</div>
	</form>

	<aside>
		<p>State: <code>{form.state}</code></p>
		{#if form.timeout}
			<p>The request is taking longer than expected.</p>
		{/if}
		{#if form.error}
			<p class="error">The form hit an unexpected error. Check the console for details.</p>
		{/if}
		{#if form.result}
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
