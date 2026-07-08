import { createHighlighter, type Highlighter } from 'shiki'

export type CodeLang = 'typescript' | 'svelte' | 'bash' | 'json'

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

export async function highlight(code: string, lang: CodeLang) {
	const highlighter = await getHighlighter()
	return highlighter.codeToHtml(code.trim(), { lang, theme: THEME })
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
