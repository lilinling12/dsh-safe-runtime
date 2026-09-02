# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK and accepted exact-head evidence
> remain semantic authority.

## Snapshot

- Recorded at: `2026-09-02`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M4 — Capability Broker v0.1`
- Active pull request: `#3 — feat(policy): begin M4 capability broker`
- Branch: `feat/m4-capability-broker`
- Base: `main@57430273e065be8d38807d67b175fa154c801d43`
- M4-001 through M4-014: **GOVERNANCE CLOSED**
- M4-020 through M4-025: **GOVERNANCE CLOSED**
- M4-030 TTL: **IMPLEMENTATION ACCEPTED / ACCEPTANCE-RECORD DUAL-GREEN**
- M4-030 final governance: **IN PROGRESS — final governance exact head must be dual-green before closure**
- M4-031+, M4-040+ and M6: **NOT AUTHORIZED**

Live GitHub state overrides this file.

## Live ancestry note

The long-running PR retains known ancestry-only drift relative to `main`. The
reconciled merge-base `65870612d039ce026a6952c16d5e069b11bd24a7` and
`main@57430273e065be8d38807d67b175fa154c801d43` point to source tree
`ed0c142bf6bbd00f607cc169222f0bf67057fca5`.

Do not rebase, force-update, squash, or rewrite accepted ancestry merely to
change GitHub compare counters.

## Compatibility baseline

DeepSeek Harness remains Adapter compatibility evidence only:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

Harness behavior, host clocks and runtime parsing MUST NOT define Lease TTL
semantics. M4-030 remains protocol-first and runtime-independent.

## M4-025 closure prerequisite

M4-025 final-governance exact head:

```text
47f918a83c331db1589cb9cb7f332920521ab51d
```

Exact-head evidence:

- normal CI #511 / run `33469235589`: PASS;
- exact Harness rc5 source-conformance #453 / run `33469235567`: PASS;
- PR #3 remained Open, Draft and mergeable with no review/thread blocker.

Therefore M4-025 governance is CLOSED and M4-030 was authorized to begin
protocol-first.

## M4-030 protocol-first closure

Normative specification:

```text
specs/0037-m4-capability-lease-ttl.md
```

Portable corpus:

```text
fixtures/lease-ttl/cases.json
```

Corpus profile:

```text
M4-030_LEASE_TTL_V1
```

Portable cases: `32`, canonical sequential IDs `LTTL-001` through `LTTL-032`.

Protocol-first exact head:

```text
8cb3a9054cd8a1f0114f3cc5fdd9cf5000548efd
```

Relative to M4-025 final governance, the protocol-first delta was exactly:

```text
docs/handoff/CURRENT.md
fixtures/lease-ttl/cases.json
specs/0037-m4-capability-lease-ttl.md
```

Exact-head evidence:

- normal CI #512: PASS;
- exact Harness rc5 source-conformance #454: PASS;
- no review/review-thread blocker.

Production TypeScript began only after that same-head dual-green prerequisite.

## M4-030 accepted semantics

M4-030 evaluates only the time-window validity of an already-materialized
CapabilityLease at caller-supplied logical observation time.

Portable input is exactly:

```text
LeaseTtlEvaluationInput {
  profile: "M4-030_LEASE_TTL_V1"
  issuedAt: timestamp
  expiresAt: timestamp
  observedAt: timestamp
}
```

The authoritative interval is:

```text
[issuedAt, expiresAt)
```

Therefore:

```text
observedAt == issuedAt  -> TIME_ELIGIBLE / LEASE_TTL_ACTIVE
observedAt <  issuedAt  -> TIME_INELIGIBLE / LEASE_TTL_NOT_YET_ACTIVE
observedAt >= expiresAt -> TIME_INELIGIBLE / LEASE_TTL_EXPIRED
issuedAt >= expiresAt   -> FAIL_CLOSED / TIME / LEASE_TTL_WINDOW_INVALID
```

Comparison is by deterministic RFC3339 instant rather than timestamp text.
Offset-equivalent values compare equal; arbitrary fractional precision is
preserved without floating-point rounding; Gregorian validation includes the
century rule; deterministic leap-second ordering is explicit and does not rely
on a host leap table.

`observedAt` is an explicit logical input. The accepted implementation does not
consult `Date()`, `new Date()`, `Date.now()`, `Date.parse()`, `Date.UTC()` or
another host wall-clock source.

`requestedLease.ttlMs` / policy `lease.ttlMs` remain issuance-request bounds.
M4-030 does not reconstruct them from an existing Lease and does not infer a
24-hour lifetime cap.

