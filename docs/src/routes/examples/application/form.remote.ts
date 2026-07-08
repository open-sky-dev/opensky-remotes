import { form } from '$app/server'
import { applicationSchema } from './schema'

export const applicationForm = form(applicationSchema, async ({ name, email, role, skills }) => {
	console.log('Application received:', name, email, role, skills)

	// Simulate processing so the 'delayed' state is visible
	await new Promise((resolve) => setTimeout(resolve, 900))

	return {
		success: true
	}
})
