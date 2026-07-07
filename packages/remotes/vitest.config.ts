import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	// The plain svelte plugin (not sveltekit()) compiles the runes in the
	// .svelte.ts source modules; the tests themselves are plain TypeScript
	plugins: [
		svelte({
			preprocess: vitePreprocess()
		})
	],
	resolve: {
		// Svelte's client runtime — the tests run in a DOM, not on a server
		conditions: ['browser']
	},
	test: {
		environment: 'jsdom',
		include: ['src/tests/**/*.test.ts'],
		setupFiles: ['src/tests/setup.ts']
	}
})
