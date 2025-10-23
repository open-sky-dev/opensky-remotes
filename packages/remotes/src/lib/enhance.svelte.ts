import type { RemoteForm, RemoteFormInput, RemoteQuery, RemoteQueryOverride } from '@sveltejs/kit'

// TODO: add handleSubmit callback to allow user to call submit() themselves which will allow them to do client-driven single-flight mutations and optimistic updates

/**
 * Parameters passed to the enhance handler
 */
type EnhanceParams<TData> = {
	/** The HTML form element being submitted */
	form: HTMLFormElement
	/** Function to submit the form */
	submit: () => Promise<void>
	/** Form data being submitted */
	data: TData
}

/**
 * Base context object passed to all enhance callbacks
 */
type BaseEnhanceContext<TData, TResult> = EnhanceParams<TData> & {
	/** The RemoteForm instance */
	remote: RemoteForm<any, TResult>
}

/**
 * Current state of the form submission lifecycle
 */
type FormState = 'idle' | 'pending' | 'delayed' | 'timeout' | 'issues' | 'error' | 'result'

/**
 * Base form state (always present)
 */
type BaseFormState = 'idle' | 'pending' | 'issues' | 'error' | 'result'

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
 * Conditional state type based on delay/timeout presence
 */
type ConditionalFormState<HasDelay extends boolean, HasTimeout extends boolean> =
	| BaseFormState
	| (HasDelay extends true ? 'delayed' : never)
	| (HasTimeout extends true ? 'timeout' : never)

/**
 * Submit context with cancel and updates functions
 */
type SubmitContext<TData, TResult> = BaseEnhanceContext<TData, TResult> & {
	/** Cancel the submission and optionally set state to 'error' or 'issues'. Defaults to 'idle' if no argument provided. */
	cancel: (state?: 'error' | 'issues') => void
	/** Provide queries/overrides to be passed to submit().updates(...) for optimistic updates */
	updates: (...queries: Array<RemoteQuery<any> | RemoteQueryOverride>) => void
}

/**
 * Base callback functions available for all forms
 */
type BaseCallbacks<TData, TResult> = {
	/** Called when form submission begins */
	onSubmit?: (ctx: SubmitContext<TData, TResult>) => void | Promise<void>
	/** Called when form submission returns successfully */
	onReturn?: (ctx: BaseEnhanceContext<TData, TResult> & { result: TResult }) => void | Promise<void>
	/** Called when form submission returns with validation issues */
	onIssues?: (ctx: BaseEnhanceContext<TData, TResult>) => void | Promise<void>
	/** Called when form submission encounters an error */
	onError?: (ctx: BaseEnhanceContext<TData, TResult> & { error: unknown }) => void | Promise<void>
}

/**
 * Callbacks with no delay or timeout
 */
type CallbacksNoTiming<TData, TResult> = BaseCallbacks<TData, TResult>

/**
 * Callbacks with delay only
 */
type CallbacksWithDelay<TData, TResult> = BaseCallbacks<TData, TResult> & {
	/** Called when submission takes longer than delayMs */
	onDelay?: (ctx: BaseEnhanceContext<TData, TResult>) => void | Promise<void>
}

/**
 * Callbacks with timeout only
 */
type CallbacksWithTimeout<TData, TResult> = BaseCallbacks<TData, TResult> & {
	/** Called when submission takes longer than timeoutMs */
	onTimeout?: (ctx: BaseEnhanceContext<TData, TResult>) => void | Promise<void>
}

/**
 * Callbacks with both delay and timeout
 */
type CallbacksWithBoth<TData, TResult> = BaseCallbacks<TData, TResult> & {
	/** Called when submission takes longer than delayMs */
	onDelay?: (ctx: BaseEnhanceContext<TData, TResult>) => void | Promise<void>
	/** Called when submission takes longer than timeoutMs */
	onTimeout?: (ctx: BaseEnhanceContext<TData, TResult>) => void | Promise<void>
}

