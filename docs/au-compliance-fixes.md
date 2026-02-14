# AU Compliance Fixes

This follow-up note documents the Australian market compliance fixes now in the app:

- Financial-year aware tax engine for `2024-25`, `2025-26`, and `2026-27`.
- Medicare levy low-income reduction handling.
- Medicare Levy Surcharge support for single and family threshold paths.
- FY-aware super contribution caps with carry-forward and bring-forward calculations.
- Updated superannuation UI cap messaging to reflect dynamic cap eligibility.
- Microburbs provider now performs direct API requests instead of stubbed throw paths.

Validation completed in this change set:

- `npm run test:run`
- `npm run lint`
- `npm run build`
