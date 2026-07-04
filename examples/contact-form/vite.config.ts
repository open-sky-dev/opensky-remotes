import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

export default defineConfig({
	plugins: [sveltekit()],
	// @opensky/remotes is linked from ../../packages/remotes — don't serve a prebundled copy
	optimizeDeps: {
		exclude: ['@opensky/remotes']
	}
})