/**
 * Return type with no delay or timeout
 */
type EnhancedFormNoTiming<TOutput> = {
	enhance: <TData>(
		params: EnhanceParams<TData>,
		callbacks: CallbacksNoTiming<TData, TOutput>
	) => Promise<void>
	reset: () => void
	state: 'idle' | 'pending' | 'issues' | 'error' | 'result'
	idle: boolean
	pending: boolean
	issues: boolean
	error: boolean
	result: boolean
}

/**
 * Return type with delay only
 */
type EnhancedFormWithDelay<TOutput> = {
	enhance: <TData>(
		params: EnhanceParams<TData>,
		callbacks: CallbacksWithDelay<TData, TOutput>
	) => Promise<void>
	reset: () => void
	state: 'idle' | 'pending' | 'delayed' | 'issues' | 'error' | 'result'
	idle: boolean
	pending: boolean
	delayed: boolean
	issues: boolean
	error: boolean
	result: boolean
}

/**
 * Return type with timeout only
 */
type EnhancedFormWithTimeout<TOutput> = {
	enhance: <TData>(
		params: EnhanceParams<TData>,
		callbacks: CallbacksWithTimeout<TData, TOutput>
	) => Promise<void>
	reset: () => void
	state: 'idle' | 'pending' | 'timeout' | 'issues' | 'error' | 'result'
	idle: boolean
	pending: boolean
	timeout: boolean
	issues: boolean
	error: boolean
	result: boolean
}

/**
 * Return type with both delay and timeout
 */
type EnhancedFormWithBoth<TOutput> = {
	enhance: <TData>(
		params: EnhanceParams<TData>,
		callbacks: CallbacksWithBoth<TData, TOutput>
	) => Promise<void>
	reset: () => void
	state: 'idle' | 'pending' | 'delayed' | 'timeout' | 'issues' | 'error' | 'result'
	idle: boolean
	pending: boolean
	delayed: boolean
	timeout: boolean
	issues: boolean
	error: boolean
	result: boolean
}

/**
 * Creates an enhanced form with reactive state management and lifecycle callbacks
 * @param remote - The RemoteForm object from createRemote
 * @param options - Optional configuration including validation integration, delayMs, and timeoutMs
 * @returns An object with enhance handler and reactive state getters (conditionally includes delayed/timeout based on options)
 */
