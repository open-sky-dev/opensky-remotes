import type { LayoutMetadata, PageMetadata } from './types/metadata';
import type { Load, LoadEvent } from '@sveltejs/kit';
import { addMetaTagsPage, addMetaTagsLayout, addMetaTagsResetLayout } from './add-meta-tags';

/**
 * Creates a page load function that adds metadata with access to load context.
 * Use this when you need to access route parameters, server data, or other context.
 *
 * @param callback - Function that receives load context and returns metadata
 * @returns A SvelteKit load function
 *
 * @example
 * ```typescript
 * // +page.ts
 * export const load = metaLoadWithData.page(({ params, data }) => ({
 *   title: data.post.title,
 *   description: `Post about ${params.slug}`
 * }));
 * ```
 */
export function metaLoadWithDataPage(
	callback: (context: { data: unknown; route: LoadEvent['route']; params: LoadEvent['params']; url: LoadEvent['url'] }) => PageMetadata
): Load {
	return async ({ data, route, params, url }) => {
		const metaTags = callback({ data, route, params, url });

		return {
			...data,
			...addMetaTagsPage(metaTags)
		};
	};
}

/**
 * Creates a layout load function that adds metadata with access to load context.
 * Use this when you need to access route parameters, server data, or other context.
 *
 * @param callback - Function that receives load context and returns metadata
 * @returns A SvelteKit load function
 *
 * @example
 * ```typescript
 * // +layout.ts
 * export const load = metaLoadWithData.layout(({ data }) => ({
 *   title: data.section.title,
 *   description: data.section.description
 * }));
 * ```
 */
export function metaLoadWithDataLayout(
	callback: (context: { data: unknown; route: LoadEvent['route']; params: LoadEvent['params']; url: LoadEvent['url'] }) => LayoutMetadata
): Load {
	return async ({ data, route, params, url }) => {
		const metaTags = callback({ data, route, params, url });

		return {
			...data,
			...addMetaTagsLayout(metaTags)
		};
	};
}

/**
 * Creates a reset layout load function with access to load context.
 * Use this to start fresh with dynamic metadata that depends on context.
 *
 * @param callback - Function that receives load context and returns metadata
 * @returns A SvelteKit load function
 *
 * @example
 * ```typescript
 * // +layout.ts
 * export const load = metaLoadWithData.resetLayout(({ data }) => ({
 *   title: data.fresh.title,
 *   description: data.fresh.description
 * }));
 * ```
 */
export function metaLoadWithDataResetLayout(
	callback: (context: { data: unknown; route: LoadEvent['route']; params: LoadEvent['params']; url: LoadEvent['url'] }) => LayoutMetadata
): Load {
	return async ({ data, route, params, url }) => {
		const metaTags = callback({ data, route, params, url });

		return {
			...data,
			...addMetaTagsResetLayout(metaTags)
		};
	};
}
