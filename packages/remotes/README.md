# opensky/seo

A powerful, lightweight solution for managing meta tags in SvelteKit applications with intelligent data cascading.

You define your metadata in `+page.ts` or `+layout.ts` load functions, using our helper functions for simpler code - like so:

```typescript
// src/routes/+layout.ts
import { metaLoad } from "@opensky/seo";

export const load = metaLoad.layout({
  sitename: "My Awesome Site",
  title: "Home",
  titleTemplate: "My Awesome Site - {page}",
  description: "A fantastic SvelteKit application",
  icon: "./favicon.png",
});
```

Congrats! You now have seo meta tags for your entire site. Customizing meta tags from here on is easy

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
  - [Data Cascade](#data-cascade)
  - [Available Helpers](#available-helpers)
- [Advanced Usage](#advanced-usage)
  - [Accessing Route Parameters](#accessing-route-parameters)
  - [Handling Server Data](#handling-server-data)
- [Supported Metadata Properties](#supported-metadata-properties)
- [License](#license)

## Features

- **Data Cascade**: Define meta tags at the root level and override selectively at deeper levels
- **Simple API**: Straightforward helper functions to reduce boiler plate code
- **Type Safe**: Fully typed to make adding tags easier
- **Flexible Integration**: Works with SvelteKit's layout and page structure
- **Performance Optimized**: Works with SvelteKit parallel execution of load functions
- **SEO-friendly**: Fully supports server-side rendering

## Installation

```bash
bun add @opensky/seo
# or
npm install @opensky/seo
```

## Quick Start

### 1. Set up base metadata in your root layout

```typescript
// src/routes/+layout.ts
import { metaLoad } from "@opensky/seo";

export const load = metaLoad.layout({
  sitename: "My SvelteKit App",
  title: "Welcome",
  titleTemplate: "My SvelteKit App - {page}",
  description: "A fantastic SvelteKit application",
  icon: "./favicon.png",
});
```

### 2. Add the MetaTags component to your root layout template

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { MetaTags } from '@opensky/seo';

  let { children } = $props();
</script>

<MetaTags />

{@render children()}
```

### 3. Override metadata in pages or nested layouts

```typescript
// src/routes/blog/+layout.ts
import { metaLoad } from "@opensky/seo";

export const load = metaLoad.layout({
  title: "Blog",
  titleTemplate: "Svelte Blog - {page}",
  description: "Read our latest articles and updates",
});
```

```typescript
// src/routes/blog/[slug]/+page.ts
import { metaLoadWithData } from "@opensky/seo";

export const load = metaLoadWithData.page(({ data }) => ({
  title: data.post.title,
  description: "This is a detailed description of my blog post",
}));
```

And that's it! Your meta tags will be automatically generated and updated across your site.

## Core Concepts

### Data Cascade

SvelteKit Meta uses a data cascade pattern to efficiently manage metadata:

1. **Layout Metadata**: Each layout can extend or override parent metadata. Unlike other tools, you can have many layers of layout metadata set.
2. **Page Metadata**: Pages can further customize metadata for specific routes, overwriting and extending data inherited from layouts above the page in route tree.

Metadata flows down through your application's routing hierarchy inheriting any data above, with lower levels being able to selectively override higher-level values.

The provided helpers for writing the load functions take care of passing parent data and data from any `+page.server.ts` load functions down to the page. Other packages will lose the data from page server load functions, but using these helpers ensures that the page receives everything from the data cascade.

Titles are handled specially to allow you to set a title template and for that to work in a correct fashion.

### Available Helpers

SvelteKit Meta provides several helper functions to simplify integration. You still have to create `+page.ts` and `+layout.ts` files but these make it simpler to define your meta tags with minimal boilerplate code

#### `metaLoad` - Static Metadata

Use these functions when you have metadata that doesn't depend on route parameters or server data.

- **`metaLoad.page(metaTags)`** - Creates a page load function with static metadata
- **`metaLoad.layout(metaTags)`** - Creates a layout load function with static metadata
- **`metaLoad.resetLayout(metaTags)`** - Creates a reset layout load function with static metadata

#### `metaLoadWithData` - Dynamic Metadata

Use these functions when you need to access route parameters, server data, or other context to generate metadata.

- **`metaLoadWithData.page(callback)`** - Creates a page load function with dynamic metadata
- **`metaLoadWithData.layout(callback)`** - Creates a layout load function with dynamic metadata
- **`metaLoadWithData.resetLayout(callback)`** - Creates a reset layout load function with dynamic metadata

#### `addMetaTags` - Manual Integration

Use these functions when you want full control over your load function but still want to add metadata.

- **`addMetaTags.page(metaTags)`** - Adds page metadata to load function return value
- **`addMetaTags.layout(metaTags)`** - Adds layout metadata to load function return value
- **`addMetaTags.resetLayout(metaTags)`** - Adds reset layout metadata to load function return value

## Title Templates

Title templates allow you to define a pattern for constructing page titles. You are required to specify the route where the template is located. This allows us to evaluate multiple layers of title templates and decide which should be used.

To understand this concern, consider the following: you have a `/staff` route with `/staff/+layout.ts` and `/staff/+page.ts` files and you also have `/staff/jeff` route. When you visit /staff you want to use the title from staff layout and the template from the higher layout, in this case root. But you also want a template to be defined in staff/layout which would be applied at /staff/jeff. The issue is that if you set a titleTemplate at staff/layout it will override the root layout's titleTemplate and so visiting /staff will use the titleTemplate from /staff/layout. Instead of "Site - Staff" using root template, it would be "Staff - Staff" using the staff layout template. By specifying route in the title template, we are able to determine which should be used based on the route being loaded.

```typescript
// Root layout - applies to all pages under /
export const load = metaLoad.layout({
  titleTemplate: { route: "/", template: "My Site - {page}" },
});

// Blog layout - applies to all pages under /blog
export const load = metaLoad.layout({
  titleTemplate: { route: "/blog", template: "Blog - {page}" },
});

// Individual page - will use the most specific template
export const load = metaLoad.page({
  title: "My Amazing Post",
});
// Result: "Blog - My Amazing Post" (uses /blog template)
```

## Advanced Usage

### Accessing Route Parameters

For dynamic metadata, you can use the `metaLoadWithData` helper to incorporate route parameters:

```typescript
// src/routes/blog/[slug]/+page.ts
import { metaLoadWithData } from "@opensky/seo";

export const load = metaLoadWithData.page(({ params, data }) => {
  const { slug } = params;

  // Fetch article data based on slug
  const article = await getArticleBySlug(slug);

  return {
    title: article.title,
    description: article.excerpt,
    image: article.featuredImage,
  };
});
```

### Manual Integration

If you need full control over your load function, you can use the `addMetaTags` helpers:

```typescript
// +page.ts
export async function load({ data, route, params, url }) {
  const post = await fetchPost(params.slug);

  return {
    ...data,
    post,
    ...addMetaTags.page({ title: post.title }),
  };
}

// +layout.ts
export async function load({ data, route, params }) {
  const section = await fetchSection();

  return {
    ...data,
    section,
    ...addMetaTags.layout({ title: section.title }),
  };
}
```

### Handling Server Data

The `metaLoadWithData` and `metaLoad` helpers automatically merge parent data, server data, and your meta data. If you are using addMetaTags, it is important that you handle this otherwise server data will not reach the page.

You must take in `data` as a destructured argument in your load function and spread it on the return value 

```typescript
// +page.ts
export async function load({ data }) {
                          /* ^ include data */
  return {
    ...data,
    /* ^ include data */
    ...addMetaTags.page({ title: post.title }),
  };
}
```

## Supported Metadata Properties

SvelteKit Meta supports a comprehensive range of metadata properties:

| Property         | Description                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| `canonical`      | Canonical URL for the page (og:url, link:rel:canonical)                                        |
| `icon`           | Favicon path as string or IconOpinionated object                                               |
| `maskIcon`       | Object with `url` (svg file) and optional `color` (hex) for Safari Pinned Tabs                 |
| `theme`          | Theme color for browser UI elements (string or `{ light, dark }` object)                       |
| `colorScheme`    | Color scheme preference for the page (meta:color-scheme)                                       |
| `sitename`       | Name of the website (og:sitename)                                                              |
| `title`          | Page title (warns if > 70 characters) (og:title, meta:title)                                   |
| `titleTemplate`  | Template for constructing child page titles (e.g., "Reviews - {page}")                         |
| `description`    | Page description (warns if > 200 characters) (og:description, twitter:description)             |
| `author`         | Content author(s) as string or array (meta:author, og:author)                                  |
| `twitterSite`    | The X Account for the publishing site (twitter:site)                                           |
| `twitterCreator` | The X Account for the author/creator of this page (twitter:creator)                            |
| `date`           | Publication date in ISO 8601 format (og meta)                                                  |
| `modified`       | Last modified date (og:modified-time, meta:modified, meta:last-modified)                       |
| `type`           | Content type configuration (`basic`, `article`, `largeImage`, `player` or ContentTypeAdvanced) |
| `image`          | Primary image for social sharing (string or Media object)                                      |
| `images`         | Multiple images for social sharing (array of Media objects)                                    |
| `video`          | Primary video for social sharing (string or Media object)                                      |
| `videos`         | Multiple videos for social sharing (array of Media objects)                                    |

### Media Object Structure

Media objects for images and videos can include:

```typescript
type Media = {
  url: string; // Primary URL for the media resource
  secureUrl?: string; // HTTPS URL for the media resource
  type?: string; // MIME type of the media
  width?: number; // Width in pixels
  height?: number; // Height in pixels
  alt?: string; // Alt text description
};
```

### Icon Configuration

Icons can be configured with more advanced options:

```typescript
type IconOpinionated = {
  svg?: string;
  small?: {
    url: string;
    size: number;
    type?: string;
  };
  large?: {
    url: string;
    size: number;
    type?: string;
  };
};
```

### Content Type Configuration

Content type can be configured with advanced options for different platforms:

```typescript
type ContentTypeAdvanced = {
  twitter: "summary" | "largeImage" | "player";
  og: "website" | "article";
};
```

> Note: Properties like `image`/`images` and `video`/`videos` are mutually exclusive. The library will warn and use the plural version if both are specified.

## License

MIT License
