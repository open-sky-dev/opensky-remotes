/**
 * Compile-time tests for enhancedForm's conditional types: the delayed/timeout
 * state and the onDelay/onTimeout callbacks must only be available when
 * delayMs/timeoutMs were passed at creation, and autoSubmit must exclude
 * preventResetOnSuccess.
 *
 * This file is type-checked by `bun run check` but never imported at runtime
 * (and lives outside src/lib, so it is not packaged). An unfulfilled
 * @ts-expect-error fails the check.
 */
import type { RemoteForm, RemoteFormEnhanceInstance } from '@sveltejs/kit'
import { enhancedForm } from './lib/form.svelte'

declare const remote: RemoteForm<{ name: string; address: { state: string } }, { ok: boolean }>
declare const instance: RemoteFormEnhanceInstance<
	{ name: string; address: { state: string } },
	{ ok: boolean }
>

function assertType<T>(value: T) {
	void value
}

export function typeTests() {
	// No options: no delayed/timeout state or callbacks
	{
		const form = enhancedForm(remote)

		assertType<'idle' | 'pending' | 'issues' | 'error' | 'result'>(form.state)
		assertType<boolean>(form.pending)
		// @ts-expect-error -- 'delayed' state requires delayMs
		void (form.state === 'delayed')
		// @ts-expect-error -- 'timeout' state requires timeoutMs
		void (form.state === 'timeout')
		// @ts-expect-error -- delayed getter requires delayMs
		void form.delayed
		// @ts-expect-error -- timeout getter requires timeoutMs
		void form.timeout

		void form.enhance(instance, {
			onSubmit: ({ cancel, updates }) => {
				cancel('issues')
				updates()
			},
			// @ts-expect-error -- onDelay requires delayMs
			onDelay: () => {}
		})
		void form.enhance(instance, {
			// @ts-expect-error -- onTimeout requires timeoutMs
			onTimeout: () => {}
		})
	}

	// Empty options object behaves like no options
	{
		const form = enhancedForm(remote, {})

		// @ts-expect-error -- delayed getter requires delayMs
		void form.delayed
		// @ts-expect-error -- timeout getter requires timeoutMs
		void form.timeout
	}

	// delayMs only: delayed available, timeout not
	{
		const form = enhancedForm(remote, { delayMs: 500 })

		assertType<'idle' | 'pending' | 'issues' | 'error' | 'result' | 'delayed'>(form.state)
		assertType<boolean>(form.delayed)
		// @ts-expect-error -- 'timeout' state requires timeoutMs
		void (form.state === 'timeout')
		// @ts-expect-error -- timeout getter requires timeoutMs
		void form.timeout

		void form.enhance(instance, {
			onDelay: () => {},
			// @ts-expect-error -- onTimeout requires timeoutMs
			onTimeout: () => {}
		})
	}

	// timeoutMs only: timeout available, delayed not
	{
		const form = enhancedForm(remote, { timeoutMs: 3000 })

		assertType<'idle' | 'pending' | 'issues' | 'error' | 'result' | 'timeout'>(form.state)
		assertType<boolean>(form.timeout)
		// @ts-expect-error -- 'delayed' state requires delayMs
		void (form.state === 'delayed')
		// @ts-expect-error -- delayed getter requires delayMs
		void form.delayed

		void form.enhance(instance, {
			onTimeout: () => {},
			// @ts-expect-error -- onDelay requires delayMs
			onDelay: () => {}
		})
	}

	// Both timings plus the other options: everything available
	{
		const form = enhancedForm(remote, {
			delayMs: 500,
			timeoutMs: 3000,
			preventResetOnSuccess: true,
			persist: { key: 'custom', storage: 'session', maxAgeMs: 60_000 }
		})

		assertType<'idle' | 'pending' | 'issues' | 'error' | 'result' | 'delayed' | 'timeout'>(
			form.state
		)
		assertType<boolean>(form.delayed)
		assertType<boolean>(form.timeout)

		void form.enhance(instance, {
			onDelay: () => {},
			onTimeout: () => {},
			onReturn: ({ result }) => {
				assertType<{ ok: boolean }>(result)
			},
			onError: ({ error }) => {
				assertType<unknown>(error)
			}
		})
	}

	// autoSubmit accepts boolean shorthand and a debounce object
	{
		void enhancedForm(remote, { autoSubmit: true })
		void enhancedForm(remote, { autoSubmit: { debounceMs: 300 } })
		void enhancedForm(remote, { autoSubmit: false, preventResetOnSuccess: true })
	}

	// autoSubmit excludes preventResetOnSuccess — auto-submitting forms never reset
	// @ts-expect-error -- preventResetOnSuccess is not accepted alongside autoSubmit
	void enhancedForm(remote, { autoSubmit: true, preventResetOnSuccess: true })
	// @ts-expect-error -- preventResetOnSuccess is not accepted alongside autoSubmit
	void enhancedForm(remote, { autoSubmit: { debounceMs: 300 }, preventResetOnSuccess: false })

	// The pre-merge option name is gone
	// @ts-expect-error -- resetOnSuccess was replaced by preventResetOnSuccess
	void enhancedForm(remote, { resetOnSuccess: false })

	// Field surface: validate/persist spreads, mirrored field shape
	{
		const form = enhancedForm(remote)

		void form.fields.name.validate.onblur
		void form.fields.name.persist
		void form.fields.address.state.validate
		assertType<string[] | null>(form.fields.address.state.issues)
		assertType<boolean>(form.fields.name.pending)
		form.fields.name.addValidator(({ value, issue }) => {
			assertType<string | undefined>(value)
			return issue('nope')
		})
		// @ts-expect-error -- handlers was renamed to validate
		void form.fields.name.handlers
		// @ts-expect-error -- misspelled field paths are rejected
		void form.fields.adress

		// Form-level surface
		void form.handlers.onsubmitcapture
		void form.reset()
		void form.resetState()
		void form.discardPersisted()
		assertType<string[] | null>(form.formIssues)
		void form.clearAllIssues()
		void form.validateAll()
		// @ts-expect-error -- updateIssues is internal post-merge
		void form.updateIssues
		// @ts-expect-error -- formHandler was renamed to handlers
		void form.formHandler
	}

	// Unknown options are rejected
	// @ts-expect-error -- delayMss is not a valid option
	void enhancedForm(remote, { delayMss: 500 })
}
