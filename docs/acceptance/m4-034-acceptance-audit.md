# M4-034 Acceptance Audit — CapabilityLease Parent-Child Attenuation

Status: **IMPLEMENTATION ACCEPTED / AUDIT EXACT-HEAD VERIFICATION PENDING**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-034 P0 — parent-child attenuation`

## 1. Accepted protocol-first authority

Normative specification:

```text
specs/0041-m4-capability-lease-parent-child-attenuation.md
```

Portable corpus:

```text
fixtures/lease-attenuation/cases.json
```

Portable profile:

```text
M4-034_LEASE_ATTENUATION_V1
```

Protocol-first exact head:

```text
e712a599d143a30ca69103d6a0f931f903cd63a8
```

The protocol-first delta was limited to:

```text
docs/handoff/CURRENT.md
fixtures/lease-attenuation/cases.json
specs/0041-m4-capability-lease-parent-child-attenuation.md
```

No production TypeScript, CapabilityLease schema/type, Shared TCK,
dependency/lockfile, Harness baseline, HISTORY, roadmap acceptance marker,
M4-035+, M4-040+, M6 or M13 runtime integration was changed by the
protocol-first commit.

Exact-head protocol evidence:

- normal CI #542 / run `33672611292`: PASS;
- exact pinned Harness rc5 source-conformance #484 / run `33672611311`: PASS;
- portable corpus: 28 canonical `LATT-001` through `LATT-028` cases;
- PR #3 remained Open, Draft and mergeable;
- submitted reviews: none;
- review threads: none.

Production implementation was authorized only after that exact head became
dual-green.

## 2. Accepted implementation and review history

Final accepted implementation/hardening head:

```text
6690dbc5a96f1cfb384147d20928f184922ba192
```

The implementation history is intentionally preserved rather than rebased or
squashed away.

During implementation, CI exposed one TypeScript exhaustiveness mismatch:
M4-031's general failure union contains input/profile failures that cannot arise
from the M4-034 reference store's internally constructed usage evaluation.
The fix did **not** widen the M4-034 reason vocabulary. It explicitly narrowed
pass-through to the three reachable usage-state reasons and treats impossible
or contradictory evidence as invalid.

Source-level review then found two additional evidence-quality issues before
acceptance:

1. store `FAIL_CLOSED` results needed stage-specific reason-code allowlists so
   arbitrary provider strings could not escape as public stable reasons;
2. the first reference-store implementation validated TTL/usage before some
   earlier attenuation dimensions, violating Spec 0041 observable failure
   precedence for multi-defect states.

The implementation was corrected rather than weakening the specification or
changing fixture expectations. A dedicated precedence suite now locks the
accepted order.

Final hardening also added shared-state race evidence for:

- parent use racing descendant use over one remaining ancestor budget;
- ancestor revoke racing descendant consume through the same per-Lease
  serialization mechanism.

No accepted protocol artifact, schema, compatibility baseline, TCK strictness,
lockfile or supply-chain rule was weakened to obtain green status.

## 3. Exact implementation delta

Comparing protocol-first head
`e712a599d143a30ca69103d6a0f931f903cd63a8` to final implementation/hardening
head `6690dbc5a96f1cfb384147d20928f184922ba192` shows eleven commits ahead, zero
behind, and exactly these seven Capability Broker files:

```text
packages/capability-broker/src/index.ts
packages/capability-broker/src/lease-attenuation-hardening.test.ts
packages/capability-broker/src/lease-attenuation-memory-store.ts
packages/capability-broker/src/lease-attenuation-precedence.test.ts
packages/capability-broker/src/lease-attenuation-types.ts
packages/capability-broker/src/lease-attenuation.test.ts
packages/capability-broker/src/lease-attenuation.ts
```

There is no implementation-stage change to:

```text
specs/0041-m4-capability-lease-parent-child-attenuation.md
fixtures/lease-attenuation/cases.json
schemas/v1alpha1/capability-lease.schema.json
packages/protocol/src/capability.ts
Shared TCK assets/manifest
dependencies or lockfile
DeepSeek Harness baseline
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md
docs/roadmap.md
M4-035+
M4-040+
M6
M13 runtime integration
```

## 4. Public wire-model boundary

M4-034 does not introduce a second public CapabilityLease model and does not add
fields such as:

```text
delegation
delegableUses
revoked
revokedAt
depth
reservation
revision
```

to the published v1alpha1 CapabilityLease type/schema.

The accepted wire authority remains the existing Lease fields, including
`parentLeaseRef?`, capability, resource, constraints, lifetime, usage counters
and authorization provenance.

The M4-034 operational projection adds `revoked` only inside trusted store state
because revocation remains the accepted M4-033 operational fact keyed by exact
`leaseRef`; it is not promoted into the public Lease wire object.

Core §11 contains an older illustrative fragment using `authorizationRef` and
`delegation`. Those names are not published v1alpha1 fields and are not treated
as portable M4-034 runtime authority.

## 5. Exact public request boundary

The accepted operation input is exactly:

```text
{
  profile: "M4-034_LEASE_ATTENUATION_V1",
  leaseRef
}
```

There are no optional caller-authoritative fields. A caller cannot supply or
override:

```text
parentLeaseRef
capability
resource
constraints
issuedAt
expiresAt
maxUses
remainingUses
authorization
revoked
```

`leaseRef` preserves the existing exact runtime ref profile of 1..512 Unicode
code points. There is no trim, case folding, Unicode normalization, alias
resolution, parsing or coercion.

## 6. Authoritative chain resolution

The trusted store resolves the parent chain from the target Lease by following
only authoritative `parentLeaseRef` state until a root is reached.

Accepted integrity rules are:

```text
missing target
  -> NOT_CONSUMED / LEASE_ATTENUATION_NOT_FOUND

