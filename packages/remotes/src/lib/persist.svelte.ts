import type { Attachment } from 'svelte/attachments'
import { createAttachmentKey } from 'svelte/attachments'

/**
 * Options for draft persistence. Persistence itself is opted into per field by
 * spreading `form.fields.<path>.persist` — these only override the defaults.
 */
export type PersistOptions = {
	/** Storage key for the draft. Defaults to the remote form's action id. */
	key?: string
	/** Which web storage bucket to write drafts to (default: 'local') */
	storage?: 'local' | 'session'
	/** Discard drafts older than this many milliseconds (default: no expiry) */
	maxAgeMs?: number
}

/** The spread returned by `form.fields.<path>.persist` — a single attachment */
export type PersistSpread = Record<symbol, Attachment>

type Draft = {
	savedAt: number
	fields: Record<string, unknown>
}

type PersistCoreOptions = {
	storageKey: string
	storage: 'local' | 'session'
	maxAgeMs: number | undefined
	/** Restored drafts count as user input, not pristine state */
	markDirty: (path: string[]) => void
	/** Writes a restored value into kit's reactive field state */
	setKitField: (path: string[], value: unknown) => void
}

type PersistedElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

const WRITE_DEBOUNCE_MS = 300

function isPersistedElement(node: Element): node is PersistedElement {
	return (
		node instanceof HTMLInputElement ||
		node instanceof HTMLTextAreaElement ||
		node instanceof HTMLSelectElement
	)
}

/**
 * Kit renders a checkbox-array field (`as('checkbox', value)`) as several
 * same-named checkboxes with a `[]` name suffix; single boolean checkboxes
 * are named `b:key` instead. The group is one `string[]` field.
 */
function isGroupCheckbox(el: HTMLInputElement) {
	return el.type === 'checkbox' && el.name.endsWith('[]')
}

/**
 * The currently selected values across a checkbox group — the shape kit
 * itself uses for the field
 */
function groupValues(el: HTMLInputElement): string[] {
	const members = el.form
		? Array.from(el.form.elements).filter(
				(member): member is HTMLInputElement =>
					member instanceof HTMLInputElement &&
					member.type === 'checkbox' &&
					member.name === el.name
			)
		: [el]

	return members.filter((box) => box.checked).map((box) => box.value)
}

/**
 * Reads an element's current value in the shape we store. Returns undefined
 * for values that can't or shouldn't be captured (unchecked radios, files).
 */
function readValue(el: PersistedElement): unknown {
	if (el instanceof HTMLSelectElement) {
		return el.multiple ? Array.from(el.selectedOptions, (option) => option.value) : el.value
	}

	if (el instanceof HTMLInputElement) {
		if (el.type === 'checkbox') {
			// A value-carrying group is one string[] field — store the selected
			// values, not this element's checked flag
			return isGroupCheckbox(el) ? groupValues(el) : el.checked
		}
		if (el.type === 'radio') {
			return el.checked ? el.value : undefined
		}
		if (el.type === 'file') {
			return undefined
		}
	}

	return el.value
}

/**
 * Applies a stored value back onto an element. Kit's field state is restored
 * separately — this covers inputs whose value/checked props aren't driven by
 * a kit `as()` spread.
 */
function applyValue(el: PersistedElement, value: unknown) {
	if (el instanceof HTMLSelectElement && el.multiple) {
		const selected = Array.isArray(value) ? value.map(String) : []
		for (const option of el.options) {
			option.selected = selected.includes(option.value)
		}
		return
	}

	if (el instanceof HTMLInputElement) {
		if (el.type === 'checkbox') {
			if (isGroupCheckbox(el)) {
				el.checked = Array.isArray(value) && value.map(String).includes(el.value)
				return
			}
			el.checked = value === true
			return
		}
		if (el.type === 'radio') {
			el.checked = el.value === String(value)
			return
		}
		if (el.type === 'file') {
			return
		}
	}

	el.value = value == null ? '' : String(value)
}

/**
 * Kit encodes a field's type in the input name (`n:count` for numbers,
 * `b:agree` for booleans) so it can coerce FormData's strings back to typed
 * values. Mirror that coercion when restoring a stored string into kit's
 * field state, so validators and `fields.value()` see the right type.
 */
