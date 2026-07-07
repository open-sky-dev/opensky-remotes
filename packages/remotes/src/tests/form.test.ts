import type { RemoteFormEnhanceInstance, RemoteFormInput } from '@sveltejs/kit'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { enhancedForm } from '../lib/form.svelte'
import { deferred, getAttachment, makeForm, makeInstance, makeRemote } from './helpers'

afterEach(() => {
	document.body.innerHTML = ''
	vi.useRealTimers()
})

describe('submission state machine', () => {
	it('moves through pending to result and resets the form element by default', async () => {
		const form = enhancedForm(makeRemote())
		const element = makeForm({ a: 'typed' })
		const input = element.elements.namedItem('a') as HTMLInputElement
		input.value = 'typed by user'

		const onReturn = vi.fn()
		const submit = deferred<boolean>()
		const enhancePromise = form.enhance(
			makeInstance({ element, submit: () => submit.promise, result: { ok: true } }),
			{ onReturn }
		)

		expect(form.state).toBe('pending')
		expect(form.pending).toBe(true)

		submit.resolve(true)
		await enhancePromise

		expect(form.state).toBe('result')
		expect(form.result).toBe(true)
		expect(onReturn).toHaveBeenCalledWith(expect.objectContaining({ result: { ok: true } }))
		// Reset after success mirrors SvelteKit's default enhance behavior
		expect(input.value).toBe('')
	})

	it('keeps the form values when preventResetOnSuccess is set', async () => {
		const form = enhancedForm(makeRemote(), { preventResetOnSuccess: true })
		const element = makeForm()
		const input = element.elements.namedItem('a') as HTMLInputElement
		input.value = 'keep me'

		await form.enhance(makeInstance({ element, submit: async () => true }))

		expect(form.state).toBe('result')
		expect(input.value).toBe('keep me')
	})

	it('moves to issues when the submission returns invalid', async () => {
		const form = enhancedForm(makeRemote())
		const onIssues = vi.fn()

		await form.enhance(makeInstance({ element: makeForm(), submit: async () => false }), {
			onIssues
		})

		expect(form.state).toBe('issues')
		expect(form.issues).toBe(true)
		expect(onIssues).toHaveBeenCalledOnce()
	})

	it('moves to error when the submission throws and passes the error to onError', async () => {
		const form = enhancedForm(makeRemote())
		const failure = new Error('boom')
		const onError = vi.fn()

		await form.enhance(
			makeInstance({
				element: makeForm(),
				submit: async () => {
					throw failure
				}
			}),
			{ onError }
		)

		expect(form.state).toBe('error')
		expect(onError).toHaveBeenCalledWith(expect.objectContaining({ error: failure }))
	})

	it('cancel() in onSubmit stops the submission and sets the requested state', async () => {
		const form = enhancedForm(makeRemote())
		const submit = vi.fn(async () => true)

		await form.enhance(makeInstance({ element: makeForm(), submit }), {
			onSubmit: ({ cancel }) => cancel('issues')
		})

		expect(form.state).toBe('issues')
		expect(submit).not.toHaveBeenCalled()
	})

	it('reaches delayed then timeout while a slow submission is in flight', async () => {
		vi.useFakeTimers()
		const form = enhancedForm(makeRemote(), { delayMs: 500, timeoutMs: 2000 })
		const onDelay = vi.fn()
		const onTimeout = vi.fn()
		const submit = deferred<boolean>()

		const enhancePromise = form.enhance(
			makeInstance({ element: makeForm(), submit: () => submit.promise }),
			{ onDelay, onTimeout }
		)

		expect(form.state).toBe('pending')

		await vi.advanceTimersByTimeAsync(500)
		expect(form.state).toBe('delayed')
		expect(form.delayed).toBe(true)
		expect(form.pending).toBe(true)
		expect(onDelay).toHaveBeenCalledOnce()

		await vi.advanceTimersByTimeAsync(1500)
		expect(form.state).toBe('timeout')
		expect(form.timeout).toBe(true)
		expect(form.delayed).toBe(true)
		expect(onTimeout).toHaveBeenCalledOnce()

		submit.resolve(true)
		await enhancePromise
		expect(form.state).toBe('result')
	})

	it('a superseded submission cannot overwrite the newer submission or fire callbacks', async () => {
		const form = enhancedForm(makeRemote())
		const slowReturn = vi.fn()
		const fastReturn = vi.fn()
		const slow = deferred<boolean>()

		const slowPromise = form.enhance(
			makeInstance({ element: makeForm(), submit: () => slow.promise, result: 'slow' }),
			{ onReturn: slowReturn }
		)
		const fastPromise = form.enhance(
			makeInstance({ element: makeForm(), submit: async () => true, result: 'fast' }),
			{ onReturn: fastReturn }
		)

		await fastPromise
		expect(form.state).toBe('result')
		expect(fastReturn).toHaveBeenCalledOnce()

		slow.resolve(true)
		await slowPromise

		expect(form.state).toBe('result')
		expect(slowReturn).not.toHaveBeenCalled()
	})

	it('resetState() returns to idle without touching the form values', async () => {
		const form = enhancedForm(makeRemote(), { preventResetOnSuccess: true })
		const element = makeForm()
		const input = element.elements.namedItem('a') as HTMLInputElement
		input.value = 'typed'

		await form.enhance(makeInstance({ element, submit: async () => true }))
		expect(form.state).toBe('result')

		form.resetState()

		expect(form.state).toBe('idle')
		expect(input.value).toBe('typed')
	})

	it('reset() resets the form element as well as the state', async () => {
		const element = makeForm()
		const remote = makeRemote({ element })
		const form = enhancedForm(remote, { preventResetOnSuccess: true })
		const input = element.elements.namedItem('a') as HTMLInputElement
		input.value = 'typed'

		await form.enhance(makeInstance({ element, submit: async () => true }))
		form.reset()

		expect(form.state).toBe('idle')
		expect(input.value).toBe('')
	})

	it('calling updates() with zero arguments in onSubmit forwards to submit().updates()', async () => {
		const form = enhancedForm(makeRemote())
		const submission = Object.assign(Promise.resolve(true), {
			updates: vi.fn(() => Promise.resolve(true))
		})
		const instance = {
			element: makeForm(),
			submit: () => submission,
			result: undefined,
			fields: {}
		} as unknown as RemoteFormEnhanceInstance<RemoteFormInput, unknown>

		await form.enhance(instance, { onSubmit: ({ updates }) => updates() })

		expect(submission.updates).toHaveBeenCalledWith()
	})
})

