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
- M4-030 TTL: **AUTHORIZED / PROTOCOL-FIRST IN PROGRESS**
- M4-030 production implementation: **NOT AUTHORIZED until the resulting protocol-first exact head is dual-green**
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

Harness behavior MUST NOT define Lease TTL semantics. M4-030 is protocol-first
and runtime-independent.

## M4-025 final governance closure

M4-025 acceptance-record exact head:

```text
40ba27452f90e06fe4daa3f2a4243986f7d5d0ed
```

Final-governance exact head:

```text
47f918a83c331db1589cb9cb7f332920521ab51d
```

The net final-governance delta from the acceptance-record head is exactly:

```text
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md   # +62 / -0 append-only
docs/roadmap.md           # +1 / -1; only M4-025 acceptance marker
```

Exact-head evidence for `47f918a8...`:

- normal CI #511 / run `33469235589`: PASS;
- exact Harness rc5 source-conformance #453 / run `33469235567`: PASS;
- frozen install / `pnpm check:all`: PASS;
- pinned Harness build/install/projection/idempotence/exact-source typecheck/runtime: PASS;
- PR #3: Open, Draft, mergeable;
- reviews: none;
- unresolved review threads: none.

Therefore:

```text
M4-025: GOVERNANCE CLOSED
M4-030: P0 TTL — AUTHORIZED / PROTOCOL-FIRST
```

PR #3 merge remains unauthorized without explicit user approval.

## M4-030 authority reconciliation

Existing protocol authority already defines the Lease timestamp fields:

```text
schemas/v1alpha1/capability-lease.schema.json
packages/protocol/src/capability.ts
specs/0001-safe-runtime-core.md §11
specs/0002-state-machines-and-precedence.md §3
specs/0033-m4-capability-lease-lookup.md §8
```

Published `CapabilityLease` already contains:

```text
issuedAt
expiresAt
maxUses
remainingUses
authorization
parentLeaseRef?
```

M4-022 explicitly returns Lease candidates without evaluating `issuedAt` /
`expiresAt` and delegates time validity to M4-030.

The roadmap keeps lifecycle responsibilities separate:

```text
M4-030 TTL
M4-031 maxUses / usage validity
M4-032 atomic consume
M4-033 revoke
M4-034 parent-child attenuation
```

M4-030 therefore MUST NOT change the Lease schema or absorb later-Gate
semantics.

## M4-030 protocol-first draft

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

The authorized protocol-first delta is limited to:

```text
docs/handoff/CURRENT.md
fixtures/lease-ttl/cases.json
specs/0037-m4-capability-lease-ttl.md
```

No production TypeScript, protocol wire type, schema, Shared TCK, dependency,
lockfile, Adapter/Harness baseline, M4-031+, M4-040+ or M6 file is authorized
before this protocol-first exact head is dual-green.

## M4-030 normative lifetime semantics

M4-030 evaluates only the existing Lease time window at an explicit logical
observation time.

Portable input:

```text
LeaseTtlEvaluationInput {
  profile: "M4-030_LEASE_TTL_V1"
  issuedAt: timestamp
  expiresAt: timestamp
  observedAt: timestamp
}
```

The primitive MUST NOT read host wall clock. `observedAt` is explicit.

A coherent lifetime is the half-open interval:

```text
[issuedAt, expiresAt)
```

Therefore:

```text
observedAt == issuedAt  -> TIME_ELIGIBLE
observedAt <  issuedAt  -> TIME_INELIGIBLE / LEASE_TTL_NOT_YET_ACTIVE
observedAt == expiresAt -> TIME_INELIGIBLE / LEASE_TTL_EXPIRED
observedAt >  expiresAt -> TIME_INELIGIBLE / LEASE_TTL_EXPIRED
```

`issuedAt >= expiresAt` is malformed lifecycle data and fails closed with
`LEASE_TTL_WINDOW_INVALID`.

Timestamp comparison is by RFC3339 instant, not text. Offset-equivalent values
compare equal; arbitrary fractional precision is preserved; lowercase `t/z`
remain accepted under the existing lexical profile; deterministic leap-second
ordering is specified without delegating to host date parsing.

## Requested TTL boundary

`CapabilityRequest.requestedLease.ttlMs` and policy-rule `lease.ttlMs` are
issuance-request bounds. They are not fields on an existing CapabilityLease.

M4-030 MUST NOT reconstruct or enforce requested `ttlMs` against an existing
Lease without authoritative issuance context. In particular, it does not infer
a global 24-hour lifetime cap from the `leaseRequest.ttlMs` schema maximum.

## M4-031+ separation

M4-030 does not inspect or decide:

```text
maxUses
remainingUses
atomic consume
revocation
parentLeaseRef attenuation
authorization provenance
Lease candidate selection
approval bypass
PEP execution
```

`TIME_ELIGIBLE` means only time-window eligibility. It MUST NOT be interpreted
as a usable or authorizing Lease.

## Runtime/security requirements for later implementation

After protocol-first dual-green, the TypeScript reference implementation must:

- accept runtime input as `unknown`;
- inspect exact own data properties only;
- reject accessors without executing getters;
- reject inherited/symbol/unexpected fields;
- fail closed on revoked/unreadable Proxies and meta-operations;
- avoid implicit string/number coercion;
- avoid `Date.parse`, locale APIs and host wall clock;
- compare offsets/fractions deterministically without precision truncation;
- return detached frozen success/failure objects;
- never echo attacker-controlled timestamps or host exception text.

Portable JSON fixtures do not model host-language Proxy/accessor attacks; those
must be added as production implementation regressions after authorization.

## Protocol-first Gate

The resulting exact head for this three-file protocol-first delta MUST reach:

1. normal CI PASS;
2. exact pinned Harness rc5 source-conformance PASS;
3. PR #3 remains Open/Draft/mergeable with no review/review-thread blocker.

Only after that **same exact head** is dual-green may M4-030 production
TypeScript begin.

If CI fails, inspect the real failing job/step/diagnostic for that exact head.
Do not weaken schema, validators, strict TypeScript, conformance tests, frozen
lockfile, security boundaries or Harness source-conformance to obtain green.

## Boundaries that remain enforced

- DeepSeek Harness is Adapter compatibility evidence only.
- M4-030 does not change the published CapabilityLease wire model.
- M4-030 does not derive authority from host time or locale parsing.
- M4-031+ remain unauthorized until M4-030 is accepted through its own Gate.
- M4-040+ PEP work remains unauthorized.
- M6 remains unauthorized.
- PR #3 remains Draft; no merge without explicit user authorization.

## Resume instruction

1. refresh PR #3 exact head/base/reviews/threads;
2. confirm the protocol-first delta against `47f918a8...` is exactly CURRENT +
   `fixtures/lease-ttl/cases.json` + Spec 0037;
3. require exact-head normal CI + pinned Harness rc5 source-conformance
   dual-green;
4. only then authorize production M4-030 implementation;
5. implement only the accepted TTL profile with hostile-runtime tests;
6. keep M4-031+, M4-040+, M6 and PR merge unauthorized.
