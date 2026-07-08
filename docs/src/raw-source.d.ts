// Source-of-remote-files imports served by the raw-remote-source vite plugin
// (must live in a non-module .d.ts so the wildcard pattern is ambient)
declare module '*?raw-source' {
	const source: string
	export default source
}
