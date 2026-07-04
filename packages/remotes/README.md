# @opensky/remotes

Provides two helpers `createValidation` and `createEnhancedForm` that improve the behaviors and experience working with [remote form functions](https://svelte.dev/docs/kit/remote-functions#form).

Requires `@sveltejs/kit` 2.68.0 or newer (targets the current remote form `enhance` instance API).

## createValidation

Use this to achieve better user experience around validation issues. Fields become dirty when the user changes their value. Issues appear when a dirty field loses focus (`onblur` events), and existing issues are cleared on input when the new value is valid. This way focus alone does not show validation issues, and you don't see new issues appear as you type.

This follows the same validation as superforms did and is inspired by several articles. **(todo: links)**

#### Usage

```ts
import { createValidation } from '@opensky/remotes'

const valid = createValidation(remoteForm)
```

Returns an object with:

- `formHandler` - Form-level submit attempt handler that shows preflight issues for all registered fields, even when SvelteKit blocks invalid submissions
- `fields` - Type-safe validation field helpers that mirror the remote form's field shape
- `fields.some.path.handlers` - Returns `onblur` and `oninput` handlers for a field
- `fields.some.path.issues` - Returns validation issues for a field
- `fields.some.path.pending` - Returns whether validation is currently running for a field
- `fields.some.path.addIssues(issues: string | string[])` - Adds one or more custom validation errors to a field, ignoring duplicate messages
- `fields.some.path.removeIssue(issue: string)` - Removes a custom validation error from a field by message
- `fields.some.path.clearIssues()` - Clears validation issues for a field and any fields nested under it
- `fields.some.path.addValidator(validator)` - Adds a field validator and returns a cleanup function
- `allIssues` - Returns all currently displayed validation issues as a nested tree (form-level issues appear under the `''` key)
- `allKnownIssues` - Debugging view: every issue currently known, whether displayed or not — everything the form holds right now (including unregistered and untouched fields) merged with custom and validator issues
- `formIssues` - Returns form-level issues — issues without a field path, e.g. from `invalid('message')` on the server
- `clearAllIssues()` - Clears all validation issues
- `validateAll()` - Validates all registered fields with the server (including untouched fields), then updates issues
- `updateIssues()` - Updates issues for all registered fields and runs field validators (no validation request)

Spread `.formHandler` onto the form to show all registered field issues when the user attempts to submit, even if SvelteKit preflight validation blocks the remote submission before the enhance callback runs. This runs preflight validation only (no server request) — SvelteKit blocks submissions on preflight failure alone, and issues from the server arrive with the submission response instead.

`.formHandler` also clears validation state (issues and dirty tracking) whenever the form resets — including the automatic reset after a successful submission — mirroring SvelteKit's own clearing of issues and touched state on reset.

Use `.fields.some.path.handlers` to add the fields you want validated. The validation field shape mirrors the remote form field shape, so TypeScript can catch renamed or misspelled fields.

Then use `.fields.some.path.issues` to get issues by field path the same way. This returns an array of strings or null. So you can easily use it as a check for styling like `class:border-red-500={valid.fields.address.state.issues}`

```svelte
<form {...valid.formHandler} {...remoteForm.preflight(schema).enhance(callback)}>
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
</form>
```

Add custom field validators directly to the field. A validator owns its own issue result: if it returns an issue, that issue is shown; if it later returns nothing, its previous issue is cleared.

```ts
const removeValidator = valid.fields.address.state.addValidator(({ value, issue }) => {
	if (!acceptedStates.includes(value)) {
		return issue('Your state is not accepted at this time')
	}
})

valid.fields.email.addValidator(async ({ value, issue }) => {
	const available = await checkEmailAvailability(value)

	if (!available) {
		return issue('That email is already in use')
	}
})
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

const enhanced = createEnhancedForm(remoteForm, {
	validation: valid,
	delayMs: 500,
	timeoutMs: 3500
})
```

Returns an object with:

- `enhance(form, callbacks?)` - Form enhancement handler. Pass it the instance SvelteKit provides to the remote form's `enhance` callback
- `reset()` - Resets the form state back to 'idle' and stops any in-flight submission from updating state
- `state` - Current form state (type-safe based on creation options). Always exactly one state at a time
- `idle`, `pending`, `issues`, `error`, `result` - Boolean getters (always available)
- `delayed` - Boolean getter (only available if `delayMs` was provided)
- `timeout` - Boolean getter (only available if `timeoutMs` was provided)

The boolean getters are cumulative for in-flight states (like superforms): `pending` is true for the whole time a submission is in flight — including the 'delayed' and 'timeout' states — and `delayed` stays true once reached, including through 'timeout'. So `disabled={enhanced.pending}` is all you need for a submit button. Use `state` when you want the exclusive value.

If a new submission starts while one is still in flight (e.g. a double submit), the older submission stops updating state and its remaining callbacks are skipped — the latest submission wins.

**Creation Options:**

- `validation?` - Optional validation instance from `createValidation`
- `delayMs?` - Milliseconds to wait before transitioning to 'delayed' state
- `timeoutMs?` - Milliseconds to wait before transitioning to 'timeout' state
- `resetOnSuccess?` - Whether to reset the `<form>` element after a successful submission (default: `true`). Set to `false` for edit/settings forms where the values should stay visible after saving

**Callbacks** (all optional):

Every callback receives the remote form instance as `form` — the same object SvelteKit passes to the `enhance` callback. Use `form.element` for the `<form>` element and `form.fields.value()` for the data being submitted.

- `onSubmit` - Called when form submission begins. Also receives `cancel()` and `updates()` functions:
  - `cancel(state?)` - Cancel submission and set state to 'idle' (default), 'error', or 'issues'
  - `updates(...queries)` - Provide queries/overrides for optimistic updates via `submit().updates(...)`. Only has effect when called during `onSubmit` — the queries are read once at submit time
- `onDelay` - Called when delayed state is reached (only allowed if `delayMs` is set)
- `onTimeout` - Called when timeout state is reached (only allowed if `timeoutMs` is set)
- `onReturn` - Called when form submission returns successfully. Also receives `result`
- `onIssues` - Called when form submission returns with validation issues
- `onError` - Called when form submission encounters an error. Also receives `error`

Errors thrown by your callbacks are not treated as submission errors: they are logged to the console instead of escaping the enhance callback (which would send SvelteKit to the nearest error page). The one exception in effect: an error thrown in `onSubmit` aborts the submission and sets state to 'error', since its pre-submit checks may not have finished.

After a successful submission the enhanced form resets the `<form>` element for you (unless `resetOnSuccess: false`), matching SvelteKit's default (non-enhanced) behavior. If you spread `valid.formHandler` from `createValidation` onto the form, this reset also clears validation state — passing `validation` to `createEnhancedForm` alone doesn't wire that up, so use both together.

Use with the remote form's enhance method:

```svelte
<form
	{...remoteForm.preflight(schema).enhance((form) =>
		enhanced.enhance(form, {
			onSubmit: ({ form, cancel, updates }) => {
				// Custom client-side checks before submission
				if (!customValidationCheck(form.fields.value())) {
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

	<button disabled={enhanced.pending}>
		{enhanced.delayed ? 'Loading...' : 'Submit'}
	</button>
</form>

{#if enhanced.timeout}
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
	const enhanced = createEnhancedForm(myForm, {
		validation: valid,
		delayMs: 500,
		timeoutMs: 3500
	})
</script>

<p>State: {enhanced.state}</p>

<form
	{...valid.formHandler}
	{...myForm.preflight(schema).enhance((form) =>
		enhanced.enhance(form, {
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

	<button disabled={enhanced.pending}>
		{enhanced.delayed ? 'Loading...' : 'Submit'}
	</button>
</form>

{#if enhanced.timeout}
	<p>Request timed out</p>
{/if}
```
