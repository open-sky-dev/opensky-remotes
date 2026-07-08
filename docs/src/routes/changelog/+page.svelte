<script lang="ts">
	let { data } = $props()
</script>

<svelte:head>
	<title>Changelog — @opensky/remotes</title>
	<meta name="description" content="Release history for @opensky/remotes." />
</svelte:head>

<div class="doc rise-in">
	<section style="margin-top: 0">
		<h1>Changelog</h1>
		<p>Release history for <code>@opensky/remotes</code>. Newest first.</p>
		<!-- eslint-disable-next-line svelte/no-at-html-tags — rendered from the trusted, in-repo CHANGELOG.md -->
		<div class="markdown block">{@html data.html}</div>
	</section>
</div>