referenced parent missing
  -> FAIL_CLOSED / CHAIN / LEASE_ATTENUATION_PARENT_NOT_FOUND

repeated identity / self-cycle / multi-node cycle
  -> FAIL_CLOSED / CHAIN / LEASE_ATTENUATION_CYCLE

more than 32 Lease identities including target and root
  -> FAIL_CLOSED / CHAIN / LEASE_ATTENUATION_DEPTH_EXCEEDED
```

The depth bound is a portable resource/DoS bound. It is not DeepSeek Harness
`delegationDepth` semantics.

## 7. Provenance coherence

For every direct `child -> parent` edge the accepted relation is:

```text
child.parentLeaseRef == parent.leaseRef
child.authorization.kind == "lease"
child.authorization.ref == parent.leaseRef
```

A root without `parentLeaseRef` must not claim lease-derived authorization.
Invalid provenance fails closed as:

```text
ATTENUATION / LEASE_ATTENUATION_AUTHORIZATION_INVALID
```

M4-034 does not dereference or reinterpret root policy/approval/system
provenance.

## 8. Portable scope attenuation

M4-034 intentionally does not invent containment algebras that the protocol has
not accepted.

### Capability

There is no accepted capability-subsumption lattice, so portable proof requires
exact capability equality for each edge.

Different capability fails closed as:

```text
LEASE_ATTENUATION_CAPABILITY_UNPROVABLE
```

### Resource

Both Resources are normalized through the accepted M4-003 exact-resource
boundary and then compared for exact canonical equality, including
`providerIdentity` presence/value.

M4-034 does not infer containment from filesystem path prefixes, wildcards,
URLs, DNS names or opaque provider-specific conventions.

Different/unprovable Resource relation fails closed as:

```text
LEASE_ATTENUATION_RESOURCE_UNPROVABLE
```

### Constraints

No generic accepted implication algebra exists for arbitrary Lease constraints.
The portable profile therefore supports only:

```text
constraints omitted
constraints {}
```

Any non-empty constraint object fails closed as:

```text
LEASE_ATTENUATION_CONSTRAINT_PROFILE_UNSUPPORTED
```

This prevents unknown parent constraints from being silently ignored by a child.

## 9. Lifetime attenuation

Every chain node must first have a coherent positive M4-030 time interval.
For every direct edge:

```text
parent.issuedAt <= child.issuedAt
child.expiresAt <= parent.expiresAt
```

using the already accepted deterministic RFC3339 instant ordering, including
offset-equivalent instants.

Invalid interval syntax/coherence and broadening remain distinct:

```text
LEASE_ATTENUATION_TIME_INVALID
LEASE_ATTENUATION_TIME_BROADENING
```

M4-034 intentionally has no `observedAt`; it proves interval containment, not
current TTL eligibility. Current execution-time TTL composition remains later
work.

## 10. Usage attenuation and the non-amplification rule

Every node is subject to the accepted M4-031 exact-integer/coherence rules.
For every direct edge:

```text
child.maxUses <= parent.maxUses
```

A broader child maximum fails closed as:

```text
LEASE_ATTENUATION_MAX_USES_BROADENING
```

M4-034 deliberately does **not** require:

```text
child.remainingUses <= parent.remainingUses
```

because legitimate prior parent/sibling consumption may reduce the ancestor's
current counter below a child's local counter.

The security property is instead enforced by coupled authoritative consumption.
A successful hierarchy-aware use decrements exactly one unit from:

```text
target
AND every ancestor through the root
```

as one all-or-none logical transition.

This closes the amplification bug that would exist if a parent and child each
held independent consumable budgets satisfying only static
`child.maxUses <= parent.maxUses`.

## 11. Revocation inheritance without fabricated state

M4-033 remains exact-target revocation storage semantics.

M4-034 does not mutate a child's revocation record when an ancestor is revoked.
Instead hierarchy-aware use treats lifecycle state as:

```text
target revoked
  -> NOT_CONSUMED / LEASE_ATTENUATION_TARGET_REVOKED

