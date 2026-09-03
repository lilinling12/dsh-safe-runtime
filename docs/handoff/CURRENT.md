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
- M4-030..034: **GOVERNANCE CLOSED after this final-governance exact head is dual-green**
- M4-035 P1 lease listing CLI: **NEXT AUTHORIZED GATE / PROTOCOL-FIRST ONLY after final-governance dual-green**
- M4-036, M4-040+, M6, M13 runtime-lineage integration: **NOT AUTHORIZED**
- PR #3 merge: **NOT AUTHORIZED without explicit user authorization**

Live GitHub state overrides this snapshot.

## M4-034 accepted authority

Normative specification:

```text
specs/0041-m4-capability-lease-parent-child-attenuation.md
profile: M4-034_LEASE_ATTENUATION_V1
```

Portable corpus:

```text
fixtures/lease-attenuation/cases.json
28 cases: LATT-001 through LATT-028
```

Protocol-first exact head:

```text
e712a599d143a30ca69103d6a0f931f903cd63a8
```

Protocol evidence:

- CI #542 / run `33672611292`: PASS;
- Harness rc5 source-conformance #484 / run `33672611311`: PASS.

Accepted implementation/hardening exact head:

```text
6690dbc5a96f1cfb384147d20928f184922ba192
```

Implementation evidence:

- CI #553 / run `33674755323`: PASS;
- Harness rc5 source-conformance #495 / run `33674755269`: PASS;
- 62 test files / 1204 tests PASS;
- M4-034 portable suite: 29 PASS;
- hostile/store/concurrency hardening: 10 PASS;
- multi-defect precedence suite: 6 PASS;
- frozen install / 124-entry supply-chain policy: PASS;
- architecture / 16-schema shape / schema baseline / strict TypeScript: PASS;
- packed Shared TCK + external non-workspace consumer: 44 assets PASS.

Acceptance audit:

```text
docs/acceptance/m4-034-acceptance-audit.md
7f6542e345b51e985a0f55c253881b3c4de093bb
```

Audit exact-head evidence:

- CI #554 / run `33702524911`: PASS;
- Harness rc5 source-conformance #496 / run `33702524917`: PASS.

Package acceptance record:

```text
b85ac81b8858a199259c0794975e3349e3bb9de2
PACKAGE_STAGE = M4-034-LEASE-ATTENUATION-ACCEPTED
```

Package-record exact-head evidence:

- CI #555 / run `33704248709`: PASS;
- Harness rc5 source-conformance #497 / run `33704248711`: PASS;
- every source-conformance step passed, including exact pinned source checkout,
  type-surface build, reproducible install, projection/idempotence, binding
  typecheck and runtime conformance.

## Accepted M4-034 security semantics

A static `child.maxUses <= parent.maxUses` comparison is insufficient because
independent counters can amplify aggregate authority. M4-034 therefore resolves
the authoritative target-to-root Lease chain and, on successful hierarchy-aware
use, decrements exactly one usage unit from the target and every ancestor as one
all-or-none logical transition.

Portable direct-edge attenuation requires exact parent provenance, exact
capability equality, exact M4-003 canonical Resource equality, omitted/empty
constraints only, contained lifetime intervals and `child.maxUses <=
parent.maxUses`. `child.remainingUses <= parent.remainingUses` is intentionally
not required because prior parent/sibling consumption may legitimately lower the
ancestor's current counter; coupled consumption enforces the effective budget.

Target/ancestor revocation and exhaustion block hierarchy use without fabricating
child revocation history. The reference store shares operational state and
per-Lease serialization with M4-033 revocation, and hardening covers sibling,
parent/descendant and revoke/consume overlap.

The reference in-memory store proves process-local linearizability only.
Database, multi-process or distributed adapters require backend-specific
transaction/isolation/locking evidence before claiming the same guarantee.

## Observable precedence and hostile-runtime boundary

The accepted failure order is:

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
-> usage coherence
-> maxUses attenuation
-> target/ancestor revocation
-> target/ancestor exhaustion
-> all-chain decrement
-> store-evidence validation
```

The implementation uses stage-specific reason allowlists, rejects accessor,
inherited, symbol, Proxy/unreadable or coercion-dependent authority, performs no
automatic retry after ambiguous store outcome, validates successful all-chain
decrement evidence and returns detached frozen public results.

## Explicit non-claims

M4-034 does not issue child Leases, reserve delegated quota, prove runtime
Subject lineage, import Harness `parentSession`/workflow/delegationDepth as
protocol authority, evaluate current TTL without `observedAt`, construct
Decision/Receipt/GuaranteeLevel, execute/cancel/rollback Actions, solve the
post-consume execution race, alter the public CapabilityLease schema/type or
claim distributed atomicity from the process-local reference store.

DeepSeek Harness remains Adapter compatibility evidence only:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

## Final-governance gate

This final governance transition is restricted to:

```text
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md   # append-only
docs/roadmap.md           # M4-034 marker only
```

No production implementation, Spec/corpus/schema, Shared TCK, dependency,
lockfile, Adapter/Harness baseline, M4-035 implementation, M4-036, M4-040+, M6
or M13 behavior is authorized in this commit.

The resulting final-governance exact head must itself reach normal CI + exact
pinned Harness rc5 source-conformance dual-green. Only then is M4-034 governance
CLOSED and M4-035 P1 lease listing CLI the sole newly authorized protocol-first
Gate.

## Resume instruction

1. refresh PR #3 exact head/base/Open/Draft/mergeability/reviews/threads;
2. confirm final-governance delta from `b85ac81b...` is exactly CURRENT,
   append-only HISTORY and the M4-034 roadmap marker;
3. require exact-head normal CI + pinned Harness rc5 source-conformance green;
4. only after dual-green mark M4-034 governance CLOSED and begin M4-035
   protocol-first reconnaissance;
5. keep M4-036, M4-040+, M6, M13 integration and PR #3 merge unauthorized.
