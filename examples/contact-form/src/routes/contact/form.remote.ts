import { form } from '$app/server'
import { invalid } from '@sveltejs/kit'
import { contactSchema } from './schema'

export const contactForm = form(contactSchema, async ({ name, email, message }, issue) => {
	console.log('Message from', name, email, message)

	// Simulate a slow request so the enhanced form's 'delayed' state is visible
	await new Promise((resolve) => setTimeout(resolve, 1000))

	// Server-only check the schema can't express — only runs on real submits,
	// so this issue appears via the 'issues' path, never on blur
	if (email === 'taken@test.com') {
		invalid(issue.email('That email is already registered'))
	}

	return {
		success: true
	}
})