any ancestor revoked
  -> NOT_CONSUMED / LEASE_ATTENUATION_ANCESTOR_REVOKED
```

The reference store implements both M4-033 `revokeOne` and M4-034 hierarchy
consume over the same operational state and per-Lease serialization mechanism.
The hardening suite proves that a revoke racing descendant consume can only
produce one of the two legal linearization orders.

## 12. Exhaustion inheritance

After state/attenuation/usage validation and revocation checks:

```text
target.remainingUses == 0
  -> NOT_CONSUMED / LEASE_USAGE_EXHAUSTED

any ancestor.remainingUses == 0
  -> NOT_CONSUMED / LEASE_ATTENUATION_ANCESTOR_EXHAUSTED
```

No counter mutates on any non-consume outcome.

Sibling consumers share ancestor counters. Parent and descendant operations over
shared state also compete over the same ancestor budget rather than receiving
independent authority.

## 13. Linearizability and lock discipline

The reference `InMemoryLeaseAttenuationStore` provides process-local
linearizability for overlapping resolved chains.

It uses stable per-Lease serialization and deterministic lock acquisition over
shared Lease identities so that overlapping operations cannot independently
consume the same remaining authority or deadlock through opposite chain order.

The accepted tests cover:

- repeated use of one child;
- sibling children sharing a parent;
- parent use racing descendant use over one remaining ancestor budget;
- descendant operations with different depths;
- disjoint chains that require no global total order;
- ancestor revoke racing descendant consume.

The reference store makes **no** multi-process/database/distributed guarantee.
A persistent or distributed adapter must provide backend-specific evidence for
its transaction/isolation/locking design before claiming the same M4-034
property.

## 14. M4-032 coordination boundary

M4-032 remains an accepted single-Lease atomic consume primitive and is not
silently redefined by M4-034.

However, a deployment must not expose an uncoordinated M4-032 direct-consume path
for hierarchy-participating Lease state while claiming M4-034 non-amplification.
A conforming deployment must either:

1. route hierarchy-aware uses through M4-034; or
2. prove that M4-032 and M4-034 share the same authoritative counters and
   serialization/transaction mechanism.

Independent counters or unrelated process-local locks around external state do
not establish this guarantee.

## 15. Store contract and failure classification

The public primitive invokes its trusted authoritative store at most once per
request. It does not emulate atomicity through split read/check/write calls and
does not automatically retry.

Known-not-applied failure maps to:

```text
FAIL_CLOSED / STORE / LEASE_ATTENUATION_STORE_UNAVAILABLE
```

Ambiguous commit outcome maps to:

```text
FAIL_CLOSED / STORE / LEASE_ATTENUATION_OUTCOME_UNKNOWN
```

An automatic retry is intentionally forbidden because an ambiguous first
attempt may already have committed one use from every member of the chain.

Malformed, partial, contradictory, unknown-reason or wrong-identity store
evidence maps to:

```text
FAIL_CLOSED / STORE / LEASE_ATTENUATION_STORE_RESULT_INVALID
```

The implementation uses stage-specific allowlists for store semantic failures;
an arbitrary provider string cannot become a stable public reason code.

## 16. Successful store-evidence validation

The broker does not blindly trust a store's `CONSUMED` label.

For accepted success evidence it requires:

- a non-empty target-first chain of at most 32 identities;
- exact requested target identity;
- same chain cardinality before/after;
- exact Lease identity at every corresponding position;
- all immutable authority/lifecycle fields unchanged;
- every `remainingUses` before value to be a positive safe integer;
- every corresponding after value to equal exactly `before - 1`.

A fabricated success where only the target decrements and an ancestor does not
is rejected. A fabricated success that rewrites capability or other immutable
authority is also rejected.

The public success result exposes only the target Lease counters:

```text
CONSUMED / LEASE_ATTENUATED_USE_CONSUMED
remainingUsesAfter == remainingUsesBefore - 1
```

## 17. Observable failure precedence

Spec 0041 defines observable precedence so a multi-defect state cannot leak
implementation-specific validation order.

The accepted semantic order is:

```text
input shape
-> profile
-> leaseRef
-> one store invocation
-> chain missing/cycle/depth
-> state identity/shape
-> authorization
-> capability
-> Resource
-> constraints
-> lifetime
-> M4-031 usage coherence
-> maxUses attenuation
-> target/ancestor revocation
-> target/ancestor exhaustion
-> all-chain decrement
-> store-evidence validation
-> immutable detached result
```

Source review caught an early implementation ordering defect before acceptance.
The final implementation now performs staged validation passes in the accepted
order, and `lease-attenuation-precedence.test.ts` provides six explicit
multi-defect regressions.

Physical backend lock/read order may differ only when externally observable
semantics remain equivalent.

## 18. Hostile JavaScript boundary

The public TypeScript entry point accepts `unknown`.

The final implementation rejects or fails closed on:

- inherited input authority;
- accessor-backed required fields without invoking the getter;
- symbol or unexpected input keys;
- revoked Proxy / descriptor failures;
- coercion-dependent refs;
- unreadable or accessor-backed store evidence;
- unrecognized semantic failure reasons;
- fabricated chain-success evidence.

A thrown store operation is sanitized to outcome-unknown and the store is not
automatically retried.

Successful public results are detached immutable/frozen objects.

## 19. Portable and hardening evidence

The accepted portable fixture corpus contains 28 cases:

```text
LATT-001 .. LATT-028
```

The fixture runner itself includes one corpus-integrity test, so the suite reports:

```text
lease-attenuation.test.ts: 29 PASS
```

Coverage includes:

- root/child/grandchild coupled consumption;
- sibling shared budgets;
- overlapping/disjoint concurrency;
- capability/Resource/constraint attenuation;
- lifetime containment and RFC3339 offset equivalence;
- maxUses bounds and remainingUses semantics;
- authorization provenance;
- missing parent/cycles/depth;
- target/ancestor revocation;
- target/ancestor exhaustion;
- usage-state coherence;
- caller authority rejection;
- store unavailable/ambiguous/malformed outcomes.

Additional implementation hardening evidence:

```text
lease-attenuation-hardening.test.ts: 10 PASS
lease-attenuation-precedence.test.ts: 6 PASS
```

The hardening suite includes parent-vs-descendant shared-budget concurrency and
revoke-vs-descendant-consume race evidence that is intentionally more specific
than the portable corpus.

## 20. Exact final implementation evidence

Exact accepted implementation/hardening head:

```text
6690dbc5a96f1cfb384147d20928f184922ba192
```

Normal CI:

```text
CI #553
run: 33674755323
result: PASS
```

Observed CI evidence:

- frozen `pnpm install --frozen-lockfile`: PASS;
- supply-chain policy: 124 entries PASS;
- architecture boundaries: PASS;
- schema shape: 16 schemas PASS;
- schema compatibility baseline: PASS;
- strict workspace TypeScript: PASS;
- 62 test files / 1204 tests: PASS;
- M4-034 portable suite: 29 PASS;
- M4-034 hostile/store/concurrency hardening: 10 PASS;
- M4-034 multi-defect precedence: 6 PASS;
- oxlint: 174 files, 0 errors, 2 inherited warnings;
- packed Shared TCK assets: 44 registered fixtures;
- external non-workspace dummy consumer: 44 installed TCK asset checks PASS.

Exact pinned Harness rc5 source conformance:

```text
Harness #495
run: 33674755269
result: PASS
```

Every source-conformance step passed:

- safe-runtime checkout;
- exact DeepSeek Harness source baseline checkout;
- pinned public type-surface build;
- reproducible safe-runtime install;
- exact pinned workspace projection;
- projection idempotence;
- rc5 binding typecheck;
- rc5 runtime conformance.

The Harness baseline remains evidence only; it does not define attenuation
semantics.

## 21. Package stage and acceptance boundary

At this audit-writing stage the package marker remains:

```text
M4-034-LEASE-ATTENUATION-IMPLEMENTED
```

The marker is **not** advanced by this acceptance-audit commit.

The implementation itself is accepted because final implementation head
`6690dbc5...` is exact-head dual-green and has completed source-level
review/hardening.

This audit commit must independently reach normal CI + exact pinned Harness rc5
source-conformance dual-green before the package-stage acceptance record is
authorized.

## 22. Explicit non-claims

M4-034 does not:

- issue or mint child Leases;
- allocate a separately reserved delegated quota;
- prove runtime Subject parentage;
- import Harness `parentSession`, run id, workflow sequence or
  `delegationDepth` as protocol authority;
- evaluate current TTL without an `observedAt` input;
- create or modify Decision/Receipt/GuaranteeLevel semantics;
- execute, cancel or roll back an Action;
- solve the post-consume-to-execution race owned by M4-040+ composition;
- modify M4-035/036 CLI behavior;
- modify the public CapabilityLease schema/type;
- establish a multi-process or distributed store guarantee from the
  process-local reference implementation.

## 23. Acceptance verdict

M4-034 production implementation and hardening are **ACCEPTED** at exact head:

```text
6690dbc5a96f1cfb384147d20928f184922ba192
```

because the implementation:

1. conforms to the accepted Spec 0041/profile/corpus authority;
2. proves non-amplification through ancestor-coupled atomic usage rather than
   static counter comparison alone;
3. preserves exact capability/Resource/constraint/lifetime attenuation rules;
4. preserves M4-031 usage coherence and M4-033 revocation separation;
5. validates authoritative store evidence instead of trusting success labels;
6. preserves the specified multi-defect failure precedence;
7. provides explicit hostile-runtime and overlapping-state race hardening;
8. changes no public CapabilityLease wire/schema or Harness semantics;
9. preserves frozen dependency, supply-chain, architecture, schema,
   compatibility and Shared TCK gates;
10. is exact-head dual-green in both normal CI and exact pinned Harness rc5
    source conformance.

This document itself is now the only new acceptance-stage change and remains
pending its own exact-head dual-green verification.

Until that audit exact head is dual-green:

```text
M4-034 package acceptance record: NOT AUTHORIZED
M4-034 final governance: NOT AUTHORIZED
M4-035+: NOT AUTHORIZED
M4-040+: NOT AUTHORIZED
M6 / M13 runtime integration: NOT AUTHORIZED
PR #3 merge: NOT AUTHORIZED without explicit user authorization
```
