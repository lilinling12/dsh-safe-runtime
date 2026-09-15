# M4-032 — Atomic Capability Lease Use Consumption

Status: **DRAFT NORMATIVE SPECIFICATION**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-032 P0 — atomic consume`  
Depends on: M1 CapabilityLease model, M4-022 deterministic Lease lookup, M4-031 deterministic Lease usage validity  
Separated from: M4-030 TTL, M4-033 revocation, M4-034 parent-child attenuation, M4-040+ PEP integration

## 1. Purpose

M4-032 defines the portable state-transition and concurrency contract for
consuming exactly one use from one already-materialized `CapabilityLease`.

This Gate answers one narrow question:

> When a caller targets one Lease by stable `leaseRef`, can the authoritative
> Lease state consume at most one currently remaining use as one linearizable
> transition, without underflow, lost updates, stale-snapshot authorization or
> caller-controlled counter authority?

M4-032 is the first Lease Gate that mutates authoritative usage state.

It MUST NOT be implemented as:

```text
read remainingUses
if remainingUses > 0
  write remainingUses - 1
```

when the read and write are independently visible to competing consumers.

The roadmap deliberately separates:

- M4-030 — TTL / time-window validity;
- M4-031 — read-only usage validity;
- M4-032 — atomic one-use consumption;
- M4-033 — revocation;
- M4-034 — parent-child attenuation;
- M4-040+ — PEP composition and execution-time enforcement.

Atomic counter consumption is not by itself complete Lease authorization.

## 2. Existing protocol authority

M4-032 preserves the published v1alpha1 Lease wire model.

`schemas/v1alpha1/capability-lease.schema.json` already requires `leaseRef`,
`maxUses`, and `remainingUses`. `packages/protocol/src/capability.ts` exposes the
same required fields.

Core §11 requires a Lease to become invalid immediately after exhaustion and
requires Lease validation before Action execution.

M4-031 already fixed the portable exact-integer/coherence domain:

```text
1 <= maxUses <= 9007199254740991
0 <= remainingUses <= maxUses
```

and defines `remainingUses == 0` as exhausted.

M4-032 does not add a revision, consumed-count, reservation token, revocation
flag, idempotency key or mutable wrapper field to the CapabilityLease wire
schema.

The authoritative mutation state defined below is operational store state, not
a second public CapabilityLease wire model.

## 3. Caller identity versus store counters

The portable consume input is exactly:

```text
LeaseConsumeInput {
  profile: "M4-032_LEASE_CONSUME_V1"
  leaseRef: ref
}
```

There are no optional fields.

The caller identifies the Lease only by `leaseRef` and MUST NOT supply any of
these as consume authority:

```text
maxUses
remainingUses
expectedRemainingUses
expiresAt
issuedAt
revoked
parentLeaseRef
authorization
```

M4-032 MUST NOT trust a previously returned M4-022 candidate object or M4-031
read-only counter snapshot as the state that is decremented.

An implementation MAY use an internal storage version/CAS token, transaction
revision, row lock, compare-and-swap word, mutex state, or equivalent mechanism,
but that mechanism is not portable caller input and does not alter the
CapabilityLease wire schema.

## 4. Authoritative store state

For the purpose of the M4-032 usage transition, the authoritative store exposes
this minimal semantic projection:

```text
LeaseUseState {
  leaseRef: ref
  maxUses: integer
  remainingUses: integer
}
```

This projection is not permission to discard the other fields of a stored
CapabilityLease. It defines only the fields M4-032 is allowed to interpret.

M4-032 MUST NOT inspect or derive authority from `subjectRef`, `parentLeaseRef`,
`capability`, `resource`, `constraints`, `issuedAt`, `expiresAt`, or
`authorization`.

The storage technology is not portable protocol authority. A conforming store
may use memory, SQLite, PostgreSQL, another transactional database, or another
backend, provided the observable M4-032 atomicity contract is satisfied.

## 5. One-use transition

For one valid `leaseRef`, the store performs one indivisible logical transition.
At the operation's linearization point, exactly one of the following applies.

### 5.1 Lease not found

If no authoritative state exists for the exact `leaseRef`:

```text
NOT_CONSUMED / LEASE_CONSUME_NOT_FOUND
```

No Lease is created and no counter changes.

### 5.2 Invalid authoritative usage state

The authoritative `maxUses` / `remainingUses` pair MUST satisfy M4-031's exact
integer and coherence rules before decrement. Invalid state MUST NOT be repaired,
clamped, normalized or decremented.

The M4-031 usage failure reason is preserved:

```text
LEASE_USAGE_MAX_USES_INVALID
LEASE_USAGE_REMAINING_USES_INVALID
LEASE_USAGE_STATE_INVALID
```

and M4-032 returns `FAIL_CLOSED / USAGE / <preserved reason>`.

### 5.3 Exhausted

If the authoritative state is coherent and `remainingUses == 0`, the operation
returns:

```text
NOT_CONSUMED / LEASE_USAGE_EXHAUSTED
```

The state remains zero.

### 5.4 Consume exactly one

If the authoritative state is coherent and `remainingUses > 0`, the single legal
mutation is:

```text
before = remainingUses
after  = before - 1
```

committed atomically as one logical transition.

The result is:

```text
CONSUMED {
  status: "CONSUMED"
  reasonCode: "LEASE_USE_CONSUMED"
  remainingUsesBefore: before
  remainingUsesAfter: after
}
```

The result counters describe the state immediately around the successful
linearization point. M4-032 never decrements by more than one per successful
invocation.

## 6. Per-Lease linearizability

Atomicity is normative, not an implementation suggestion.

For all consume invocations targeting the same `leaseRef`, there MUST exist one
total order of successful/non-consuming transitions such that:

1. each invocation appears to take effect at one instant between invocation and
   response;
2. real-time order is preserved when invocation A completes before invocation B
   begins;
3. each `CONSUMED` result observes the state produced by the previous transition
   in that order;
4. `remainingUses` never becomes negative;
5. no update is lost;
6. no two successful transitions consume the same remaining use.

If the starting state has `R` remaining uses and `N` concurrent attempts, no more
than `min(R, N)` attempts may return `CONSUMED`.

When all attempts target one Lease and no store failure occurs:

```text
successfulConsumes = min(startRemainingUses, attemptCount)
finalRemainingUses = startRemainingUses - successfulConsumes
```

The identity of the winning invocation among overlapping concurrent attempts is
not portable authorization precedence.

## 7. No global serialization requirement

M4-032 atomicity is required per Lease identity. Operations targeting different
`leaseRef` values MUST NOT be required by this specification to share one global
lock or total ordering.

An implementation may serialize more broadly for correctness, but it MUST NOT
claim that such serialization is protocol-required. This leaves room for row
locks, per-key CAS, partition-local transactions, or equivalent mechanisms.

## 8. No split read/check/write authority

M4-031 is read-only evidence and cannot be used as the sole concurrency guard.

This sequence is non-conforming as an authoritative consume path:

```text
snapshot = evaluate M4-031
if snapshot is USAGE_ELIGIBLE
  later write snapshot.remainingUses - 1
