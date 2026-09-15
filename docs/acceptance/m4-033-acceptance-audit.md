# M4-033 Acceptance Audit — Authoritative CapabilityLease Revocation

Status: **IMPLEMENTATION ACCEPTED / AUDIT EXACT-HEAD VERIFICATION PENDING**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-033 P0 — revoke`

## 1. Accepted protocol-first authority

Normative specification:

```text
specs/0040-m4-capability-lease-revocation.md
```

Portable corpus:

```text
fixtures/lease-revocation/cases.json
```

Portable profile:

```text
M4-033_LEASE_REVOKE_V1
```

Protocol-first exact head:

```text
831e78dbc7724811f2750e7a7271f9df38471517
```

The protocol-first delta was limited to:

```text
docs/handoff/CURRENT.md
fixtures/lease-revocation/cases.json
specs/0040-m4-capability-lease-revocation.md
```

No production TypeScript, CapabilityLease wire type/schema, Shared TCK,
dependency, lockfile, Adapter/Harness baseline, M4-034+, M4-040+ or M6 behavior
was changed by the protocol-first commit.

Exact-head protocol evidence:

- normal CI #531 / run `33616058152`: PASS;
- exact pinned Harness rc5 source-conformance #473 / run `33616058124`: PASS;
- portable corpus: 32 canonical `LREV-001` through `LREV-032` cases;
- PR #3 remained Open, Draft and mergeable;
- submitted reviews: none;
- review threads: none.

Production implementation was authorized only after that exact head was
dual-green.

## 2. Accepted implementation and review history

Final accepted implementation/hardening head:

```text
76447d4115299ad325e76cb67fea8946f01132ff
```

The implementation history after the protocol-first head is preserved rather
than rebased or squashed away. The first complete implementation head was:

```text
9d510b181c02af050c424f8dd95bee4a30a403f4
```

That head reached same-head dual-green:

- CI #537 / run `33618353671`: PASS;
- Harness #479 / run `33618353716`: PASS;
- 59 test files / 1158 tests PASS.

An independent source-level review then identified a test-evidence quality gap:
the runtime/store behavior was already fail-closed, but two contradictory
store-evidence cases were not explicit regressions. The review therefore added
one test-only hardening commit:

```text
76447d4115299ad325e76cb67fea8946f01132ff
test(capability): harden M4-033 revocation evidence
```

The additional regressions require fail-closed behavior when:

1. a provider claims `ALREADY_REVOKED` while its state says `revoked: false`;
2. a provider claims `REVOKED` while its post-state remains `revoked: false`.

No production behavior, protocol artifact, schema or compatibility baseline was
weakened or rewritten to obtain green status.

## 3. Exact implementation delta

Comparing protocol-first head
`831e78dbc7724811f2750e7a7271f9df38471517` to final implementation/hardening
head `76447d4115299ad325e76cb67fea8946f01132ff` shows seven commits ahead, zero
behind, and exactly these six Capability Broker files:

```text
packages/capability-broker/src/index.ts
packages/capability-broker/src/lease-revoke-hardening.test.ts
packages/capability-broker/src/lease-revoke-memory-store.ts
packages/capability-broker/src/lease-revoke-types.ts
packages/capability-broker/src/lease-revoke.test.ts
packages/capability-broker/src/lease-revoke.ts
```

There is no implementation-stage change to:

```text
specs/0040-m4-capability-lease-revocation.md
fixtures/lease-revocation/cases.json
schemas/v1alpha1/capability-lease.schema.json
packages/protocol/src/capability.ts
Shared TCK assets/manifest
dependencies or lockfile
DeepSeek Harness baseline
M4-034+
M4-040+
M6
```

## 4. Wire-model and authority boundary

M4-033 preserves the published `CapabilityLease` wire model. The implementation
does not add `revoked`, `revokedAt`, `revocationReason`, `revocationRef` or an
operational revision field to the public Lease object.

The authoritative operational projection is deliberately narrow:

```text
LeaseRevocationState {
  leaseRef: string
  revoked: boolean
}
```

Revocation authority comes only from the trusted `LeaseRevocationStore` port.
Caller input supplies only the stable Lease identity and profile; it cannot
supply lifecycle state.

This keeps operational mutation separate from the public wire schema and avoids
creating a second mutable CapabilityLease protocol model.

## 5. Public request boundary

The accepted runtime request is exactly:

```text
{
  profile: "M4-033_LEASE_REVOKE_V1",
  leaseRef
}
```

Unknown fields fail closed. In particular, caller-provided values such as:

```text
revoked
revokedAt
reason
remainingUses
expiresAt
```

cannot become revocation authority.

`leaseRef` is validated under the existing `defs.ref` semantic boundary of
1..512 Unicode code points and is preserved exactly: no trim, case folding,
Unicode normalization, parsing, alias lookup or coercion is performed.

## 6. Accepted monotonic revocation semantics

The only legal mutation for one existing Lease identity is:

```text
revoked: false -> true
```

Results are:

```text
missing
  -> NOT_REVOKED / LEASE_REVOKE_NOT_FOUND

