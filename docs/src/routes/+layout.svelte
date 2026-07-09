<script lang="ts">
	import '../app.css'
	import { SeoTags } from '@opensky/seo'
	import Sidebar from '$lib/components/Sidebar.svelte'
	import MobileNav from '$lib/components/MobileNav.svelte'

	let { children } = $props()
</script>

<SeoTags />

<div class="top-fade" aria-hidden="true"></div>

<a class="wordmark" href="/">@opensky/remotes</a>

<MobileNav />

<div class="shell">
	<aside>
		<Sidebar />
	</aside>
	<main>
		<div class="content">
			{@render children()}
		</div>
	</main>
</div>
