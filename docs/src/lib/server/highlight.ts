import { createHighlighter, type Highlighter, type ShikiTransformer } from 'shiki'

export type CodeLang = 'typescript' | 'svelte' | 'bash' | 'json'

// Tags 1-based line numbers with an `added` class so the CSS can highlight them
// green — the source stays clean, so copied code carries no diff markers.
function addedLines(lines: number[]): ShikiTransformer {
	const set = new Set(lines)
	return {
		name: 'added-lines',
		line(node, line) {
			if (set.has(line)) this.addClassToHast(node, 'added')
		}
	}
}

// GitHub's light syntax palette; the code-card CSS overrides the pre
// background, so only the token colors come from the theme
const THEME = 'github-light'

let highlighterPromise: Promise<Highlighter> | undefined

function getHighlighter() {
	highlighterPromise ??= createHighlighter({
		themes: [THEME],
		langs: ['typescript', 'svelte', 'bash', 'json']
	})
	return highlighterPromise
}

export async function highlight(code: string, lang: CodeLang, added?: number[]) {
	const highlighter = await getHighlighter()
	return highlighter.codeToHtml(code.trim(), {
		lang,
		theme: THEME,
		transformers: added?.length ? [addedLines(added)] : []
	})
}

export type HighlightedFile = {
	name: string
	code: string
	html: string
}

export async function highlightFiles(files: { name: string; code: string; lang: CodeLang }[]) {
	return Promise.all(
		files.map(async ({ name, code, lang }): Promise<HighlightedFile> => {
			return { name, code: code.trim(), html: await highlight(code, lang) }
		})
	)
}
