# Contact form example

A minimal SvelteKit app showing `@opensky/remotes` (`enhancedForm`) with a [remote form function](https://svelte.dev/docs/kit/remote-functions#form) and a valibot schema.

## Setup

The example links `@opensky/remotes` from `../../packages/remotes`, so build the package first:

```sh
cd packages/remotes
bun install
bun run build
```

Then run the example:

```sh
cd examples/contact-form
bun install
bun run dev
```

## What it demonstrates

- Validation — `.validate` field spreads, per-field issues, and the form-level `handlers` spread ([src/routes/+page.svelte](src/routes/+page.svelte))
- Async field validator with a `pending` indicator — enter `test@test.com` in the email field
- Sync field validator — include the word `spam` in the message
- Server-only validation via `invalid(issue.email(...))` — enter `taken@test.com` and submit ([src/routes/form.remote.ts](src/routes/form.remote.ts))
- Tracked form state (`pending`, `delayed`, `timeout`, `error`, `result`) and semantic callbacks
- Draft persistence — `.persist` field spreads; type into the form, reload the page, and the values come back

Note: remote functions require the `kit.experimental.remoteFunctions` and `compilerOptions.experimental.async` flags — see [svelte.config.js](svelte.config.js).
