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
- M4-030 TTL: **GOVERNANCE CLOSED**
- M4-031 maxUses / usage validity: **GOVERNANCE CLOSED**
- M4-032 atomic consume: **AUTHORIZED / PROTOCOL-FIRST IN PROGRESS**
- M4-032 production implementation: **NOT AUTHORIZED until the protocol-first exact head is dual-green**
- M4-033+, M4-040+ and M6: **NOT AUTHORIZED**

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

Harness behavior MUST NOT define atomic Lease consumption semantics.

## M4-031 final governance closure

Final-governance exact head:

```text
6942fa98ebd871927a1db4143c99090f51695c69
```

Its parent acceptance-record head was:

```text
68494d35e2f488f631370b80c6f84ce35a9d1818
```

The final-governance delta was exactly:

```text
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md   # +59 / -0 append-only
docs/roadmap.md           # +1 / -1; only M4-031 acceptance marker
```

Exact-head evidence:

- normal CI #523 / run `33598278938`: PASS;
- exact Harness rc5 source-conformance #465 / run `33598278951`: PASS;
- frozen install: PASS;
- `pnpm check:all`: PASS;
- pinned Harness build/install/projection/idempotence/typecheck/runtime: PASS;
- PR #3: Open, Draft, mergeable;
- reviews: none;
- review threads: none.

Therefore M4-031 governance is CLOSED.

M4-032 P0 atomic consume is the only newly authorized engineering Gate.

## M4-032 authority reconciliation

Existing protocol authority already establishes:

- `CapabilityLease.leaseRef` is stable Lease identity;
- `maxUses` and `remainingUses` are required Lease counters;
- Core §11 requires exhausted Leases to become invalid immediately;
- Lease validation occurs before Action execution;
- M4-022 lookup is candidate discovery only and does not mutate counters;
- M4-031 is read-only usage validation and explicitly does not reserve,
  decrement, lock, transact, linearize or solve TOCTOU.

Published M4-031 usage coherence remains:

```text
1 <= maxUses <= 9007199254740991
0 <= remainingUses <= maxUses
```

The request-time `leaseRequest.maxUses <= 100000` bound remains an issuance
request bound only and is not imported into an already-materialized Lease.

There is currently no CapabilityLease wire revision/CAS/idempotency field and no
accepted broker Lease store abstraction. M4-032 MUST NOT invent a database-vendor
wire model or mutate the public CapabilityLease schema merely to obtain
atomicity.

## M4-032 protocol-first draft

Normative specification:

```text
specs/0039-m4-capability-lease-atomic-consume.md
```

Portable corpus:

```text
fixtures/lease-consume/cases.json
```

Corpus profile:

```text
M4-032_LEASE_CONSUME_V1
```

Portable cases: `40`, canonical sequential IDs `LCON-001` through `LCON-040`.

The protocol-first delta is limited to:

```text
docs/handoff/CURRENT.md
fixtures/lease-consume/cases.json
specs/0039-m4-capability-lease-atomic-consume.md
```

No production TypeScript, CapabilityLease schema/type, Shared TCK registration,
dependency, lockfile, Adapter/Harness baseline, M4-033+, M4-040+ or M6 file is
authorized before this protocol-first exact head is dual-green.

## M4-032 portable consume input

The caller input is exactly:

```text
LeaseConsumeInput {
  profile: "M4-032_LEASE_CONSUME_V1"
  leaseRef: ref
}
```

The caller does not supply `maxUses` or `remainingUses`.

This is deliberate: a previously observed M4-031 snapshot is not authoritative
for mutation and cannot reserve the final use.

Counter authority comes only from the authoritative Lease store transition.

## M4-032 authoritative usage state

The minimal semantic store projection is:

```text
LeaseUseState {
  leaseRef: ref
  maxUses: integer
  remainingUses: integer
}
```

This is operational state, not a second CapabilityLease wire model.

M4-032 interprets no TTL, revocation, delegation, policy, approval, Resource,
constraint or authorization provenance field.

## Atomic one-use transition

For one valid `leaseRef`, the store transition is:

