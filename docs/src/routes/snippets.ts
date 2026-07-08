import type { CodeLang } from '$lib/server/highlight'
import { packageManagers } from '$lib/package-managers'

type Snippet = { lang: CodeLang; code: string }

// One highlighted snippet per package manager (keys: install_npm, install_bun, …)
const installSnippets = Object.fromEntries(
	packageManagers.map((m) => [`install_${m.id}`, { lang: 'bash', code: m.command } as Snippet])
)

export const snippets: Record<string, Snippet> = {
	...installSnippets,

	viteConfig: {
		lang: 'typescript',
		code: `// vite.config.ts — remote functions and async compilation are experimental,
// and since SvelteKit 2.62 the config can live on the plugin itself
import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: { experimental: { async: true } },
			experimental: { remoteFunctions: true }
		})
	]
})`
	},

	quickStart: {
		lang: 'svelte',
		code: `<script lang="ts">
	import { enhancedForm } from '@opensky/remotes'
	import { myForm } from './myForm.remote'
	import { schema } from './schema'

	const form = enhancedForm(myForm, {
		delayMs: 500,
		timeoutMs: 3500
	})
</script>

<form
	{...form.handlers}
	{...myForm.preflight(schema).enhance((instance) =>
		form.enhance(instance, {
			onDelay: () => console.log('showing loader'),
			onReturn: ({ result }) => console.log('success', result)
		})
	)}
>
	<input
		{...myForm.fields.name.as('text')}
		{...form.fields.name.validate}
		{...form.fields.name.persist}
		class:invalid={form.fields.name.issues}
	/>

	{#if form.fields.name.issues}
		{#each form.fields.name.issues as issue}
			<p class="error">{issue}</p>
		{/each}
	{/if}

	<button disabled={form.pending}>
		{form.delayed ? 'Loading...' : 'Submit'}
	</button>
</form>`
	},

	options: {
		lang: 'typescript',
		code: `const form = enhancedForm(myForm, {
	delayMs: 500, // unlocks the 'delayed' state and onDelay callback
	timeoutMs: 3500, // unlocks the 'timeout' state and onTimeout callback

	preventResetOnSuccess: true, // keep values after a successful submission

	persist: {
		key: 'my-form', // storage key (default: the remote form's action id)
		storage: 'session', // 'local' (default) or 'session'
		maxAgeMs: 86_400_000 // discard drafts older than this (default: no expiry)
	}
})

// autoSubmit is mutually exclusive with preventResetOnSuccess
const profileForm = enhancedForm(myForm, {
	autoSubmit: true // or { debounceMs: 600 }
})`
	},

	validators: {
		lang: 'typescript',
		code: `// A validator owns its own issue: if it returns one, it's shown;
// once it stops returning one, that issue clears itself
const removeValidator = form.fields.address.state.addValidator(({ value, issue }) => {
	if (!acceptedStates.includes(value)) {
		return issue('Your state is not accepted at this time')
	}
})

// Async validators expose \`pending\` on the field while they run
form.fields.email.addValidator(async ({ value, issue }) => {
	const available = await checkEmailAvailability(value)

	if (!available) {
		return issue('That email is already in use')
	}
})`
	},

	persist: {
		lang: 'svelte',
		code: `<!-- Spreading .persist is the whole opt-in — nothing to configure -->
<textarea {...myForm.fields.message.as('text')} {...form.fields.message.persist}></textarea>`
	},

	autoSubmit: {
		lang: 'typescript',
		code: `const form = enhancedForm(myForm, {
	autoSubmit: true // or { autoSubmit: { debounceMs: 600 } }
})`
	},

	callbacks: {
		lang: 'svelte',
		code: `<form
	{...form.handlers}
	{...myForm.preflight(schema).enhance((instance) =>
		form.enhance(instance, {
			onSubmit: ({ cancel, updates }) => {
				// Custom client-side checks before submission
				if (!customValidationCheck(myForm.fields.value())) {
					form.fields.fieldName.addIssues('Custom validation failed')
					cancel('issues') // cancel and set state to 'issues'
					return
				}

				// Optimistic updates
				updates(getPosts().withOverride((posts) => [newPost, ...posts]))
			},
			onReturn: ({ result }) => {},
			onIssues: () => {},
			onError: ({ error }) => {}
		})
	)}
>
	<!-- form fields -->
</form>`
	}
}
