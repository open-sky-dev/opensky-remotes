import * as v from 'valibot'

export const applicationSchema = v.object({
	name: v.pipe(v.string(), v.minLength(2, 'Enter your full name')),
	email: v.pipe(v.string(), v.email('Enter a valid email')),
	role: v.pipe(v.string(), v.minLength(1, 'Pick a role')),
	skills: v.pipe(v.array(v.string()), v.minLength(1, 'Pick at least one skill')),
	coverLetter: v.pipe(v.string(), v.minLength(40, 'Tell us a bit more — at least 40 characters'))
})
