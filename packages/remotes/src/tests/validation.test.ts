import { afterEach, describe, expect, it, vi } from 'vitest'
import { createValidationCore } from '../lib/validation.svelte'
import { makeKitField, makeRemote } from './helpers'

afterEach(() => {
	vi.useRealTimers()
})

describe('issue layers', () => {
	it('addIssues ignores duplicate messages', () => {
		const core = createValidationCore(makeRemote())

		core.addIssues(['name'], 'Too short')
		core.addIssues(['name'], ['Too short', 'Required'])

		expect(core.issuesFor(['name'])).toEqual(['Too short', 'Required'])
	})

	it('removeIssue removes by message and returns to null when empty', () => {
		const core = createValidationCore(makeRemote())

		core.addIssues(['name'], 'Too short')
		core.removeIssue(['name'], 'Too short')

		expect(core.issuesFor(['name'])).toBeNull()
	})

	it('clearIssues clears the field and everything nested under it', () => {
		const core = createValidationCore(makeRemote())

		core.addIssues(['address'], 'Bad address')
		core.addIssues(['address', 'state'], 'Bad state')
		core.addIssues(['name'], 'Too short')

		core.clearIssues(['address'])

		expect(core.issuesFor(['address'])).toBeNull()
		expect(core.issuesFor(['address', 'state'])).toBeNull()
		expect(core.issuesFor(['name'])).toEqual(['Too short'])
	})

	it('allIssues builds a nested tree with form-level issues under the root key', () => {
		const core = createValidationCore(makeRemote())

		core.addIssues(['address', 'state'], 'Bad state')
		core.addIssues([], 'Form-level problem')

		expect(core.allIssues).toEqual({
			'': ['Form-level problem'],
			address: { state: ['Bad state'] }
		})
		expect(core.formIssues).toEqual(['Form-level problem'])
	})

	it('clearAllIssues wipes every layer', () => {
		const core = createValidationCore(makeRemote())

		core.addIssues(['name'], 'Too short')
		core.addIssues([], 'Form-level problem')
		core.clearAllIssues()

		expect(core.issuesFor(['name'])).toBeNull()
		expect(core.formIssues).toBeNull()
		expect(core.allIssues).toEqual({})
	})
})

describe('field validators', () => {
	it('a validator owns its issue: shown when returned, cleared when it stops returning', async () => {
		let broken = true
		const remote = makeRemote({
			fields: { name: makeKitField(() => 'abc') }
		})
		const core = createValidationCore(remote)

		core.addValidator(['name'], ({ issue }) => (broken ? issue('Not accepted') : undefined))

		await core.updateIssues()
		expect(core.issuesFor(['name'])).toEqual(['Not accepted'])

		broken = false
		await core.updateIssues()
		expect(core.issuesFor(['name'])).toBeNull()
	})

	it('validators receive the current field value', async () => {
		const remote = makeRemote({
			fields: { name: makeKitField(() => 'current-value') }
		})
		const core = createValidationCore(remote)
		const seen: unknown[] = []

		core.addValidator(['name'], ({ value }) => {
			seen.push(value)
		})
		await core.updateIssues()

		expect(seen).toEqual(['current-value'])
	})

	it('a removed validator takes its issue with it', async () => {
		const remote = makeRemote({
			fields: { name: makeKitField(() => 'abc') }
		})
		const core = createValidationCore(remote)

		const remove = core.addValidator(['name'], ({ issue }) => issue('Always broken'))
		await core.updateIssues()
		expect(core.issuesFor(['name'])).toEqual(['Always broken'])

		remove()
		expect(core.issuesFor(['name'])).toBeNull()
	})
})

describe('validate handlers', () => {
	it('blur on a pristine field does not validate', async () => {
		const remote = makeRemote()
		const core = createValidationCore(remote)

		await core.validate(['name']).onblur()

		expect(remote.validate).not.toHaveBeenCalled()
	})

	it('blur on a dirty field runs debounced validation and mirrors kit issues', async () => {
		vi.useFakeTimers()
		const kitIssues: Array<{ message: string }> = []
		const remote = makeRemote({
			fields: {
				name: makeKitField(
					() => 'abc',
					() => kitIssues
				)
			}
		})
		const core = createValidationCore(remote)
		const handlers = core.validate(['name'])

		// Input marks the field dirty (no issues shown yet, so it returns early)
		await handlers.oninput()
		expect(core.issuesFor(['name'])).toBeNull()

		// Simulate kit reporting an issue with the validation response
		kitIssues.push({ message: 'Too short' })

		const blur = handlers.onblur()
		await vi.advanceTimersByTimeAsync(300)
		await blur

		expect(remote.validate).toHaveBeenCalled()
		expect(core.issuesFor(['name'])).toEqual(['Too short'])
	})

	it('rapid blurs share one debounced validation request', async () => {
		vi.useFakeTimers()
		const remote = makeRemote({
			fields: { name: makeKitField(() => 'abc'), email: makeKitField(() => 'a@b.c') }
		})
		const core = createValidationCore(remote)
		const name = core.validate(['name'])
		const email = core.validate(['email'])

		await name.oninput()
		await email.oninput()

		const blurs = [name.onblur(), email.onblur()]
		await vi.advanceTimersByTimeAsync(300)
		await Promise.all(blurs)

		expect(remote.validate).toHaveBeenCalledTimes(1)
	})
})
