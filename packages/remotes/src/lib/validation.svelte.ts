import type { RemoteForm } from '@sveltejs/kit'
import { useDebounce } from 'runed'

type ValidationIssues = {
	[key: string]: string[] | null | ValidationIssues
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
		const fieldIssues = keys.reduce((current, key) => current?.[key], issues)

		if (fieldIssues && Array.isArray(fieldIssues) && fieldIssues.length > 0) {
			return fieldIssues
		}
		return null
	}

	/**
	 * Gets the field object from the form using a dot-notation path
	 */
	function getField(path: string) {
		const keys = path.split('.')
		return keys.reduce((current, key) => current?.[key], form.fields)
	}

	/**
	 * Registers a field path for validation tracking
	 */
	function registerPath(path: string) {
		if (!allFieldPaths.includes(path)) {
			allFieldPaths.push(path)
		}
	}

	let debounceDuration = $state(500)
	const remoteValidate = useDebounce(
		async () => {
			await form.validate()
		},
		() => debounceDuration
	)

	/**
	 * Validates all registered fields
	 */
	async function validateAll() {
		await form.validate({ includeUntouched: true, preflightOnly: false })

		for (const path of allFieldPaths) {
			const field = getField(path)
			const iss = field.issues()?.map((i: any) => i.message) || null
			setNestedValue(issues, path, iss)
		}
	}

	/**
	 * Updates issues for all registered fields
	 */
	async function updateIssues() {
		for (const path of allFieldPaths) {
			const field = getField(path)
			const iss = field.issues()?.map((i: any) => i.message) || null
			setNestedValue(issues, path, iss)
		}
	}

	/**
	 * Resets all validation issues
	 */
	function reset() {
		issues = {}
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

				const iss = field.issues()?.map((i: any) => i.message) || null
				setNestedValue(issues, path, iss)

				// If preflight didn't find issues, check against server
				if (!iss) {
					await form.validate({ includeUntouched: true })
					const iss = field.issues()?.map((i: any) => i.message) || null
					setNestedValue(issues, path, iss)
				}
			},
			oninput: async () => {
				const fieldIssues = getNestedValue(path)

				if (fieldIssues && fieldIssues.length > 0) {
					await form.validate({ preflightOnly: true })

					let iss = field.issues()?.map((i: any) => i.message) || null

					if (iss) {
						// await form.validate()
						await remoteValidate()
						iss = field.issues()?.map((i: any) => i.message) || null
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
		updateIssues
	}
}
