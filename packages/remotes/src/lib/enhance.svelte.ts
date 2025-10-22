import type { RemoteForm, RemoteFormInput } from '@sveltejs/kit'

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
type FormState = 'idle' | 'pending' | 'delayed' | 'timeout' | 'issues' | 'error' | 'success'

/**
 * Optional validator integration for form validation
 */
type Validator = {
	/** Updates validation issues for all registered fields */
	updateIssues: () => void | Promise<void>
	/** Validates all registered fields */
	validateAll: () => void | Promise<void>
}

/**
 * Callback functions for different stages of form submission
 */
type EnhanceCallbacks<TData, TResult> = {
	/** Called when form submission begins */
	onSubmit?: (ctx: BaseEnhanceContext<TData, TResult>) => void | Promise<void>
	/** Called when submission takes longer than delayMs */
	onDelay?: (ctx: BaseEnhanceContext<TData, TResult>) => void | Promise<void>
	/** Called when submission takes longer than timeoutMs */
	onTimeout?: (ctx: BaseEnhanceContext<TData, TResult>) => void | Promise<void>
	/** Called when form submission returns successfully */
	onReturn?: (ctx: BaseEnhanceContext<TData, TResult> & { result: TResult }) => void | Promise<void>
	/** Called when form submission returns with validation issues */
	onIssues?: (ctx: BaseEnhanceContext<TData, TResult>) => void | Promise<void>
	/** Called when form submission encounters an error */
	onError?: (ctx: BaseEnhanceContext<TData, TResult> & { error: unknown }) => void | Promise<void>
	/** Milliseconds to wait before calling onDelay (requires onDelay callback) */
	delayMs?: number
	/** Milliseconds to wait before calling onTimeout (requires onTimeout callback) */
	timeoutMs?: number
} & ValidateDelayTimeout

/**
 * Type validation to ensure delay/timeout callbacks have corresponding durations
 */
type ValidateDelayTimeout =
	| { onDelay?: never; delayMs?: number }
	| { onDelay: Function; delayMs: number }
	| { onTimeout?: never; timeoutMs?: number }
	| { onTimeout: Function; timeoutMs: number }
	| { onDelay: Function; delayMs: number; onTimeout: Function; timeoutMs: number }
	| { onDelay?: never; onTimeout?: never }

/**
 * Options for creating an enhanced form
 */
type CreateEnhancedFormOptions = {
	/** Optional validator instance for form validation integration */
	validator?: Validator
}

/**
 * Creates an enhanced form with reactive state management and lifecycle callbacks
 * @param remote - The RemoteForm object from createRemote
 * @param options - Optional configuration including validator integration
 * @returns An object with enhance handler and reactive state getters
 */
export function createEnhancedForm<TInput extends RemoteFormInput | void, TOutput>(
	remote: RemoteForm<TInput, TOutput>,
	options?: CreateEnhancedFormOptions
) {
	let state = $state<FormState>('idle')
	const { validator } = options ?? {}

	$effect(() => {
		if (remote.result) {
			state = 'success'
		}
	})

	const enhanceHandler = async <TData>(
		params: EnhanceParams<TData>,
		callbacks: EnhanceCallbacks<TData, TOutput>
	) => {
		const { onSubmit, onDelay, onTimeout, onReturn, onIssues, onError, delayMs, timeoutMs } =
			callbacks

		let delayTimer: ReturnType<typeof setTimeout> | null = null
		let timeoutTimer: ReturnType<typeof setTimeout> | null = null

		const baseContext: BaseEnhanceContext<TData, TOutput> = {
			...params,
			remote
		}

		try {
			state = 'pending'
			await onSubmit?.(baseContext)

			if (onDelay && delayMs != null) {
				delayTimer = setTimeout(() => {
					state = 'delayed'
					onDelay(baseContext)
				}, delayMs)
			}

			if (onTimeout && timeoutMs != null) {
				timeoutTimer = setTimeout(() => {
					state = 'timeout'
					onTimeout(baseContext)
				}, timeoutMs)
			}

			await params.submit()

			if (delayTimer) clearTimeout(delayTimer)
			if (timeoutTimer) clearTimeout(timeoutTimer)

			if (remote.result) {
				state = 'success'
				await onReturn?.({ ...baseContext, result: remote.result })
				params.form.reset()
			} else {
				const allIssues = remote.fields.allIssues()
				if (allIssues && allIssues.length > 0) {
					state = 'issues'
					// Call validator.updateIssues if provided
					await validator?.updateIssues()
					await onIssues?.(baseContext)
				}
			}
		} catch (error) {
			if (delayTimer) clearTimeout(delayTimer)
			if (timeoutTimer) clearTimeout(timeoutTimer)

			state = 'error'
			// Call validator.validateAll if provided
			await validator?.validateAll()
			await onError?.({ ...baseContext, error })
		}
	}

	return {
		enhance: enhanceHandler,
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
		get success() {
			return state === 'success'
		}
	}
}
