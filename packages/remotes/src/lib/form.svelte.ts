import type {
	RemoteForm,
	RemoteFormEnhanceInstance,
	RemoteFormInput,
	RemoteQueryUpdate
} from '@sveltejs/kit'
import type { Attachment } from 'svelte/attachments'
import { createAttachmentKey } from 'svelte/attachments'
import { tick } from 'svelte'
import {
	createValidationCore,
	type FieldValidator,
	type PrimitiveFieldValue,
	type ValidationHandlers,
	type ValidationIssues
} from './validation.svelte'
import { createPersistCore, type PersistOptions, type PersistSpread } from './persist.svelte'

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
 * Auto-submit configuration
 */
type AutoSubmitOptions = {
	/** Milliseconds of input inactivity before the form auto-submits (default: 600) */
	debounceMs?: number
}

/**
 * Options available regardless of delay/timeout configuration
 */
type CommonOptions = {
	/** Milliseconds to wait before transitioning to 'delayed' state */
	delayMs?: number
	/** Milliseconds to wait before transitioning to 'timeout' state */
	timeoutMs?: number
	/** Draft persistence overrides — fields opt in by spreading `form.fields.<path>.persist` */
	persist?: PersistOptions
}

/**
 * Options for creating an enhanced form. `autoSubmit` and
 * `preventResetOnSuccess` are mutually exclusive: auto-submitting forms never
 * reset, so there is nothing left to opt into.
 */
export type EnhancedFormOptions = CommonOptions &
	(
		| {
				/** Auto-submit the form after input settles (debounced; flushed on change) */
				autoSubmit: true | AutoSubmitOptions
				preventResetOnSuccess?: never
		  }
		| {
				autoSubmit?: false
				/** Keep the form's values after a successful submission instead of resetting (default: false) */
				preventResetOnSuccess?: boolean
		  }
	)

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
 * The spread for the `<form>` element: submit-attempt issue display, validation
 * clearing on reset, and (when autoSubmit is enabled) the input listener
 */
export type FormHandlers = {
	onsubmitcapture: () => Promise<void>
	onreset: () => void
} & Record<symbol, Attachment>

type FieldValue<T, K extends PropertyKey> = T extends unknown
	? K extends keyof T
		? T[K]
		: never
	: never

/**
 * Per-field surface: spreads to opt into validation and persistence, plus
 * issue accessors and custom issue/validator management
 */
export type FormField<TValue = unknown> = {
	/** Spread onto the input to opt it into validation (onblur/oninput) */
	validate: ValidationHandlers
	/** Spread onto the input to opt it into draft persistence */
	persist: PersistSpread
	issues: string[] | null
	pending: boolean
	addIssues: (issues: string | string[]) => void
	removeIssue: (issue: string) => void
	clearIssues: () => void
	addValidator: (validator: FieldValidator<TValue>) => () => void
}

export type FormFields<T> = [T] extends [void]
	? FormField
	: NonNullable<T> extends PrimitiveFieldValue
		? FormField<NonNullable<T>>
		: [NonNullable<T>] extends [Array<infer Item>]
			? FormField<NonNullable<T>> & {
					[index: number]: FormFields<Item>
				}
			: FormField<NonNullable<T>> & {
					[K in keyof NonNullable<T>]-?: FormFields<FieldValue<NonNullable<T>, K>>
				}

/**
 * Enhanced form return type, conditionally including delayed/timeout state based on creation options
 */
export type EnhancedForm<
	TInput extends RemoteFormInput | void,
	TOutput,
	HasDelay extends boolean,
	HasTimeout extends boolean
