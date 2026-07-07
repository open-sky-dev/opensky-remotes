import * as v from 'valibot'

export const contactSchema = v.object({
	name: v.pipe(v.string(), v.minLength(2, 'Name is too short')),
	email: v.pipe(v.string(), v.email('Enter a valid email')),
	message: v.pipe(v.string(), v.minLength(10, 'Message is too short'))
})
