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
 * Options for creating an enhanced form
 */
type CreateEnhancedFormOptions = {
	/** Optional validation instance from createValidation for form validation integration */
	validation?: Validation
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
	/** Resets the form state back to 'idle' */
	reset: () => void
	/** Current form state */
	state:
		| BaseFormState
		| (HasDelay extends true ? 'delayed' : never)
		| (HasTimeout extends true ? 'timeout' : never)
	idle: boolean
	pending: boolean
	issues: boolean
	error: boolean
	result: boolean
} & (HasDelay extends true ? { delayed: boolean } : unknown) &
	(HasTimeout extends true ? { timeout: boolean } : unknown)

/**
 * Creates an enhanced form with reactive state management and lifecycle callbacks
 * @param remote - The remote form function
 * @param options - Optional configuration including validation integration, delayMs, and timeoutMs
 * @returns An object with enhance handler and reactive state getters (conditionally includes delayed/timeout based on options)
 */
export function createEnhancedForm<TInput extends RemoteFormInput | void, TOutput>(
	remote: RemoteForm<TInput, TOutput>,
	options: { validation?: Validation; delayMs: number; timeoutMs: number }
): EnhancedForm<TInput, TOutput, true, true>
export function createEnhancedForm<TInput extends RemoteFormInput | void, TOutput>(
	remote: RemoteForm<TInput, TOutput>,
	options: { validation?: Validation; delayMs: number; timeoutMs?: never }
): EnhancedForm<TInput, TOutput, true, false>
export function createEnhancedForm<TInput extends RemoteFormInput | void, TOutput>(
	remote: RemoteForm<TInput, TOutput>,
	options: { validation?: Validation; delayMs?: never; timeoutMs: number }
): EnhancedForm<TInput, TOutput, false, true>
export function createEnhancedForm<TInput extends RemoteFormInput | void, TOutput>(
	remote: RemoteForm<TInput, TOutput>,
	options?: { validation?: Validation; delayMs?: never; timeoutMs?: never }
): EnhancedForm<TInput, TOutput, false, false>
export function createEnhancedForm<TInput extends RemoteFormInput | void, TOutput>(
	// remote is unused at runtime but anchors TInput/TOutput inference
	remote: RemoteForm<TInput, TOutput>,
	options: CreateEnhancedFormOptions = {}
):
	| EnhancedForm<TInput, TOutput, true, true>
	| EnhancedForm<TInput, TOutput, true, false>
	| EnhancedForm<TInput, TOutput, false, true>
	| EnhancedForm<TInput, TOutput, false, false> {
	const { validation, delayMs, timeoutMs } = options

	let state = $state<FormState>('idle')

	const enhance = async (
		form: RemoteFormEnhanceInstance<TInput, TOutput>,
		callbacks: BaseCallbacks<TInput, TOutput> & {
			onDelay?: TimingCallback<TInput, TOutput>
			onTimeout?: TimingCallback<TInput, TOutput>
		} = {}
	) => {
		const { onSubmit, onDelay, onTimeout, onReturn, onIssues, onError } = callbacks

		let delayTimer: ReturnType<typeof setTimeout> | null = null
		let timeoutTimer: ReturnType<typeof setTimeout> | null = null
		let cancelled = false
		let cancelledState: 'idle' | 'error' | 'issues' = 'idle'
		let updateQueries: RemoteQueryUpdate[] = []

		const context: EnhanceContext<TInput, TOutput> = { form }

		try {
			state = 'pending'
			await onSubmit?.({
				...context,
				cancel: (cancelState?: 'error' | 'issues') => {
					cancelled = true
					cancelledState = cancelState ?? 'idle'
				},
				updates: (...queries: Array<RemoteQueryUpdate>) => {
					updateQueries = queries
				}
			})

			// If cancelled, set the state and return early
			if (cancelled) {
				state = cancelledState
				return
			}

			if (delayMs != null) {
				delayTimer = setTimeout(() => {
					state = 'delayed'
					onDelay?.(context)
				}, delayMs)
			}

			if (timeoutMs != null) {
				timeoutTimer = setTimeout(() => {
					state = 'timeout'
					onTimeout?.(context)
				}, timeoutMs)
			}

			const valid =
				updateQueries.length > 0
					? await form.submit().updates(...updateQueries)
					: await form.submit()

			if (delayTimer) clearTimeout(delayTimer)
			if (timeoutTimer) clearTimeout(timeoutTimer)

			if (valid) {
				state = 'result'
				await onReturn?.({ ...context, result: form.result as TOutput })
				// Mirror SvelteKit's default enhance behavior: wait a tick, then
				// reset via the prototype to avoid DOM clobbering
				await tick()
				HTMLFormElement.prototype.reset.call(form.element)
			} else {
				state = 'issues'
				try {
					await validation?.updateIssues()
				} catch {
					// A failed issue refresh shouldn't escape the enhance callback
					// (SvelteKit would navigate to the nearest error page)
				}
				await onIssues?.(context)
			}
		} catch (error) {
			if (delayTimer) clearTimeout(delayTimer)
			if (timeoutTimer) clearTimeout(timeoutTimer)

			state = 'error'
			try {
				await validation?.validateAll()
			} catch {
				// A failed re-validation shouldn't mask the original error
			}
			await onError?.({ ...context, error })
		}
	}

	return {
		enhance,
		reset: () => {
			state = 'idle'
		},
		get state() {
			return state
		},
		get idle() {
			return state === 'idle'
		},
		get pending() {
			return state === 'pending'
		},
		get delayed() {
			return state === 'delayed'
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
	} as EnhancedForm<TInput, TOutput, true, true>
}
