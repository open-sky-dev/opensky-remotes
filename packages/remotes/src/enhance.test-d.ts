/**
 * Compile-time tests for createEnhancedForm's conditional types: the
 * delayed/timeout state and the onDelay/onTimeout callbacks must only be
 * available when delayMs/timeoutMs were passed at creation.
 *
 * This file is type-checked by `bun run check` but never imported at runtime
 * (and lives outside src/lib, so it is not packaged). An unfulfilled
 * @ts-expect-error fails the check.
 */
import type { RemoteForm, RemoteFormEnhanceInstance } from '@sveltejs/kit'
import { createEnhancedForm } from './lib/enhance.svelte'

declare const remote: RemoteForm<{ name: string }, { ok: boolean }>
declare const instance: RemoteFormEnhanceInstance<{ name: string }, { ok: boolean }>

function assertType<T>(value: T) {
	void value
}

export function typeTests() {
	// No options: no delayed/timeout state or callbacks
	{
		const enhanced = createEnhancedForm(remote)

		assertType<'idle' | 'pending' | 'issues' | 'error' | 'result'>(enhanced.state)
		assertType<boolean>(enhanced.pending)
		// @ts-expect-error -- 'delayed' state requires delayMs
		void (enhanced.state === 'delayed')
		// @ts-expect-error -- 'timeout' state requires timeoutMs
		void (enhanced.state === 'timeout')
		// @ts-expect-error -- delayed getter requires delayMs
		void enhanced.delayed
		// @ts-expect-error -- timeout getter requires timeoutMs
		void enhanced.timeout

		void enhanced.enhance(instance, {
			onSubmit: ({ cancel, updates }) => {
				cancel('issues')
				updates()
			},
			// @ts-expect-error -- onDelay requires delayMs
			onDelay: () => {}
		})
		void enhanced.enhance(instance, {
			// @ts-expect-error -- onTimeout requires timeoutMs
			onTimeout: () => {}
		})
	}

	// Empty options object behaves like no options
	{
		const enhanced = createEnhancedForm(remote, {})

		// @ts-expect-error -- delayed getter requires delayMs
		void enhanced.delayed
		// @ts-expect-error -- timeout getter requires timeoutMs
		void enhanced.timeout
	}

	// delayMs only: delayed available, timeout not
	{
		const enhanced = createEnhancedForm(remote, { delayMs: 500 })

		assertType<'idle' | 'pending' | 'issues' | 'error' | 'result' | 'delayed'>(enhanced.state)
		assertType<boolean>(enhanced.delayed)
		// @ts-expect-error -- 'timeout' state requires timeoutMs
		void (enhanced.state === 'timeout')
		// @ts-expect-error -- timeout getter requires timeoutMs
		void enhanced.timeout

		void enhanced.enhance(instance, {
			onDelay: () => {},
			// @ts-expect-error -- onTimeout requires timeoutMs
			onTimeout: () => {}
		})
	}

	// timeoutMs only: timeout available, delayed not
	{
		const enhanced = createEnhancedForm(remote, { timeoutMs: 3000 })

		assertType<'idle' | 'pending' | 'issues' | 'error' | 'result' | 'timeout'>(enhanced.state)
		assertType<boolean>(enhanced.timeout)
		// @ts-expect-error -- 'delayed' state requires delayMs
		void (enhanced.state === 'delayed')
		// @ts-expect-error -- delayed getter requires delayMs
		void enhanced.delayed

		void enhanced.enhance(instance, {
			onTimeout: () => {},
			// @ts-expect-error -- onDelay requires delayMs
			onDelay: () => {}
		})
	}

	// Both timings plus the other options: everything available
	{
		const enhanced = createEnhancedForm(remote, {
			delayMs: 500,
			timeoutMs: 3000,
			resetOnSuccess: false
		})

		assertType<'idle' | 'pending' | 'issues' | 'error' | 'result' | 'delayed' | 'timeout'>(
			enhanced.state
		)
		assertType<boolean>(enhanced.delayed)
		assertType<boolean>(enhanced.timeout)

		void enhanced.enhance(instance, {
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

	// Unknown options are rejected
	// @ts-expect-error -- delayMss is not a valid option
	void createEnhancedForm(remote, { delayMss: 500 })
}