existing + revoked == false
  -> atomically commit revoked := true
  -> REVOKED / LEASE_REVOKED

existing + revoked == true
  -> no mutation
  -> ALREADY_REVOKED / LEASE_ALREADY_REVOKED
```

There is no accepted reverse transition from `true` to `false`.

M4-033 therefore defines permanent prospective invalidation for the exact Lease
identity; reauthorization requires a distinct newly issued Lease identity under
a later/other issuance path.

## 7. No deletion, exhaustion or expiry simulation

The implementation does not simulate revocation by:

```text
remainingUses := 0
expiresAt := now
deleting the Lease record
rewriting authorization provenance
```

Those lifecycle facts remain independent.

The M4-033 store port cannot mutate TTL or usage counters because those facts are
not in its operational state projection. The public request also rejects such
caller-supplied fields.

A missing Lease is not converted into a tombstone. `NOT_FOUND` remains distinct
from `ALREADY_REVOKED`, preserving reconciliation and lifecycle semantics.

## 8. Per-Lease linearizability

The trusted store contract requires `revokeOne(leaseRef)` to be linearizable for
a single Lease identity.

The reference `InMemoryLeaseRevocationStore` uses a per-`leaseRef` promise queue.
For one Lease, concurrent operations are serialized; operations on different
Lease identities do not require one global protocol lock.

For N concurrent revoke attempts against one initially non-revoked Lease, in the
absence of store failure, the portable contract is:

```text
REVOKED x 1
ALREADY_REVOKED x (N - 1)
final revoked = true
```

Winner identity among overlapping attempts is not portable precedence.

The queue lifecycle uses the same tail-ownership cleanup discipline accepted for
M4-032, preventing a completed operation from deleting a newer queued tail.

The reference store claims only single-process linearizability. Database,
multi-process or distributed adapters require backend-specific evidence before
claiming the M4-033 guarantee.

## 9. Store failure classification

The accepted abstract store outcomes include:

```text
NOT_FOUND
UNAVAILABLE_NOT_APPLIED
OUTCOME_UNKNOWN
ALREADY_REVOKED
REVOKED
```

Known not applied:

```text
UNAVAILABLE_NOT_APPLIED
  -> FAIL_CLOSED / STORE / LEASE_REVOKE_STORE_UNAVAILABLE
```

Ambiguous outcome:

```text
OUTCOME_UNKNOWN
  -> FAIL_CLOSED / STORE / LEASE_REVOKE_OUTCOME_UNKNOWN
