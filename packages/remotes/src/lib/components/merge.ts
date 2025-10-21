import type { Metadata, ParentMetadata } from '../types/metadata'

// Generate a short UUID (12 characters)
function generateShortUUID(): string {
	return Math.random().toString(36).substring(2, 14)
}

// Create a metadata object with route info
export function createMetadataObject(routeId: string, metadata: Metadata) {
	const uuid = generateShortUUID()
	return {
		id: `${uuid}.${routeId}`,
		routeId,
		metadata
	}
}

// Parse route segments to determine hierarchy
function parseRouteSegments(routeId: string): string[] {
	// Handle root route
	if (routeId === '/') {
		return ['/']
	}
	
	// Remove leading slash and split by '/'
	const segments = routeId.replace(/^\//, '').split('/').filter(Boolean)
	const hierarchy: string[] = ['/'] // Always start with root
	
	// Build hierarchy from root to current route
	for (let i = 0; i < segments.length; i++) {
		if (i === 0) {
			hierarchy.push(`/${segments[i]}`)
		} else {
			hierarchy.push(hierarchy[i] + '/' + segments[i])
		}
	}
	
	return hierarchy
}

// Merge metadata following the same logic as the original parseMeta
function mergeMetadata(parentTags: ParentMetadata | null, setTags: Metadata): ParentMetadata {
	// Handle character limit warnings
	if (setTags.title && setTags.title.length > 70) {
		console.warn('Title exceeds recommended length of 70 characters')
	}

	if (setTags.description && setTags.description.length > 200) {
		console.warn('Description exceeds recommended length of 200 characters')
	}

	// Handle mutual exclusivity for image/images
	if ('image' in setTags && 'images' in setTags) {
		console.warn('Both image and images properties specified - using images and ignoring image')
		const { image, ...restData } = setTags
		setTags = restData
	}

	// Handle mutual exclusivity for video/videos
	if ('video' in setTags && 'videos' in setTags) {
		console.warn('Both video and videos properties specified - using videos and ignoring video')
		const { video, ...restData } = setTags
		setTags = restData
	}

	// Handle titles and title templates
	let safeParentTags: Partial<ParentMetadata> = parentTags ? { ...parentTags } : {}
	if (safeParentTags.titleTemplate) {
		safeParentTags.parentTitleTemplate = safeParentTags.titleTemplate
		delete safeParentTags?.titleTemplate
	}

	return { ...safeParentTags, ...setTags } as ParentMetadata
}

// Main function to merge all metadata objects based on route hierarchy
export function mergeMetadataObjects(metadataObjects: Record<string, any>, currentRouteId: string): ParentMetadata {
	// Get all metadata objects
	const allObjects = Object.values(metadataObjects).filter(obj => obj && obj.id && obj.routeId && obj.metadata)
	
	// Get the route hierarchy for the current route
	const hierarchy = parseRouteSegments(currentRouteId)
	
	// Sort metadata objects based on route hierarchy
	const sortedObjects = allObjects
		.filter(obj => hierarchy.includes(obj.routeId))
		.sort((a, b) => {
			const aIndex = hierarchy.indexOf(a.routeId)
			const bIndex = hierarchy.indexOf(b.routeId)
			return aIndex - bIndex
		})
	
	// Merge metadata following the waterfall pattern
	let result: ParentMetadata = {}
	for (const obj of sortedObjects) {
		result = mergeMetadata(result, obj.metadata) as ParentMetadata
	}
	
	return result
}