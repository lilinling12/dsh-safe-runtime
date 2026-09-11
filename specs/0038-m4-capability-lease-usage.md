# M4-031 — Deterministic Capability Lease Usage Validity

Status: **DRAFT NORMATIVE SPECIFICATION**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-031 P0 — maxUses`  
Depends on: M1 CapabilityLease model, M4-022 deterministic Lease lookup, M4-030 deterministic Lease TTL validity

## 1. Purpose

M4-031 defines the portable usage-validity boundary for an already-materialized
`CapabilityLease`.

This Gate answers one narrow question:

> Does the Lease's current usage snapshot represent a coherent, non-exhausted
> `maxUses` / `remainingUses` state?

M4-031 is a **read-only validity check**. It does not reserve a use, decrement a
counter, persist a state transition, solve concurrent races, or authorize
execution.

The roadmap deliberately separates:

- M4-030 — TTL / time-window validity;
- M4-031 — `maxUses` / usage validity;
- M4-032 — atomic consume;
- M4-033 — revoke;
- M4-034 — parent-child attenuation;
- M4-040+ — PEP integration and execution-time enforcement.

M4-031 MUST NOT collapse M4-032+ into a generic "usable Lease" predicate.

## 2. Existing protocol authority

M4-031 preserves the published v1alpha1 Lease wire model.

`schemas/v1alpha1/capability-lease.schema.json` already requires:

```text
maxUses:       integer, minimum 1
remainingUses: integer, minimum 0
```

`packages/protocol/src/capability.ts` exposes those same two required numeric
fields on `CapabilityLease`.

Core §11 requires a Lease to become invalid immediately after it is exhausted.
Spec 0033 explicitly defers usage validity to M4-031.

M4-031 introduces no new Lease wire field and does not modify the
CapabilityLease schema or TypeScript wire interface.

The evaluator input below is a runtime-independent semantic projection, not a
second CapabilityLease wire model.

## 3. Scope boundary

M4-031 consumes only usage-counter facts.

It MUST NOT inspect, validate, mutate, rank, or derive authority from:

```text
leaseRef
subjectRef
parentLeaseRef
capability
resource
constraints
issuedAt
expiresAt
authorization
```

In particular:

- TTL/time validity remains M4-030;
- revocation remains M4-033;
- parent-child attenuation remains M4-034;
- policy/approval/decision/guarantee facts are not re-evaluated;
- no counter is decremented by this primitive.

`USAGE_ELIGIBLE` means only that the current usage snapshot is coherent and has
at least one remaining use. It does not mean that a use has been reserved or can
be committed safely under concurrency.

## 4. No `leaseRequest.maxUses` import into an existing Lease

The existing `CapabilityRequest.requestedLease.maxUses` and
`CapabilityPolicy.rules[].lease.maxUses` are **issuance-request bounds**. The
current `leaseRequest` schema limits those requested values to `1..100000`.

That request-time maximum is not an upper bound on an already-materialized
CapabilityLease because the Lease wire schema does not publish the same maximum.

M4-031 therefore MUST NOT:

- reject an existing Lease merely because `maxUses > 100000`;
- guess which request or policy emitted the Lease;
- compare an existing Lease to caller-supplied requested `maxUses`;
- infer historical consumption from `maxUses - remainingUses` for authorization
  or audit purposes.

Any issuance rule binding requested `maxUses` to a newly emitted Lease belongs to
an authoritative issuance context, not this validity primitive.

## 5. Portable logical input

The portable projection is exactly:

```text
LeaseUsageEvaluationInput {
  profile: "M4-031_LEASE_USAGE_V1"
  maxUses: integer
  remainingUses: integer
}
```

There are no optional fields.

The input shape MUST be exact. Unknown fields fail closed rather than silently
being ignored, so this primitive cannot accidentally absorb TTL, revocation,
consume, or delegation state.

## 6. Portable exact-integer domain

JSON itself permits integer literals that exceed the exact integer range of
common IEEE-754 host runtimes. A portable profile cannot allow two conforming
implementations to observe different counter values after parsing the same JSON.

For M4-031, both counters MUST therefore be exact portable non-fractional
integers in the range:

```text
0 .. 9007199254740991
```

with the additional field-specific constraint:

```text
maxUses >= 1
```

This bound is a semantic interoperability bound for this evaluator, not a new
`leaseRequest.maxUses` limit and not permission to rewrite the published Lease
schema in this Gate.

Host-language reference implementations MUST reject non-number values,
non-finite values, fractional values, unsafe integers, and implicit coercion.
Booleans are not integers for this profile.

## 7. Usage-state coherence

A coherent usage snapshot MUST satisfy:

```text
1 <= maxUses <= 9007199254740991
0 <= remainingUses <= maxUses
```

`remainingUses > maxUses` is not treated as "available" merely because it is
positive. It represents incoherent lifecycle state and MUST fail closed.

This relation is semantic state validation that JSON Schema cannot express with
independent scalar minimum constraints.

M4-031 MUST NOT infer why an incoherent state exists, repair it, clamp it, or
rewrite either counter.

## 8. Eligibility semantics

After input and coherence validation:

```text
remainingUses == 0 -> USAGE_INELIGIBLE / LEASE_USAGE_EXHAUSTED
remainingUses >  0 -> USAGE_ELIGIBLE   / LEASE_USAGE_AVAILABLE
```

A Lease with `remainingUses == maxUses` is ordinary eligible state; M4-031 does
not infer that it is "unused", "new", or more authoritative than another Lease.

A Lease with exactly one remaining use is usage-eligible. That final use is not
reserved until M4-032 performs the authoritative consume operation.

## 9. No consume / no TOCTOU claim

M4-031 is intentionally not sufficient for safe execution under concurrency.

The sequence:

```text
M4-031 says remainingUses == 1
another actor consumes that final use
caller executes based on stale M4-031 result
```

is a valid race if an integration incorrectly treats this read-only evaluator as
reservation authority.

Therefore:

- M4-031 MUST NOT expose a decrement operation;
- M4-031 MUST NOT return a reservation token;
- M4-031 MUST NOT promise compare-and-swap, transaction, lock, serializable
  isolation, or linearization;
- M4-031 MUST NOT update `remainingUses` in memory or persistent storage;
- execution that relies on one consumable use MUST be coupled to M4-032's future
  atomic consume semantics.

## 10. Result algebra

Success / ordinary ineligibility:

```text
USAGE_ELIGIBLE {
  status: "USAGE_ELIGIBLE"
  reasonCode: "LEASE_USAGE_AVAILABLE"
}

