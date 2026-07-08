<script lang="ts">
	import '../app.css'
	import Sidebar from '$lib/components/Sidebar.svelte'
	import MobileNav from '$lib/components/MobileNav.svelte'

	let { children } = $props()
</script>

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
