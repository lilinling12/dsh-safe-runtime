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
- M4-031 maxUses / usage validity: **IMPLEMENTATION ACCEPTED / ACCEPTANCE-RECORD DUAL-GREEN**
- M4-031 final governance: **IN PROGRESS — final governance exact head must be dual-green before closure**
- M4-032+, M4-040+ and M6: **NOT AUTHORIZED**

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

Harness behavior MUST NOT define Lease usage semantics. M4-031 remains
protocol-first and runtime-independent.

## M4-030 closure prerequisite

M4-030 final-governance exact head:

```text
64e6b4a2a2e0c35522f004ec185548e8214b81c1
```

Exact-head evidence:

- normal CI #518 / run `33578030624`: PASS;
- exact Harness rc5 source-conformance #460 / run `33578030655`: PASS;
- PR #3 remained Open, Draft and mergeable with no review/thread blocker.

Therefore M4-030 governance is CLOSED and M4-031 was authorized to begin
protocol-first.

## M4-031 protocol-first closure

Normative specification:

```text
specs/0038-m4-capability-lease-usage.md
```

Portable corpus:

```text
fixtures/lease-usage/cases.json
```

Corpus profile:

```text
M4-031_LEASE_USAGE_V1
```

Portable cases: `32`, canonical sequential IDs `LUSE-001` through `LUSE-032`.

Protocol-first exact head:

```text
b7fd6b4b127ec393113de15d35f81ee90738fd42
```

Relative to M4-030 final governance, the protocol-first delta was exactly:

```text
docs/handoff/CURRENT.md
fixtures/lease-usage/cases.json
specs/0038-m4-capability-lease-usage.md
```

Exact-head evidence:

- normal CI #519 / run `33586806719`: PASS;
- exact Harness rc5 source-conformance #461 / run `33586807228`: PASS;
- no review/review-thread blocker.

Production TypeScript began only after that same-head dual-green prerequisite.

## M4-031 accepted semantics

M4-031 is a deterministic read-only evaluator of an already-materialized
CapabilityLease usage snapshot.

Portable input is exactly:

```text
LeaseUsageEvaluationInput {
  profile: "M4-031_LEASE_USAGE_V1"
  maxUses: integer
  remainingUses: integer
}
```

Portable exact-integer and coherence domain:

```text
1 <= maxUses <= 9007199254740991
0 <= remainingUses <= maxUses
```

After validation:

```text
remainingUses == 0 -> USAGE_INELIGIBLE / LEASE_USAGE_EXHAUSTED
remainingUses >  0 -> USAGE_ELIGIBLE   / LEASE_USAGE_AVAILABLE
remainingUses > maxUses -> FAIL_CLOSED / USAGE / LEASE_USAGE_STATE_INVALID
```

The request-time `leaseRequest.maxUses <= 100000` bound is not imported into an
existing Lease. A coherent materialized Lease with `maxUses: 100001` remains
valid under M4-031.

JavaScript `-0` is numeric zero and therefore means exhausted for
`remainingUses`. Values outside the exact IEEE-754 safe-integer domain fail
closed; no string, boolean, object or parser coercion is allowed.

`USAGE_ELIGIBLE` means only that the observed snapshot is coherent and has at
least one remaining use. It is not a reservation, atomic consume result,
authorization decision or PEP permission.

## M4-031 accepted implementation

Accepted implementation exact head:

```text
4888db9445f807ce2a17f4434371a3d18aaf97bc
```

The implementation delta from protocol-first is exactly:

```text
packages/capability-broker/src/index.ts
packages/capability-broker/src/lease-usage-hardening.test.ts
packages/capability-broker/src/lease-usage-types.ts
packages/capability-broker/src/lease-usage.test.ts
packages/capability-broker/src/lease-usage.ts
```

The public evaluator accepts `unknown`, requires exact own data properties,
rejects accessors/inherited/symbol/unexpected authority, fails closed on hostile
or revoked Proxy meta-operations, performs no counter coercion, mutates no input,
and returns detached frozen results with stable sanitized failures.

