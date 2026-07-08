// The machine-readable docs served at /llms.txt, following the llms.txt
// convention: an H1 title, a one-line summary blockquote, a small link index,
// then the full written guide. Sourced from the package README so the two never
// drift — the README stays the single source of truth.
import readme from '../../../README.md?raw'

// Drop the README's own H1 and the npm badge line; the guide starts at the
// intro paragraph. Everything after becomes the body of the guide below.
const guide = readme
	.replace(/^#\s+@opensky\/remotes\s*\n/, '')
	.replace(/^\[!\[npm\][^\n]*\n/m, '')
	.trim()

export function buildLlmsTxt(origin: string): string {
	return `# @opensky/remotes

> \`enhancedForm\` wraps a SvelteKit remote form function with the behaviors every real form ends up needing — submission state, inline validation UX, draft persistence, and auto-submit — all wired up with a few spreads.

- Human docs: ${origin}
- Changelog: ${origin}/changelog
- Source & issues: https://github.com/open-sky-dev/opensky-remotes
- Install: \`npm i @opensky/remotes\`
- Requires \`@sveltejs/kit\` >= 2.68.0 and \`svelte\` >= 5.29.0

## Guide

${guide}
`
}
