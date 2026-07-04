import type {
	RemoteForm,
	RemoteFormEnhanceInstance,
	RemoteFormInput,
	RemoteQueryUpdate
} from '@sveltejs/kit'
import { tick } from 'svelte'

/**
 * Base form state (always present)
 */
type BaseFormState = 'idle' | 'pending' | 'issues' | 'error' | 'result'

/**
 * Current state of the form submission lifecycle
 */
type FormState = BaseFormState | 'delayed' | 'timeout'

/**
 * Base context object passed to all enhance callbacks
 */
type EnhanceContext<TInput extends RemoteFormInput | void, TOutput> = {
	/**
	 * The remote form instance as received by the enhance callback.
	 * Use `form.element` for the `<form>` element and `form.fields.value()` for the submitted data.
	 */
	form: RemoteFormEnhanceInstance<TInput, TOutput>
}

/**
 * Optional validation integration for form validation
 */
type Validation = {
	/** Updates validation issues for all registered fields */
	updateIssues: () => void | Promise<void>
	/** Validates all registered fields */
	validateAll: () => void | Promise<void>
}

/**
 * Options available regardless of delay/timeout configuration
 */
type CommonOptions = {
	/** Optional validation instance from createValidation for form validation integration */
	validation?: Validation
	/** Whether to reset the `<form>` element after a successful submission (default: true) */
	resetOnSuccess?: boolean
}

/**
 * Options for creating an enhanced form
 */
type CreateEnhancedFormOptions = CommonOptions & {
	/** Milliseconds to wait before transitioning to 'delayed' state */
	delayMs?: number
	/** Milliseconds to wait before transitioning to 'timeout' state */
	timeoutMs?: number
}

/**
 * Submit context with cancel and updates functions
 */
type SubmitContext<TInput extends RemoteFormInput | void, TOutput> = EnhanceContext<
	TInput,
	TOutput
> & {
	/** Cancel the submission and optionally set state to 'error' or 'issues'. Defaults to 'idle' if no argument provided. */
	cancel: (state?: 'error' | 'issues') => void
	/** Provide queries/overrides to be passed to submit().updates(...) for optimistic updates */
	updates: (...queries: Array<RemoteQueryUpdate>) => void
}

/**
 * Callback for delayed/timeout timing transitions
 */
type TimingCallback<TInput extends RemoteFormInput | void, TOutput> = (
	ctx: EnhanceContext<TInput, TOutput>
) => void | Promise<void>

/**
 * Base callback functions available for all forms
 */
type BaseCallbacks<TInput extends RemoteFormInput | void, TOutput> = {
	/** Called when form submission begins */
	onSubmit?: (ctx: SubmitContext<TInput, TOutput>) => void | Promise<void>
	/** Called when form submission returns successfully */
	onReturn?: (ctx: EnhanceContext<TInput, TOutput> & { result: TOutput }) => void | Promise<void>
	/** Called when form submission returns with validation issues */
	onIssues?: (ctx: EnhanceContext<TInput, TOutput>) => void | Promise<void>
	/** Called when form submission encounters an error */
	onError?: (ctx: EnhanceContext<TInput, TOutput> & { error: unknown }) => void | Promise<void>
}

/**
 * Callbacks, conditionally including onDelay/onTimeout based on creation options
 */
type Callbacks<
	TInput extends RemoteFormInput | void,
	TOutput,
	HasDelay extends boolean,
	HasTimeout extends boolean
> = BaseCallbacks<TInput, TOutput> &
	(HasDelay extends true
		? {
				/** Called when submission takes longer than delayMs */
				onDelay?: TimingCallback<TInput, TOutput>
			}
		: { onDelay?: never }) &
	(HasTimeout extends true
		? {
				/** Called when submission takes longer than timeoutMs */
				onTimeout?: TimingCallback<TInput, TOutput>
			}
		: { onTimeout?: never })

