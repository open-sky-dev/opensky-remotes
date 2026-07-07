import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig, type Plugin } from 'vite'
import { readFileSync } from 'node:fs'

const VIRTUAL_PREFIX = '\0raw-source:'
const VIRTUAL_SUFFIX = ':src'

/**
 * `?raw` can't be used on `.remote.ts` files — kit's remote transform matches
 * them by filename and rejects the raw module's default export. This serves
 * their source under `?raw-source` through a virtual id kit never matches.
 */
function rawRemoteSource(): Plugin {
	return {
		name: 'raw-remote-source',
		enforce: 'pre',
		async resolveId(source, importer) {
			if (!source.endsWith('?raw-source')) {
				return
			}

			const resolved = await this.resolve(source.slice(0, -'?raw-source'.length), importer, {
				skipSelf: true
			})
			if (resolved) {
				return `${VIRTUAL_PREFIX}${resolved.id}${VIRTUAL_SUFFIX}`
			}
		},
		load(id) {
			if (id.startsWith(VIRTUAL_PREFIX)) {
				const path = id.slice(VIRTUAL_PREFIX.length, -VIRTUAL_SUFFIX.length)
				// The virtual id hides the real path from rollup — watch it explicitly
				// so edits invalidate the module in dev
				this.addWatchFile(path)
				return `export default ${JSON.stringify(readFileSync(path, 'utf-8'))}`
			}
		}
	}
}

export default defineConfig({
	plugins: [rawRemoteSource(), sveltekit()],
	// @opensky/remotes is linked from ../../packages/remotes — don't serve a prebundled copy
	optimizeDeps: {
		exclude: ['@opensky/remotes']
	}
})