```

A thrown or rejected store invocation is conservatively classified as outcome
unknown because the broker cannot prove whether the backend committed before the
failure became observable.

The primitive invokes the store at most once per invocation and performs no
automatic retry.

Because revocation is monotonic set-to-true rather than a decrement, a later
caller-driven retry cannot restore authority or consume a second quota unit; it
may observe `ALREADY_REVOKED` if the earlier ambiguous attempt actually
committed. The original ambiguous invocation nevertheless remains fail-closed.

## 10. Store-evidence hardening

The broker does not trust a provider's status string as sufficient evidence of
success.

For `ALREADY_REVOKED`, it requires:

```text
state.leaseRef == requested leaseRef
state.revoked == true
```

For `REVOKED`, it requires:

```text
stateBefore.leaseRef == requested leaseRef
stateAfter.leaseRef  == requested leaseRef
stateBefore.revoked == false
stateAfter.revoked  == true
```

Wrong identity, missing state, non-boolean state, accessor-backed state,
contradictory state or unknown status fails closed as:

```text
FAIL_CLOSED / STORE / LEASE_REVOKE_STORE_RESULT_INVALID
```

The post-green review added explicit regressions for contradictory
`ALREADY_REVOKED` and non-monotonic `REVOKED` evidence before acceptance.

## 11. Hostile JavaScript runtime boundary

The public primitive accepts request input as `unknown`. It therefore treats
TypeScript types as developer ergonomics rather than a runtime security proof.

The implementation:

- rejects null and arrays;
- rejects inherited authority;
- rejects unexpected string or symbol keys;
- reads security-relevant fields using own property descriptors;
- rejects accessor-backed request properties without executing getters;
- catches revoked Proxy / own-key / descriptor failures;
- performs no string coercion of `leaseRef`;
- does not mutate caller input;
- invokes the store no more than once;
- sanitizes thrown provider errors;
- returns detached frozen results.

Store-result hardening uses the same descriptor-safe pattern so malformed
provider evidence cannot execute getter-backed `status`, `leaseRef` or `revoked`
properties while being inspected.

## 12. Separation from M4-030, M4-031 and M4-032

M4-033 does not modify or reinterpret:

```text
issuedAt
expiresAt
maxUses
remainingUses
```

TTL remains M4-030. Usage snapshot validity remains M4-031. Atomic one-use
consumption remains M4-032.

Revocation and exhaustion are distinct facts: an exhausted Lease may still be
revoked, and revoking a Lease with remaining uses does not consume those uses.

The accepted M4-032 primitive remains counter-only and is not retroactively
redefined as revocation-aware.

## 13. Revocation/consume TOCTOU boundary

M4-033 intentionally does not claim that separate lifecycle primitives form an
execution-safe composition.

This sequence remains unsafe:

```text
observe not revoked
concurrent revoke commits
consume via M4-032
execute action
```

A later execution/PEP composition must prove that a revocation cannot linearize
before execution authority is irreversibly acquired while the action still
proceeds.

Possible backend implementations may use a combined transaction, shared
per-Lease serialization or another backend-specific atomic proof, but M4-033 does
not invent that composition early.

Therefore neither `REVOKED` nor an M4-032 `CONSUMED` result is by itself a full
CapabilityDecision/PEP execution proof.

## 14. Parent/child boundary

M4-033 revokes only the exact target Lease identity.

It does not:

```text
walk parentLeaseRef
revoke a parent automatically
revoke descendants automatically
prove attenuation
fabricate child revocation records
```

Those semantics remain M4-034 or a later explicitly authorized composition.

No M4-034 implementation was pulled forward by this Gate.

## 15. Portable corpus coverage

The portable corpus contains 32 canonical cases:

```text
LREV-001 .. LREV-032
```

It covers:

- first revocation;
- already-revoked idempotency;
- missing Lease without tombstone creation;
- exact/case-sensitive/untrimmed identity;
- null/array/missing/profile-invalid/ref-invalid requests;
- rejection of caller-supplied revocation, TTL and usage authority;
- 512/513 Unicode-code-point boundaries;
- astral Unicode code-point counting;
- known-not-applied store failure;
- ambiguous store outcome;
- malformed provider result;
- wrong-identity provider evidence;
- concurrent repeated revocation;
- already-revoked concurrent attempts;
- independent different-Lease revocation;
- lifecycle separation from usage and TTL facts.

The production test suite executes this reviewed corpus directly rather than
maintaining a second handwritten portable truth table.

## 16. Host-language hardening coverage

Dedicated hardening tests cover:

- accessor request rejection without getter execution;
- revoked Proxy input;
- unexpected symbol authority;
- inherited identity rejection;
- exactly-one store invocation and no implicit retry after throw;
- wrong Lease identity evidence;
- fabricated `true -> true` new-revocation evidence;
- contradictory `ALREADY_REVOKED` with `revoked:false`;
- non-monotonic `REVOKED` with `stateAfter.revoked:false`;
- accessor-backed provider result/status/state rejection;
- detached frozen result objects;
- request non-mutation.

The final hardening suite contains 8 tests.

## 17. Exact-head quality evidence

For final implementation/hardening head
`76447d4115299ad325e76cb67fea8946f01132ff`:

- normal CI #538 / run `33618834463`: PASS;
- exact Harness rc5 source-conformance #480 / run `33618834499`: PASS;
- CI verify job `100210870220`: PASS;
- frozen `pnpm install --frozen-lockfile`: PASS;
- supply-chain policy: 124 entries PASS;
- architecture boundaries: PASS;
- schema shape: 16 schemas PASS;
- schema compatibility baseline: PASS;
- strict workspace TypeScript: PASS;
- test files: 59 PASS;
- tests: 1159 PASS;
- M4-033 primary portable suite: 33 PASS;
- M4-033 hostile-runtime/store hardening suite: 8 PASS;
- oxlint: 168 files, 0 errors, two inherited repository warnings;
- packed Shared TCK / external non-workspace consumer: 44 registered assets PASS;
- exact pinned Harness source checkout: PASS;
- pinned Harness public type-surface build: PASS;
- reproducible safe-runtime dependency install: PASS;
- exact pinned Harness workspace projection: PASS;
- projection idempotence: PASS;
- real rc5 binding typecheck against pinned source: PASS;
- real rc5 runtime conformance: PASS;
- PR #3: Open, Draft, mergeable;
- submitted reviews: none;
- review threads: none.

The two oxlint warnings are inherited repository warnings and are not M4-033
errors.

## 18. Public package stage

At this audit parent head, the package marker is intentionally:

```text
M4-033-LEASE-REVOCATION-IMPLEMENTED
```

The package exports:

```text
revokeCapabilityLease
InMemoryLeaseRevocationStore
LEASE_REVOKE_PROFILE
LeaseRevokeInput
LeaseRevokeResult
LeaseRevoked
LeaseAlreadyRevoked
LeaseNotRevoked
LeaseRevokeFailure
LeaseRevokeFailureReason
LeaseRevokeStage
LeaseRevocationState
LeaseRevocationStore
LeaseRevocationStoreOutcome
```

The package marker does not yet claim acceptance. Advancing it to an accepted
marker is a separate package-stage acceptance-record commit after this audit
exact head itself reaches dual-green.

## 19. Independent acceptance findings

The implementation/security review found no remaining M4-033 blocker after the
test-evidence hardening commit.

Confirmed properties:

- no CapabilityLease wire/schema expansion;
- authoritative state comes from the store, not caller snapshots;
- revocation is monotonic and permanent for the exact Lease identity;
- repeated revoke is state-idempotent;
- missing identity is not silently converted into a tombstone;
- no TTL/usage mutation is possible through the M4-033 state projection;
- same-Lease reference-store operations are process-locally linearizable;
- different Lease identities do not require a global protocol lock;
- store failures distinguish known-not-applied from ambiguous outcome;
- no implicit retry is performed;
- malformed/contradictory provider success evidence cannot fabricate success;
- runtime input/accessor/Proxy boundaries fail closed;
- no parent/child cascade or attenuation logic was pulled forward;
- no execution/PEP or revocation-aware-consume claim was fabricated;
- DeepSeek Harness remains compatibility evidence only.

The earlier observation that portable fixture cases carry preserved TTL/usage
examples is not treated as a separate mutable runtime store surface. The actual
M4-033 public/store types structurally exclude those fields, while the portable
request corpus also rejects caller attempts to inject them. Acceptance therefore
rests on the enforced interface boundary plus direct portable and hostile-runtime
tests, not on a self-equality assertion over fixture metadata.

## 20. Acceptance verdict

```text
M4-033 protocol-first authority: PASS
M4-033 portable corpus: PASS
M4-033 monotonic revocation transition: PASS
M4-033 repeated-revoke idempotency: PASS
M4-033 per-Lease linearizability contract: PASS
M4-033 store failure classification: PASS
M4-033 hostile-runtime boundary: PASS
M4-033 store-evidence hardening: PASS
M4-033 no-delete/no-expiry/no-exhaustion simulation: PASS
M4-033 TTL/usage separation: PASS
M4-033 parent-child boundary: PASS
M4-033 revocation/consume TOCTOU boundary preserved: PASS
M4-033 exact-head CI: PASS
M4-033 Harness compatibility: PASS
M4-033 implementation: ACCEPTED
M4-034+: NOT AUTHORIZED
PR #3 merge: NOT AUTHORIZED
```

This audit does not itself close M4-033 governance.

## 21. Audit exact-head gate

The commit containing this audit MUST itself reach:

1. normal repository CI PASS;
2. exact pinned Harness rc5 source-conformance PASS;
3. PR #3 remains Open/Draft/mergeable;
4. no review/review-thread blocker exists.

Only after this audit exact head is dual-green may the package-stage acceptance
record advance `PACKAGE_STAGE` from implementation to accepted status.

M4-034+, M4-040+, M6 and PR #3 merge remain unauthorized until their respective
staged gates are explicitly reached.
