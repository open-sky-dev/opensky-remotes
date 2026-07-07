/**
 * jsdom ships no web storage implementation — install a minimal in-memory one
 * covering the surface the persist module uses (getItem/setItem/removeItem/clear).
 */
function makeStorage(): Storage {
	let entries = new Map<string, string>()

	return {
		get length() {
			return entries.size
		},
		key: (index: number) => [...entries.keys()][index] ?? null,
		getItem: (key: string) => entries.get(key) ?? null,
		setItem: (key: string, value: string) => {
			entries.set(key, String(value))
		},
		removeItem: (key: string) => {
			entries.delete(key)
		},
		clear: () => {
			entries = new Map()
		}
	}
}

Object.defineProperty(window, 'localStorage', { value: makeStorage() })
Object.defineProperty(window, 'sessionStorage', { value: makeStorage() })
