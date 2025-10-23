# Changelog

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
