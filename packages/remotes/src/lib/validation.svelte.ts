import type { RemoteForm, RemoteFormInput, RemoteFormIssue } from '@sveltejs/kit'

export type ValidationIssues = {
	[key: string]: string[] | null | ValidationIssues
}

type ValidationHandlers = {
	onblur: () => Promise<void>
	oninput: () => Promise<void>
}

type ValidationFormHandler = {
	onsubmitcapture: () => Promise<void>
	onreset: () => void
}

type FieldWithIssues = {
	issues: () => RemoteFormIssue[] | undefined
	value: () => unknown
}

type ValidationWaiter = {
	resolve: () => void
	reject: (error: unknown) => void
	isCurrent: () => boolean
	onStart: () => void
	onEnd: () => void
}

type PrimitiveField = string | string[] | number | boolean | File | File[]
type ValidatorResult = string | string[] | null | undefined | void

type FieldValidatorContext<TValue> = {
	/** The field's current value — undefined when the field is empty or untouched */
	value: TValue | undefined
	issue: (issues: string | string[]) => string[]
}

export type FieldValidator<TValue = unknown> = (
	context: FieldValidatorContext<TValue>
) => ValidatorResult | Promise<ValidatorResult>

type FieldValue<T, K extends PropertyKey> = T extends unknown
	? K extends keyof T
		? T[K]
		: never
	: never

export type ValidationField<TValue = unknown> = {
	handlers: ValidationHandlers
	issues: string[] | null
	pending: boolean
	addIssues: (issues: string | string[]) => void
	removeIssue: (issue: string) => void
	clearIssues: () => void
	addValidator: (validator: FieldValidator<TValue>) => () => void
}

export type ValidationFields<T> = [T] extends [void]
	? ValidationField
	: NonNullable<T> extends PrimitiveField
		? ValidationField<NonNullable<T>>
		: [NonNullable<T>] extends [Array<infer Item>]
			? ValidationField<NonNullable<T>> & {
					[index: number]: ValidationFields<Item>
				}
			: ValidationField<NonNullable<T>> & {
					[K in keyof NonNullable<T>]-?: ValidationFields<FieldValue<NonNullable<T>, K>>
				}

export type Validation<TInput extends RemoteFormInput | void = RemoteFormInput> = {
	formHandler: ValidationFormHandler
	fields: ValidationFields<TInput>
	allIssues: ValidationIssues
	allKnownIssues: ValidationIssues
	formIssues: string[] | null
	clearAllIssues: () => void
	validateAll: () => Promise<void>
	updateIssues: () => Promise<void>
}

/**
 * Creates a validation helper for a form with reactive state management
 * @param form - The RemoteForm object from createRemote
 * @returns An object with methods to validate and access validation issues
 */
