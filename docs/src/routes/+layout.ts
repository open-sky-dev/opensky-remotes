import { metaLoad } from '@opensky/seo'

// Site-wide SEO defaults. The template formats every sub-page title as
// "OpenSky/Remotes - {page}"; the homepage keeps its own bare title. The
// description here is the fallback for any page that doesn't set its own.
export const load = metaLoad.layout({
	sitename: 'OpenSky Remotes',
	// Scoped to '/' explicitly so it applies to every route: a layout load sees
	// the leaf route id, not the layout's, so the inferred form would mis-key it.
	titleTemplate: { route: '/', template: 'OpenSky/Remotes - {page}' },
	description:
		'enhancedForm wraps a SvelteKit remote form function with submission state, inline validation UX, draft persistence, and auto-submit — one object, wired up with a few spreads.'
})
