import { highlightFiles } from '$lib/server/highlight'

import demoSource from './Demo.svelte?raw'
import remoteSource from './form.remote.ts?raw-source'
import schemaSource from './schema.ts?raw'

export const load = async () => {
	return {
		files: await highlightFiles([
			{ name: 'Demo.svelte', code: demoSource, lang: 'svelte' },
			{ name: 'form.remote.ts', code: remoteSource, lang: 'typescript' },
			{ name: 'schema.ts', code: schemaSource, lang: 'typescript' }
		])
	}
}
