export type PackageManager = 'npm' | 'bun' | 'pnpm'

// Single source of truth for install commands, shared by the hero pill, the
// installation code block, and the server-side snippet highlighting. npm is
// the default everywhere.
export const packageManagers: { id: PackageManager; label: string; command: string }[] = [
	{ id: 'npm', label: 'npm', command: 'npm i @opensky/remotes' },
	{ id: 'bun', label: 'bun', command: 'bun add @opensky/remotes' },
	{ id: 'pnpm', label: 'pnpm', command: 'pnpm add @opensky/remotes' }
]
