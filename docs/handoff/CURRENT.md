# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before changes;
> normative specs/schemas/TCK and accepted exact-head evidence remain authority.

## Snapshot

- Recorded at: `2026-09-03`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M4 — Capability Broker v0.1`
- Active PR: `#3 — feat(policy): begin M4 capability broker`
- Branch: `feat/m4-capability-broker`
- Base: `main@57430273e065be8d38807d67b175fa154c801d43`
- Parent governance-closed head: `797252bcd26291ad99433c1cccf0dcce99550f15`
- M4-001..014: **GOVERNANCE CLOSED**
- M4-020..025: **GOVERNANCE CLOSED**
- M4-030..033: **GOVERNANCE CLOSED**
- M4-034 parent-child attenuation: **AUTHORIZED / PROTOCOL-FIRST IN PROGRESS**
- M4-034 production implementation: **NOT AUTHORIZED before protocol-first exact-head dual-green**
- M4-035+, M4-040+, M6, M13 runtime-lineage integration: **NOT AUTHORIZED**
- PR #3 merge: **NOT AUTHORIZED without explicit user authorization**

Live GitHub state overrides this snapshot.

## M4-033 final closure

Final governance exact head:

```text
797252bcd26291ad99433c1cccf0dcce99550f15
```

Evidence:

- CI #541 / run `33667518261`: PASS;
- Harness rc5 source-conformance #483 / run `33667518173`: PASS;
- PR #3 remained Open, Draft, mergeable;
- reviews: none;
- review threads: none.

Therefore M4-033 governance is CLOSED and M4-034 is the sole newly authorized
engineering Gate.

## M4-034 authority reconciliation

Core §5 requires attenuating delegation; Core §11 requires a child Lease not to
broaden authority. The published v1alpha1 Lease already has
`parentLeaseRef?`, capability, Resource, constraints, lifetime, counters and
authorization provenance.

Core §11 also contains an older illustrative JSON fragment with
`authorizationRef` / `delegation`, which are not published v1alpha1 Lease wire
fields. M4-034 does not treat those names as authority and does not change the
public Lease schema/type.

M4-022 explicitly deferred parent existence/scope; M4-030 time, M4-031 usage,
M4-032 single-Lease consume and M4-033 exact-target revocation remain separate
accepted primitives.

## Critical non-amplification rule

`child.maxUses <= parent.maxUses` alone is insufficient. Independent parent and
child counters can amplify aggregate use.

M4-034 therefore requires a hierarchy-aware successful use to atomically
decrement one usage unit from the target and **every ancestor through the root**.
Sibling and parent/descendant operations share ancestor budgets. Overlapping
chains must be linearizable over shared Lease identities; disjoint chains need
no global ordering.

A deployment must route hierarchy-aware use through shared state or prove that
any M4-032 direct-consume path uses the same authoritative counters and
serialization mechanism.

## Portable direct-edge attenuation

For each child -> parent edge:

```text
parent exists
child.parentLeaseRef == parent.leaseRef
child.authorization.kind == lease
child.authorization.ref == parent.leaseRef
child.capability == parent.capability
child.resource == parent.resource after M4-003 canonicalization
parent.issuedAt <= child.issuedAt
child.expiresAt <= parent.expiresAt
child.maxUses <= parent.maxUses
```

Only omitted/empty constraints are supported because no generic constraint
implication algebra exists.

`child.remainingUses <= parent.remainingUses` is intentionally not required;
effective quota is enforced by the atomic ancestor-coupled operation.

Chain identity is exact, cycles fail closed, and portable depth is bounded at 32
Lease identities including target/root.

## Revocation inheritance

M4-033 remains exact-target storage semantics.

M4-034 hierarchy use treats target or any revoked ancestor as ineligible, but
does **not** fabricate child revocation records.

M4-033 and M4-034 adapters must share authoritative revocation state and
linearization for overlapping identities before a deployment claims this
inheritance.

## Protocol-first artifacts

Normative draft:

```text
specs/0041-m4-capability-lease-parent-child-attenuation.md
profile: M4-034_LEASE_ATTENUATION_V1
```

Portable corpus:

```text
fixtures/lease-attenuation/cases.json
28 cases: LATT-001 through LATT-028
```

Coverage includes root/child/grandchild coupled use, sibling shared budgets,
overlap/disjoint concurrency, scope/time/max-use bounds, provenance, missing
parent/cycle, target/ancestor revocation, exhaustion, invalid usage, caller
authority rejection, store faults and depth limit.

## Authorized protocol-first delta

Exactly:

```text
specs/0041-m4-capability-lease-parent-child-attenuation.md
fixtures/lease-attenuation/cases.json
docs/handoff/CURRENT.md
```

No production TypeScript, CapabilityLease schema/type, Core rewrite, Shared TCK
registration, dependency, lockfile, HISTORY, roadmap acceptance marker,
Adapter/Harness baseline, M4-035+, M4-040+, M6 or M13 behavior is authorized
before this protocol-first exact head is dual-green.

## Compatibility baseline

DeepSeek Harness remains Adapter compatibility evidence only:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

Harness behavior does not define attenuation semantics.

## Resume instruction

1. refresh PR #3 exact head/base/reviews/threads;
2. verify parent `797252bc...` -> protocol-first candidate changes exactly the
   three authorized files;
3. require exact-head normal CI + pinned Harness rc5 source-conformance green;
4. only then authorize M4-034 production implementation;
5. keep M4-035+, M4-040+, M6, M13 integration and PR merge unauthorized.
