import { highlight } from '$lib/server/highlight'
import { snippets } from './snippets'

export const load = async () => {
	const highlighted = await Promise.all(
		Object.entries(snippets).map(async ([key, { code, lang }]) => {
			return [key, { code: code.trim(), html: await highlight(code, lang) }] as const
		})
	)

	return { snippets: Object.fromEntries(highlighted) }
}
