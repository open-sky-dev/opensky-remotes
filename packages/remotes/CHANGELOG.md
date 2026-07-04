# Changelog

## [0.0.3]

### Added

- Added `formHandler` to validation instances for showing all registered issues on submit attempts, including submissions blocked by SvelteKit preflight validation.
- Added `formIssues` to validation instances — form-level issues without a field path, e.g. from `invalid('message')` on the server. These are mirrored on every issue update, no registration needed.
- Added `allKnownIssues` to validation instances — a debugging view of every issue currently known, whether displayed or not: everything the form holds right now (including unregistered and untouched fields) merged with custom and validator issues. `allIssues` remains the currently displayed issues only.
- `formHandler` now also clears validation state (issues and dirty tracking) when the form resets, matching SvelteKit's clearing of its own issues and touched state on reset. This covers the automatic reset after successful submissions as well as manual resets.
- `clearAllIssues()` now invalidates in-flight validations so a slow validation or async validator can no longer write stale issues back after a clear.
- Removing a field validator while it is running no longer lets it write an orphaned issue that nothing owns.
- Added `reset()` method to enhanced form instances for manually resetting state back to 'idle'.
- Added `cancel()` and `updates()` functions to `onSubmit` callback for client-side validation and optimistic updates.
- Added `addIssue()` method to validation instances for adding custom validation errors.

### Changed

- **BREAKING**: Updated to SvelteKit's current remote form `enhance` API and raised the peer dependency to `@sveltejs/kit >= 2.68`. Enhance callbacks now receive the remote form instance as `form` (with `element`, `fields`, `submit()`, `result`) instead of `{ form: HTMLFormElement, data, remote }`. Use `form.element` for the form element and `form.fields.value()` for the data being submitted.
- The callbacks argument of `enhance` is now optional, so an enhanced form can be used purely for state tracking.
- **BREAKING**: Renamed `success` state to `result` throughout the enhanced form lifecycle for better semantic clarity.
- **BREAKING**: Renamed `validator` option to `validation` in `createEnhancedForm` for consistency with `createValidation`.
- **BREAKING**: Moved `delayMs` and `timeoutMs` from enhance callback options to `createEnhancedForm` creation options. This enables type-safe conditional states where `delayed` and `timeout` state accessors are only available when their corresponding timing options are provided. Callbacks (`onDelay`, `onTimeout`) are now optional but can only be used when the corresponding timing option is set at creation.

### Changed (internal)

- Reworked issue storage: the three issue layers (mirrored validation issues, custom issues, validator issues) are now flat reactive records keyed by field path, with a field's displayed issues merged on read and the `allIssues` tree computed via `$derived`. This removes the hand-maintained merged-issues cache and the nested tree bookkeeping that had to be kept in sync at every write site.

### Fixed

- `clearIssues()` on a parent path now clears validator issues of nested fields too (previously only the tree-stored layers were cleared for the subtree).
- `allIssues` no longer retains `null` entries for fields whose issues were cleared — cleared fields simply disappear from the tree.
- Removed a redundant second server validation round-trip on blur — `form.validate()` already checks the server when preflight passes, halving validation traffic on clean blurs.
- `formHandler` now runs preflight-only validation on submit attempts instead of a full server round-trip. SvelteKit blocks submissions on preflight failure alone, so this covers every blocking case with zero network; server-side issues still arrive with the submission response.
- Validation event handlers (`onblur`, `oninput`, `formHandler`) and the enhanced form's validation integration no longer surface unhandled promise rejections when a validation request fails — the currently displayed issues are kept instead. This also prevents SvelteKit from navigating to the nearest error page when a validation refresh fails inside the enhance callback.
- `validateAll()` and `updateIssues()` now refresh fields in parallel instead of sequentially, so total latency is the slowest field's validators rather than the sum of all of them (validator order within a field is preserved).
- Field validators now receive `value` typed as possibly `undefined`, matching the runtime behavior for empty or untouched fields.
- Fixed a crash after successful submissions on SvelteKit 2.61+ ("The `form` property has been removed from the `enhance` callback argument") that left the enhanced form stuck in the 'error' state. The post-submit form reset now uses the instance's `element` and mirrors SvelteKit's default enhance behavior (waits a tick, then resets via the prototype).

## [0.0.2]

### Added

- `createEnhancedForm` helper for managing form submission lifecycle with state tracking and callbacks. Provides reactive state getters (idle, pending, delayed, timeout, issues, error, success) and integrates with createValidation for automatic validation handling.

## [0.0.1]

### Added

- `createValidation` helper for reactive form validation with debounced remote validation. Provides event handlers for inputs with smart issue display logic - issues appear on blur but clear on input for better UX.
