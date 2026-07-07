import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPersistCore } from '../lib/persist.svelte'
import { getAttachment } from './helpers'

// Node exposes an experimental bare `localStorage` global that shadows
// jsdom's — go through window explicitly
const { localStorage, sessionStorage } = window

const STORAGE_KEY = 'opensky-remotes:test-form'

function makeCore(overrides: Partial<Parameters<typeof createPersistCore>[0]> = {}) {
	const markDirty = vi.fn()
	const setKitField = vi.fn()
	const core = createPersistCore({
		storageKey: STORAGE_KEY,
		storage: 'local',
		maxAgeMs: undefined,
		markDirty,
		setKitField,
		...overrides
	})
	return { core, markDirty, setKitField }
}

function writeDraft(fields: Record<string, unknown>, savedAt = Date.now()) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedAt, fields }))
}

function readDraftFields(): Record<string, unknown> | null {
	const raw = localStorage.getItem(STORAGE_KEY)
	return raw ? JSON.parse(raw).fields : null
}

function makeInput(name: string, form?: HTMLFormElement) {
	const input = document.createElement('input')
	input.name = name
	if (form) {
		form.appendChild(input)
	} else {
		document.body.appendChild(input)
	}
	return input
}

function attach(core: ReturnType<typeof makeCore>['core'], path: string[], el: Element) {
	return getAttachment(core.attachment(path))(el)
}

beforeEach(() => {
	localStorage.clear()
})

afterEach(() => {
	document.body.innerHTML = ''
	vi.useRealTimers()
})

describe('restore', () => {
	it('restores a saved draft into the element, kit state, and dirty tracking', () => {
		writeDraft({ name: 'saved value' })
		const { core, markDirty, setKitField } = makeCore()
		const input = makeInput('name')

		attach(core, ['name'], input)

		expect(input.value).toBe('saved value')
		expect(setKitField).toHaveBeenCalledWith(['name'], 'saved value')
		expect(markDirty).toHaveBeenCalledWith(['name'])
	})

	it('does nothing when no draft exists', () => {
		const { core, markDirty, setKitField } = makeCore()
		const input = makeInput('name')

		attach(core, ['name'], input)

		expect(input.value).toBe('')
		expect(setKitField).not.toHaveBeenCalled()
		expect(markDirty).not.toHaveBeenCalled()
	})

	it('only restores fields present in the draft', () => {
		writeDraft({ name: 'saved' })
		const { core, markDirty } = makeCore()
		const other = makeInput('email')

		attach(core, ['email'], other)

		expect(other.value).toBe('')
		expect(markDirty).not.toHaveBeenCalled()
	})

	it('discards an expired draft instead of restoring it', () => {
		writeDraft({ name: 'stale' }, Date.now() - 10_000)
		const { core, markDirty } = makeCore({ maxAgeMs: 5_000 })
		const input = makeInput('name')

		attach(core, ['name'], input)

		expect(input.value).toBe('')
		expect(markDirty).not.toHaveBeenCalled()
		expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
	})

	it('restores a draft that has not expired yet', () => {
		writeDraft({ name: 'fresh' }, Date.now() - 1_000)
		const { core } = makeCore({ maxAgeMs: 5_000 })
		const input = makeInput('name')

		attach(core, ['name'], input)

		expect(input.value).toBe('fresh')
	})

	it('restores checkbox state', () => {
		writeDraft({ agree: true })
		const { core, setKitField } = makeCore()
		const checkbox = makeInput('agree')
		checkbox.type = 'checkbox'

		attach(core, ['agree'], checkbox)

		expect(checkbox.checked).toBe(true)
		expect(setKitField).toHaveBeenCalledWith(['agree'], true)
	})
})

describe('saving', () => {
	it('saves the field value after input settles', async () => {
		vi.useFakeTimers()
		const { core } = makeCore()
		const input = makeInput('name')
		attach(core, ['name'], input)

		input.value = 'typed'
		input.dispatchEvent(new Event('input'))

		expect(readDraftFields()).toBeNull()
		await vi.advanceTimersByTimeAsync(300)
		expect(readDraftFields()).toEqual({ name: 'typed' })
	})

	it('flushes immediately on change', () => {
		const { core } = makeCore()
		const input = makeInput('name')
		attach(core, ['name'], input)

		input.value = 'committed'
		input.dispatchEvent(new Event('change'))

		expect(readDraftFields()).toEqual({ name: 'committed' })
	})

	it('saves checkbox state as a boolean', () => {
		const { core } = makeCore()
		const checkbox = makeInput('agree')
		checkbox.type = 'checkbox'
		attach(core, ['agree'], checkbox)

		checkbox.checked = true
		checkbox.dispatchEvent(new Event('change'))

		expect(readDraftFields()).toEqual({ agree: true })
	})

	it('multiple fields share one draft', () => {
		const { core } = makeCore()
		const name = makeInput('name')
		const email = makeInput('email')
		attach(core, ['name'], name)
		attach(core, ['email'], email)

		name.value = 'Ada'
		name.dispatchEvent(new Event('change'))
		email.value = 'ada@example.com'
		email.dispatchEvent(new Event('change'))

		expect(readDraftFields()).toEqual({ name: 'Ada', email: 'ada@example.com' })
	})

	it('uses sessionStorage when configured', () => {
		const { core } = makeCore({ storage: 'session' })
		const input = makeInput('name')
		attach(core, ['name'], input)

		input.value = 'session draft'
		input.dispatchEvent(new Event('change'))

		expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
		expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY)!).fields).toEqual({
			name: 'session draft'
		})
		sessionStorage.clear()
	})
})

describe('discarding', () => {
	it('drops the draft when the form resets', () => {
		const { core } = makeCore()
		const form = document.createElement('form')
		document.body.appendChild(form)
		const input = makeInput('name', form)
		attach(core, ['name'], input)

		input.value = 'draft'
		input.dispatchEvent(new Event('change'))
		expect(readDraftFields()).not.toBeNull()

		form.dispatchEvent(new Event('reset'))
		expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
	})

	it('discard() removes the draft', () => {
		writeDraft({ name: 'saved' })
		const { core } = makeCore()

		core.discard()

		expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
	})

	it('a detached field stops writing', async () => {
		vi.useFakeTimers()
		const { core } = makeCore()
		const input = makeInput('name')
		const cleanup = attach(core, ['name'], input)

		input.value = 'typed'
		input.dispatchEvent(new Event('input'))
		cleanup?.()

		await vi.advanceTimersByTimeAsync(300)
		expect(readDraftFields()).toBeNull()
	})
})

describe('attachment identity', () => {
	it('returns the same spread for the same field path', () => {
		const { core } = makeCore()

		// Template re-evaluations must see the same attachment, or Svelte would
		// detach and re-restore the field on every render
		expect(core.attachment(['name'])).toBe(core.attachment(['name']))
		expect(core.attachment(['name'])).not.toBe(core.attachment(['email']))
	})
})
