import { metaLoad } from '@opensky/seo'

// Site-wide SEO defaults. The template formats every sub-page title as
// "OpenSky/Remotes - {page}"; the homepage keeps its own bare title. The
// description here is the fallback for any page that doesn't set its own.
export const load = metaLoad.layout({
	sitename: 'OpenSky Remotes',
	title: 'OpenSky Remotes',
	// route: '/' is required — a layout load sees the leaf route id, not the
	// layout's, so without it the template mis-keys to each page's own route and
	// never applies. Scoped to '/' it formats every sub-page; 1.2.1 leaves the
	// homepage ('/') itself untouched, so its bare title comes from `title` above.
	titleTemplate: { route: '/', template: 'OpenSky/Remotes › {page}' },
	description:
		'enhancedForm wraps a SvelteKit remote form function with submission state, inline validation UX, draft persistence, and auto-submit — one object, wired up with a few spreads.'
})
