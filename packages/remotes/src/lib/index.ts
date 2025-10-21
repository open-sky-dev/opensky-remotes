import { addMetaTagsPage, addMetaTagsLayout, addMetaTagsResetLayout } from './add-meta-tags'
import { metaLoadPage, metaLoadLayout, metaLoadResetLayout } from './meta-load'
import {
	metaLoadWithDataPage,
	metaLoadWithDataLayout,
	metaLoadWithDataResetLayout
} from './meta-load-with-data'

export const PREFIX = '_meta' // This will be prefixed for all metadata added to load data

/**
 * Convenience object for creating SvelteKit load functions with static metadata.
 * 
 * Use these functions when you have metadata that doesn't depend on route parameters
 * or server data. They create load functions that automatically add metadata to the
 * load data.
 * 
 * @property {Function} page - Creates a page load function with static metadata
 * @property {Function} layout - Creates a layout load function with static metadata  
 * @property {Function} resetLayout - Creates a reset layout load function with static metadata
 * 
 * @example
 * ```typescript
 * // +page.ts
 * export const load = metaLoad.page({
 *   title: 'My Page',
 *   description: 'This is my page'
 * });
 * 
 * // +layout.ts
 * export const load = metaLoad.layout({
 *   title: 'My Site',
 *   description: 'Welcome to my site'
 * });
 * ```
 */
export const metaLoad = {
	page: metaLoadPage,
	layout: metaLoadLayout,
	resetLayout: metaLoadResetLayout
} as const

/**
 * Convenience object for creating SvelteKit load functions with dynamic metadata.
 * 
 * Use these functions when you need to access route parameters, server data, or other
 * context to generate metadata. They create load functions that call your callback
 * with the load context and add the returned metadata to the load data.
 * 
 * @property {Function} page - Creates a page load function with dynamic metadata
 * @property {Function} layout - Creates a layout load function with dynamic metadata
 * @property {Function} resetLayout - Creates a reset layout load function with dynamic metadata
 * 
 * @example
 * ```typescript
 * // +page.ts
 * export const load = metaLoadWithData.page(({ params, data }) => ({
 *   title: data.post.title,
 *   description: `Post about ${params.slug}`
 * }));
 * 
 * // +layout.ts
 * export const load = metaLoadWithData.layout(({ data }) => ({
 *   title: data.section.title,
 *   description: data.section.description
 * }));
 * ```
 */
export const metaLoadWithData = {
	page: metaLoadWithDataPage,
	layout: metaLoadWithDataLayout,
	resetLayout: metaLoadWithDataResetLayout
} as const

/**
 * Convenience object for adding metadata to existing load function return values.
 * 
 * Use these functions when you want full control over your load function but still
 * want to add metadata. They return objects that you can spread into your load
 * function return value.
 * 
 * @property {Function} page - Adds page metadata to load function return value
 * @property {Function} layout - Adds layout metadata to load function return value
 * @property {Function} resetLayout - Adds reset layout metadata to load function return value
 * 
 * @example
 * ```typescript
 * // +page.ts
 * export async function load({ data, route, params, url }) {
 *   const post = await fetchPost(params.slug);
 *   
 *   return {
 *     ...data,
 *     post,
 *     ...addMetaTags.page({ title: post.title })
 *   };
 * }
 * 
 * // +layout.ts
 * export async function load({ data, route, params }) {
 *   const section = await fetchSection();
 *   
 *   return {
 *     ...data,
 *     section,
 *     ...addMetaTags.layout({ title: section.title })
 *   };
 * }
 * ```
 */
export const addMetaTags = {
	page: addMetaTagsPage,
	layout: addMetaTagsLayout,
	resetLayout: addMetaTagsResetLayout
} as const

export { default as SeoTags } from './components/Mount.svelte'

export * from './types/metadata'

export default {
	metaLoad,
	metaLoadWithData,
	addMetaTags
}
