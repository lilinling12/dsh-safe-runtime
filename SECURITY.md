# Security Policy

## Current security boundary

The project is intentionally explicit about enforcement scope.

- Tool interception is a `tool-enforced` boundary.
- Broker-aware filesystem/process providers can become `provider-enforced`.
- Arbitrary in-process plugin isolation is NOT provided by the initial releases.
- `process-isolated` is reserved for an actual OS/process/container/microVM boundary.

Reports that demonstrate a bypass of a claimed guarantee are security issues.
A bypass that is explicitly documented as `EXPECTED_UNGOVERNED` is a known scope
boundary, not evidence of a stronger guarantee.

Never include secrets, private source, or raw credentials in public reports.
