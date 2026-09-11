# M4-034 — CapabilityLease Parent-Child Attenuation

Status: **DRAFT NORMATIVE SPECIFICATION**  
Gate: `M4-034 P0`  
Profile: `M4-034_LEASE_ATTENUATION_V1`

## 1. Objective

Core §5 requires delegation to be attenuating and Core §11 requires a child
Lease not to broaden authority. M4-034 defines hierarchy-aware use of an
already-materialized `CapabilityLease`.

The security invariant is:

```text
a descendant use cannot create more portable authority than the authoritative
ancestor chain possesses
```

A static check such as `child.maxUses <= parent.maxUses` is insufficient:
independent parent/child or sibling counters can amplify aggregate use.
Therefore successful descendant use MUST atomically decrement the target and
every ancestor through the root.

M4-034 does not issue Leases, execute Actions, bind Harness Subagents, or
implement M4-040+ PEP composition.

## 2. Existing wire authority

Published v1alpha1 Lease fields remain:

```text
apiVersion, kind, leaseRef, subjectRef, parentLeaseRef?,
capability, resource, constraints?, issuedAt, expiresAt,
maxUses, remainingUses, authorization
```

No delegation/revocation/depth/reservation field is added. `revoked` below is
M4-033 operational state, not a public Lease wire field.

Core §11 has an older illustrative JSON fragment with `authorizationRef` and
`delegation`. Those names are not published v1alpha1 fields and MUST NOT be
treated as portable M4-034 authority.

## 3. Caller input

Exactly:

```text
LeaseAttenuationConsumeInput {
  profile: "M4-034_LEASE_ATTENUATION_V1"
  leaseRef: ref
}
```

No optional fields. Parent, scope, counter and revocation facts are store
authority. `leaseRef` preserves the existing exact 1..512 Unicode-code-point
runtime profile with no coercion/trim/normalization/case-folding.

## 4. Authoritative state and chain

The trusted store exposes only the semantic fields M4-034 interprets:

```text
LeaseAttenuationState {
  leaseRef, subjectRef, parentLeaseRef?, capability, resource, constraints?,
  issuedAt, expiresAt, maxUses, remainingUses, authorization, revoked
}
```

Resolve `parentLeaseRef` from target to root only from authoritative state.

Rules:

- missing target -> `NOT_CONSUMED / LEASE_ATTENUATION_NOT_FOUND`;
- referenced parent must exist;
- duplicate identity/self/multi-node cycle -> fail closed;
- portable chain bound = 32 Lease identities including target/root;
- resolving a 33rd identity -> `LEASE_ATTENUATION_DEPTH_EXCEEDED`.

Failures: `LEASE_ATTENUATION_PARENT_NOT_FOUND`,
`LEASE_ATTENUATION_CYCLE`, `LEASE_ATTENUATION_DEPTH_EXCEEDED`.

## 5. Direct-edge attenuation

For each `child -> parent`:

### Provenance

```text
child.parentLeaseRef == parent.leaseRef
child.authorization.kind == "lease"
child.authorization.ref == parent.leaseRef
```

A root without parent MUST NOT claim lease-derived authorization.

Failure: `LEASE_ATTENUATION_AUTHORIZATION_INVALID`.

### Capability

No accepted capability-subsumption lattice exists. Require exact equality:

```text
child.capability == parent.capability
```

Otherwise: `LEASE_ATTENUATION_CAPABILITY_UNPROVABLE`.

### Resource

Normalize each exact Resource using M4-003, then require exact equality,
including `providerIdentity` presence/value. Do not infer containment from path,
prefix, wildcard, URL/DNS or opaque provider identity.

Otherwise: `LEASE_ATTENUATION_RESOURCE_UNPROVABLE`.

### Constraints

No generic accepted constraint implication algebra exists. Portable profile:

```text
omitted -> supported
{}      -> supported
non-empty -> fail closed
```

Failure: `LEASE_ATTENUATION_CONSTRAINT_PROFILE_UNSUPPORTED`.

### Lifetime

Each node must have a coherent positive M4-030 interval. Using M4-030 instant
ordering:

```text
parent.issuedAt <= child.issuedAt
child.expiresAt <= parent.expiresAt
```

Failures: `LEASE_ATTENUATION_TIME_INVALID`,
`LEASE_ATTENUATION_TIME_BROADENING`.

M4-034 has no `observedAt`; containment does not prove current TTL eligibility.

### Usage

Every node satisfies M4-031 safe-integer/coherence rules and preserves M4-031
usage failures. Require:

```text
child.maxUses <= parent.maxUses
```

Otherwise: `LEASE_ATTENUATION_MAX_USES_BROADENING`.

Do NOT require `child.remainingUses <= parent.remainingUses`: legitimate
parent/sibling consumption may make the parent snapshot smaller. Effective
authority is enforced by coupled atomic consumption.

## 6. Revocation/exhaustion

M4-033 remains exact-target storage semantics; do not fabricate descendant
revocation records.

```text
target.revoked
 -> NOT_CONSUMED / LEASE_ATTENUATION_TARGET_REVOKED

any ancestor.revoked
 -> NOT_CONSUMED / LEASE_ATTENUATION_ANCESTOR_REVOKED

target.remainingUses == 0
 -> NOT_CONSUMED / LEASE_USAGE_EXHAUSTED

any ancestor.remainingUses == 0
 -> NOT_CONSUMED / LEASE_ATTENUATION_ANCESTOR_EXHAUSTED
```

No state mutates on non-consume.

## 7. Atomic hierarchy use

On success, as one all-or-none logical transition:

```text
for target and every ancestor:
  remainingUses := remainingUses - 1
```

