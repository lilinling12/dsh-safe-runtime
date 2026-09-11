# M4-033 — Authoritative Capability Lease Revocation

Status: **DRAFT NORMATIVE SPECIFICATION**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-033 P0 — revoke`  
Depends on: M1 CapabilityLease model, M4-022 deterministic Lease lookup, M4-030 TTL validity, M4-031 usage validity, M4-032 atomic consume  
Separated from: M4-034 parent-child attenuation, M4-040+ PEP integration

## 1. Purpose

M4-033 defines the portable authoritative state transition for revoking one
already-issued `CapabilityLease` by stable `leaseRef`.

This Gate answers one narrow question:

> Can one Lease identity be moved monotonically from not-revoked to revoked in
> authoritative lifecycle state, with deterministic idempotent outcomes and
> fail-closed storage semantics?

Core §11 already requires a Lease to be revocable. M4-030, M4-031 and M4-032
explicitly defer revocation to this Gate.

M4-033 does not define end-to-end Lease authorization or action execution.

## 2. Existing protocol authority

The published `CapabilityLease` wire model contains no `revoked`, `revokedAt`,
`revocationRef`, `revocationReason` or mutable lifecycle wrapper field.

M4-033 MUST NOT modify the v1alpha1 Lease wire schema merely to make revocation
convenient. In particular it does not change:

```text
schemas/v1alpha1/capability-lease.schema.json
packages/protocol/src/capability.ts
```

Revocation is authoritative operational lifecycle state keyed by the existing
stable `leaseRef`. It is not a second public CapabilityLease wire model.

Core stable-ID rules already require cross-component identities not to be
reused. A revoked Lease identity therefore MUST NOT later denote a newly issued
Lease.

## 3. Revocation is independent lifecycle state

A conforming implementation MUST NOT simulate revocation by:

```text
remainingUses := 0
expiresAt := now
deleting the Lease record
rewriting authorization provenance
changing subject/capability/resource constraints
```

Those representations destroy or conflate distinct lifecycle facts.

Revocation is an independent monotonic fact. TTL, usage exhaustion and
revocation may all be true independently.

## 4. Portable revoke input

The caller input is exactly:

```text
LeaseRevokeInput {
  profile: "M4-033_LEASE_REVOKE_V1"
  leaseRef: ref
}
```

There are no optional fields.

The caller MUST NOT provide revocation authority through fields such as:

```text
revoked
revokedAt
remainingUses
expiresAt
subjectRef
parentLeaseRef
authorization
reason
```

This Gate does not define human-facing reason/audit metadata. Such metadata may
exist in an implementation or later audit record, but it MUST NOT change the
portable state-transition result.

## 5. Authoritative revocation state

For this Gate, the minimal operational projection is:

```text
LeaseRevocationState {
  leaseRef: ref
  revoked: boolean
}
```

`revoked` is authoritative store state, not a field added to the
`CapabilityLease` wire object.

The store MUST distinguish:

1. exact Lease identity does not exist;
2. Lease exists and is not revoked;
3. Lease exists and is already revoked.

A missing Lease is not equivalent to a revoked Lease.

## 6. Monotonic transition

For one valid `leaseRef`, the authoritative operation has one legal mutation:

```text
revoked: false -> true
```

There is no portable transition from `true` back to `false`.

### 6.1 Lease not found

If no authoritative Lease lifecycle state exists for the exact `leaseRef`:

```text
NOT_REVOKED / LEASE_REVOKE_NOT_FOUND
```

No Lease and no revocation tombstone is created by M4-033.

### 6.2 Revoke now

If the Lease exists with `revoked == false`, commit atomically:

```text
revoked := true
```

and return:

```text
REVOKED / LEASE_REVOKED
```

### 6.3 Already revoked

If the Lease exists with `revoked == true`, perform no mutation and return:

```text
ALREADY_REVOKED / LEASE_ALREADY_REVOKED
```

Repeated revocation is therefore state-idempotent.

## 7. Revocation is permanent for one Lease identity

Once the authoritative revocation transition commits, that exact `leaseRef`
remains revoked for the lifetime of that identity.

M4-033 defines no:

```text
unrevoke
restore
reactivate
clearRevocation
replacement-in-place
```

A new authorization must use a new non-reused Lease identity under the normal
issuance model; M4-033 itself does not issue that replacement.

## 8. Per-Lease linearizability

All revoke invocations targeting the same `leaseRef` MUST be linearizable.

If N concurrent revoke attempts target one existing non-revoked Lease and no
store failure occurs, exactly one invocation returns:

```text
REVOKED / LEASE_REVOKED
```

and the remaining `N - 1` return:

```text
ALREADY_REVOKED / LEASE_ALREADY_REVOKED
```

The final authoritative state is revoked.

The identity of the winning overlapping invocation is not portable precedence.

Operations for different Lease identities do not require one global ordering.

## 9. Store failure semantics

If the backend proves no revocation transition linearized:

```text
FAIL_CLOSED / STORE / LEASE_REVOKE_STORE_UNAVAILABLE
```

If the backend cannot prove whether `revoked := true` committed before failure:

```text
FAIL_CLOSED / STORE / LEASE_REVOKE_OUTCOME_UNKNOWN
```

The primitive performs no automatic retry and invokes the authoritative store at
most once per invocation.

Unlike usage decrement, revocation is a monotonic set-to-true operation. A
caller MAY later retry the same revoke request after an ambiguous outcome because
a repeated successful state transition cannot restore authority or consume an
additional quota unit. The retry may observe `ALREADY_REVOKED` if the first
attempt actually committed.

This does not make the first ambiguous result successful. Until authoritative
state is re-observed, `OUTCOME_UNKNOWN` remains fail-closed for any execution
that depends on proving the Lease unrevoked.

## 10. No deletion / no tombstone invention

M4-033 MUST NOT delete the Lease as its revocation mechanism. Deletion would make
`not found` indistinguishable from `revoked` and would discard lifecycle,
provenance and reconciliation evidence.

M4-033 also does not create a revocation tombstone for a never-existing
`leaseRef`. Stable Lease identity is authoritative; a typo or attacker-supplied
unknown ref must not populate lifecycle state.

An implementation may physically store revocation facts in the Lease row, a
separate table, KV record, event log or equivalent backend. Storage shape is not
portable protocol authority.

## 11. Interaction with TTL and usage

Revocation does not mutate or reinterpret:

```text
issuedAt
expiresAt
maxUses
remainingUses
```

Examples:

- an expired Lease may also be revoked;
- an exhausted Lease may also be revoked;
- revoking a Lease with remaining uses does not consume those uses;
- revocation does not make an incoherent usage state coherent;
- TTL expiry does not automatically write revocation state.

M4-030, M4-031 and M4-033 remain distinct lifecycle facts.

## 12. Interaction with M4-032 atomic consume

M4-032 is already accepted as a **counter-only** atomic primitive and explicitly
does not inspect revocation state. M4-033 MUST NOT retroactively redefine an
M4-032 `CONSUMED` result as proof that the Lease was unrevoked.

This sequence is unsafe as an execution authorization pattern:

```text
check revocation == false
revoke commits concurrently
consume usage with M4-032
execute action
```

because separate read/check/consume steps can race.

M4-033 therefore establishes the authoritative revocation fact but does not claim
that the already-separated primitives form an execution-safe composite.

A later composition/PEP Gate that permits Lease-backed execution MUST ensure that
revocation cannot linearize before execution authority is irreversibly acquired
while the action still proceeds. This may require one backend transaction,
shared per-Lease serialization, a combined authoritative operation, or another
backend-specific proof.

M4-033 MUST NOT weaken this requirement by treating a stale `not revoked`
snapshot as a reservation.

## 13. Parent/child boundary

M4-033 revokes only the exact target `leaseRef`.

It MUST NOT automatically:

```text
revoke parentLeaseRef
revoke descendants
walk a Lease graph
infer child identities
prove attenuation
```

Parent-child attenuation and any revocation propagation policy remain M4-034 or a
later explicitly specified lifecycle-composition Gate.

Therefore revoking a parent does not, in this primitive alone, fabricate
revocation records for children. A later composition must still prevent a child
from retaining authority that its accepted attenuation semantics forbid.

## 14. Input validation precedence

Observable validation order is:

```text
1. outer value is a readable record
2. exact own key set is profile + leaseRef
3. profile is exactly M4-033_LEASE_REVOKE_V1
4. leaseRef satisfies existing defs.ref: 1..512 Unicode code points
5. invoke authoritative store exactly once
6. classify store outcome
7. return detached immutable result
```

`leaseRef` is preserved exactly. No trim, case folding, Unicode normalization,
prefixing, parsing, alias resolution or coercion is permitted.

## 15. Result algebra

New revocation:

```text
REVOKED {
  status: "REVOKED"
  reasonCode: "LEASE_REVOKED"
}
```

Existing revocation:

```text
ALREADY_REVOKED {
  status: "ALREADY_REVOKED"
  reasonCode: "LEASE_ALREADY_REVOKED"
}
```

Missing identity:

```text
NOT_REVOKED {
  status: "NOT_REVOKED"
  reasonCode: "LEASE_REVOKE_NOT_FOUND"
}
```

Fail closed:

```text
FAIL_CLOSED {
  status: "FAIL_CLOSED"
  stage: "INPUT" | "STORE"
  reasonCode: ...
}
```

Stable M4-033 failures:

```text
LEASE_REVOKE_INPUT_INVALID
LEASE_REVOKE_PROFILE_INVALID
LEASE_REVOKE_LEASE_REF_INVALID
LEASE_REVOKE_STORE_UNAVAILABLE
LEASE_REVOKE_OUTCOME_UNKNOWN
LEASE_REVOKE_STORE_RESULT_INVALID
```

Failure results MUST NOT echo attacker-controlled refs, store values, host
exception text or stack traces.

## 16. Trusted store result hardening

The revocation store is a trusted enforcement dependency, but the broker still
MUST validate enough returned evidence to avoid fabricating success from a
malformed adapter result.

A store outcome MUST identify only the requested exact `leaseRef` and one legal
portable state transition/outcome. Contradictory, malformed or unreadable result
evidence fails closed as:

```text
FAIL_CLOSED / STORE / LEASE_REVOKE_STORE_RESULT_INVALID
```

The broker MUST NOT translate an unknown truthy/falsy value into revocation
success.

## 17. Hostile JavaScript runtime boundary

A TypeScript reference implementation accepts public request input as `unknown`
and MUST:

- inspect exact own request properties only;
- reject inherited required values;
- reject accessors without executing getters;
- reject unexpected string or symbol keys;
- fail closed on revoked Proxy / `ownKeys` / descriptor failures;
- avoid `String(value)` or other ref coercion;
- invoke the authoritative store no more than once per invocation;
- perform no automatic retry;
- return detached frozen results;
- sanitize host/store exceptions.

The trusted store port SHOULD be captured/normalized during construction rather
than repeatedly discovered through untrusted request objects.

## 18. Security meaning of a revoked state

A committed revocation means the exact Lease identity is no longer eligible to
provide authorization in any later composition that claims M4-033 conformance.

It does not mean:

```text
the action was stopped after already executing
a running process was killed
external side effects were rolled back
children were automatically revoked
usage counters changed
TTL changed
an audit receipt was persisted
```

Revocation is prospective authorization invalidation, not retroactive rollback.

## 19. Portable conformance corpus

The portable corpus is:

```text
fixtures/lease-revocation/cases.json
```

Profile:

```text
M4-033_LEASE_REVOKE_V1
```

The corpus MUST cover at least:

- first revoke;
- already-revoked idempotency;
- not-found without tombstone creation;
- exact ref identity;
- missing/extra/profile-invalid/ref-invalid input;
- 512/513 Unicode-code-point boundaries;
- caller-supplied revoked/timestamp/reason fields rejected;
- known-not-applied store failure;
- ambiguous store outcome;
- malformed store result;
- concurrent repeated revoke of one Lease;
- independent revocation of different Lease identities;
- proof that revocation does not mutate usage or TTL projections.

Portable concurrent cases specify aggregate outcome counts rather than a fixed
winner identity.

## 20. Explicit non-goals

M4-033 does not:

- add revocation fields to CapabilityLease wire/schema;
- implement Lease issuance;
- implement unrevoke/reactivation;
- mutate TTL or usage counters;
- consume a use;
- select among M4-022 candidates;
- automatically revoke parent or child Leases;
- prove attenuation;
- rerun policy or approval;
- construct Decision/Receipt records;
- assign GuaranteeLevel;
- stop an already-running action;
- rollback external effects;
- wire a PEP;
- claim an execution-safe composition of TTL + usage + consume + revocation;
- change DeepSeek Harness semantics.

## 21. Protocol-first Gate boundary

The M4-033 protocol-first delta MUST remain limited to:

```text
specs/0040-m4-capability-lease-revocation.md
fixtures/lease-revocation/cases.json
docs/handoff/CURRENT.md
```

No production TypeScript, CapabilityLease schema/type, Shared TCK registration,
dependency, lockfile, Harness baseline, M4-034+, M4-040+ or M6 behavior is
authorized in this protocol-first commit.

Production implementation may begin only after this exact protocol-first head
reaches:

1. normal repository CI PASS;
2. exact pinned DeepSeek Harness rc5 source-conformance PASS;
3. PR #3 remains Open/Draft/mergeable;
4. no review/review-thread blocker exists.

Any semantic ambiguity discovered during implementation MUST first be corrected
in this specification/corpus rather than hidden in TypeScript behavior.
