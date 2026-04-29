import type { RemoteForm, RemoteFormIssue } from '@sveltejs/kit'

type ValidationIssues = {
	[key: string]: string[] | null | ValidationIssues
}

type FieldWithIssues = {
	issues: () => RemoteFormIssue[] | undefined
}

type ValidationWaiter = {
	resolve: () => void
	reject: (error: unknown) => void
}

/**
 * Creates a validation helper for a form with reactive state management
 * @param form - The RemoteForm object from createRemote
 * @returns An object with methods to validate and access validation issues
 */
export function createValidation(form: RemoteForm<any, any>) {
	let issues = $state<ValidationIssues>({})
	const allFieldPaths = $state.raw<string[]>([])

	/**
	 * Sets a nested value in the issues object using a dot-notation path
	 */
	function setNestedValue(obj: ValidationIssues, path: string, value: string[] | null) {
		const keys = path.split('.')

		if (keys.length === 1) {
			obj[path] = value
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
	 * Gets a nested value from the issues object using a dot-notation path
	 */
	function getNestedValue(path: string): string[] | null {
		const keys = path.split('.')
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
	 * Gets the field object from the form using a dot-notation path
	 */
	function getField(path: string): FieldWithIssues {
		const keys = path.split('.')
		return keys.reduce((current, key) => current?.[key], form.fields)
	}

	function issueMessages(field: FieldWithIssues): string[] | null {
		const messages = field.issues()?.map((issue) => issue.message)
		return messages && messages.length > 0 ? messages : null
	}

	function updateFieldIssues(path: string) {
		setNestedValue(issues, path, issueMessages(getField(path)))
	}

	/**
	 * Registers a field path for validation tracking
	 */
	function registerPath(path: string) {
		if (!allFieldPaths.includes(path)) {
			allFieldPaths.push(path)
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
			updateFieldIssues(path)
		}
	}

	/**
	 * Updates issues for all registered fields
	 */
	async function updateIssues() {
		for (const path of allFieldPaths) {
			updateFieldIssues(path)
		}
	}

	/**
	 * Resets all validation issues
	 */
	function reset() {
		issues = {}
	}

	/**
	 * Adds a custom validation issue to a field
	 * @param path - The dot-notation path to the field (e.g., 'name' or 'address.state')
	 * @param issue - The validation error message to add
	 */
	function addIssue(path: string, issue: string) {
		const existingIssues = getNestedValue(path)
		if (existingIssues) {
			setNestedValue(issues, path, [...existingIssues, issue])
		} else {
			setNestedValue(issues, path, [issue])
		}
	}

	/**
	 * Returns reactive field bindings and event handlers for a field path
	 * @param path - The dot-notation path to the field (e.g., 'name' or 'address.state')
	 */
	function fields(path: string) {
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

	/**
	 * Returns the current issues for a field path
	 * @param path - The dot-notation path to the field
	 */
	function getIssues(path: string): string[] | null {
		return getNestedValue(path)
	}

	/**
	 * Returns all current validation issues
	 */
	function getAllIssues(): ValidationIssues {
		return issues
	}

	return {
		fields,
		issues: getIssues,
		allIssues: getAllIssues,
		validateAll,
		reset,
		updateIssues,
		addIssue
	}
}
