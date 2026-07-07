# @opensky/remotes

[![npm](https://img.shields.io/npm/v/@opensky/remotes)](https://www.npmjs.com/package/@opensky/remotes)

Provides `enhancedForm`, a helper that improves the behaviors and experience of working with [remote form functions](https://svelte.dev/docs/kit/remote-functions#form). One object wraps a remote form with:

- **Submission state** — an exclusive state machine (`idle`/`pending`/`issues`/`error`/`result`, plus opt-in `delayed`/`timeout`) with semantic lifecycle callbacks
- **Inline validation UX** — issues appear when a dirty field loses focus and clear as soon as the value is valid again, with custom sync/async validators per field
- **Draft persistence** — opted-in fields save to web storage as the user types and restore after a reload
- **Auto-submit** — the form submits itself once input settles, for save-button-less forms

Requires `@sveltejs/kit` 2.68.0 or newer (targets the current remote form `enhance` instance API).

A runnable demo app lives in [`examples/contact-form`](examples/contact-form) — see its README for setup.

## Usage

```svelte
<script lang="ts">
	import { enhancedForm } from '@opensky/remotes'
	import { myForm } from './myForm.remote'
	import { z } from 'zod'

	const schema = z.object({
		name: z.string().min(4, 'Too short').max(10, 'Too long'),
		address: z.object({
			state: z.string()
		})
	})

	const form = enhancedForm(myForm, {
		delayMs: 500,
		timeoutMs: 3500
	})
</script>

<p>State: {form.state}</p>

<form
	{...form.handlers}
	{...myForm.preflight(schema).enhance((instance) =>
		form.enhance(instance, {
			onDelay: () => console.log('showing loader'),
			onTimeout: () => console.log('request timeout'),
			onReturn: ({ result }) => console.log('success', result)
		})
	)}
>
	<input
		{...myForm.fields.name.as('text')}
		{...form.fields.name.validate}
		{...form.fields.name.persist}
		class:error={form.fields.name.issues}
	/>

	{#if form.fields.name.issues}
		{#each form.fields.name.issues as issue}
			<p class="error">{issue}</p>
		{/each}
	{/if}

	<input
		{...myForm.fields.address.state.as('text')}
		{...form.fields.address.state.validate}
		class:error={form.fields.address.state.issues}
	/>

	<button disabled={form.pending}>
		{form.delayed ? 'Loading...' : 'Submit'}
	</button>
</form>

{#if form.timeout}
	<p>Request timed out</p>
{/if}
```

Three kinds of spreads wire everything up:

- `{...form.handlers}` on the `<form>` element — shows preflight issues for registered fields on submit attempts (even when SvelteKit blocks the submission before the enhance callback runs), clears validation state when the form resets, and hosts the auto-submit listener when `autoSubmit` is enabled
- `{...form.fields.some.path.validate}` on an input — opts the field into validation
- `{...form.fields.some.path.persist}` on an input — opts the field into draft persistence

The validation field shape mirrors the remote form field shape, so TypeScript catches renamed or misspelled fields.

## Creation options

```ts
const form = enhancedForm(myForm, {
	delayMs: 500, // unlocks the 'delayed' state and onDelay callback
	timeoutMs: 3500, // unlocks the 'timeout' state and onTimeout callback

	preventResetOnSuccess: true, // keep values after a successful submission (default: false)
	// — or —
	autoSubmit: true, // or { debounceMs: 600 } — mutually exclusive with preventResetOnSuccess

	persist: {
		key: 'my-form', // storage key (default: the remote form's action id)
		storage: 'session', // 'local' (default) or 'session'
		maxAgeMs: 86_400_000 // discard drafts older than this (default: no expiry)
	}
})
```

All options are optional. `delayed`/`timeout` state and the `onDelay`/`onTimeout` callbacks only exist when `delayMs`/`timeoutMs` were passed — enforced at the type level.

After a successful submission the form element is reset, matching SvelteKit's default enhance behavior. Pass `preventResetOnSuccess: true` for edit/settings forms that should keep their values visible after a save. When `autoSubmit` is enabled the form never resets (clearing a field the user just auto-saved would be jarring), so `preventResetOnSuccess` is not accepted alongside it.

## Validation

Use this to achieve better user experience around validation issues. Fields become dirty when the user changes their value. Issues appear when a dirty field loses focus (`onblur` events), and existing issues are cleared on input when the new value is valid. This way focus alone does not show validation issues, and you don't see new issues appear as you type.

This follows the same validation approach as superforms and is inspired by several articles:

- [Inline Validation in Forms: Designing the Experience](https://medium.com/wdstack/inline-validation-in-forms-designing-the-experience-123fb34088ce)
- [Inline Validation in Web Forms](https://alistapart.com/article/inline-validation-in-web-forms/)
- [Inline validation resources from Aral Balkan](https://ar.al/1161/)

Per field, via `form.fields.some.path`:

- `.validate` - Spread onto the input to opt it into validation (`onblur` and `oninput` handlers)
- `.issues` - The field's currently displayed validation issues (`string[] | null`) — handy for styling like `class:border-red-500={form.fields.address.state.issues}`
- `.pending` - Whether validation is currently running for the field
- `.addIssues(issues: string | string[])` - Adds one or more custom validation errors, ignoring duplicate messages
- `.removeIssue(issue: string)` - Removes a custom validation error by message
- `.clearIssues()` - Clears validation issues for the field and any fields nested under it
- `.addValidator(validator)` - Adds a field validator and returns a cleanup function

Form-wide:

- `allIssues` - All currently displayed validation issues as a nested tree (form-level issues appear under the `''` key)
- `allKnownIssues` - Debugging view: every issue currently known, whether displayed or not — everything the form holds right now (including unregistered and untouched fields) merged with custom and validator issues
- `formIssues` - Form-level issues — issues without a field path, e.g. from `invalid('message')` on the server
- `clearAllIssues()` - Clears all validation issues and dirty tracking
- `validateAll()` - Validates all registered fields with the server (including untouched fields), then updates issues

Add custom field validators directly to the field. A validator owns its own issue result: if it returns an issue, that issue is shown; if it later returns nothing, its previous issue is cleared.

```ts
const removeValidator = form.fields.address.state.addValidator(({ value, issue }) => {
	if (!acceptedStates.includes(value)) {
		return issue('Your state is not accepted at this time')
	}
})

form.fields.email.addValidator(async ({ value, issue }) => {
	const available = await checkEmailAvailability(value)

	if (!available) {
		return issue('That email is already in use')
	}
})
```

## Draft persistence

Spread `.persist` onto a field and its value survives reloads: it saves to web storage as the user types (debounced, flushed when the value commits) and restores when the input mounts. Restored fields are marked dirty, since a restored draft is user input, not pristine state.

```svelte
<textarea {...myForm.fields.message.as('text')} {...form.fields.message.persist}></textarea>
```

Spreading `.persist` is the whole opt-in — nothing to configure. The `persist` creation option only overrides defaults:

- `key` - Storage key. Defaults to the remote form's action id, which is stable across reloads and builds and self-invalidates when the remote function moves or is renamed (`.for(key)` instances get distinct keys automatically). Set it explicitly if you need to control invalidation.
- `storage` - `'local'` (default) persists across tabs and browser restarts; `'session'` is per-tab and self-cleans when the tab closes
- `maxAgeMs` - Drafts older than this are discarded at restore time. Default: no expiry.

The draft is discarded on successful submission, on form reset, or when it expires. Call `form.discardPersisted()` to drop it programmatically (e.g. a "discard changes" button). File inputs cannot be persisted and are skipped.

## Auto-submit

For forms that shouldn't need a save button — a profile field that saves once you stop typing:

```ts
const form = enhancedForm(myForm, { autoSubmit: true }) // or { autoSubmit: { debounceMs: 600 } }
```

Once input settles for `debounceMs` (default 600ms), the form submits itself via `requestSubmit()` — a real submit event, so preflight validation, the submit-attempt issue display, and your enhance callbacks all run exactly as they would for a button press. Behaviors that are built in rather than configurable:

- **Dirty check** — data identical to the last submission is never re-submitted, so a settled debounce after a save is a no-op
- **In-flight coalescing** — a debounce that fires mid-submission waits for it to settle, then submits once more only if the data changed since
- **Commit flush** — a `change` event (text field blur, select/checkbox pick) submits immediately instead of waiting out the debounce

Auto-submitting forms never reset after success, and a debounce still pending when the form unmounts is dropped — pair with `.persist` if that draft matters.

## Submission state and callbacks

- `enhance(instance, callbacks?)` - Form enhancement handler. Pass it the instance SvelteKit provides to the remote form's `enhance` callback
- `state` - Current form state (exclusive — exactly one state at a time; type-safe based on creation options)
- `idle`, `pending`, `issues`, `error`, `result` - Boolean getters (always available). `pending` stays true through the 'delayed' and 'timeout' states, so `disabled={form.pending}` is sufficient on its own
- `delayed` - Boolean getter (only when `delayMs` was provided) — stays true through 'timeout'
- `timeout` - Boolean getter (only when `timeoutMs` was provided)
- `reset()` - Resets the form element and the submission state (also clears validation state and discards the persisted draft, via the form's reset event)
- `resetState()` - Resets only the submission state back to 'idle', leaving the form's values alone

**Callbacks** (all optional):

Every callback receives the remote form instance as `form` — the same object SvelteKit passes to the `enhance` callback. Use `form.element` for the `<form>` element and `form.fields.value()` for the data being submitted. If you named your `enhancedForm` object `form`, destructuring the instance as `form` inside a callback shadows it — destructure only what you need instead.

- `onSubmit` - Called when form submission begins. Also receives `cancel()` and `updates()` functions:
  - `cancel(state?)` - Cancel submission and set state to 'idle' (default), 'error', or 'issues'
  - `updates(...queries)` - Provide queries/overrides for optimistic updates via `submit().updates(...)`
- `onDelay` - Called when delayed state is reached (only allowed if `delayMs` is set)
- `onTimeout` - Called when timeout state is reached (only allowed if `timeoutMs` is set)
- `onReturn` - Called when form submission returns successfully. Also receives `result`
- `onIssues` - Called when form submission returns with validation issues
- `onError` - Called when form submission encounters an error. Also receives `error`

```svelte
<form
	{...form.handlers}
	{...myForm.preflight(schema).enhance((instance) =>
		form.enhance(instance, {
			onSubmit: ({ cancel, updates }) => {
				// Custom client-side checks before submission
				if (!customValidationCheck(myForm.fields.value())) {
					form.fields.fieldName.addIssues('Custom validation failed')
					cancel('issues') // Cancel and set state to 'issues'
					return
				}

				// Optimistic updates
				updates(getPosts().withOverride((posts) => [newPost, ...posts]))
			},
			onReturn: ({ result }) => {},
			onIssues: () => {},
			onError: ({ error }) => {}
		})
	)}
>
	<!-- form fields -->
</form>
```

## Details

There is currently a [lot of change](https://github.com/sveltejs/kit/discussions/14288) with svelte's remote functions and with form validation. We use a very newly added `preflightOnly` flag for validation calls to avoid making calls to the server to validate on every keystroke however there seem to be [bugs](https://github.com/sveltejs/kit/discussions/14288#discussioncomment-14743807) in the current implementation including that we don't get server issues until you submit the form (we should be getting them on blur).

We also have some buggy behavior after a submit if the server sends back validation issues (and doesn't run the remote function), we do show those issues, however they currently all get cleared when you mutate the form. This is not desired. We want to clear only the issues for the field that mutates after server sends back issues.
