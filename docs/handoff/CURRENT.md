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
- M4-031 usage validity: **GOVERNANCE CLOSED**
- M4-032 atomic consume: **GOVERNANCE CLOSED**
- M4-033 revocation: **IMPLEMENTATION ACCEPTED / ACCEPTANCE AUDIT DUAL-GREEN / PACKAGE ACCEPTANCE DUAL-GREEN / FINAL GOVERNANCE IN PROGRESS**
- M4-034+, M4-040+ and M6: **NOT AUTHORIZED until M4-033 final-governance exact head is dual-green**
- PR #3 merge: **NOT AUTHORIZED without explicit user authorization**

Live GitHub state overrides this file.

## M4-033 accepted authority

Normative specification:

```text
specs/0040-m4-capability-lease-revocation.md
```

Portable corpus:

```text
fixtures/lease-revocation/cases.json
profile: M4-033_LEASE_REVOKE_V1
cases: 32 (LREV-001 through LREV-032)
```

Protocol-first exact head:

```text
831e78dbc7724811f2750e7a7271f9df38471517
```

Evidence:

- normal CI #531 / run `33616058152`: PASS;
- exact Harness rc5 source-conformance #473 / run `33616058124`: PASS.

## M4-033 accepted implementation

Final implementation/hardening exact head:

```text
76447d4115299ad325e76cb67fea8946f01132ff
```

The accepted primitive revokes one exact stable `leaseRef` through a trusted
authoritative store port. Revocation state remains the independent operational
projection `{ leaseRef, revoked }`; the published `CapabilityLease` wire/schema
is unchanged.

The only legal mutation is monotonic:

```text
revoked: false -> true
```

Missing Lease, already-revoked Lease, known-not-applied store failure and
ambiguous outcome remain distinct. The broker invokes the store at most once,
performs no automatic retry, validates store identity/transition evidence, and
fails closed on malformed or contradictory provider results.

The reference in-memory store provides per-`leaseRef` process-local
linearizability only. It does not claim multi-process/database/distributed
atomicity.

M4-033 does not simulate revocation through TTL expiry, usage exhaustion,
deletion, authorization rewrite or parent/child traversal. M4-032 remains
counter-only and separate. Revocation/consume/execution TOCTOU composition stays
for later PEP/composition work.

Exact implementation evidence:

- normal CI #538 / run `33618834463`: PASS;
- exact Harness rc5 source-conformance #480 / run `33618834499`: PASS;
- 59 test files / 1159 tests: PASS;
- M4-033 portable suite: 33 PASS;
- M4-033 hostile-runtime/store hardening: 8 PASS;
- frozen install / 124-entry supply-chain policy: PASS;
- architecture / 16-schema shape / compatibility baseline / strict TypeScript: PASS;
- packed Shared TCK external consumer: 44 assets PASS.

## Acceptance stages

Acceptance audit:

```text
docs/acceptance/m4-033-acceptance-audit.md
7718130b413c94399cfeb0842cc54243c49046bc
```

Audit exact-head evidence:

- normal CI #539 / run `33619714824`: PASS;
- exact Harness rc5 source-conformance #481 / run `33619714826`: PASS.

Package acceptance record:

```text
37d8affdd2e6e281ac914bc4d97283eb7b78d430
PACKAGE_STAGE = M4-033-LEASE-REVOCATION-ACCEPTED
```

Package-record exact-head evidence:

- normal CI #540 / run `33620346004`: PASS;
- exact Harness rc5 source-conformance #482 / run `33620346009`: PASS;
- PR #3 remained Open, Draft and mergeable.

## Final governance boundary

The final M4-033 governance transition is restricted to:

```text
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md
docs/roadmap.md
```

`HISTORY.md` must remain append-only. In `docs/roadmap.md`, only the M4-033
acceptance checkbox may change; M4-034 remains unchecked.

The resulting final-governance exact head must itself reach normal CI + exact
pinned Harness rc5 source-conformance dual-green. Only after that evidence is
M4-033 governance CLOSED and M4-034 P0 parent-child attenuation newly authorized
for protocol-first work.

## Compatibility baseline

DeepSeek Harness remains Adapter compatibility evidence only:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

Harness behavior does not define Lease revocation or attenuation semantics.

## M4-034 boundary after closure

When M4-033 final governance becomes dual-green, M4-034 is the only newly
authorized engineering Gate. It must begin protocol-first by reconciling the
existing Core delegation/attenuation rules, `parentLeaseRef` wire/schema surface,
M4-030/M4-031/M4-032/M4-033 lifecycle facts, and stable identity constraints.

M4-034 must not infer propagation, parent consumption, cascade revocation,
execution-time PEP composition or Harness semantics from roadmap wording.
M4-035+, M4-040+, M6 and PR #3 merge remain unauthorized until their own gates.

## Resume instruction

1. refresh PR #3 exact head/base/reviews/threads;
2. verify the final-governance delta from package-record head `37d8affd...` is
   exactly CURRENT + append-only HISTORY + only the M4-033 roadmap checkbox;
3. require exact-head normal CI + pinned Harness rc5 source-conformance
   dual-green;
4. only then record M4-033 governance CLOSED and authorize M4-034 protocol-first;
5. do not merge PR #3 without explicit user authorization.
