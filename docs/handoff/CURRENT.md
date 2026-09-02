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
- Parent acceptance-record head: `61829b65a71521e5b21bc0fcf3092dfa503ee424`
- M4-001 through M4-014: **GOVERNANCE CLOSED**
- M4-020 through M4-025: **GOVERNANCE CLOSED**
- M4-030 TTL: **GOVERNANCE CLOSED**
- M4-031 maxUses / usage validity: **GOVERNANCE CLOSED**
- M4-032 atomic consume: **IMPLEMENTATION ACCEPTED / FINAL GOVERNANCE EXACT-HEAD VERIFICATION PENDING**
- M4-033+, M4-040+ and M6: **NOT AUTHORIZED until this final governance head is exact-head dual-green**
- PR #3 merge: **NOT AUTHORIZED without explicit user authorization**

Live GitHub state overrides this file.

## Live ancestry note

The long-running PR retains known ancestry-only drift relative to `main`. Do not
rebase, force-update, squash, or rewrite accepted ancestry merely to change
GitHub compare counters.

PR #3 remains Open and Draft. At the parent acceptance-record head it is
mergeable and has no review or review-thread blockers.

## Compatibility baseline

DeepSeek Harness remains Adapter compatibility evidence only:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

Harness behavior does not define Lease consume semantics.

## M4-032 accepted authority

Normative specification:

```text
specs/0039-m4-capability-lease-atomic-consume.md
```

Portable corpus:

```text
fixtures/lease-consume/cases.json
profile: M4-032_LEASE_CONSUME_V1
cases: 40 (LCON-001 through LCON-040)
```

The accepted primitive consumes exactly one authoritative usage unit for one
`leaseRef` through a trusted atomic store port. It preserves M4-031 exact
safe-integer/coherence validation and requires per-Lease linearizability.

A successful consume commits:

```text
remainingUses := remainingUses - 1
```

exactly once for that successful invocation. Exhausted or invalid state is not
mutated. Missing state is not created.

Store failure semantics remain explicit:

- known not applied -> `LEASE_CONSUME_STORE_UNAVAILABLE`;
- commit outcome cannot be proven -> `LEASE_CONSUME_OUTCOME_UNKNOWN`;
- the primitive performs no automatic retry and makes no distributed
  exactly-once claim across caller retries.

The accepted reference in-memory store claims atomicity only within one process.
Database/multi-process adapters require backend-specific atomicity evidence.

M4-032 does not select among candidate Leases, check TTL, implement revocation,
consume a parent, prove attenuation, rerun policy/approval, construct a
Decision/Receipt, assign GuaranteeLevel, execute an action, or wire a PEP.

## M4-032 staged acceptance evidence

Protocol-first exact head:

```text
a5c011e55c7e7c55915e8c1aee5a787688d18e67
```

- normal CI #524: PASS;
- exact Harness rc5 source-conformance #466: PASS.

Accepted implementation/hardening exact head:

```text
8fa634bfc986c2486ccc778d14af5a76ad690bb1
```

- normal CI #527 / run `33609196856`: PASS;
- exact Harness rc5 source-conformance #469 / run `33609196891`: PASS;
- frozen install / supply-chain policy: PASS;
- architecture/schema/baseline/strict TypeScript: PASS;
- 57 test files / 1118 tests: PASS;
- portable M4-032 corpus runner: 41 PASS;
- M4-032 hostile-runtime hardening: 7 PASS;
- packed Shared TCK + external consumer: PASS.

Acceptance audit exact head:

```text
ce5010bbe1def1df157fc856f70e59317af18e22
```

- normal CI #528 / run `33611612524`: PASS;
- exact Harness rc5 source-conformance #470 / run `33611612511`: PASS.

Package acceptance-record exact head:

```text
61829b65a71521e5b21bc0fcf3092dfa503ee424
```

The acceptance-record delta is limited to
`packages/capability-broker/src/index.ts`, advancing the package marker to:

```text
M4-032-ATOMIC-CONSUME-ACCEPTED
```

Exact-head evidence:

- normal CI #529 / run `33612365181`: PASS;
- exact Harness rc5 source-conformance #471 / run `33612365191`: PASS;
- PR #3: Open, Draft, mergeable;
- reviews: none;
- review threads: none.

`docs/acceptance/m4-032-acceptance-audit.md` records the implementation acceptance
boundary.

## Final governance gate

This governance transition is intentionally limited to:

```text
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md   # append-only M4-032 acceptance record
docs/roadmap.md           # only M4-032 acceptance marker/details
```

No production code, protocol Spec/corpus/schema, Shared TCK, dependency,
lockfile, Adapter/Harness baseline or M4-033+ behavior is authorized to change in
this commit.

The resulting final-governance exact head MUST itself reach:

1. normal repository CI PASS;
2. exact pinned Harness rc5 source-conformance PASS;
3. PR #3 remains Open/Draft/mergeable;
4. no review/review-thread blocker exists.

Only after that same exact governance head is dual-green is M4-032 governance
CLOSED and M4-033 P0 revocation authorized to begin protocol-first.

## Resume instruction

1. refresh PR #3 exact head/base/reviews/threads;
2. verify the final-governance delta is exactly CURRENT + append-only HISTORY +
   only the M4-032 roadmap marker/details;
3. require exact-head normal CI + pinned Harness rc5 source-conformance
   dual-green;
4. only then declare M4-032 governance CLOSED and authorize M4-033 protocol-first;
5. keep M4-034+, M4-040+, M6 and PR merge unauthorized.
