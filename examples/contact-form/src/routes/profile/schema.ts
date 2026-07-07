import * as v from 'valibot'

export const profileSchema = v.object({
	displayName: v.pipe(v.string(), v.minLength(2, 'Display name is too short')),
	bio: v.pipe(v.string(), v.maxLength(160, 'Bio must fit in 160 characters'))
})