describe('autoSubmit', () => {
	function setup(options: { debounceMs?: number } | true = true) {
		vi.useFakeTimers()
		const element = makeForm()
		const remote = makeRemote({ element })
		const form = enhancedForm(remote, { autoSubmit: options })
		element.requestSubmit = vi.fn()

		const detach = getAttachment(form.handlers)(element)
		return {
			form,
			element,
			requestSubmit: element.requestSubmit as ReturnType<typeof vi.fn>,
			detach
		}
	}

	function type(element: HTMLFormElement, value: string) {
		const input = element.elements.namedItem('a') as HTMLInputElement
		input.value = value
		input.dispatchEvent(new Event('input', { bubbles: true }))
	}

	it('submits after input settles for the debounce window', async () => {
		const { element, requestSubmit } = setup()

		type(element, 'hello')
		expect(requestSubmit).not.toHaveBeenCalled()

		await vi.advanceTimersByTimeAsync(599)
		expect(requestSubmit).not.toHaveBeenCalled()

		await vi.advanceTimersByTimeAsync(1)
		expect(requestSubmit).toHaveBeenCalledOnce()
	})

	it('respects a custom debounceMs', async () => {
		const { element, requestSubmit } = setup({ debounceMs: 100 })

		type(element, 'hello')
		await vi.advanceTimersByTimeAsync(100)

		expect(requestSubmit).toHaveBeenCalledOnce()
	})

	it('continued typing keeps pushing the submission back', async () => {
		const { element, requestSubmit } = setup()

		type(element, 'h')
		await vi.advanceTimersByTimeAsync(400)
		type(element, 'he')
		await vi.advanceTimersByTimeAsync(400)
		expect(requestSubmit).not.toHaveBeenCalled()

		await vi.advanceTimersByTimeAsync(200)
		expect(requestSubmit).toHaveBeenCalledOnce()
	})

	it('a change event submits immediately instead of waiting out the debounce', () => {
		const { element, requestSubmit } = setup()

		const input = element.elements.namedItem('a') as HTMLInputElement
		input.value = 'committed'
		input.dispatchEvent(new Event('change', { bubbles: true }))

		expect(requestSubmit).toHaveBeenCalledOnce()
	})

	it('never re-submits data identical to the last submission', async () => {
		const { form, element, requestSubmit } = setup()

		// A submission captures the snapshot of what was submitted
		await form.enhance(makeInstance({ element, submit: async () => true }))
		expect(form.state).toBe('result')

		// Input events that end with the same data: no re-submission
		type(element, 'initial')
		await vi.advanceTimersByTimeAsync(600)
		expect(requestSubmit).not.toHaveBeenCalled()

		// Changed data submits
		type(element, 'different')
		await vi.advanceTimersByTimeAsync(600)
		expect(requestSubmit).toHaveBeenCalledOnce()
	})

	it('a debounce firing mid-submission waits, then re-submits only if the data changed', async () => {
		const { form, element, requestSubmit } = setup()
		const submit = deferred<boolean>()

		const enhancePromise = form.enhance(makeInstance({ element, submit: () => submit.promise }))
		expect(form.state).toBe('pending')

		// The user keeps typing while the submission is in flight
		type(element, 'newer value')
		await vi.advanceTimersByTimeAsync(600)
		expect(requestSubmit).not.toHaveBeenCalled()

		submit.resolve(true)
		await enhancePromise

		// The queued auto-submit fires now that the submission settled
		expect(requestSubmit).toHaveBeenCalledOnce()
	})

	it('a pending debounce is dropped at teardown', async () => {
		const { element, requestSubmit, detach } = setup()

		type(element, 'about to navigate away')
		detach?.()

		await vi.advanceTimersByTimeAsync(600)
		expect(requestSubmit).not.toHaveBeenCalled()
	})

	it('does not reset the form after a successful submission', async () => {
		const { form, element } = setup()
		const input = element.elements.namedItem('a') as HTMLInputElement
		input.value = 'auto-saved'

		await form.enhance(makeInstance({ element, submit: async () => true }))

		expect(form.state).toBe('result')
		expect(input.value).toBe('auto-saved')
	})
})
