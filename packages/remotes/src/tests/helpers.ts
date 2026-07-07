import type { RemoteForm, RemoteFormEnhanceInstance, RemoteFormInput } from '@sveltejs/kit'
import { vi } from 'vitest'

export function deferred<T>() {
	let resolve!: (value: T) => void
	let reject!: (error: unknown) => void
	const promise = new Promise<T>((res, rej) => {
		resolve = res
		reject = rej
	})
	return { promise, resolve, reject }
}

/**
 * A kit field as the validation core sees it: `issues()` and `value()`
 */
export function makeKitField(
	value: () => unknown,
	issues: () => Array<{ message: string }> = () => []
) {
	return {
		issues: () => {
			const list = issues()
			return list.length > 0 ? list : undefined
		},
		value,
		set: vi.fn()
	}
}

type MockRemoteOptions = {
	action?: string
	element?: HTMLFormElement | null
	fields?: Record<string, unknown>
}

/**
 * The slice of a RemoteForm that enhancedForm and the validation core touch:
 * `action`, `element`, `validate()`, and the `fields` tree
 */
export function makeRemote(options: MockRemoteOptions = {}) {
	const remote = {
		action: options.action ?? '?/remote=abc123%2FtestForm',
		element: options.element ?? null,
		validate: vi.fn(async () => {}),
		fields: options.fields ?? {}
	}
	return remote as typeof remote & RemoteForm<RemoteFormInput, unknown>
}

type MockInstanceOptions = {
	element: HTMLFormElement
	/** Resolves the submission's validity; reject to simulate a submission error */
	submit: () => Promise<boolean>
	result?: unknown
}

/**
 * The slice of a RemoteFormEnhanceInstance that enhance() touches:
 * `element`, `submit()`, and `result`
 */
export function makeInstance(options: MockInstanceOptions) {
	const instance = {
		element: options.element,
		submit: () => {
			const submission = options.submit() as Promise<boolean> & {
				updates: (...args: unknown[]) => Promise<boolean>
			}
			submission.updates = () => submission
			return submission
		},
		result: options.result,
		fields: {}
	}
	return instance as typeof instance & RemoteFormEnhanceInstance<RemoteFormInput, unknown>
}

/**
 * Pulls the attachment function out of a symbol-keyed spread (form.handlers
 * or a field's persist spread) so tests can attach it to an element manually
 */
export function getAttachment(spread: object): (node: Element) => void | (() => void) {
	const symbols = Object.getOwnPropertySymbols(spread)
	if (symbols.length !== 1) {
		throw new Error(`Expected exactly one attachment symbol, found ${symbols.length}`)
	}
	return (spread as Record<symbol, (node: Element) => void | (() => void)>)[symbols[0]]
}

/**
 * A form element with a named text input, attached to the document
 */
export function makeForm(inputs: Record<string, string> = { a: 'initial' }) {
	const form = document.createElement('form')

	for (const [name, value] of Object.entries(inputs)) {
		const input = document.createElement('input')
		input.name = name
		input.value = value
		form.appendChild(input)
	}

	document.body.appendChild(form)
	return form
}
