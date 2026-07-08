import { highlight } from '$lib/server/highlight'
import { snippets } from './snippets'

export const load = async () => {
	const highlighted = await Promise.all(
		Object.entries(snippets).map(async ([key, { code, lang, added }]) => {
			return [key, { code: code.trim(), html: await highlight(code, lang, added) }] as const
		})
	)

	return { snippets: Object.fromEntries(highlighted) }
}