```

unless the later mutation re-establishes atomic authority against current store
state.

A previously observed `remainingUses == 1` cannot reserve the final use.

## 9. Store failure and ambiguous outcome

Production storage can fail at different points. M4-032 MUST distinguish
"known not applied" from "outcome unknown" when the backend can make that
distinction.

If the backend proves that no consume linearization occurred:

```text
FAIL_CLOSED / STORE / LEASE_CONSUME_STORE_UNAVAILABLE
```

If the backend cannot prove whether the decrement committed before failure:

```text
FAIL_CLOSED / STORE / LEASE_CONSUME_OUTCOME_UNKNOWN
```

The caller MUST NOT interpret an unknown result as consumed or not consumed.
The primitive MUST NOT blindly retry, because a second successful attempt could
consume a second use after the first attempt actually committed.

M4-032 deliberately does not define an idempotency/deduplication record or
exactly-once retry protocol. A future stronger operational profile may bind a
logical action identity to durable deduplication, but that is not invented here
without an accepted protocol record model.

Security takes precedence over quota availability: an ambiguous result fails
closed for execution even if that can strand one use until reconciliation.

## 10. Store port trust boundary

A host-language implementation may place the atomic mutation behind an internal
Lease usage store/repository port. That port is a trusted enforcement dependency
for the atomicity claim.

The broker MUST NOT simulate distributed atomicity by placing only an in-process
mutex around a non-atomic external read/write sequence and then claim
cross-process linearizability.

A single-process in-memory reference store may use process-local serialization
for its documented scope. That does not prove the same guarantee for a
multi-process/database adapter.

Backend-specific adapters MUST have backend-specific conformance evidence before
they claim the M4-032 atomicity guarantee.

## 11. Input validation

The input exact key set is `profile` + `leaseRef`.

Validation order is normative:

```text
1. outer value is a readable record
2. exact own key set is profile + leaseRef
3. profile is exactly M4-032_LEASE_CONSUME_V1
4. leaseRef satisfies existing defs.ref: 1..512 Unicode code points
5. invoke authoritative store exactly once
6. classify store outcome
7. validate authoritative usage state under M4-031 rules
8. exhausted or consume-one transition
9. return detached immutable result
```

Unknown fields fail closed so caller-supplied lifecycle or counter fields cannot
silently become authority.

`leaseRef` is preserved exactly. There is no trim, case folding, Unicode
normalization, prefixing, parsing, alias resolution or generated fallback ID.

## 12. Result algebra

Consumed:

```text
CONSUMED {
  status: "CONSUMED"
  reasonCode: "LEASE_USE_CONSUMED"
  remainingUsesBefore: integer
  remainingUsesAfter: integer
}
```

with:

```text
remainingUsesBefore >= 1
remainingUsesAfter == remainingUsesBefore - 1
```

Not consumed:

```text
NOT_CONSUMED {
  status: "NOT_CONSUMED"
  reasonCode:
    "LEASE_CONSUME_NOT_FOUND"
    | "LEASE_USAGE_EXHAUSTED"
}
```

Fail closed:

```text
FAIL_CLOSED {
  status: "FAIL_CLOSED"
  stage: "INPUT" | "USAGE" | "STORE"
  reasonCode: ...
}
```

M4-032-owned stable failures:

```text
LEASE_CONSUME_INPUT_INVALID
LEASE_CONSUME_PROFILE_INVALID
LEASE_CONSUME_LEASE_REF_INVALID
LEASE_CONSUME_STORE_UNAVAILABLE
LEASE_CONSUME_OUTCOME_UNKNOWN
LEASE_CONSUME_STORE_RESULT_INVALID
```

Preserved M4-031 usage failures:

```text
LEASE_USAGE_MAX_USES_INVALID
LEASE_USAGE_REMAINING_USES_INVALID
LEASE_USAGE_STATE_INVALID
```

The result MUST NOT echo host exception text or unbounded attacker-controlled
store values.

## 13. Arithmetic and exact-integer safety

M4-032 inherits M4-031's portable exact integer domain. Decrement occurs only
after authoritative `remainingUses` is proven to be a safe exact integer greater
than zero.

```text
remainingUsesBefore ∈ 1 .. 9007199254740991
remainingUsesAfter  ∈ 0 .. 9007199254740990
```

No floating-point rounding, string coercion, bigint coercion, boolean coercion or
saturating arithmetic is permitted. JavaScript numeric `-0` is zero and is
exhausted.

The request-time `leaseRequest.maxUses <= 100000` limit remains an issuance
request bound and MUST NOT be imported into existing Lease consumption.

## 14. Runtime hostile-input boundary

A JavaScript/TypeScript public consume function accepts request input as
`unknown` and MUST:

- inspect exact own request properties only;
- reject inherited request identity;
- reject accessors without executing them;
- reject unexpected string or symbol keys;
- fail closed on revoked Proxy / ownKeys / descriptor failures;
- avoid coercing `leaseRef`;
- invoke the authoritative store no more than once per primitive invocation;
- avoid automatic retry after throw, rejection, unavailable or unknown outcome;
- return detached frozen result objects;
- never expose host exception messages.

The authoritative store is not attacker-controlled arbitrary object metadata. A
reference implementation SHOULD normalize/capture its trusted store port during
construction rather than repeatedly reading mutable/accessor-backed provider
methods from untrusted call input.

## 15. Concurrency conformance

Portable fixtures include abstract concurrent batches. A concurrent fixture does
not require a deterministic winning attempt identity. It specifies an expected
multiset/count of outcomes and one final authoritative state.

From:

```text
maxUses = 1
remainingUses = 1
attemptCount = 2
```

the only conforming aggregate result is:

```text
CONSUMED x 1
NOT_CONSUMED / LEASE_USAGE_EXHAUSTED x 1
final remainingUses = 0
```

Two `CONSUMED` results are non-conforming even if both callers originally
observed `remainingUses == 1`.

The reference implementation MUST include host-language concurrency regressions
in addition to the portable corpus. Backend adapters that claim stronger
multi-process/storage atomicity require evidence against their actual backend.

## 16. No automatic Lease selection

M4-022 can return multiple candidate Lease refs. M4-032 does not choose among
them. The caller supplies exactly one `leaseRef` already selected by higher-level
orchestration.

M4-032 MUST NOT rank candidates by remaining uses, max uses, timestamps,
authorization, parent depth or lexical Lease-ref order.

## 17. Separation from TTL, revocation and attenuation

M4-032 does not accept timestamps and does not call M4-030 implicitly.

M4-032 does not inspect or mutate revocation state. M4-033 owns revocation.

M4-032 does not follow `parentLeaseRef`, consume a parent automatically, reserve
delegable uses or prove parent-child scope. M4-034 owns attenuation.

Later end-to-end Lease authorization may need these lifecycle facts composed at
an execution-safe boundary. This Gate does not claim that a counter-only atomic
consume proves a Lease is unexpired, unrevoked or delegation-valid.

## 18. No execution/PEP claim

`CONSUMED` is evidence that one usage unit was atomically committed. It is not by
itself a CapabilityDecision allow, approval, guarantee assignment, PEP
authorization, proof that the action executed, or proof it succeeded.

M4-040+ owns execution-time PEP integration. An integration MUST NOT execute an
action after `NOT_CONSUMED`, `FAIL_CLOSED`, or `LEASE_CONSUME_OUTCOME_UNKNOWN`.

## 19. No exactly-once retry claim

One completed invocation consumes at most one use. That is different from saying
repeated invocations for the same logical action consume at most one use.

M4-032 does not currently receive `requestRef`, `actionRef`, `consumeRef` or
another accepted idempotency identity and therefore MUST NOT claim exactly-once
semantics across retries. The primitive performs zero implicit retries.

This explicit boundary prevents callers from mistaking linearizability for
distributed exactly-once delivery.

## 20. Portable conformance corpus

The portable corpus is:

```text
fixtures/lease-consume/cases.json
```

Profile:

```text
M4-032_LEASE_CONSUME_V1
```

It covers single-/multi-use decrement, exhaustion without mutation, request-cap
non-import, safe-integer arithmetic, invalid authoritative state, exact input
shape/ref validation, caller-counter/TTL rejection, not-found, known-not-applied
store failure, ambiguous outcome/no retry, final-use races, over-subscription,
exhausted concurrency, per-Lease independence, and sequential committed-state
observation.

## 21. Gate boundary

The M4-032 protocol-first delta MUST remain limited to:

```text
specs/0039-m4-capability-lease-atomic-consume.md
fixtures/lease-consume/cases.json
docs/handoff/CURRENT.md
```

No production TypeScript, CapabilityLease schema/type, Shared TCK registration,
dependency, lockfile, Harness baseline, M4-033+, M4-040+ or M6 behavior is
authorized by this protocol-first commit.

Production implementation may begin only after this exact protocol-first head
reaches normal repository CI PASS, exact pinned Harness rc5 source-conformance
PASS, PR #3 remains Open/Draft/mergeable, and no review/review-thread blocker
exists.

## 22. Implementation expectations after protocol-first closure

After protocol-first dual-green, the TypeScript reference implementation should
introduce a narrow runtime-independent Lease usage store port and a reference
implementation whose atomicity scope is explicit.

The production implementation MUST NOT bind semantics to one database vendor,
weaken M4-031 validation to simplify update logic, expose mutable authoritative
counters through caller objects, automatically retry ambiguous store outcomes,
implement M4-033+ early, or modify the public CapabilityLease wire schema merely
to obtain CAS.

Concurrency, store-fault, hostile-runtime and detached/frozen-result hardening
are acceptance requirements for the later implementation head.
