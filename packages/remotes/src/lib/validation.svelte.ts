import type { RemoteForm, RemoteFormInput, RemoteFormIssue } from '@sveltejs/kit'

export type ValidationIssues = {
	[key: string]: string[] | null | ValidationIssues
}

type ValidationHandlers = {
	onblur: () => Promise<void>
	oninput: () => Promise<void>
}

type FieldWithIssues = {
	issues: () => RemoteFormIssue[] | undefined
}

type ValidationWaiter = {
	resolve: () => void
	reject: (error: unknown) => void
}

type PrimitiveField = string | string[] | number | boolean | File | File[]

type FieldValue<T, K extends PropertyKey> = T extends unknown
	? K extends keyof T
		? T[K]
		: never
	: never

export type ValidationField = {
	handlers: ValidationHandlers
	issues: string[] | null
	addIssues: (issues: string | string[]) => void
	clearIssues: () => void
}

export type ValidationFields<T> = [T] extends [void]
	? ValidationField
	: NonNullable<T> extends PrimitiveField
		? ValidationField
		: [NonNullable<T>] extends [Array<infer Item>]
			? ValidationField & {
					[index: number]: ValidationFields<Item>
				}
			: ValidationField & {
					[K in keyof NonNullable<T>]-?: ValidationFields<FieldValue<NonNullable<T>, K>>
				}

export type Validation<TInput extends RemoteFormInput | void = RemoteFormInput> = {
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
	const allFieldPaths: string[] = []

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
	function getNestedValue(path: string[]): string[] | null {
		const keys = [...path]
		let current: string[] | null | ValidationIssues | undefined = issues
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

	function updateFieldIssues(path: string[]) {
		setNestedValue(issues, path, issueMessages(getField(path)))
	}

	/**
	 * Registers a field path for validation tracking
	 */
	function registerPath(path: string[]) {
		const fieldPath = path.join('.')
		if (!allFieldPaths.includes(fieldPath)) {
			allFieldPaths.push(fieldPath)
		}
	}

	/**
	 * Debounced remote validation to avoid sending repeated validation requests while input is settling
	 */
	let remoteValidationTimer: ReturnType<typeof setTimeout> | null = null
	let remoteValidationWaiters: ValidationWaiter[] = []

	function remoteValidate() {
		if (remoteValidationTimer) {
			clearTimeout(remoteValidationTimer)
		}

		const validation = new Promise<void>((resolve, reject) => {
			remoteValidationWaiters.push({ resolve, reject })
		})

		remoteValidationTimer = setTimeout(async () => {
			remoteValidationTimer = null

			const waiters = remoteValidationWaiters
			remoteValidationWaiters = []

			try {
				await form.validate()
				waiters.forEach(({ resolve }) => resolve())
			} catch (error) {
				waiters.forEach(({ reject }) => reject(error))
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
			updateFieldIssues(path.split('.'))
		}
	}

	/**
	 * Updates issues for all registered fields
	 */
	async function updateIssues() {
		for (const path of allFieldPaths) {
			updateFieldIssues(path.split('.'))
		}
	}

	/**
	 * Resets all validation issues
	 */
	function clearAllIssues() {
		issues = {}
	}

	/**
	 * Adds a custom validation issue to a field
	 * @param path - The path to the field (e.g., ['name'] or ['address', 'state'])
	 * @param issue - The validation error message to add
	 */
	function addIssues(path: string[], issuesToAdd: string | string[]) {
		const existingIssues = getNestedValue(path)
		const newIssues = Array.isArray(issuesToAdd) ? issuesToAdd : [issuesToAdd]
		setNestedValue(issues, path, existingIssues ? [...existingIssues, ...newIssues] : newIssues)
	}

	function clearIssues(path: string[]) {
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
				// await form.validate()
				await remoteValidate()

				const iss = issueMessages(field)
				setNestedValue(issues, path, iss)

				// If preflight didn't find issues, check against server
				if (!iss) {
					await form.validate({ includeUntouched: true })
					const iss = issueMessages(field)
					setNestedValue(issues, path, iss)
				}
			},
			oninput: async () => {
				const fieldIssues = getNestedValue(path)

				if (fieldIssues && fieldIssues.length > 0) {
					await form.validate({ preflightOnly: true })

					let iss = issueMessages(field)

					if (iss) {
						// await form.validate()
						await remoteValidate()
						iss = issueMessages(field)
					}

					setNestedValue(issues, path, iss)
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

					if (property === 'addIssues') {
						return (issues: string | string[]) => addIssues(path, issues)
					}

					if (property === 'clearIssues') {
						return () => clearIssues(path)
					}

					return createFieldProxy([...path, property])
				}
			}
		) as ValidationField
	}

	const fields = createFieldProxy([]) as ValidationFields<TInput>

	return {
		fields,
		get allIssues() {
			return issues
		},
		validateAll,
		clearAllIssues,
		updateIssues
	}
}