The implementation is observational only. It does not decrement/reserve usage,
perform compare-and-swap, lock or transact, consult TTL/revocation/delegation,
execute an action or wire a PEP. Atomic consume remains M4-032.

Exact accepted implementation evidence:

- normal CI #520 / run `33588237365`: PASS;
- exact Harness rc5 source-conformance #462 / run `33588237362`: PASS;
- frozen install / 124-entry supply-chain policy: PASS;
- architecture boundaries / 16-schema shape / schema baseline: PASS;
- strict workspace TypeScript: PASS;
- 55 test files / 1070 tests: PASS;
- M4-031 primary suite: 35 PASS;
- M4-031 hostile-runtime hardening suite: 11 PASS;
- oxlint: 0 errors and two inherited repository warnings;
- packed Shared TCK + external non-workspace consumer: 44 assets PASS;
- pinned Harness build/install/projection/idempotence/exact-source typecheck/runtime: PASS.

## M4-031 acceptance record

Acceptance audit commit:

```text
61d4226b72a2a2e7cae185b3e7c8c33676edd583
```

The audit is:

```text
docs/acceptance/m4-031-acceptance-audit.md
```

Audit exact-head evidence:

- normal CI #521 / run `33591492448`: PASS;
- exact Harness rc5 source-conformance #463 / run `33591492442`: PASS.

Package-stage acceptance-record exact head:

```text
68494d35e2f488f631370b80c6f84ce35a9d1818
```

That transition changed only the Capability Broker package-stage comment/marker
to:

```text
M4-031-LEASE-USAGE-ACCEPTED
```

Exact-head evidence for `68494d35...`:

- normal CI #522 / run `33595106908`: PASS;
- exact Harness rc5 source-conformance #464 / run `33595106809`: PASS;
- frozen install / 124-entry supply-chain policy: PASS;
- architecture / 16-schema shape / schema baseline / strict TypeScript: PASS;
- 55 test files / 1070 tests: PASS;
- M4-031 primary suite: 35 PASS;
- M4-031 hardening suite: 11 PASS;
- packed Shared TCK external consumer: 44 assets PASS;
- PR #3: Open, Draft, mergeable;
- reviews: none;
- review threads: none.

Therefore the implementation and acceptance record are accepted. Final
governance bookkeeping is now the only active M4-031 Gate.

## Final governance scope

The final-governance commit may change only:

```text
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md   # append-only
docs/roadmap.md           # only M4-031 acceptance marker
```

It MUST NOT change production code, Spec/corpus/schema, Shared TCK,
Adapter/Harness baseline, dependency, lockfile, M4-032+ semantics or PR merge
state.

The resulting final-governance exact head MUST reach:

1. normal repository CI PASS;
2. exact pinned Harness rc5 source-conformance PASS;
3. PR #3 remains Open/Draft/mergeable with no review/review-thread blocker.

Only after that same exact head is dual-green is M4-031 governance CLOSED and
M4-032 P0 atomic consume authorized to begin protocol-first.

## Boundaries that remain enforced

- M4-031 does not inspect TTL timestamps.
- M4-031 does not consume or reserve a use.
- M4-031 does not provide linearizability or solve TOCTOU.
- M4-031 does not implement revocation.
- M4-031 does not validate parent-child attenuation.
- M4-031 does not rerun policy/approval or construct authorization.
- M4-031 does not execute a PEP.
- DeepSeek Harness remains compatibility evidence only.
- M4-032+, M4-040+ and M6 remain unauthorized until their own Gate opens.
- PR #3 remains Draft; no merge without explicit user authorization.

## Resume instruction

1. refresh PR #3 exact head/base/reviews/threads;
2. verify the final-governance delta from `68494d35...` is exactly CURRENT +
   append-only HISTORY + only the M4-031 roadmap marker;
3. require exact-head normal CI + pinned Harness rc5 source-conformance
   dual-green;
4. only after that evidence declare M4-031 governance CLOSED;
5. then authorize M4-032 P0 atomic consume as the only next protocol-first Gate;
6. keep M4-033+, M4-040+, M6 and PR merge unauthorized.