/**
 * Enhanced form return type, conditionally including delayed/timeout state based on creation options
 */
type EnhancedForm<
	TInput extends RemoteFormInput | void,
	TOutput,
	HasDelay extends boolean,
	HasTimeout extends boolean
> = {
	/** Form enhancement handler — pass the instance received from the remote form's enhance callback */
	enhance: (
		form: RemoteFormEnhanceInstance<TInput, TOutput>,
		callbacks?: Callbacks<TInput, TOutput, HasDelay, HasTimeout>
	) => Promise<void>
	/** Resets the form state back to 'idle' and stops any in-flight submission from updating state */
	reset: () => void
	/** Current form state (exclusive — exactly one state at a time) */
	state:
		| BaseFormState
		| (HasDelay extends true ? 'delayed' : never)
		| (HasTimeout extends true ? 'timeout' : never)
	idle: boolean
	/** True while a submission is in flight — includes the 'delayed' and 'timeout' states */
	pending: boolean
	issues: boolean
	error: boolean
	result: boolean
} & (HasDelay extends true
	? {
			/** True once a submission exceeds delayMs — stays true through 'timeout', implies pending */
			delayed: boolean
		}
	: unknown) &
	(HasTimeout extends true
		? {
				/** True once a submission exceeds timeoutMs — implies pending */
				timeout: boolean
			}
		: unknown)

/**
 * Creates an enhanced form with reactive state management and lifecycle callbacks
 * @param remote - The remote form function
 * @param options - Optional configuration including validation integration, delayMs, timeoutMs, and resetOnSuccess
 * @returns An object with enhance handler and reactive state getters (conditionally includes delayed/timeout based on options)
 */
export function createEnhancedForm<
	TInput extends RemoteFormInput | void,
	TOutput,
	// The inferred options type determines which delayed/timeout state and
	// callbacks exist — passing delayMs unlocks 'delayed' and onDelay, etc.
	TOptions extends CreateEnhancedFormOptions = Record<never, never>
>(
	remote: RemoteForm<TInput, TOutput>,
	options?: TOptions
): EnhancedForm<
	TInput,
	TOutput,
	TOptions extends { delayMs: number } ? true : false,
	TOptions extends { timeoutMs: number } ? true : false
