import type { RemoteForm, RemoteFormInput } from '@sveltejs/kit'

type EnhanceParams<TData> = {
	form: HTMLFormElement
	submit: () => Promise<void>
	data: TData
}

type BaseEnhanceContext<TData, TResult> = EnhanceParams<TData> & {
	remote: RemoteForm<any, TResult>
}

type FormState = 'idle' | 'pending' | 'delayed' | 'timeout' | 'issues' | 'error' | 'success'

type Validator = {
	updateIssues: () => void | Promise<void>
	validateAll: () => void | Promise<void>
}

type EnhanceCallbacks<TData, TResult> = {
	onSubmit?: (ctx: BaseEnhanceContext<TData, TResult>) => void | Promise<void>
	onDelay?: (ctx: BaseEnhanceContext<TData, TResult>) => void | Promise<void>
	onTimeout?: (ctx: BaseEnhanceContext<TData, TResult>) => void | Promise<void>
	onReturn?: (ctx: BaseEnhanceContext<TData, TResult> & { result: TResult }) => void | Promise<void>
	onIssues?: (ctx: BaseEnhanceContext<TData, TResult>) => void | Promise<void>
	onError?: (ctx: BaseEnhanceContext<TData, TResult> & { error: unknown }) => void | Promise<void>
	delayMs?: number
	timeoutMs?: number
} & ValidateDelayTimeout

type ValidateDelayTimeout =
	| { onDelay?: never; delayMs?: number }
	| { onDelay: Function; delayMs: number }
	| { onTimeout?: never; timeoutMs?: number }
	| { onTimeout: Function; timeoutMs: number }
	| { onDelay: Function; delayMs: number; onTimeout: Function; timeoutMs: number }
	| { onDelay?: never; onTimeout?: never }

type CreateEnhancedFormOptions = {
	validator?: Validator
}

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