`TIME_ELIGIBLE` means only time-window eligibility. It is not authorization and
does not imply usage availability, non-revocation, valid delegation or PEP
permission.

## M4-030 accepted implementation

Initial implementation head:

```text
90c3462320b61b8db2ba74b6bc9fd2be4e397245
```

Acceptance review then added test-only hardening without changing production
semantics:

```text
4931be505b7e0b138d0d2c47f4e1751fcb8e59ee  Gregorian century regressions
e7c2832f1263d744e3de6916e01c30db374ce68c  descriptor-trap / no-host-Date regressions
```

Accepted implementation/hardening exact head:

```text
e7c2832f1263d744e3de6916e01c30db374ce68c
```

Net implementation delta from the protocol-first head is exactly:

```text
packages/capability-broker/src/index.ts
packages/capability-broker/src/lease-ttl-hardening.test.ts
packages/capability-broker/src/lease-ttl-types.ts
packages/capability-broker/src/lease-ttl.test.ts
packages/capability-broker/src/lease-ttl.ts
```

No schema, Shared TCK, Adapter/Harness baseline, dependency, lockfile or later
Lease Gate was changed.

Exact accepted implementation evidence:

- normal CI #515 / run `33554652123`: PASS;
- exact Harness rc5 source-conformance #457 / run `33554649460`: PASS;
- frozen install / 124-entry supply-chain policy: PASS;
- architecture boundaries / 16-schema shape / schema baseline: PASS;
- strict workspace TypeScript: PASS;
- 53 test files / 1024 tests: PASS;
- M4-030 primary suite: 36 PASS;
- M4-030 hostile-runtime hardening suite: 12 PASS;
- oxlint: 0 errors and two inherited repository warnings;
- packed Shared TCK + external non-workspace consumer: 44 assets PASS;
- pinned Harness build/install/projection/idempotence/exact-source typecheck/runtime: PASS.

## M4-030 acceptance record

Acceptance audit commit:

```text
fbe7583ae32472d5553590cd1a1c28dd67676586
```

The audit is:

```text
docs/acceptance/m4-030-acceptance-audit.md
```

Audit-only exact-head evidence:

- normal CI #516: PASS;
- exact Harness rc5 source-conformance #458: PASS.

Package-stage acceptance-record exact head:

```text
0d2a07a4753bda5f2ebcbbdf50725e2c5413e4b9
```

That transition changed only the Capability Broker package-stage comment/marker
to `M4-030-LEASE-TTL-ACCEPTED`.

Exact-head evidence for `0d2a07a4...`:

- normal CI #517 / run `33555584220`: PASS;
- exact Harness rc5 source-conformance #459 / run `33555584238`: PASS;
- PR #3: Open, Draft, mergeable;
- reviews: none;
- review threads: none.

Therefore the implementation and acceptance record are accepted. Final
governance bookkeeping is now the only active M4-030 Gate.

## Final governance scope

The final-governance commit may change only:

```text
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md   # append-only
docs/roadmap.md           # only M4-030 acceptance marker
```

It MUST NOT change production code, Spec/corpus/schema, Shared TCK,
Adapter/Harness baseline, dependency, lockfile, M4-031+ semantics or PR merge
state.

The resulting final-governance exact head MUST reach:

1. normal repository CI PASS;
2. exact pinned Harness rc5 source-conformance PASS;
3. PR #3 remains Open/Draft/mergeable with no review/review-thread blocker.

Only after that same exact head is dual-green is M4-030 governance CLOSED and
M4-031 P0 maxUses authorized to begin protocol-first.

## Boundaries that remain enforced

- M4-030 does not inspect `maxUses` or `remainingUses`.
- M4-030 does not perform atomic consumption.
- M4-030 does not implement revocation.
- M4-030 does not validate parent-child attenuation.
- M4-030 does not rerun policy/approval or construct new authorization.
- M4-030 does not execute a PEP.
- DeepSeek Harness remains compatibility evidence only.
- M4-031+, M4-040+ and M6 remain unauthorized until their own Gate opens.
- PR #3 remains Draft; no merge without explicit user authorization.

## Resume instruction

1. refresh PR #3 exact head/base/reviews/threads;
2. verify the final-governance delta from `0d2a07a4...` is exactly CURRENT +
   append-only HISTORY + only the M4-030 roadmap marker;
3. require exact-head normal CI + pinned Harness rc5 source-conformance
   dual-green;
4. only after that evidence declare M4-030 governance CLOSED;
5. then authorize M4-031 P0 maxUses as the only next protocol-first Gate;
6. keep M4-032+, M4-040+, M6 and PR merge unauthorized.
