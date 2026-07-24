# Changelog

## 2.0.1 - 2026-07-24

- Included the active submitter name/value in `ReviewContext.formData`.
- Aggregated same-name checkbox groups into a single review entry.
- Clarified `mode: "page"` as a page-takeover review flow and added regression coverage for the current behavior.
- Hardened the npm publish workflow with version preflight checks, explicit provenance publishing, updated GitHub Actions versions, and release documentation.

## 2.0.0 - 2026-07-24

- Added a dependency-free TypeScript core.
- Added accessible dialog and page review modes.
- Added native validation and submission preservation.
- Added safe text rendering and privacy-aware masking.
- Added file metadata, sections, edit actions, lifecycle callbacks, and teardown.
- Added the jQuery 3.7+ compatibility adapter.
- Added build tooling, declarations, tests, and a modern demo.
- Added working ESM, CommonJS, and CDN-global entry points for the core and jQuery adapter.
- Fixed dialog reopening, submit-handler isolation, legacy password reveal behavior, and jQuery TypeScript augmentation.
- Fixed native validation parity for forms using `novalidate` and submitters using `formnovalidate`.
- Expanded the demo with multi-select, file, date/time, URL, number, color, range, hidden, output, and telephone controls.

Known follow-up items planned after 2.0.0:

- Include active submitter name/value in `ReviewContext.formData`.
- Aggregate same-name checkbox groups into a single review entry.
- Define fuller `mode: "page"` semantics beyond the current overlay-style flow.
- Explore optional reveal controls and sanitized callback context behavior for sensitive fields.
