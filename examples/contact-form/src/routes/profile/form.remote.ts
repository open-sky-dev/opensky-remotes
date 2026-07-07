import { form } from '$app/server'
import { profileSchema } from './schema'

export const profileForm = form(profileSchema, async ({ displayName, bio }) => {
	console.log('Saving profile', displayName, bio)

	// Simulate a save round-trip so the auto-save indicator is visible
	await new Promise((resolve) => setTimeout(resolve, 600))

	return {
		savedAt: new Date().toLocaleTimeString()
	}
})