export function createEnhancedForm<TInput extends RemoteFormInput | void, TOutput>(
	remote: RemoteForm<TInput, TOutput>,
	options: { validation?: Validation; delayMs: number; timeoutMs: number }
): EnhancedFormWithBoth<TOutput>
export function createEnhancedForm<TInput extends RemoteFormInput | void, TOutput>(
	remote: RemoteForm<TInput, TOutput>,
	options: { validation?: Validation; delayMs: number; timeoutMs?: never }
): EnhancedFormWithDelay<TOutput>
export function createEnhancedForm<TInput extends RemoteFormInput | void, TOutput>(
	remote: RemoteForm<TInput, TOutput>,
	options: { validation?: Validation; delayMs?: never; timeoutMs: number }
): EnhancedFormWithTimeout<TOutput>
export function createEnhancedForm<TInput extends RemoteFormInput | void, TOutput>(
	remote: RemoteForm<TInput, TOutput>,
	options?: { validation?: Validation; delayMs?: never; timeoutMs?: never }
): EnhancedFormNoTiming<TOutput>
export function createEnhancedForm<TInput extends RemoteFormInput | void, TOutput>(
	remote: RemoteForm<TInput, TOutput>,
	options?: CreateEnhancedFormOptions
):
	| EnhancedFormNoTiming<TOutput>
	| EnhancedFormWithDelay<TOutput>
	| EnhancedFormWithTimeout<TOutput>
	| EnhancedFormWithBoth<TOutput> {
	const { validation, delayMs, timeoutMs } = options ?? {}

	type State = 'idle' | 'pending' | 'delayed' | 'timeout' | 'issues' | 'error' | 'result'
	let state = $state<State>('idle')

	$effect(() => {
		if (remote.result) {
			state = 'result'
		}
	})

	const enhanceHandler = async <TData>(
		params: EnhanceParams<TData>,
		callbacks: BaseCallbacks<TData, TOutput> & {
			onDelay?: (ctx: BaseEnhanceContext<TData, TOutput>) => void | Promise<void>
			onTimeout?: (ctx: BaseEnhanceContext<TData, TOutput>) => void | Promise<void>
		}
	) => {
		const { onSubmit, onDelay, onTimeout, onReturn, onIssues, onError } = callbacks

		let delayTimer: ReturnType<typeof setTimeout> | null = null
		let timeoutTimer: ReturnType<typeof setTimeout> | null = null
		let cancelled = false
		let cancelledState: 'idle' | 'error' | 'issues' = 'idle'
		let updateQueries: any[] = []

		const baseContext: BaseEnhanceContext<TData, TOutput> = {
			...params,
			remote
		}

		const submitContext: SubmitContext<TData, TOutput> = {
			...baseContext,
			cancel: (cancelState?: 'error' | 'issues') => {
				cancelled = true
				cancelledState = cancelState ?? 'idle'
			},
			updates: (...queries: Array<RemoteQuery<any> | RemoteQueryOverride>) => {
				updateQueries = queries
			}
		}

		try {
			state = 'pending'
			await onSubmit?.(submitContext)

			// If cancelled, set the state and return early
			if (cancelled) {
				state = cancelledState
				return
			}

			if (delayMs != null) {
				delayTimer = setTimeout(() => {
					state = 'delayed'
					onDelay?.(baseContext)
				}, delayMs)
			}

			if (timeoutMs != null) {
				timeoutTimer = setTimeout(() => {
					state = 'timeout'
					onTimeout?.(baseContext)
				}, timeoutMs)
			}

			// Call submit with or without updates
			if (updateQueries.length > 0) {
				await params.submit().updates(...updateQueries)
			} else {
				await params.submit()
			}

			if (delayTimer) clearTimeout(delayTimer)
			if (timeoutTimer) clearTimeout(timeoutTimer)

			if (remote.result) {
				state = 'result'
				await onReturn?.({ ...baseContext, result: remote.result })
				params.form.reset()
			} else {
				const allIssues = remote.fields.allIssues()
				if (allIssues && allIssues.length > 0) {
					state = 'issues'
					// Call validation.updateIssues if provided
					await validation?.updateIssues()
					await onIssues?.(baseContext)
				}
			}
		} catch (error) {
			if (delayTimer) clearTimeout(delayTimer)
			if (timeoutTimer) clearTimeout(timeoutTimer)

			state = 'error'
			// Call validation.validateAll if provided
			await validation?.validateAll()
			await onError?.({ ...baseContext, error })
		}
	}

	const reset = () => {
		state = 'idle'
	}

	const baseReturn = {
		enhance: enhanceHandler,
		reset,
		get state() {
			return state
		},
		get idle() {
			return state === 'idle'
		},
		get pending() {
			return state === 'pending'
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
	}

	if (delayMs != null && timeoutMs != null) {
		return {
			enhance: enhanceHandler,
			reset,
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
		} as any
	} else if (delayMs != null) {
		return {
			enhance: enhanceHandler,
			reset,
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
			get issues() {
				return state === 'issues'
			},
			get error() {
				return state === 'error'
			},
			get result() {
				return state === 'result'
			}
		} as any
	} else if (timeoutMs != null) {
		return {
			enhance: enhanceHandler,
			reset,
			get state() {
				return state
			},
			get idle() {
				return state === 'idle'
			},
			get pending() {
				return state === 'pending'
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
		} as any
	}

	return baseReturn as any
}
