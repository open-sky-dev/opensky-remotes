# @opensky/remotes

Provides two helpers `createValidation` and `createEnhancedForm` that improve the behaviors and experience working with [remote form functions](https://svelte.dev/docs/kit/remote-functions#form).

## createValidation

Use this to achieve better user experience around validation issues. The logic for showing issues on fields is: issues only appear when you leave a field (`onblur` events) but they are cleared on input. This way you don't see issues appear as you type, but if the field shows an issue, as you type, the issue will go away as soon as you modify it to be valid.

This follows the same validation as superforms did and is inspired by several articles. **(todo: links)**

#### Usage

```ts
import { createValidation } from '@opensky/remotes'

const valid = createValidation(remoteForm)
```

Returns an object with:

- `fields` - Type-safe validation field helpers that mirror the remote form's field shape
- `fields.some.path.handlers` - Returns `onblur` and `oninput` handlers for a field
- `fields.some.path.issues` - Returns validation issues for a field
- `fields.some.path.pending` - Returns whether validation is currently running for a field
- `fields.some.path.addIssues(issues: string | string[])` - Adds one or more custom validation errors to a field, ignoring duplicate messages
- `fields.some.path.removeIssue(issue: string)` - Removes a custom validation error from a field by message
- `fields.some.path.clearIssues()` - Clears validation issues for a field
- `allIssues` - Returns all validation issues
- `clearAllIssues()` - Clears all validation issues
- `validateAll()` - Validates all registered fields (with server)
- `updateIssues()` - Updates issues for all registered fields (populates from issues)

Use `.fields.some.path.handlers` to add the fields you want validated. The validation field shape mirrors the remote form field shape, so TypeScript can catch renamed or misspelled fields.

Then use `.fields.some.path.issues` to get issues by field path the same way. This returns an array of strings or null. So you can easily use it as a check for styling like `class:border-red-500={valid.fields.address.state.issues}`

```svelte
<input
	{...remoteForm.fields.address.state.as('text')}
	{...valid.fields.address.state.handlers}
	class:border-red-500={valid.fields.address.state.issues}
/>

{#if valid.fields.address.state.issues}
	{#each valid.fields.address.state.issues as issue}
		<p>{issue}</p>
	{/each}
{/if}

{#if valid.fields.address.state.pending}
	<p>Checking...</p>
{/if}
```

#### Details

There is currently a [lot of change](https://github.com/sveltejs/kit/discussions/14288) with svelte's remote functions and with form validation. We use a very newly added `preflightOnly` flag for validation calls to avoid making calls to the server to validate on every keystroke however there seem to be [bugs](https://github.com/sveltejs/kit/discussions/14288#discussioncomment-14743807) in the current implementation including that we don't get server issues until you submit the form (we should be getting them on blur).

We also have some buggy behavior after a submit if the server sends back validation issues (and doesn't run the remote function), we do show those issues, however they currently all get cleared when you mutate the form. This is not desired. We want to clear only the issues for the field that mutates after server sends back issues.

For these to update you need to call `valid.updateIssues()` in your form enhance handler when there is no error but also no result. And you need to call `valid.validateAll()` in your catch block. (Or use alongside createEnhancedForm to get this automatically).

## createEnhancedForm

Creates tracked state for the remote form and also semantic callbacks for stages of the request.

This allows you to add callbacks a little more easily (more like superforms) and allows this utility to take care of some things for you. It also exposes state of the form including delayed and timeout. And you can pass in your validation instance from createValidation for the proper calls be added in the callbacks.

#### Usage

```ts
import { createEnhancedForm } from '@opensky/remotes'

const form = createEnhancedForm(remoteForm, {
	validation: valid,
	delayMs: 500,
	timeoutMs: 3500
})
```

Returns an object with:

- `enhance(params, callbacks)` - Form enhancement handler
- `reset()` - Resets the form state back to 'idle'
- `state` - Current form state (type-safe based on creation options)
- `idle`, `pending`, `issues`, `error`, `result` - Boolean getters (always available)
- `delayed` - Boolean getter (only available if `delayMs` was provided)
- `timeout` - Boolean getter (only available if `timeoutMs` was provided)

**Creation Options:**

- `validation?` - Optional validation instance from `createValidation`
- `delayMs?` - Milliseconds to wait before transitioning to 'delayed' state
- `timeoutMs?` - Milliseconds to wait before transitioning to 'timeout' state

**Callbacks** (all optional):

- `onSubmit` - Called when form submission begins. Receives `cancel()` and `updates()` functions:
  - `cancel(state?)` - Cancel submission and set state to 'idle' (default), 'error', or 'issues'
  - `updates(...queries)` - Provide queries/overrides for optimistic updates via `submit().updates(...)`
- `onDelay` - Called when delayed state is reached (only allowed if `delayMs` is set)
- `onTimeout` - Called when timeout state is reached (only allowed if `timeoutMs` is set)
- `onReturn` - Called when form submission returns successfully
- `onIssues` - Called when form submission returns with validation issues
- `onError` - Called when form submission encounters an error

Use with the remote form's enhance method:

```svelte
<form
	{...remoteForm.preflight(schema).enhance((opts) =>
		form.enhance(opts, {
			onSubmit: ({ cancel, updates, data }) => {
				// Custom client-side checks before submission
				if (!customValidationCheck(data)) {
					valid.fields.fieldName.addIssues('Custom validation failed')
					cancel('issues') // Cancel and set state to 'issues'
					return
				}

				// Optimistic updates
				updates(getPosts().withOverride((posts) => [newPost, ...posts]))
			},
			onDelay: () => {}, // Only allowed if delayMs was set at creation
			onTimeout: () => {}, // Only allowed if timeoutMs was set at creation
			onReturn: ({ result }) => {},
			onIssues: () => {},
			onError: ({ error }) => {}
		})
	)}
>
	<!-- form fields -->

	<button disabled={form.pending || form.delayed}>
		{form.delayed ? 'Loading...' : 'Submit'}
	</button>
</form>

{#if form.timeout}
	<p>Request timed out</p>
{/if}
```

## Example

Example of usage of both createValidation and createEnhancedForm

```svelte
<script lang="ts">
	import { createValidation, createEnhancedForm } from '@opensky/remotes'
	import { myForm } from './myForm.remote'
	import { z } from 'zod'

	const schema = z.object({
		name: z.string().min(4, 'Too short').max(10, 'Too long'),
		address: z.object({
			state: z.string()
		})
	})

	const valid = createValidation(myForm)
	const form = createEnhancedForm(myForm, {
		validation: valid,
		delayMs: 500,
		timeoutMs: 3500
	})
</script>

<p>State: {form.state}</p>

<form
	{...myForm.preflight(schema).enhance((opts) =>
		form.enhance(opts, {
			onDelay: () => console.log('showing loader'),
			onTimeout: () => console.log('request timeout'),
			onReturn: ({ result }) => console.log('success', result)
		})
	)}
>
	<input
		{...myForm.fields.name.as('text')}
		{...valid.fields.name.handlers}
		class:error={valid.fields.name.issues}
	/>

	{#if valid.fields.name.issues}
		{#each valid.fields.name.issues as issue}
			<p class="error">{issue}</p>
		{/each}
	{/if}

	<input
		{...myForm.fields.address.state.as('text')}
		{...valid.fields.address.state.handlers}
		class:error={valid.fields.address.state.issues}
	/>

	<button disabled={form.pending || form.delayed}>
		{form.delayed ? 'Loading...' : 'Submit'}
	</button>
</form>

{#if form.timeout}
	<p>Request timed out</p>
{/if}
```