USAGE_INELIGIBLE {
  status: "USAGE_INELIGIBLE"
  reasonCode: "LEASE_USAGE_EXHAUSTED"
}
```

Fail-closed result:

```text
FAIL_CLOSED {
  status: "FAIL_CLOSED"
  stage: "INPUT" | "USAGE"
  reasonCode: ...
}
```

Stable failure vocabulary:

```text
LEASE_USAGE_INPUT_INVALID
LEASE_USAGE_PROFILE_INVALID
LEASE_USAGE_MAX_USES_INVALID
LEASE_USAGE_REMAINING_USES_INVALID
LEASE_USAGE_STATE_INVALID
```

The result MUST NOT echo attacker-controlled counter values or host exception
text.

## 11. Validation precedence

Validation order is normative:

```text
1. outer value is a readable record
2. exact own key set is profile + maxUses + remainingUses
3. profile is exactly M4-031_LEASE_USAGE_V1
4. maxUses is a valid portable exact integer and >= 1
5. remainingUses is a valid portable exact integer and >= 0
6. remainingUses <= maxUses
7. remainingUses == 0 => exhausted
8. otherwise => available
```

This ordering makes multi-defect cases deterministic.

## 12. Hostile runtime boundary

A JavaScript/TypeScript reference implementation accepts runtime input as
`unknown` and MUST:

- inspect exact own properties only;
- reject inherited values;
- reject getters/setters without executing them;
- reject unexpected string or symbol keys;
- fail closed on revoked Proxies and `ownKeys` / descriptor failures;
- perform no `Number(...)`, `parseInt`, unary-plus, string or boolean coercion;
- use safe-integer predicates before comparing counters;
- avoid mutation of caller input;
- return detached frozen result objects;
- never expose host exception messages.

Portable JSON fixtures cannot model accessors or Proxy traps; those belong in
runtime hardening tests after protocol-first authorization.

## 13. Composition boundary

M4-030 and M4-031 remain independent primitives.

A future Lease-usable composition may require both:

```text
TIME_ELIGIBLE
AND USAGE_ELIGIBLE
```

but this Gate does not define that composite authorization function. It also does
not decide revocation, attenuation, or consume success.

M4-031 MUST NOT accept timestamps in its input and MUST NOT call the M4-030
primitive implicitly.

## 14. Portable conformance corpus

The portable corpus is:

```text
fixtures/lease-usage/cases.json
```

Profile:

```text
M4-031_LEASE_USAGE_V1
```

It covers:

- available / final-use / exhausted states;
- `remainingUses > maxUses` incoherence;
- request-limit non-import (`maxUses > 100000`);
- portable exact-integer ceiling;
- zero/negative/fractional/string/null/boolean invalid counters;
- unsafe integer rejection;
- deterministic multi-defect precedence;
- missing/unexpected fields and unknown profile.

## 15. Gate boundary

The protocol-first M4-031 delta MUST remain limited to:

```text
specs/0038-m4-capability-lease-usage.md
fixtures/lease-usage/cases.json
docs/handoff/CURRENT.md
```

No production TypeScript, CapabilityLease schema/type, Shared TCK registration,
dependency, lockfile, Harness baseline, M4-032+, M4-040+ or M6 behavior is
authorized by this protocol-first commit.

Production implementation may begin only after this exact protocol-first head
reaches normal CI + exact pinned Harness rc5 source-conformance dual-green and
PR #3 remains Open/Draft/mergeable with no review-thread blocker.