```text
missing lease
  -> NOT_CONSUMED / LEASE_CONSUME_NOT_FOUND

invalid M4-031 usage state
  -> FAIL_CLOSED / USAGE / preserved M4-031 reason

remainingUses == 0
  -> NOT_CONSUMED / LEASE_USAGE_EXHAUSTED

remainingUses > 0
  -> atomically commit remainingUses := remainingUses - 1
  -> CONSUMED / LEASE_USE_CONSUMED
```

A successful invocation consumes exactly one use and returns the before/after
remaining-use counters around the linearization point.

No state is repaired or clamped.

## Concurrency requirement

M4-032 requires per-Lease linearizability.

For all overlapping consume invocations targeting one Lease, there must exist
one total order consistent with real-time ordering.

No underflow, lost update or double-consumption of one remaining use is allowed.

From:

```text
remainingUses = R
concurrent attempts = N
```

with no store failure:

```text
successful consumes <= min(R, N)
```

The portable corpus includes aggregate concurrent cases where winner identity is
not prescribed but status counts and final authoritative state are.

Different Lease identities do not require one global serialization lock.

## Store failure boundary

A backend failure known to occur before any linearization returns:

```text
FAIL_CLOSED / STORE / LEASE_CONSUME_STORE_UNAVAILABLE
```

An ambiguous backend result where commit status cannot be proven returns:

```text
FAIL_CLOSED / STORE / LEASE_CONSUME_OUTCOME_UNKNOWN
```

The primitive performs no automatic retry.

Blindly retrying an ambiguous result could consume twice if the first transition
actually committed.

M4-032 therefore claims linearizable one-use consumption per invocation, not
distributed exactly-once delivery across caller retries.

No new `requestRef`, `actionRef` or `consumeRef` deduplication record is invented
without an accepted protocol state model.

## Runtime/security requirements for later implementation

After protocol-first dual-green, the TypeScript reference implementation must:

- accept consume request input as `unknown`;
- inspect exact own request data properties only;
- reject inherited/accessor/symbol/unexpected input without executing getters;
- fail closed on revoked Proxy/meta-operation failures;
- validate `leaseRef` under existing `defs.ref` 1..512 code-point semantics;
- take counters only from authoritative store state;
- preserve M4-031 exact-integer/coherence validation before decrement;
- invoke the authoritative store no more than once per primitive invocation;
- never automatically retry an unavailable/unknown store outcome;
- return detached frozen outputs;
- sanitize host/provider failures;
- include concurrency and store-fault hardening tests.

A reference in-memory store may claim atomicity only for its documented
single-process scope. A database/multi-process adapter must have backend-specific
atomicity evidence before claiming the same guarantee.

## Boundaries that remain enforced

- M4-032 does not select among multiple M4-022 candidate Leases.
- M4-032 does not accept or inspect TTL timestamps.
- M4-032 does not implement revocation.
- M4-032 does not consume a parent or prove child attenuation.
- M4-032 does not rerun policy/approval.
- M4-032 does not construct Decision/Receipt records.
- M4-032 does not assign a GuaranteeLevel.
- M4-032 does not authorize or execute a PEP.
- M4-032 does not claim exactly-once behavior across retries.
- DeepSeek Harness remains compatibility evidence only.
- M4-033+, M4-040+ and M6 remain unauthorized.
- PR #3 remains Draft; no merge without explicit user authorization.

## Gate

The resulting exact protocol-first head MUST reach:

1. normal repository CI PASS;
2. exact pinned Harness rc5 source-conformance PASS;
3. PR #3 remains Open/Draft/mergeable;
4. no review/review-thread blocker exists.

Only after that same exact head is dual-green may M4-032 production TypeScript
begin.

## Resume instruction

1. refresh PR #3 exact head/base/reviews/threads;
2. verify the protocol-first delta from `6942fa98...` is exactly CURRENT +
   `fixtures/lease-consume/cases.json` + Spec 0039;
3. require exact-head normal CI + pinned Harness rc5 source-conformance
   dual-green;
4. only then authorize M4-032 production implementation;
5. keep M4-033+, M4-040+, M6 and PR merge unauthorized.
