# M1 Self-Review Notes

Date: 2026-08-17

## Issues found and corrected before implementation

1. Transaction state projection initially omitted `PREPARING`, `PREPARING_COMMIT`, `RECOVERY_REQUIRED`, and `ABORTED`.
   It was corrected to match the normative state machine.
2. Transaction scope was normalized to the normative literal `workspace-filesystem-effects`.
3. Examples mixed `leaseId`/`leaseRef`, `receiptId`/`receiptRef`, and `transactionId`/`transactionRef`.
   Canonical cross-component identifiers now consistently use `*Ref`.
4. Policy precedence was tightened from an implementation recommendation to a v0.1 deterministic profile.
5. Schema compatibility now has an explicit SHA-256 baseline so schema changes cannot occur silently in CI.

## Deliberately deferred

- DeepSeek Harness concrete imports and event mapping: M2.
- Runtime semantic TCK against a real Harness instance: M3.
- Policy engine implementation: M4.
- Workspace transactional providers: M6+.

This deferral is intentional: implementation is not allowed to define protocol semantics backwards.
