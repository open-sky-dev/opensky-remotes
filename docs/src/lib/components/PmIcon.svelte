<script lang="ts">
	import type { PackageManager } from '$lib/package-managers'

	let { id, size = 16 }: { id: PackageManager; size?: number } = $props()
</script>

{#if id === 'npm'}
	<!-- npm: the classic red mark with the wordmark cut out -->
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
		<path
			fill="#CB3837"
			fill-rule="evenodd"
			d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z"
		/>
	</svg>
{:else if id === 'bun'}
	<!-- bun: cream mascot approximation -->
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
		<rect x="0.5" y="1.5" width="23" height="21" rx="8" fill="#FBF0DF" stroke="#E5DBC5" />
		<ellipse cx="9" cy="12.4" rx="1.35" ry="1.7" fill="#3A2B1F" />
		<ellipse cx="15" cy="12.4" rx="1.35" ry="1.7" fill="#3A2B1F" />
		<circle cx="6.6" cy="14.6" r="1.3" fill="#F7B8B0" />
		<circle cx="17.4" cy="14.6" r="1.3" fill="#F7B8B0" />
		<path
			d="M10.1 14.9c.55.7 3.25.7 3.8 0"
			stroke="#3A2B1F"
			stroke-width="1"
			stroke-linecap="round"
			fill="none"
		/>
	</svg>
{:else}
	<!-- pnpm: the square grid, brand orange over graphite -->
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
		<path
			fill="#F9AD00"
			d="M0 0v7.5h7.5V0zm8.25 0v7.5h7.5V0zm8.25 0v7.5H24V0zM8.25 8.25v7.5h7.5v-7.5zm8.25 0v7.5H24v-7.5zm0 8.25V24H24v-7.5z"
		/>
		<path
			fill="#4E4E4E"
			d="M8.25 16.5V24h7.5v-7.5zM0 16.5V24h7.5v-7.5zM0 8.25v7.5h7.5v-7.5z"
		/>
	</svg>
{/if}
