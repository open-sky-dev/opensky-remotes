import { marked } from 'marked'
import changelog from '../../../../packages/remotes/CHANGELOG.md?raw'

// The package changelog is the source of truth; render it to HTML at build/load
// time (GFM tables are on by default) and drop its own H1 — the page supplies
// its own heading.
const body = changelog.replace(/^#\s+Changelog\s*\n/, '')

export const load = () => {
	return { html: marked.parse(body, { async: false, gfm: true }) as string }
}
