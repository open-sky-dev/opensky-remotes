# Changelog

## [0.1.0]

### Added

- Added `resetOnSuccess` option to `createEnhancedForm` (default `true`). Set it to `false` for edit/settings forms that should keep their values visible after a successful save instead of clearing.
- Added `formHandler` to validation instances. Spread it onto the form to show all registered field issues on submit attempts, including submissions blocked by SvelteKit preflight validation (which never reach the enhance callback). It runs preflight-only validation — SvelteKit blocks on preflight failure alone, so no server request is needed — and also clears validation state (issues and dirty tracking) when the form resets, matching SvelteKit's clearing of its own issues and touched state.
- Added `fields.some.path.addValidator(validator)` — per-field custom validators, sync or async, receiving `{ value, issue }`. Each validator owns its own issue result: returning an issue shows it, returning nothing clears it, without affecting other layers. Returns a cleanup function.
- Added `fields.some.path.pending` for tracking in-flight validation per field.
- Added `formIssues` to validation instances — form-level issues without a field path, e.g. from `invalid('message')` on the server.
- Added `allKnownIssues` to validation instances — a debugging view of every issue currently known, whether displayed or not: everything the form holds right now (including unregistered and untouched fields) merged with custom and validator issues. `allIssues` remains the currently displayed issues only.

### Changed

- **BREAKING**: The enhanced form's boolean getters are now cumulative for in-flight states, like superforms: `pending` stays true through the 'delayed' and 'timeout' states, and `delayed` stays true through 'timeout' — so `disabled={enhanced.pending}` is sufficient on its own. The `state` getter remains exclusive (exactly one state at a time).
- Errors thrown by enhance callbacks are now logged to the console instead of escaping the enhance callback (which sent SvelteKit to the nearest error page) or being misreported as submission errors via `onError`. An error thrown in `onSubmit` aborts the submission and sets state to 'error', since its pre-submit checks may not have finished.
- **BREAKING**: `createValidation` fields are now a type-safe proxy mirroring the remote form's field shape. Use `valid.fields.address.state.handlers` and `valid.fields.address.state.issues` in place of `valid.fields('address.state')` and `valid.issues('address.state')`. `addIssue(path, issue)` is replaced by `fields.some.path.addIssues(issues)` (plus `removeIssue` and `clearIssues`), and `reset()` is now `clearAllIssues()`.
- **BREAKING**: Updated to SvelteKit's current remote form `enhance` API and raised the peer dependency to `@sveltejs/kit >= 2.68`. Enhance callbacks now receive the remote form instance as `form` (with `element`, `fields`, `submit()`, `result`) instead of `{ form: HTMLFormElement, data, remote }`. Use `form.element` for the form element and `form.fields.value()` for the data being submitted.
- Issues now only appear for fields the user has actually edited — focusing and leaving a field no longer triggers validation display (dirty tracking).
- The callbacks argument of `enhance` is now optional, so an enhanced form can be used purely for state tracking.

### Changed (internal)

- Collapsed `createEnhancedForm`'s four overloads into a single generic signature. The conditional API surface is unchanged — `delayed`/`timeout` state and `onDelay`/`onTimeout` callbacks are still only available when `delayMs`/`timeoutMs` are passed at creation — and is now locked in by compile-time type tests that run as part of `bun run check`.
- Reworked issue storage: the three issue layers (mirrored validation issues, custom issues, validator issues) are now flat reactive records keyed by field path, with a field's displayed issues merged on read and the `allIssues` tree computed via `$derived`. This removes the hand-maintained merged-issues cache and the nested tree bookkeeping that had to be kept in sync at every write site.

### Fixed

- Overlapping submissions no longer corrupt enhanced form state. Each submission takes a generation, and only the latest may update state, fire callbacks, or reset the form — a slow older submission can no longer overwrite a newer one's state, fire stale callbacks (like an error toast) while a newer submission is pending, or wipe the form's inputs after a late success. `reset()` now also detaches any in-flight submission from state updates.
- The delay/timeout timers can no longer clobber a settled state, and the delay timer no longer downgrades 'timeout' back to 'delayed' when `delayMs > timeoutMs`.
- Async `onDelay`/`onTimeout` callbacks no longer surface unhandled promise rejections.
- Fixed a crash after successful submissions on SvelteKit 2.61+ ("The `form` property has been removed from the `enhance` callback argument") that left the enhanced form stuck in the 'error' state. The post-submit form reset now uses the instance's `element` and mirrors SvelteKit's default enhance behavior (waits a tick, then resets via the prototype).
- Removed a redundant second server validation round-trip on blur — `form.validate()` already checks the server when preflight passes, halving validation traffic on clean blurs.
- Validation event handlers and the enhanced form's validation integration no longer surface unhandled promise rejections when a validation request fails — the currently displayed issues are kept instead. This also prevents SvelteKit from navigating to the nearest error page when a validation refresh fails inside the enhance callback.
- Clearing all issues now invalidates in-flight validations, so a slow validation can no longer write stale issues back after a clear.
- `validateAll()` and `updateIssues()` now refresh fields in parallel instead of sequentially, so total latency is the slowest field's validators rather than the sum of all of them (validator order within a field is preserved).
- `allIssues` no longer retains `null` entries for fields whose issues were cleared — cleared fields simply disappear from the tree.

## [0.0.3]

### Added

- Added `reset()` method to enhanced form instances for manually resetting state back to 'idle'.
- Added `cancel()` and `updates()` functions to `onSubmit` callback for client-side validation and optimistic updates.
- Added `addIssue()` method to validation instances for adding custom validation errors.

### Changed

- **BREAKING**: Renamed `success` state to `result` throughout the enhanced form lifecycle for better semantic clarity.
- **BREAKING**: Renamed `validator` option to `validation` in `createEnhancedForm` for consistency with `createValidation`.
- **BREAKING**: Moved `delayMs` and `timeoutMs` from enhance callback options to `createEnhancedForm` creation options. This enables type-safe conditional states where `delayed` and `timeout` state accessors are only available when their corresponding timing options are provided. Callbacks (`onDelay`, `onTimeout`) are now optional but can only be used when the corresponding timing option is set at creation.

## [0.0.2]

### Added

- `createEnhancedForm` helper for managing form submission lifecycle with state tracking and callbacks. Provides reactive state getters (idle, pending, delayed, timeout, issues, error, success) and integrates with createValidation for automatic validation handling.

## [0.0.1]

### Added

- `createValidation` helper for reactive form validation with debounced remote validation. Provides event handlers for inputs with smart issue display logic - issues appear on blur but clear on input for better UX.
