<script lang="ts">
	import { page } from '$app/state'

	let { children } = $props()

	const examples = [
		{ href: '/contact', label: 'Contact form', hint: 'validation & submission state' },
		{ href: '/profile', label: 'Profile settings', hint: 'auto-save' },
		{ href: '/application', label: 'Job application', hint: 'draft persistence' }
	]
</script>

<div class="shell">
	<header>
		<p class="brand">@opensky/remotes</p>
		<nav>
			{#each examples as example (example.href)}
				<a href={example.href} class:active={page.url.pathname === example.href}>
					<span class="label">{example.label}</span>
					<span class="hint">{example.hint}</span>
				</a>
			{/each}
		</nav>
	</header>

	{@render children()}
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: system-ui, sans-serif;
		color: #1a1a1a;
	}

	.shell {
		max-width: 34rem;
		margin: 0 auto 4rem;
		padding: 0 1rem;
	}

	header {
		padding: 1.5rem 0 0;
	}

	.brand {
		margin: 0 0 0.75rem;
		font-size: 0.8125rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		color: #666;
	}

	nav {
		display: flex;
		gap: 0.375rem;
		border-bottom: 1px solid #e5e5e5;
	}

	nav a {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		padding: 0.5rem 0.75rem;
		border: 1px solid transparent;
		border-bottom: none;
		border-radius: 0.375rem 0.375rem 0 0;
		text-decoration: none;
		color: #444;
	}

	nav a:hover {
		background: #f5f5f5;
	}

	nav a.active {
		border-color: #e5e5e5;
		background: white;
		position: relative;
		top: 1px;
		color: #1a1a1a;
	}

	.label {
		font-size: 0.875rem;
		font-weight: 500;
	}

	.hint {
		font-size: 0.6875rem;
		color: #888;
	}
</style>
