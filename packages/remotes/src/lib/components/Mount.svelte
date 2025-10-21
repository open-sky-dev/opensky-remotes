<script lang="ts">
	import { page } from '$app/state'
	import { afterNavigate } from '$app/navigation'

	let data = $state(page.data)
	afterNavigate(() => { data = page.data }) // Update data after navigation
	
	let { debug } = $props()
	if (debug) { $inspect(data) }
	
	// Get all metadata keys from page data
	const metaKeys = $derived.by(() => {
		return Object.keys(data).filter((key: string) => key.startsWith('_meta-'))
	})

	// Get all title template keys
	const titleTemplateKeys = $derived.by(() => {
		const keys = Object.keys(data).filter((key: string) => key.endsWith('-title-template'))
		if (debug) { console.log('🔍 [Mount] Found title template keys:', keys) }
		return keys
	})

	// Get current route path
	const currentRoute = $derived.by(() => {
		const route = page.url.pathname
		return route
	})

	// Find the appropriate title template based on route depth
	const activeTitleTemplate = $derived.by(() => {
		if (titleTemplateKeys.length === 0) {
			return null
		}

		// Sort title templates by depth (root first, then by path length)
		const sortedTemplates = titleTemplateKeys
			.map((key: string) => {
				const route = key.replace('_meta_', '').replace('-title-template', '')
				const depth = route === 'root' ? 0 : route.split('_').length
				return { key, route, depth, template: data[key] }
			})
			.sort((a: any, b: any) => a.depth - b.depth)

		if (debug) { console.log('🔍 [Mount] Sorted title templates:', sortedTemplates) }

		// Find the best matching template for current route
		for (const template of sortedTemplates) {
			if (template.route === 'root') {
				// Don't return root immediately, check for more specific matches first
				continue
			}

			// Check if current route starts with this template's route
			const templateRoute = '/' + template.route.replace(/_/g, '/')

			if (currentRoute.startsWith(templateRoute)) {
				return template
			}
		}

		// If no specific match found, check for root template
		const rootTemplate = sortedTemplates.find((t) => t.route === 'root')
		if (rootTemplate) {
			return rootTemplate
		}

		return null
	})

	// Get the title from the current route level
	const currentTitle = $derived.by(() => {
		const titleKey = '_meta-title'
		const title = data[titleKey] || null
		return title
	})

	// Combine title template with current title
	const combinedTitle = $derived.by(() => {
		if (activeTitleTemplate && currentTitle) {
			const result = activeTitleTemplate.template.replace('{page}', currentTitle)
			return result
		} else {
			return currentTitle
		}
	})

	// Helper function to get metadata value
	const getMetaValue = (key: string) => {
		return data[`_meta-${key}`]
	}

	// Helper function to check if metadata exists
	const hasMeta = (key: string) => {
		return data[`_meta-${key}`] !== undefined && data[`_meta-${key}`] !== null
	}
</script>

