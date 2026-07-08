<script lang="ts">
	import { page } from '$app/state'
	import { docSections, examples, resources, libVersion } from '$lib/nav'
	import { navState } from '$lib/nav-state.svelte'

	let { spy = true }: { spy?: boolean } = $props()

	const onDocsPage = $derived(page.route.id === '/')

	// Scrollspy: the active section is the last one whose top has passed the
	// reading line (~1/4 down the viewport)
	$effect(() => {
		if (!onDocsPage || !spy) return

		let frame = 0
		const update = () => {
			frame = 0
			const line = window.innerHeight * 0.25
			let current = docSections[0].id
			for (const { id } of docSections) {
				const el = document.getElementById(id)
				if (el && el.getBoundingClientRect().top <= line) {
					current = id
				}
			}
			// The last section is often too short to ever reach the reading line, so
			// once the page is scrolled to the bottom, activate it directly.
			const atBottom =
				window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
			if (atBottom) current = docSections[docSections.length - 1].id
			navState.active = current
		}

		const onScroll = () => {
			frame ||= requestAnimationFrame(update)
		}

		update()
		window.addEventListener('scroll', onScroll, { passive: true })
		return () => {
			window.removeEventListener('scroll', onScroll)
			cancelAnimationFrame(frame)
		}
	})
</script>

<nav class="side-nav" aria-label="Documentation">
	{#each docSections as { id, title } (id)}
		<a href="/#{id}" class:active={onDocsPage && navState.active === id}>{title}</a>
	{/each}

	<div class="side-group">
		<span class="side-label">Examples</span>
		{#each examples as { href, title } (href)}
			<a {href} class:active={page.url.pathname === href}>{title}</a>
		{/each}
	</div>

	<div class="side-group">
		<span class="side-label">Resources</span>
		{#each resources as { href, title } (href)}
			<a {href} class:active={page.url.pathname === href}>{title}</a>
		{/each}
	</div>

	<div class="side-group side-meta">
		<span>v{libVersion} · MIT licensed</span>
		<span>
			Made by
			<a href="https://x.com/_notnotjake" target="_blank" rel="noreferrer" class="side-author">
				@_notnotjake
			</a>
		</span>
		<div class="side-icons">
			<a
				href="https://github.com/open-sky-dev/opensky-remotes"
				target="_blank"
				rel="noreferrer"
				aria-label="GitHub repository"
			>
				<svg width="17" height="17" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
					<path
						d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"
					/>
				</svg>
			</a>
			<a
				href="https://www.npmjs.com/package/@opensky/remotes"
				target="_blank"
				rel="noreferrer"
				aria-label="npm package"
			>
				<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<path
						d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z"
					/>
				</svg>
			</a>
		</div>
	</div>
</nav>
