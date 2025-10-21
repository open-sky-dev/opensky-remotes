import type { LayoutMetadata, PageMetadata } from './types/metadata';
import type { Load } from '@sveltejs/kit';
import { addMetaTagsPage, addMetaTagsLayout, addMetaTagsResetLayout } from './add-meta-tags';

/**
 * Creates a page load function that adds metadata to the load data.
 * Use this for static metadata that doesn't depend on route parameters or server data.
 *
 * @param metaTags - The metadata to add for this page
 * @returns A SvelteKit load function
 *
 * @example
 * ```typescript
 * // +page.ts
 * export const load = metaLoad.page({
 *   title: 'My Post',
 *   description: 'This is a great post'
 * });
 * ```
 */
export function metaLoadPage(metaTags: PageMetadata): Load {
	return async ({ data }) => {
		return {
			...data,
			...addMetaTagsPage(metaTags)
		};
	};
}

/**
 * Creates a layout load function that adds metadata to the load data.
 * Use this for static metadata that doesn't depend on route parameters or server data.
 *
 * @param metaTags - The metadata to add for this layout
 * @returns A SvelteKit load function
 *
 * @example
 * ```typescript
 * // +layout.ts
 * export const load = metaLoad.layout({
 *   title: 'Blog',
 *   description: 'Read our latest articles'
 * });
 * ```
 */
export function metaLoadLayout(metaTags: LayoutMetadata): Load {
	return async ({ data }) => {
		return {
			...data,
			...addMetaTagsLayout(metaTags)
		};
	};
}

/**
 * Creates a reset layout load function that clears the metadata cascade.
 * Use this to start fresh with new metadata, ignoring any inherited metadata.
 *
 * @param metaTags - The metadata to add for this layout
 * @returns A SvelteKit load function
 *
 * @example
 * ```typescript
 * // +layout.ts
 * export const load = metaLoad.resetLayout({
 *   title: 'Fresh Start',
 *   description: 'New section with clean metadata'
 * });
 * ```
 */
export function metaLoadResetLayout(metaTags: LayoutMetadata): Load {
	return async ({ data }) => {
		return {
			...data,
			...addMetaTagsResetLayout(metaTags)
		};
	};
}