<svelte:head>
	<!-- SEO: Canonical URL -->
	{#if hasMeta('canonical')}
		<meta property="og:url" content={getMetaValue('canonical')} />
	{/if}

	<!-- APPEARENCE: Icon -->
	{#if hasMeta('icon')}
		{@const icon = getMetaValue('icon')}
		{#if typeof icon === 'string'}
			<link rel="icon" href={icon} />
			<link rel="apple-touch-icon" href={icon} />
		{:else}
			{#if icon.svg}
				<link rel="icon" type="image/svg+xml" href={icon.svg} />
			{/if}
			{#if icon.small}
				<link rel="icon" type={icon.small.type || 'image/png'} href={icon.small.url} />
			{/if}
			{#if icon.large}
				<link rel="icon" type={icon.large.type || 'image/png'} href={icon.large.url} />
				<link rel="apple-touch-icon" type={icon.large.type || 'image/png'} href={icon.large.url} />
			{/if}
		{/if}
	{/if}

	<!-- APPEARENCE: Safari Pinned Tab Icon -->
	{#if hasMeta('maskIcon')}
		{@const maskIcon = getMetaValue('maskIcon')}
		<link rel="mask-icon" href={maskIcon.url} color={maskIcon.color} />
	{/if}

	<!-- APPEARENCE: Theme Color -->
	{#if hasMeta('theme')}
		{@const theme = getMetaValue('theme')}
		{#if typeof theme === 'object'}
			<meta name="theme-color" content={theme.light} media="(prefers-color-scheme: light)" />
			<meta name="theme-color" content={theme.dark} media="(prefers-color-scheme: dark)" />
		{:else}
			<meta name="theme-color" content={theme} />
		{/if}
	{/if}

	<!-- APPEARENCE: Color Scheme -->
	{#if hasMeta('colorScheme')}
		<meta name="color-scheme" content={getMetaValue('colorScheme')} />
	{/if}

	<!-- SHARING: Site Name -->
	{#if hasMeta('sitename')}
		<meta property="og:site_name" content={getMetaValue('sitename')} />
	{/if}

	<!-- SHARING: Title -->
	{#if combinedTitle}
		<title>{combinedTitle}</title>
		<meta property="og:title" content={combinedTitle} />
		<meta name="twitter:title" content={combinedTitle} />
	{/if}

	<!-- SHARING: Description -->
	{#if hasMeta('description')}
		{@const description = getMetaValue('description')}
		<meta name="description" content={description} />
		<meta property="og:description" content={description} />
		<meta name="twitter:description" content={description} />
	{/if}

	<!-- SHARING: Content Type -->
	{#if hasMeta('type')}
		{@const type = getMetaValue('type')}
		{#if typeof type === 'object'}
			<meta property="og:type" content={type.og} />
			<meta name="twitter:card" content={type.twitter} />
		{:else if type === 'article'}
			<meta property="og:type" content="article" />
			<meta name="twitter:card" content="summary" />
		{:else if type === 'largeImage'}
			<meta property="og:type" content="website" />
			<meta name="twitter:card" content="summary_large_image" />
		{:else if type === 'player'}
			<meta property="og:type" content="website" />
			<meta name="twitter:card" content="player" />
		{:else}
			<meta property="og:type" content="website" />
			<meta name="twitter:card" content="summary" />
		{/if}
	{/if}

	<!-- SHARING: Author -->
	{#if hasMeta('author')}
		{@const author = getMetaValue('author')}
		{#if Array.isArray(author)}
			<meta name="author" content={author.join(', ')} />
			{#each author as authorName}
				<meta property="article:author" content={authorName} />
			{/each}
		{:else}
			<meta name="author" content={author} />
			<meta property="article:author" content={author} />
		{/if}
	{/if}

	<!-- SHARING: Images -->
	{#if hasMeta('image')}
		{@const image = getMetaValue('image')}
		{#if typeof image === 'string'}
			<meta property="og:image" content={image} />
			<meta name="twitter:image" content={image} />
		{:else}
			<meta property="og:image" content={image.url} />
			{#if image.secureUrl}<meta property="og:image:secure_url" content={image.secureUrl} />{/if}
			<meta name="twitter:image" content={image.url} />
			{#if image.width}<meta property="og:image:width" content={image.width} />{/if}
			{#if image.height}<meta property="og:image:height" content={image.height} />{/if}
			{#if image.type}<meta property="og:image:type" content={image.type} />{/if}
			{#if image.alt}
				<meta property="og:image:alt" content={image.alt} />
				<meta name="twitter:image:alt" content={image.alt} />
			{/if}
		{/if}
	{/if}
	{#if hasMeta('images')}
		{@const images = getMetaValue('images')}
		{#each images as image, i}
			<!-- Set twitter:image only for the first image -->
			{#if i === 0}
				<meta name="twitter:image" content={image.url} />
				{#if image.alt}
					<meta name="twitter:image:alt" content={image.alt} />
				{/if}
			{/if}
			<meta property="og:image" content={image.url} />
			{#if image.secureUrl}<meta property="og:image:secure_url" content={image.secureUrl} />{/if}
			{#if image.width}<meta property="og:image:width" content={image.width} />{/if}
			{#if image.height}<meta property="og:image:height" content={image.height} />{/if}
			{#if image.type}<meta property="og:image:type" content={image.type} />{/if}
			{#if image.alt}
				<meta property="og:image:alt" content={image.alt} />
			{/if}
		{/each}
	{/if}

	<!-- SHARING: Video -->
	{#if hasMeta('video')}
		{@const video = getMetaValue('video')}
		{#if typeof video === 'string'}
			<meta property="og:video" content={video} />
			<meta name="twitter:player" content={video} />
		{:else}
			<meta property="og:video" content={video.url} />
			<meta name="twitter:player" content={video.url} />
			{#if video.width}
				<meta property="og:video:width" content={video.width} />
				<meta name="twitter:player:width" content={video.width} />
			{/if}
			{#if video.height}
				<meta property="og:video:height" content={video.height} />
				<meta name="twitter:player:height" content={video.height} />
			{/if}
			{#if video.type}<meta property="og:video:type" content={video.type} />{/if}
		{/if}
	{/if}
	{#if hasMeta('videos')}
		{@const videos = getMetaValue('videos')}
		{#each videos as video, i}
			<!-- Set twitter:player only for the first video -->
			{#if i === 0}
				<meta name="twitter:player" content={video.url} />
				{#if video.width}
					<meta name="twitter:player:width" content={video.width} />
				{/if}
				{#if video.height}
					<meta name="twitter:player:height" content={video.height} />
				{/if}
			{/if}
			<meta property="og:video" content={video.url} />
			{#if video.secureUrl}<meta property="og:video:secure_url" content={video.secureUrl} />{/if}
			{#if video.width}<meta property="og:video:width" content={video.width} />{/if}
			{#if video.height}<meta property="og:video:height" content={video.height} />{/if}
			{#if video.type}<meta property="og:video:type" content={video.type} />{/if}
		{/each}
	{/if}

	<!-- SEO: Date Published -->
	{#if hasMeta('date')}
		<meta property="article:published_time" content={getMetaValue('date')} />
		<meta name="date" content={getMetaValue('date')} />
	{/if}

	<!-- SEO: Date Modified -->
	{#if hasMeta('modified')}
		<meta property="article:modified_time" content={getMetaValue('modified')} />
		<meta name="last-modified" content={getMetaValue('modified')} />
	{/if}

	<!-- TWITTER: Site/Publisher Account -->
	{#if hasMeta('twitterSite')}
		<meta name="twitter:site" content={getMetaValue('twitterSite')} />
	{/if}

	<!-- TWITTER: Creator Account -->
	{#if hasMeta('twitterCreator')}
		<meta name="twitter:creator" content={getMetaValue('twitterCreator')} />
	{/if}

	<!-- Arbitrary meta, link, script tags -->
	{#if hasMeta('additionalTags')}
		{@const additionalTags = getMetaValue('additionalTags')}
		{#each additionalTags as tag}
			{@const { tagType, ...attributes } = tag}
			{#if tagType === 'meta'}
				<meta {...attributes} />
			{:else if tagType === 'link'}
				<link {...attributes} />
			{:else if tagType === 'script'}
				<script {...attributes}></script>
			{/if}
		{/each}
	{/if}
</svelte:head>
