# Changelog

## [0.0.2]

### Added

- `createEnhancedForm` helper for managing form submission lifecycle with state tracking and callbacks. Provides reactive state getters (idle, pending, delayed, timeout, issues, error, success) and integrates with createValidation for automatic validation handling.

## [0.0.1]

### Added

- `createValidation` helper for reactive form validation with debounced remote validation. Provides event handlers for inputs with smart issue display logic - issues appear on blur but clear on input for better UX.