>
export function createEnhancedForm<TInput extends RemoteFormInput | void, TOutput>(
	// remote is unused at runtime but anchors TInput/TOutput inference
	remote: RemoteForm<TInput, TOutput>,
	options: CreateEnhancedFormOptions = {}
): EnhancedForm<TInput, TOutput, boolean, boolean> {
	const { validation, delayMs, timeoutMs, resetOnSuccess = true } = options

	let state = $state<FormState>('idle')

	// Each submission takes a generation; only the latest submission (and only
	// while it hasn't been superseded by a newer submission or a reset()) may
	// write state, fire callbacks, or reset the form
	let latestSubmission = 0

	/**
	 * Runs a user callback, reporting errors instead of letting them escape:
	 * a callback bug is not a submission error, and an error escaping the
	 * enhance callback would send SvelteKit to the nearest error page.
	 * Returns whether the callback completed without throwing.
	 */
	const runCallback = async (run: (() => void | Promise<void>) | undefined) => {
		try {
			await run?.()
			return true
		} catch (error) {
			console.error('[createEnhancedForm] Error thrown by form callback:', error)
			return false
		}
	}

	const enhance = async (
		form: RemoteFormEnhanceInstance<TInput, TOutput>,
		callbacks: Callbacks<TInput, TOutput, true, true> = {}
	) => {
		const { onSubmit, onDelay, onTimeout, onReturn, onIssues, onError } = callbacks

		const submission = ++latestSubmission
		const isCurrent = () => submission === latestSubmission

		let delayTimer: ReturnType<typeof setTimeout> | null = null
		let timeoutTimer: ReturnType<typeof setTimeout> | null = null
		let cancelled = false
		let cancelledState: 'idle' | 'error' | 'issues' = 'idle'
		let updateQueries: RemoteQueryUpdate[] = []

		const context: EnhanceContext<TInput, TOutput> = { form }

		const clearTimers = () => {
			if (delayTimer) clearTimeout(delayTimer)
			if (timeoutTimer) clearTimeout(timeoutTimer)
		}

		state = 'pending'

		const onSubmitOk = await runCallback(
			onSubmit &&
				(() =>
					onSubmit({
						...context,
						cancel: (cancelState?: 'error' | 'issues') => {
							cancelled = true
							cancelledState = cancelState ?? 'idle'
						},
						updates: (...queries: Array<RemoteQueryUpdate>) => {
							updateQueries = queries
						}
					}))
		)

		if (!isCurrent()) return

		// An onSubmit that threw may not have finished its pre-submit checks —
		// don't submit
		if (!onSubmitOk) {
			state = 'error'
			return
		}

		// If cancelled, set the state and return early
		if (cancelled) {
			state = cancelledState
			return
		}

		if (delayMs != null) {
			delayTimer = setTimeout(() => {
				// Only transition from 'pending' — never downgrade 'timeout'
				// (possible when delayMs > timeoutMs) or clobber a settled state
				if (!isCurrent() || state !== 'pending') return
				state = 'delayed'
				void runCallback(onDelay && (() => onDelay(context)))
			}, delayMs)
		}

		if (timeoutMs != null) {
			timeoutTimer = setTimeout(() => {
				if (!isCurrent() || (state !== 'pending' && state !== 'delayed')) return
				state = 'timeout'
				void runCallback(onTimeout && (() => onTimeout(context)))
			}, timeoutMs)
		}

		let valid: boolean
		try {
			valid =
				updateQueries.length > 0
					? await form.submit().updates(...updateQueries)
					: await form.submit()
			clearTimers()
		} catch (error) {
			clearTimers()

			if (!isCurrent()) return

			state = 'error'
			try {
				await validation?.validateAll()
			} catch {
				// A failed re-validation shouldn't mask the original error
			}
			if (!isCurrent()) return
			await runCallback(onError && (() => onError({ ...context, error })))
			return
		}

		if (!isCurrent()) return

		if (valid) {
			state = 'result'
			await runCallback(
				onReturn && (() => onReturn({ ...context, result: form.result as TOutput }))
			)

			if (resetOnSuccess) {
				// Mirror SvelteKit's default (non-enhanced) behavior: wait a tick,
				// then reset via the prototype to avoid DOM clobbering
				await tick()
				// A newer submission may have started while we waited — don't wipe
				// the form out from under it
				if (isCurrent()) {
					HTMLFormElement.prototype.reset.call(form.element)
				}
			}
		} else {
			state = 'issues'
			try {
				await validation?.updateIssues()
			} catch {
				// A failed issue refresh shouldn't escape the enhance callback
				// (SvelteKit would navigate to the nearest error page)
			}
			if (!isCurrent()) return
			await runCallback(onIssues && (() => onIssues(context)))
		}
	}

	return {
		enhance,
		reset: () => {
			// Invalidate any in-flight submission so it can't write state later
			latestSubmission++
			state = 'idle'
		},
		get state() {
			return state
		},
		get idle() {
			return state === 'idle'
		},
		get pending() {
			return state === 'pending' || state === 'delayed' || state === 'timeout'
		},
		get delayed() {
			return state === 'delayed' || state === 'timeout'
		},
		get timeout() {
			return state === 'timeout'
		},
		get issues() {
			return state === 'issues'
		},
		get error() {
			return state === 'error'
		},
		get result() {
			return state === 'result'
		}
		// The widened implementation signature erases the delayed/timeout getters,
		// which always exist at runtime — assert the fully-equipped shape
	} as EnhancedForm<TInput, TOutput, true, true>
}
