import { version } from '../../../packages/remotes/package.json'

export const libVersion = version

export const docSections = [
	{ id: 'overview', title: 'Overview' },
	{ id: 'installation', title: 'Installation' },
	{ id: 'quick-start', title: 'Quick start' },
	{ id: 'options', title: 'Options' },
	{ id: 'validation', title: 'Validation' },
	{ id: 'persistence', title: 'Draft persistence' },
	{ id: 'auto-submit', title: 'Auto-submit' },
	{ id: 'state', title: 'State & callbacks' },
	{ id: 'notes', title: 'Notes' }
]

export const examples = [
	{ href: '/examples/contact', title: 'Contact form' },
	{ href: '/examples/profile', title: 'Auto-save profile' },
	{ href: '/examples/application', title: 'Draft persistence' }
]
