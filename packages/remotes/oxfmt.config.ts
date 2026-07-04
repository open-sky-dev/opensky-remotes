import { defineConfig } from 'oxfmt'

export default defineConfig({
	useTabs: true,
	singleQuote: true,
	trailingComma: 'none',
	semi: false,
	printWidth: 100,
	sortPackageJson: false,
	ignorePatterns: [
		'package-lock.json',
		'pnpm-lock.yaml',
		'yarn.lock',
		'bun.lock',
		'bun.lockb',
		'/static/',
		'.svelte-kit/',
		'dist/'
	]
})
