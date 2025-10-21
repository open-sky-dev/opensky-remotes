import type { BaseMetadata, LayoutMetadata, PageMetadata } from './types/metadata'
import { metadataSchema } from './types/metadata'
import { PREFIX } from './index'
import { z } from 'zod'

/**
 * Generates a reset object with null values for all possible metadata keys.
 * This ensures all metadata from parent layouts is cleared.
 * Uses the Zod schema to automatically generate keys.
 */
export function generateResetData(): Record<string, null> {
	const resetData: Record<string, null> = {}

	// Get all keys from the Zod schema
	const schemaKeys = Object.keys(metadataSchema.shape)

	for (const key of schemaKeys) {
		resetData[`${PREFIX}-${key}`] = null
	}

	return resetData
}

/**
 * Transforms metadata object keys to prefixed format for SvelteKit data cascade.
 * Converts top-level keys like 'title', 'description' to '_meta-title', '_meta-description'.
 * Handles titleTemplate specially by creating a route-specific key.
 *
 * @param metadata - The metadata object to transform
 * @returns Object with prefixed keys for SvelteKit data cascade
 *
 * @example
 * ```typescript
 * const result = transformMetadataKeys({
 *   title: "My Page",
 *   description: "Page description",
 *   titleTemplate: { route: "/blog", template: "Blog: {page}" }
 * });
 * // Returns: {
 * //   "_meta-title": "My Page",
 * //   "_meta-description": "Page description",
 * //   "_meta_blog-title-template": "Blog: {page}"
 * // }
 * ```
 */
export function transformMetadataKeys(
	data: LayoutMetadata | BaseMetadata | PageMetadata
): Record<string, any> {
	const result: Record<string, any> = {}

	for (const [key, value] of Object.entries(data)) {
		// Skip if value is nullish
		if (value === undefined || value === null) continue

		// Handle titleTemplate to use route in key
		if (isTitleTemplate(key, value)) {
			const route = value.route
			let routeKey: string

			// Handle the root route
			if (!route || route === '' || route === '/') {
				routeKey = 'root'
			} else {
				routeKey = route
					.replace(/[\[\]()]/g, '') // Remove brackets and parentheses
					.replace(/[^a-zA-Z0-9_]/g, '_') // Replace any non-alphanumeric chars with underscores
					.replace(/_+/g, '_') // Collapse multiple underscores into single
					.replace(/^_|_$/g, '') // Remove leading/trailing underscores
					.toLowerCase() // Convert to lowercase for consistency
			}

			const templateKey = `${PREFIX}_${routeKey}-title-template`
			result[templateKey] = value.template

			continue
		}

		// For all other top-level keys, prefix and set value
		result[`${PREFIX}-${key}`] = value
	}

	return result
}

const isTitleTemplate = (key: string, value: any): value is { route: string; template: string } => {
	if (key === 'titleTemplate') {
		if (typeof value === 'object' && value !== null && 'route' in value && 'template' in value) {
			return true
		} else {
			console.warn('titleTemplate has error. Missing route or template in object')
			return false
		}
	} else {
		return false
	}
}

/**
 * Validates and cleans metadata tags by checking character limits and handling mutual exclusivity conflicts.
 * Also runs Zod validation for additional error checking.
 *
 * This function performs the following validations:
 * - Warns if title exceeds 70 characters (SEO best practice)
 * - Warns if description exceeds 200 characters (SEO best practice)
 * - Resolves conflicts between 'image' and 'images' properties (keeps 'images')
 * - Resolves conflicts between 'video' and 'videos' properties (keeps 'videos')
 * - Runs Zod validation for additional error checking
 *
 * @param tags - The metadata object to validate and clean
 * @returns The cleaned metadata object with conflicts resolved
 *
 * @example
 * ```typescript
 * const cleanedTags = checkData({
 *   title: 'A very long title that exceeds the recommended character limit',
 *   description: 'A description that is also too long for SEO best practices',
 *   image: 'single-image.jpg',
 *   images: ['image1.jpg', 'image2.jpg']
 * });
 * // Returns: { images: ['image1.jpg', 'image2.jpg'] }
 * // Console warnings for title and description length, and image/images conflict
 * ```
 */
export function checkData(
	tags: BaseMetadata | LayoutMetadata | PageMetadata
): BaseMetadata | LayoutMetadata | PageMetadata {
	// Handle character limit on title
	if (tags.title && tags.title.length > 70) {
		console.warn('Title exceeds recommended length of 70 characters')
	}

	// Handle character limit on description
	if (tags.description && tags.description.length > 200) {
		console.warn('Description exceeds recommended length of 200 characters')
	}

	// Handle mutual exclusivity for image/images
	if ('image' in tags && 'images' in tags) {
		console.warn('Both image and images properties specified - using images and ignoring image')
		// Remove 'image' and keep 'images'
		const { image, ...restData } = tags
		tags = restData
	}

	// Handle mutual exclusivity for video/videos
	if ('video' in tags && 'videos' in tags) {
		console.warn('Both video and videos properties specified - using videos and ignoring video')
		// Remove 'video' and keep 'videos'
		const { video, ...restData } = tags
		tags = restData
	}

	try {
		metadataSchema.parse(tags)
	} catch (error) {
		if (error instanceof z.ZodError) {
			console.warn('Additional validation warnings:', error.issues)
		}
	}

	return tags
}