> = {
	/** Spread onto the `<form>` element */
	handlers: FormHandlers
	/** Type-safe per-field helpers mirroring the remote form's field shape */
	fields: FormFields<TInput>
	/** Form enhancement handler — pass the instance received from the remote form's enhance callback */
	enhance: (
		form: RemoteFormEnhanceInstance<TInput, TOutput>,
		callbacks?: Callbacks<TInput, TOutput, HasDelay, HasTimeout>
	) => Promise<void>
	/** Resets the form element and the submission state */
	reset: () => void
	/** Resets only the submission state back to 'idle', leaving the form's values alone */
	resetState: () => void
	/** Discards the persisted draft */
	discardPersisted: () => void
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
	/** All currently displayed validation issues as a nested tree (form-level issues under the '' key) */
	allIssues: ValidationIssues
	/** Debugging view: every issue currently known, whether displayed or not */
	allKnownIssues: ValidationIssues
	/** Form-level issues — issues without a field path, e.g. from `invalid('message')` on the server */
	formIssues: string[] | null
	/** Clears all validation issues and dirty tracking */
	clearAllIssues: () => void
	/** Validates all registered fields with the server (including untouched fields), then updates issues */
	validateAll: () => Promise<void>
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

const DEFAULT_AUTO_SUBMIT_DEBOUNCE_MS = 600

/**
 * Serializes the form's current data for change detection. Auto-submit skips
 * submissions whose data matches what was last submitted.
 */
function snapshot(element: HTMLFormElement): string {
	const entries: Array<[string, string]> = []

	for (const [key, value] of new FormData(element)) {
		entries.push([
			key,
			typeof value === 'string' ? value : `file:${value.name}:${value.size}:${value.lastModified}`
		])
	}

	entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
	return JSON.stringify(entries)
}

/**
 * Creates an enhanced form: submission state tracking with semantic callbacks,
 * inline validation, draft persistence, and optional auto-submission — all
 * around a SvelteKit remote form function.
 * @param remote - The remote form function
 * @param options - Optional configuration (timings, autoSubmit, persist, preventResetOnSuccess)
 * @returns An object with the form-level `handlers` spread, per-field helpers,
 * the `enhance` handler, and reactive state getters (delayed/timeout only when configured)
 */
export function enhancedForm<
	TInput extends RemoteFormInput | void,
	TOutput,
	// The inferred options type determines which delayed/timeout state and
	// callbacks exist — passing delayMs unlocks 'delayed' and onDelay, etc.
	TOptions extends EnhancedFormOptions = Record<never, never>
>(
	remote: RemoteForm<TInput, TOutput>,
	options?: TOptions
): EnhancedForm<
	TInput,
	TOutput,
	TOptions extends { delayMs: number } ? true : false,
	TOptions extends { timeoutMs: number } ? true : false
>
export function enhancedForm<TInput extends RemoteFormInput | void, TOutput>(
	remote: RemoteForm<TInput, TOutput>,
	options: CommonOptions & {
		autoSubmit?: boolean | AutoSubmitOptions
		preventResetOnSuccess?: boolean
	} = {}
): EnhancedForm<TInput, TOutput, boolean, boolean> {
	const { delayMs, timeoutMs, autoSubmit, persist } = options

	const autoSubmitEnabled = !!autoSubmit
	const autoSubmitDebounceMs =
		(typeof autoSubmit === 'object' ? autoSubmit.debounceMs : undefined) ??
		DEFAULT_AUTO_SUBMIT_DEBOUNCE_MS
	// Auto-submitting forms never reset — clearing a field the user just
	// auto-saved would be jarring
	const resetOnSuccess = !options.preventResetOnSuccess && !autoSubmitEnabled

	const validation = createValidationCore(remote)

	/**
	 * Writes a restored draft value into kit's reactive field state so inputs
	 * driven by `as()` spreads pick it up
	 */
	function setKitField(path: string[], value: unknown) {
		let current: unknown = remote.fields

		for (const key of path) {
			if (!current || (typeof current !== 'object' && typeof current !== 'function')) {
				return
			}
			current = (current as Record<string, unknown>)[key]
		}

		const field = current as { set?: (value: unknown) => unknown } | undefined
		if (typeof field?.set === 'function') {
			try {
				field.set(value)
			} catch {
				// The element already carries the restored value — kit state is best-effort
			}
		}
	}

	const persistence = createPersistCore({
		// The action id is a deterministic hash of the remote file's path plus the
		// export name (and any .for() key), so it is stable across reloads/builds
		// and self-invalidates when the remote function moves or is renamed
		storageKey: `opensky-remotes:${persist?.key ?? remote.action}`,
		storage: persist?.storage ?? 'local',
		maxAgeMs: persist?.maxAgeMs,
		markDirty: validation.markDirty,
		setKitField
	})

	let state = $state<FormState>('idle')

	// Each submission takes a generation; only the latest submission (and only
	// while it hasn't been superseded by a newer submission or a reset()) may
	// write state, fire callbacks, or reset the form
	let latestSubmission = 0

	// --- auto-submit ---

	let autoSubmitTimer: ReturnType<typeof setTimeout> | null = null
	// A debounce that fired mid-submission waits for it to settle, then
	// re-checks: submit once more only if the data changed since
	let autoSubmitQueued = false
	let lastSubmittedSnapshot: string | null = null
	let attachedForm: HTMLFormElement | null = null

	function clearAutoSubmitTimer() {
		if (autoSubmitTimer) {
			clearTimeout(autoSubmitTimer)
			autoSubmitTimer = null
		}
	}

	function fireAutoSubmit() {
		const element = attachedForm ?? remote.element
		if (!element) {
			return
		}

		// Never re-submit unchanged data
		if (lastSubmittedSnapshot !== null && snapshot(element) === lastSubmittedSnapshot) {
			return
		}

		if (state === 'pending' || state === 'delayed' || state === 'timeout') {
			autoSubmitQueued = true
			return
		}

		// The front door: fires a real submit event, so preflight, the
		// submit-attempt issue display, and the enhance pipeline all run
		element.requestSubmit()
	}

	const autoSubmitAttachment: Attachment = (node) => {
		if (!(node instanceof HTMLFormElement)) {
			return
		}

		attachedForm = node

		const onInput = () => {
			clearAutoSubmitTimer()
			autoSubmitTimer = setTimeout(() => {
				autoSubmitTimer = null
				fireAutoSubmit()
			}, autoSubmitDebounceMs)
		}

		// change means the value was committed (text blur, select/checkbox pick) —
		// no reason to keep waiting
		const onChange = () => {
			clearAutoSubmitTimer()
			fireAutoSubmit()
		}

		// Snapshot at submit-event time — the same moment kit captures its
		// FormData — so input arriving during an async preflight can't be
		// recorded as submitted without actually being sent
		const onSubmit = () => {
			lastSubmittedSnapshot = snapshot(node)
		}

		// A reset invalidates whatever the debounce was about to submit —
		// without this, the debounce fires after the reset and auto-submits
		// the freshly-emptied form
		const onReset = () => {
			clearAutoSubmitTimer()
			autoSubmitQueued = false
		}

		node.addEventListener('input', onInput)
		node.addEventListener('change', onChange)
		node.addEventListener('submit', onSubmit)
		node.addEventListener('reset', onReset)

		return () => {
			// A debounce pending at teardown is dropped — persistence holds the draft
			node.removeEventListener('input', onInput)
			node.removeEventListener('change', onChange)
			node.removeEventListener('submit', onSubmit)
			node.removeEventListener('reset', onReset)
			if (attachedForm === node) {
				clearAutoSubmitTimer()
				autoSubmitQueued = false
				attachedForm = null
			}
		}
	}

	const handlers: FormHandlers = {
		// Shows blocking preflight issues even when SvelteKit blocks the
		// submission before the enhance callback runs
		onsubmitcapture: validation.validateSubmitAttempt,
		// Kit clears its issues and touched state on form reset; clear ours too
		onreset: validation.clearAllIssues
	}
	if (autoSubmitEnabled) {
		handlers[createAttachmentKey()] = autoSubmitAttachment
	}

	// --- fields proxy ---

	function createFieldProxy(path: string[]): FormField {
		return new Proxy(
			{},
			{
				get(_, property) {
					if (typeof property === 'symbol') {
						return undefined
					}

					if (property === 'validate') {
						return validation.validate(path)
					}

					if (property === 'persist') {
						return persistence.attachment(path)
					}

					if (property === 'issues') {
						validation.registerPath(path)
						return validation.issuesFor(path)
					}

					if (property === 'pending') {
						validation.registerPath(path)
						return validation.isPending(path)
					}

					if (property === 'addIssues') {
						return (issues: string | string[]) => validation.addIssues(path, issues)
					}

					if (property === 'removeIssue') {
						return (issue: string) => validation.removeIssue(path, issue)
					}

					if (property === 'clearIssues') {
						return () => validation.clearIssues(path)
					}

					if (property === 'addValidator') {
						return (validator: FieldValidator<unknown>) => validation.addValidator(path, validator)
					}

					return createFieldProxy([...path, property])
				}
			}
		) as FormField
	}

	const fields = createFieldProxy([]) as FormFields<TInput>

	// --- submission lifecycle ---

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
			console.error('[enhancedForm] Error thrown by form callback:', error)
			return false
		}
	}

	/**
	 * Re-fires a queued auto-submit once the submission that blocked it settles
	 */
	function flushQueuedAutoSubmit() {
		if (autoSubmitQueued) {
			autoSubmitQueued = false
			fireAutoSubmit()
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
		let updatesCalled = false

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
							updatesCalled = true
							updateQueries = queries
						}
					}))
		)

		if (!isCurrent()) return

		// An onSubmit that threw may not have finished its pre-submit checks —
		// don't submit
		if (!onSubmitOk) {
			state = 'error'
			flushQueuedAutoSubmit()
			return
		}

		// If cancelled, set the state and return early
		if (cancelled) {
			state = cancelledState
			flushQueuedAutoSubmit()
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
			valid = updatesCalled ? await form.submit().updates(...updateQueries) : await form.submit()
			clearTimers()
		} catch (error) {
			clearTimers()

			if (!isCurrent()) return

			state = 'error'
			try {
				await validation.validateAll()
			} catch {
				// A failed re-validation shouldn't mask the original error
			}
			if (!isCurrent()) return
			await runCallback(onError && (() => onError({ ...context, error })))
			if (!isCurrent()) return
			flushQueuedAutoSubmit()
			return
		}

		if (!isCurrent()) return

		if (valid) {
			state = 'result'
			// The submitted values are saved — the draft has served its purpose
			persistence.discard()
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
				await validation.updateIssues()
			} catch {
				// A failed issue refresh shouldn't escape the enhance callback
				// (SvelteKit would navigate to the nearest error page)
			}
			if (!isCurrent()) return
			await runCallback(onIssues && (() => onIssues(context)))
		}

		if (!isCurrent()) return
		flushQueuedAutoSubmit()
	}

	const resetState = () => {
		// Invalidate any in-flight submission so it can't write state later
		latestSubmission++
		state = 'idle'
		// The invalidated submission can no longer flush a queued auto-submit
		autoSubmitQueued = false
	}

	return {
		handlers,
		fields,
		enhance,
		resetState,
		reset: () => {
			resetState()
			const element = attachedForm ?? remote.element
			if (element) {
				// Fires the form's reset event, which also clears validation state
				// and discards the persisted draft
				HTMLFormElement.prototype.reset.call(element)
			}
		},
		discardPersisted: () => persistence.discard(),
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
		},
		get allIssues() {
			return validation.allIssues
		},
		get allKnownIssues() {
			return validation.allKnownIssues
		},
		get formIssues() {
			return validation.formIssues
		},
		clearAllIssues: validation.clearAllIssues,
		validateAll: validation.validateAll
		// The widened implementation signature erases the delayed/timeout getters,
		// which always exist at runtime — assert the fully-equipped shape
	} as EnhancedForm<TInput, TOutput, true, true>
}