Only `remainingUses` may change.

Operations whose resolved chains overlap MUST be linearizable over all shared
Lease identities, including siblings and parent-vs-descendant races. Disjoint
chains require no global total order.

M4-032 remains a valid one-Lease primitive, but a deployment MUST NOT expose an
uncoordinated M4-032 path for hierarchy-participating state and claim
non-amplification. M4-032/M4-034 must share authoritative counters and
serialization, or hierarchy-aware use must route through M4-034.

Likewise M4-033/M4-034 must share authoritative revocation state and a
linearization mechanism before claiming ancestor-revocation inheritance.

## 8. Store boundary

The public primitive invokes the authoritative store at most once. Store
implementation owns chain resolution, validation, revocation/usage observation
and all-chain mutation inside one transaction/serialization boundary.

A serializable DB transaction, deterministic row/key locking, transactional KV,
or documented single-process reference store may satisfy this. Multi-process
claims require backend-specific evidence.

Known-not-applied failure:

```text
FAIL_CLOSED / STORE / LEASE_ATTENUATION_STORE_UNAVAILABLE
```

Ambiguous commit:

```text
FAIL_CLOSED / STORE / LEASE_ATTENUATION_OUTCOME_UNKNOWN
```

No automatic retry: a committed first attempt followed by retry may consume a
second unit from every chain member.

Malformed/partial/wrong-identity/contradictory evidence:

```text
FAIL_CLOSED / STORE / LEASE_ATTENUATION_STORE_RESULT_INVALID
```

## 9. Result algebra

Success:

```text
CONSUMED / LEASE_ATTENUATED_USE_CONSUMED
remainingUsesAfter == remainingUsesBefore - 1
```

The public counters are the target Lease values.

Ordinary non-consume reasons:

```text
LEASE_ATTENUATION_NOT_FOUND
LEASE_ATTENUATION_TARGET_REVOKED
LEASE_ATTENUATION_ANCESTOR_REVOKED
LEASE_USAGE_EXHAUSTED
LEASE_ATTENUATION_ANCESTOR_EXHAUSTED
```

Fail-closed stages:

```text
INPUT | CHAIN | ATTENUATION | USAGE | STORE
```

M4-034-owned stable failures:

```text
LEASE_ATTENUATION_INPUT_INVALID
LEASE_ATTENUATION_PROFILE_INVALID
LEASE_ATTENUATION_LEASE_REF_INVALID
LEASE_ATTENUATION_PARENT_NOT_FOUND
LEASE_ATTENUATION_CYCLE
LEASE_ATTENUATION_DEPTH_EXCEEDED
LEASE_ATTENUATION_STATE_INVALID
LEASE_ATTENUATION_AUTHORIZATION_INVALID
LEASE_ATTENUATION_CAPABILITY_UNPROVABLE
LEASE_ATTENUATION_RESOURCE_UNPROVABLE
LEASE_ATTENUATION_CONSTRAINT_PROFILE_UNSUPPORTED
LEASE_ATTENUATION_TIME_INVALID
LEASE_ATTENUATION_TIME_BROADENING
LEASE_ATTENUATION_MAX_USES_BROADENING
LEASE_ATTENUATION_STORE_UNAVAILABLE
LEASE_ATTENUATION_OUTCOME_UNKNOWN
LEASE_ATTENUATION_STORE_RESULT_INVALID
```

Failure output must not echo attacker-controlled refs/Resources/constraints or
host exceptions.

## 10. Observable validation order

```text
input shape -> profile -> leaseRef -> one store call
-> chain missing/cycle/depth -> state identity/shape
-> authorization -> capability -> Resource -> constraints
-> lifetime -> M4-031 usage coherence -> maxUses attenuation
-> target/ancestor revocation -> target/ancestor exhaustion
-> all-chain decrement -> store-evidence validation -> immutable result
```

Physical lock order may differ only if observable semantics are equivalent.

## 11. Hostile JavaScript boundary

A TypeScript entry point accepts `unknown`; it must reject inherited/accessor/
symbol/unexpected caller authority, fail closed on Proxy/descriptor
failures, perform no coercion, invoke store once at most, retry zero times, sanitize
exceptions and return detached frozen output. Unreadable store evidence cannot
become success.

## 12. Portable corpus

```text
fixtures/lease-attenuation/cases.json
profile: M4-034_LEASE_ATTENUATION_V1
LATT-001 .. LATT-028
```

Fixture-only compression:

- `stateDefaults` shallow-fills omitted state fields; each state supplies
  `leaseRef`; explicit fields replace the whole default field.
- `authorizationDefaults`: root -> approval/root; child with parent `P` ->
  `{kind:"lease", ref:P}` unless explicitly overridden.
- depth case may use
  `generatedChain {length, leaseRefPrefix, maxUses, remainingUses}`.

These are test-data rules, not production Lease defaults.

Modes: `SEQUENTIAL`, `SEQUENCE`, `CONCURRENT`.

Corpus covers hierarchy use, shared budgets, overlapping/disjoint concurrency,
scope/time/max-use attenuation, provenance, missing/cyclic parents, revocation,
exhaustion, usage coherence, hostile caller authority, store faults and depth.

## 13. Explicit exclusions

M4-034 does not issue child Leases; prove runtime Subject parentage; import
Harness `parentSession`, run/workflow ids or `delegationDepth`; evaluate current
TTL without `observedAt`; create Decision/Receipt/Guarantee; execute/cancel an
Action; solve M4-040+ post-consume execution composition; change CLI; or change
the public CapabilityLease schema/type.

DeepSeek Harness rc5 remains Adapter compatibility evidence only.
