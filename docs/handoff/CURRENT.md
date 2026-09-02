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
- M4-031 maxUses / usage validity: **AUTHORIZED / PROTOCOL-FIRST IN PROGRESS**
- M4-031 production implementation: **NOT AUTHORIZED until the protocol-first exact head is dual-green**
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

Harness behavior MUST NOT define Lease usage semantics.

## M4-030 final governance closure

Final-governance exact head:

```text
64e6b4a2a2e0c35522f004ec185548e8214b81c1
```

The final-governance delta from acceptance-record head
`0d2a07a4753bda5f2ebcbbdf50725e2c5413e4b9` was exactly:

```text
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md   # +53 / -0 append-only
docs/roadmap.md           # +1 / -1; only M4-030 acceptance marker
```

Exact-head evidence:

- normal CI #518 / run `33578030624`: PASS;
- exact Harness rc5 source-conformance #460 / run `33578030655`: PASS;
- PR #3: Open, Draft, mergeable;
- reviews: none;
- review threads: none.

Therefore M4-030 governance is CLOSED and M4-031 is the only newly authorized
protocol-first Gate.

## M4-031 authority reconciliation

The existing v1alpha1 CapabilityLease already requires:

```text
maxUses: integer, minimum 1
remainingUses: integer, minimum 0
```

Core §11 requires a Lease to become invalid immediately after exhaustion. Spec
0033 explicitly leaves usage validity to M4-031. Spec 0002 separately assigns
parent-child use attenuation to the later delegation boundary.

The existing `leaseRequest.maxUses` maximum (`100000`) is an issuance-request
bound only. It MUST NOT be imported as an upper bound on an already-materialized
Lease during M4-031.

## M4-031 protocol-first draft

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

The protocol-first delta is limited to:

```text
docs/handoff/CURRENT.md
fixtures/lease-usage/cases.json
specs/0038-m4-capability-lease-usage.md
```

No production TypeScript, CapabilityLease schema/type, Shared TCK registration,
dependency, lockfile, Adapter/Harness baseline, M4-032+, M4-040+ or M6 file is
authorized before this protocol-first exact head is dual-green.

## M4-031 normative usage semantics

M4-031 is a read-only usage-state evaluator. It answers only whether the current
`maxUses` / `remainingUses` snapshot is coherent and non-exhausted.

Portable input:

```text
LeaseUsageEvaluationInput {
  profile: "M4-031_LEASE_USAGE_V1"
  maxUses: integer
  remainingUses: integer
}
```

Coherent state is:

```text
1 <= maxUses <= 9007199254740991
0 <= remainingUses <= maxUses
```

The portable exact-integer ceiling prevents cross-language divergence when JSON
numbers are parsed by IEEE-754 runtimes. It is not the `leaseRequest.maxUses`
issuance bound.

After validation:

```text
remainingUses == 0 -> USAGE_INELIGIBLE / LEASE_USAGE_EXHAUSTED
remainingUses >  0 -> USAGE_ELIGIBLE   / LEASE_USAGE_AVAILABLE
remainingUses > maxUses -> FAIL_CLOSED / USAGE / LEASE_USAGE_STATE_INVALID
```

`USAGE_ELIGIBLE` is not a reservation and does not solve concurrency races.
M4-032 remains responsible for authoritative atomic consumption.

## Failure vocabulary

```text
LEASE_USAGE_INPUT_INVALID
LEASE_USAGE_PROFILE_INVALID
LEASE_USAGE_MAX_USES_INVALID
LEASE_USAGE_REMAINING_USES_INVALID
LEASE_USAGE_STATE_INVALID
```

Validation precedence is outer shape -> exact keys -> profile -> maxUses ->
remainingUses -> coherence -> exhausted/available.

## Runtime/security requirements for later implementation

After protocol-first dual-green, the TypeScript reference implementation must:

- accept runtime input as `unknown`;
- inspect exact own data properties only;
- reject getters/inherited/symbol/unexpected fields;
- fail closed on revoked/unreadable Proxies and meta-operations;
- perform no string/boolean/number coercion;
- require safe exact integers before counter comparison;
- mutate no caller input and decrement no counter;
- return detached frozen outputs;
- never echo attacker-controlled values or host exception text.

Portable JSON fixtures cannot model accessors/Proxy attacks; those belong in
runtime hardening tests only after implementation authorization.

## Gate

The resulting exact protocol-first head MUST reach:

1. normal CI PASS;
2. exact pinned Harness rc5 source-conformance PASS;
3. PR #3 remains Open/Draft/mergeable with no review/review-thread blocker.

Only after that same exact head is dual-green may M4-031 production TypeScript
begin.

## Boundaries that remain enforced

- M4-031 does not inspect TTL timestamps.
- M4-031 does not consume or reserve a use.
- M4-031 does not implement revocation.
- M4-031 does not implement parent-child attenuation.
- M4-031 does not authorize execution or invoke a PEP.
- M4-032+, M4-040+ and M6 remain unauthorized.
- PR #3 remains Draft; no merge without explicit user authorization.

## Resume instruction

1. refresh PR #3 exact head/base/reviews/threads;
2. verify the protocol-first delta from `64e6b4a2...` is exactly CURRENT +
   `fixtures/lease-usage/cases.json` + Spec 0038;
3. require exact-head normal CI + pinned Harness rc5 source-conformance
   dual-green;
4. only then authorize M4-031 production implementation;
5. keep M4-032+, M4-040+, M6 and PR merge unauthorized.
