# @opensky/remotes examples

A SvelteKit app with three small, real-world-ish demos of `enhancedForm` around [remote form functions](https://svelte.dev/docs/kit/remote-functions#form) and valibot schemas. A tab bar at the top switches between them, and every page has a "View the code" button showing its `+page.svelte`, remote function, and schema.

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

## The examples

### `/contact` — validation & submission state

- `.validate` field spreads, per-field issues, and the form-level `handlers` spread
- Async field validator with a `pending` indicator — enter `test@test.com` in the email field
- Sync field validator — include the word `spam` in the message
- Server-only validation via `invalid(issue.email(...))` — enter `taken@test.com` and submit
- Tracked form state (`pending`, `delayed`, `timeout`, `error`, `result`) and semantic callbacks

### `/profile` — auto-save

- `autoSubmit` — no save button anywhere; edits submit once input settles, or immediately when a field commits on blur
- A live status line driven by the form state (`Saving…` / `Saved at …`)
- Unchanged data is never re-submitted, and auto-submitting forms never reset after success

### `/application` — draft persistence

- `.persist` field spreads on every field — text inputs, a select, a textarea, and a checkbox group; fill some in, reload the page, and the draft comes back (checkbox selections included)
- `persist.maxAgeMs` — drafts older than 7 days are dropped at restore
- The "Discard draft" button calls `form.reset()`, which clears the form element, the validation state, and the saved draft in one go; a successful submission clears the draft too

Note: remote functions require the `kit.experimental.remoteFunctions` and `compilerOptions.experimental.async` flags — see [svelte.config.js](svelte.config.js). The "View the code" panels use a small vite plugin ([vite.config.ts](vite.config.ts)) because `?raw` imports can't target `.remote.ts` files directly — kit's remote transform matches them by filename.