function coerceForKitState(el: PersistedElement, value: unknown): unknown {
	if (typeof value !== 'string') {
		return value
	}

	if (el.name.startsWith('n:')) {
		const numeric = Number(value)
		return Number.isNaN(numeric) ? value : numeric
	}

	if (el.name.startsWith('b:')) {
		return value === 'true'
	}

	return value
}

export type PersistCore = ReturnType<typeof createPersistCore>

/**
 * Internal draft persistence engine. Each opted-in field gets an attachment
 * that restores its saved value on mount and writes changes back (debounced,
 * flushed on `change`). Drafts are dropped on form reset and, by the caller,
 * on successful submission.
 */
export function createPersistCore(options: PersistCoreOptions) {
	function getStore(): Storage | null {
		// Storage can be absent (SSR) or throw (sandboxed iframes, disabled cookies)
		try {
			if (typeof window === 'undefined') {
				return null
			}
			return options.storage === 'session' ? window.sessionStorage : window.localStorage
		} catch {
			return null
		}
	}

	function readDraft(): Draft | null {
		const store = getStore()
		if (!store) {
			return null
		}

		try {
			const raw = store.getItem(options.storageKey)
			if (!raw) {
				return null
			}

			const draft = JSON.parse(raw) as Draft
			if (
				!draft ||
				typeof draft.savedAt !== 'number' ||
				typeof draft.fields !== 'object' ||
				draft.fields === null
			) {
				store.removeItem(options.storageKey)
				return null
			}

			if (options.maxAgeMs != null && Date.now() - draft.savedAt > options.maxAgeMs) {
				store.removeItem(options.storageKey)
				return null
			}

			return draft
		} catch {
			return null
		}
	}

	function writeField(key: string, value: unknown) {
		const store = getStore()
		if (!store) {
			return
		}

		const draft = readDraft() ?? { savedAt: 0, fields: {} }
		draft.fields[key] = value
		draft.savedAt = Date.now()

		try {
			store.setItem(options.storageKey, JSON.stringify(draft))
		} catch {
			// Quota exceeded or unserializable value — persistence is best-effort
		}
	}

	// Debounced writes scheduled before a discard must not fire afterwards —
	// they would resurrect the stale draft after a successful submission
	let writeGeneration = 0

	function discard() {
		writeGeneration++
		try {
			getStore()?.removeItem(options.storageKey)
		} catch {
			// Nothing to clean up if storage is unavailable
		}
	}

	// Attachment identity must be stable across template re-evaluations —
	// a fresh key per proxy read would detach and re-restore on every render.
	// This is internal bookkeeping, not reactive UI state.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const spreads = new Map<string, PersistSpread>()

	function attachment(path: string[]): PersistSpread {
		const key = path.join('.')

		const existing = spreads.get(key)
		if (existing) {
			return existing
		}

		const attach: Attachment = (node) => {
			if (!isPersistedElement(node)) {
				return
			}
			const el = node

			const draft = readDraft()
			if (draft && Object.hasOwn(draft.fields, key)) {
				const value = draft.fields[key]
				applyValue(el, value)
				options.setKitField(path, coerceForKitState(el, value))
				options.markDirty(path)
			}

			let timer: ReturnType<typeof setTimeout> | null = null

			const write = () => {
				timer = null
				const value = readValue(el)
				if (value !== undefined) {
					writeField(key, value)
				}
			}

			const onInput = () => {
				if (timer) clearTimeout(timer)
				const scheduled = writeGeneration
				timer = setTimeout(() => {
					timer = null
					// Invalidated by a discard() while pending — input after the
					// discard schedules at the new generation and still writes
					if (scheduled === writeGeneration) {
						write()
					}
				}, WRITE_DEBOUNCE_MS)
			}

			const onChange = () => {
				if (timer) clearTimeout(timer)
				write()
			}

			// A form reset discards the draft — the values it held are gone
			const formElement = el.form
			const onReset = () => {
				if (timer) clearTimeout(timer)
				timer = null
				discard()
			}

			el.addEventListener('input', onInput)
			el.addEventListener('change', onChange)
			formElement?.addEventListener('reset', onReset)

			return () => {
				if (timer) clearTimeout(timer)
				el.removeEventListener('input', onInput)
				el.removeEventListener('change', onChange)
				formElement?.removeEventListener('reset', onReset)
			}
		}

		const spread: PersistSpread = { [createAttachmentKey()]: attach }
		spreads.set(key, spread)
		return spread
	}

	return { attachment, discard }
}
