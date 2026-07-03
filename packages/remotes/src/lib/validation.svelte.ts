import type { RemoteForm, RemoteFormInput, RemoteFormIssue } from '@sveltejs/kit'
import { untrack } from 'svelte'

export type ValidationIssues = {
	[key: string]: string[] | null | ValidationIssues
}

type ValidationHandlers = {
	onblur: () => Promise<void>
	oninput: () => Promise<void>
}

type ValidationFormHandler = {
	onsubmitcapture: () => Promise<void>
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
	value: TValue
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
) {
	let issues = $state<ValidationIssues>({})
	let validationIssues = $state<ValidationIssues>({})
	let customIssues = $state<ValidationIssues>({})
	const validatorIssues = $state<Record<string, Record<number, string[] | null>>>({})
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

	/**
	 * Sets a nested value in the issues object using a field path
	 */
	function setNestedValue(obj: ValidationIssues, path: string[], value: string[] | null) {
		const keys = [...path]

		if (keys.length === 1) {
			obj[keys[0]] = value
			return
		}

		const lastKey = keys.pop()!
		let current = obj
		for (const key of keys) {
			if (!current[key] || typeof current[key] !== 'object' || Array.isArray(current[key])) {
				current[key] = {}
			}
			current = current[key] as ValidationIssues
		}

		current[lastKey] = value
	}

	/**
	 * Gets a nested value from the issues object using a field path
	 */
	function getNestedValue(path: string[], obj = issues): string[] | null {
		const keys = [...path]
		let current: string[] | null | ValidationIssues | undefined = obj
		for (const key of keys) {
			if (current && typeof current === 'object' && !Array.isArray(current)) {
				current = current[key]
			} else {
				current = undefined
			}
		}

		if (current && Array.isArray(current) && current.length > 0) {
			return current
		}
		return null
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

	function customIssuesFor(path: string[]) {
		return untrack(() => getNestedValue(path, customIssues))
	}

	function validationIssuesFor(path: string[]) {
		return untrack(() => getNestedValue(path, validationIssues))
	}

	function validatorIssuesFor(path: string[]) {
		const issuesByValidator = validatorIssues[fieldKey(path)]
		return mergeIssues(...Object.values(issuesByValidator ?? {}))
	}

	function combinedIssuesFor(path: string[]) {
		return mergeIssues(validationIssuesFor(path), customIssuesFor(path), validatorIssuesFor(path))
	}

	function setFieldIssues(path: string[], nextValidationIssues: string[] | null) {
		setNestedValue(validationIssues, path, nextValidationIssues)
		setNestedValue(issues, path, combinedIssuesFor(path))
	}

	function updateFieldIssues(path: string[]) {
		setFieldIssues(path, issueMessages(getField(path)))
	}

	function fieldValue(path: string[]) {
		return getField(path)?.value()
	}

	function fieldKey(path: string[]) {
		return path.join('.')
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

	function normalizeValidatorResult(result: ValidatorResult): string[] | null {
		if (!result) {
			return null
		}

		return Array.isArray(result) ? result : [result]
	}

	function issue(issues: string | string[]) {
		return Array.isArray(issues) ? issues : [issues]
	}

	function setValidatorIssues(path: string[], id: number, nextIssues: string[] | null) {
		const key = fieldKey(path)
		validatorIssues[key] ??= {}
		validatorIssues[key][id] = nextIssues
		setNestedValue(issues, path, combinedIssuesFor(path))
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
				const result = await validator({ value: fieldValue(path), issue })

				if (!token.isCurrent()) {
					return
				}

				const nextIssues = normalizeValidatorResult(result)
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
			setValidatorIssues(path, id, null)
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
	 * Validates all registered fields
	 */
	async function validateAll() {
		await form.validate({ includeUntouched: true, preflightOnly: false })

		for (const path of allFieldPaths) {
			const fieldPath = path.split('.')
			const token = beginFieldValidation(fieldPath)
			updateFieldIssues(fieldPath)
			await runFieldValidators(fieldPath, token, { allowNewIssues: true })
		}
	}

	/**
	 * Updates issues for all registered fields
	 */
	async function updateIssues() {
		for (const path of allFieldPaths) {
			const fieldPath = path.split('.')
			const token = beginFieldValidation(fieldPath)
			updateFieldIssues(fieldPath)
			await runFieldValidators(fieldPath, token, { allowNewIssues: true })
		}
	}

	/**
	 * Resets all validation issues
	 */
	function clearAllIssues() {
		issues = {}
		validationIssues = {}
		customIssues = {}
		for (const key of Object.keys(validatorIssues)) {
			delete validatorIssues[key]
		}
		dirtyFieldPaths.clear()
	}

	/**
	 * Adds a custom validation issue to a field
	 * @param path - The path to the field (e.g., ['name'] or ['address', 'state'])
	 * @param issue - The validation error message to add
	 */
	function addIssues(path: string[], issuesToAdd: string | string[]) {
		const existingIssues = customIssuesFor(path)
		const newIssues = Array.isArray(issuesToAdd) ? issuesToAdd : [issuesToAdd]
		const nextIssues = [...(existingIssues ?? [])]

		for (const issue of newIssues) {
			if (!nextIssues.includes(issue)) {
				nextIssues.push(issue)
			}
		}

		if (existingIssues && existingIssues.length === nextIssues.length) {
			return
		}

		setNestedValue(customIssues, path, nextIssues)
		setNestedValue(issues, path, combinedIssuesFor(path))
	}

	function removeIssue(path: string[], issueToRemove: string) {
		const existingIssues = customIssuesFor(path)

		if (!existingIssues?.includes(issueToRemove)) {
			return
		}

		const remainingIssues = existingIssues?.filter((issue) => issue !== issueToRemove)
		const nextCustomIssues = remainingIssues && remainingIssues.length > 0 ? remainingIssues : null
		setNestedValue(customIssues, path, nextCustomIssues)
		setNestedValue(issues, path, combinedIssuesFor(path))
	}

	function clearIssues(path: string[]) {
		setNestedValue(customIssues, path, null)
		setNestedValue(validationIssues, path, null)
		delete validatorIssues[fieldKey(path)]
		setNestedValue(issues, path, null)
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

				// await form.validate()
				await remoteValidate(token)

				if (!token.isCurrent()) {
					return
				}

				const iss = issueMessages(field)
				setFieldIssues(path, iss)

				// If preflight didn't find issues, check against server
				if (!iss) {
					await withPending(token, () => form.validate({ includeUntouched: true }))

					if (!token.isCurrent()) {
						return
					}

					const iss = issueMessages(field)
					setFieldIssues(path, iss)
				}

				await runFieldValidators(path, token, { allowNewIssues: true })
			},
			oninput: async () => {
				markDirty(path)
				const fieldIssues = getNestedValue(path)

				if (fieldIssues && fieldIssues.length > 0) {
					const token = beginFieldValidation(path)

					await withPending(token, () => form.validate({ preflightOnly: true }))

					if (!token.isCurrent()) {
						return
					}

					let iss = issueMessages(field)

					if (iss) {
						// await form.validate()
						await remoteValidate(token)

						if (!token.isCurrent()) {
							return
						}

						iss = issueMessages(field)
					}

					setFieldIssues(path, iss)
					await runFieldValidators(path, token, { allowNewIssues: false })
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
						return getNestedValue(path)
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
		onsubmitcapture: validateAll
	}

	return {
		formHandler,
		fields,
		get allIssues() {
			return issues
		},
		validateAll,
		clearAllIssues,
		updateIssues
	}
}