export function createValidation<TInput extends RemoteFormInput | void, TOutput>(
	form: RemoteForm<TInput, TOutput>
): Validation<TInput> {
	// Issue stores: one flat record per layer, keyed by the dot-joined field path.
	// A field's displayed issues are merged from the layers on read, and the
	// allIssues tree is derived — the layers are the only sources of truth.
	let validationIssues = $state<Record<string, string[] | null>>({})
	let customIssues = $state<Record<string, string[] | null>>({})
	let validatorIssues = $state<Record<string, Record<number, string[] | null>>>({})

	const pendingFields = $state<Record<string, number>>({})
	const fieldVersions: Record<string, number> = {}
	const fieldValidators: Record<
		string,
		Array<{ id: number; validator: FieldValidator<unknown> }>
	> = {}
	let nextValidatorId = 0
	// This is internal bookkeeping, not reactive UI state.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const allFieldPaths = new Set<string>()
	// Fields become dirty from user input, not focus/blur alone.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const dirtyFieldPaths = new Set<string>()

	function fieldKey(path: string[]) {
		return path.join('.')
	}

	function keyToPath(key: string) {
		return key === '' ? [] : key.split('.')
	}

	function toIssues(issues: string | string[]): string[] {
		return Array.isArray(issues) ? issues : [issues]
	}

	function mergeIssues(...issueLists: Array<string[] | null | undefined>): string[] | null {
		const nextIssues: string[] = []

		for (const issues of issueLists) {
			for (const issue of issues ?? []) {
				if (!nextIssues.includes(issue)) {
					nextIssues.push(issue)
				}
			}
		}

		return nextIssues.length > 0 ? nextIssues : null
	}

	/**
	 * A field's displayed issues: all layers merged, deduplicated by message
	 */
	function issuesFor(path: string[]): string[] | null {
		const key = fieldKey(path)
		return mergeIssues(
			validationIssues[key],
			customIssues[key],
			...Object.values(validatorIssues[key] ?? {})
		)
	}

	const issueTree = $derived.by(() => {
		const tree: ValidationIssues = {}
		// Local to this computation — reactivity comes from reading the stores below.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const keys = new Set([
			...Object.keys(validationIssues),
			...Object.keys(customIssues),
			...Object.keys(validatorIssues)
		])

		for (const key of keys) {
			const merged = issuesFor(keyToPath(key))
			if (merged) {
				setTreeValue(tree, keyToPath(key), merged)
			}
		}

		return tree
	})

	/**
	 * Debugging view: every issue currently known, whether displayed or not —
	 * everything kit holds right now (including unregistered and untouched fields)
	 * merged with the custom and validator layers
	 */
	const knownIssueTree = $derived.by(() => {
		// The conditional root fields type can't be resolved for a generic input,
		// but allIssues() exists on every shape of it
		const rootFields = form.fields as unknown as { allIssues: () => RemoteFormIssue[] | undefined }
		const kitIssues: Record<string, string[]> = {}

		for (const issue of rootFields.allIssues() ?? []) {
			;(kitIssues[issue.path.join('.')] ??= []).push(issue.message)
		}

		const tree: ValidationIssues = {}
		// Local to this computation — reactivity comes from reading the stores above.
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const keys = new Set([
			...Object.keys(kitIssues),
			...Object.keys(validationIssues),
			...Object.keys(customIssues),
			...Object.keys(validatorIssues)
		])

		for (const key of keys) {
			const merged = mergeIssues(kitIssues[key], issuesFor(keyToPath(key)))
			if (merged) {
				setTreeValue(tree, keyToPath(key), merged)
			}
		}

		return tree
	})

	function setTreeValue(tree: ValidationIssues, path: string[], value: string[]) {
		if (path.length === 0) {
			// Form-level issues live under the root key
			tree[''] = value
			return
		}

		let current = tree
		for (const key of path.slice(0, -1)) {
			if (!current[key] || Array.isArray(current[key])) {
				current[key] = {}
			}
			current = current[key] as ValidationIssues
		}
		current[path[path.length - 1]] = value
	}

	/**
	 * Gets the field object from the form using a field path
	 */
	function getField(path: string[]): FieldWithIssues | undefined {
		let current: unknown = form.fields

		for (const key of path) {
			if (!current || (typeof current !== 'object' && typeof current !== 'function')) {
				return undefined
			}

			current = (current as Record<string, unknown>)[key]
		}

		return isFieldWithIssues(current) ? current : undefined
	}

	function isFieldWithIssues(value: unknown): value is FieldWithIssues {
		return (
			!!value &&
			(typeof value === 'object' || typeof value === 'function') &&
			typeof (value as FieldWithIssues).issues === 'function'
		)
	}

	function issueMessages(field: FieldWithIssues | undefined): string[] | null {
		const messages = field?.issues()?.map((issue) => issue.message)
		return messages && messages.length > 0 ? messages : null
	}

	/**
	 * Mirrors kit's current issues for a field into the validation layer
	 */
	function updateFieldIssues(path: string[]) {
		validationIssues[fieldKey(path)] = issueMessages(getField(path))
	}

	function fieldValue(path: string[]) {
		return getField(path)?.value()
	}

	function beginFieldValidation(path: string[]) {
		const key = fieldKey(path)
		const version = (fieldVersions[key] ?? 0) + 1
		fieldVersions[key] = version
		let started = false

		return {
			isCurrent: () => fieldVersions[key] === version,
			start: () => {
				if (fieldVersions[key] !== version) {
					return
				}

				started = true
				pendingFields[key] = (pendingFields[key] ?? 0) + 1
			},
			end: () => {
				if (!started) {
					return
				}

				started = false
				pendingFields[key] = Math.max((pendingFields[key] ?? 1) - 1, 0)
			}
		}
	}

	async function withPending(
		token: ReturnType<typeof beginFieldValidation>,
		task: () => Promise<void> | void
	) {
		if (!token.isCurrent()) {
			return
		}

		token.start()

		try {
			await task()
		} finally {
			token.end()
		}
	}

	function isPending(path: string[]) {
		return (pendingFields[fieldKey(path)] ?? 0) > 0
	}

	function setValidatorIssues(path: string[], id: number, nextIssues: string[] | null) {
		const key = fieldKey(path)

		// Ignore results from validators that were removed while running
		if (!fieldValidators[key]?.some((entry) => entry.id === id)) {
			return
		}

		;(validatorIssues[key] ??= {})[id] = nextIssues
	}

	async function runFieldValidators(
		path: string[],
		token: ReturnType<typeof beginFieldValidation>,
		options: { allowNewIssues: boolean }
	) {
		const validators = fieldValidators[fieldKey(path)] ?? []

		if (validators.length === 0) {
			return
		}

		await withPending(token, async () => {
			for (const { id, validator } of validators) {
				const result = await validator({ value: fieldValue(path), issue: toIssues })

				if (!token.isCurrent()) {
					return
				}

				const nextIssues = result ? toIssues(result) : null
				if (!nextIssues || options.allowNewIssues) {
					setValidatorIssues(path, id, nextIssues)
				}
			}
		})
	}

	function addValidator<TValue>(path: string[], validator: FieldValidator<TValue>) {
		registerPath(path)

		const key = fieldKey(path)
		const id = nextValidatorId++
		fieldValidators[key] ??= []
		fieldValidators[key].push({ id, validator: validator as FieldValidator<unknown> })

		return () => {
			fieldValidators[key] = (fieldValidators[key] ?? []).filter((entry) => entry.id !== id)

			const issuesByValidator = validatorIssues[key]
			if (issuesByValidator) {
				delete issuesByValidator[id]
				if (Object.keys(issuesByValidator).length === 0) {
					delete validatorIssues[key]
				}
			}
		}
	}

	/**
	 * Registers a field path for validation tracking
	 */
	function registerPath(path: string[]) {
		allFieldPaths.add(fieldKey(path))
	}

	function markDirty(path: string[]) {
		dirtyFieldPaths.add(fieldKey(path))
	}

	function isDirty(path: string[]) {
		return dirtyFieldPaths.has(fieldKey(path))
	}

	/**
	 * Debounced remote validation to avoid sending repeated validation requests while input is settling
	 */
	let remoteValidationTimer: ReturnType<typeof setTimeout> | null = null
	let remoteValidationWaiters: ValidationWaiter[] = []

	function remoteValidate(token: ReturnType<typeof beginFieldValidation>) {
		if (remoteValidationTimer) {
			clearTimeout(remoteValidationTimer)
		}

		const validation = new Promise<void>((resolve, reject) => {
			remoteValidationWaiters.push({
				resolve,
				reject,
				isCurrent: token.isCurrent,
				onStart: token.start,
				onEnd: token.end
			})
		})

		remoteValidationTimer = setTimeout(async () => {
			remoteValidationTimer = null

			const waiters = remoteValidationWaiters
			remoteValidationWaiters = []
			const currentWaiters = waiters.filter(({ isCurrent }) => isCurrent())

			if (currentWaiters.length === 0) {
				waiters.forEach(({ resolve }) => resolve())
				return
			}

			try {
				currentWaiters.forEach(({ onStart }) => onStart())
				await form.validate()
				waiters.forEach(({ resolve }) => resolve())
			} catch (error) {
				waiters.forEach(({ reject }) => reject(error))
			} finally {
				currentWaiters.forEach(({ onEnd }) => onEnd())
			}
		}, 280)

		return validation
	}

	/**
	 * Mirrors kit's current issues for a field and runs its validators
	 */
	async function refreshField(
		path: string[],
		token: ReturnType<typeof beginFieldValidation>,
		options: { allowNewIssues: boolean }
	) {
		updateFieldIssues(path)
		await runFieldValidators(path, token, options)
	}

	/**
	 * Updates issues for all registered fields from the form's current state
	 * (mirrors kit's issues and runs field validators — no validation request)
	 */
	async function updateIssues() {
		// Form-level (pathless) issues are always mirrored so formIssues stays populated
		updateFieldIssues([])

		await Promise.all(
			Array.from(allFieldPaths, async (key) => {
				const path = keyToPath(key)
				await refreshField(path, beginFieldValidation(path), { allowNewIssues: true })
			})
		)
	}

	/**
	 * Validates all registered fields (preflight and server), then updates issues
	 */
	async function validateAll() {
		await form.validate({ includeUntouched: true, preflightOnly: false })
		await updateIssues()
	}

	/**
	 * Shows blocking issues on submit attempts. SvelteKit blocks submissions on
	 * preflight failure alone (before the enhance callback runs), so preflight-only
	 * validation covers every blocking case without a server request — issues from
	 * the server arrive with the submission response instead.
	 */
	async function validateSubmitAttempt() {
		try {
			await form.validate({ includeUntouched: true, preflightOnly: true })
			await updateIssues()
		} catch {
			// Validation failed to run — keep the currently displayed issues
		}
	}

	/**
	 * Resets all validation issues and dirty tracking
	 */
	function clearAllIssues() {
		// Invalidate in-flight validations so they can't write stale issues back
		for (const key of Object.keys(fieldVersions)) {
			fieldVersions[key]++
		}

		validationIssues = {}
		customIssues = {}
		validatorIssues = {}
		dirtyFieldPaths.clear()
	}

	/**
	 * Adds a custom validation issue to a field
	 * @param path - The path to the field (e.g., ['name'] or ['address', 'state'])
	 * @param issuesToAdd - The validation error message(s) to add
	 */
	function addIssues(path: string[], issuesToAdd: string | string[]) {
		const key = fieldKey(path)
		const existingIssues = customIssues[key] ?? []
		const nextIssues = [...existingIssues]

		for (const issue of toIssues(issuesToAdd)) {
			if (!nextIssues.includes(issue)) {
				nextIssues.push(issue)
			}
		}

		if (nextIssues.length !== existingIssues.length) {
			customIssues[key] = nextIssues
		}
	}

	function removeIssue(path: string[], issueToRemove: string) {
		const key = fieldKey(path)
		const existingIssues = customIssues[key]

		if (!existingIssues?.includes(issueToRemove)) {
			return
		}

		const remainingIssues = existingIssues.filter((issue) => issue !== issueToRemove)
		if (remainingIssues.length > 0) {
			customIssues[key] = remainingIssues
		} else {
			delete customIssues[key]
		}
	}

	/**
	 * Clears all issue layers for a field and any fields nested under it
	 */
	function clearIssues(path: string[]) {
		const key = fieldKey(path)
		const matches = (candidate: string) =>
			key === '' || candidate === key || candidate.startsWith(key + '.')

		for (const store of [validationIssues, customIssues, validatorIssues]) {
			for (const candidate of Object.keys(store)) {
				if (matches(candidate)) {
					delete store[candidate]
				}
			}
		}
	}

	/**
	 * Returns reactive field bindings and event handlers for a field path
	 * @param path - The path to the field (e.g., ['name'] or ['address', 'state'])
	 */
	function handlers(path: string[]): ValidationHandlers {
		registerPath(path)
		const field = getField(path)

		return {
			onblur: async () => {
				if (!isDirty(path)) {
					return
				}

				const token = beginFieldValidation(path)

				try {
					// Debounced; runs preflight and, if that passes, server validation
					await remoteValidate(token)

					if (!token.isCurrent()) {
						return
					}

					await refreshField(path, token, { allowNewIssues: true })
				} catch {
					// Validation failed to run — keep the currently displayed issues
				}
			},
			oninput: async () => {
				markDirty(path)

				if (!issuesFor(path)) {
					return
				}

				const token = beginFieldValidation(path)

				try {
					await withPending(token, () => form.validate({ preflightOnly: true }))

					if (!token.isCurrent()) {
						return
					}

					if (issueMessages(field)) {
						await remoteValidate(token)

						if (!token.isCurrent()) {
							return
						}
					}

					updateFieldIssues(path)
					await runFieldValidators(path, token, { allowNewIssues: false })
				} catch {
					// Validation failed to run — keep the currently displayed issues
				}
			}
		}
	}

	function createFieldProxy(path: string[]): ValidationField {
		return new Proxy(
			{},
			{
				get(_, property) {
					if (typeof property === 'symbol') {
						return undefined
					}

					if (property === 'handlers') {
						return handlers(path)
					}

					if (property === 'issues') {
						registerPath(path)
						return issuesFor(path)
					}

					if (property === 'pending') {
						registerPath(path)
						return isPending(path)
					}

					if (property === 'addIssues') {
						return (issues: string | string[]) => addIssues(path, issues)
					}

					if (property === 'removeIssue') {
						return (issue: string) => removeIssue(path, issue)
					}

					if (property === 'clearIssues') {
						return () => clearIssues(path)
					}

					if (property === 'addValidator') {
						return (validator: FieldValidator<unknown>) => addValidator(path, validator)
					}

					return createFieldProxy([...path, property])
				}
			}
		) as ValidationField
	}

	const fields = createFieldProxy([]) as ValidationFields<TInput>
	const formHandler: ValidationFormHandler = {
		onsubmitcapture: validateSubmitAttempt,
		// Kit clears its issues and touched state on form reset; clear ours too
		onreset: clearAllIssues
	}

	return {
		formHandler,
		fields,
		get allIssues() {
			return issueTree
		},
		get allKnownIssues() {
			return knownIssueTree
		},
		get formIssues() {
			return issuesFor([])
		},
		validateAll,
		clearAllIssues,
		updateIssues
	}
}
