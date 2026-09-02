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
- Parent governance-closed head: `89e5f5112c91f061fcb6d5e0f58de1a3e79122a7`
- M4-001 through M4-014: **GOVERNANCE CLOSED**
- M4-020 through M4-025: **GOVERNANCE CLOSED**
- M4-030 TTL: **GOVERNANCE CLOSED**
- M4-031 usage validity: **GOVERNANCE CLOSED**
- M4-032 atomic consume: **GOVERNANCE CLOSED**
- M4-033 revocation: **AUTHORIZED / PROTOCOL-FIRST IN PROGRESS**
- M4-033 production implementation: **NOT AUTHORIZED until protocol-first exact-head dual-green**
- M4-034+, M4-040+ and M6: **NOT AUTHORIZED**
- PR #3 merge: **NOT AUTHORIZED without explicit user authorization**

Live GitHub state overrides this file.

## M4-032 final governance closure

Final governance exact head:

```text
89e5f5112c91f061fcb6d5e0f58de1a3e79122a7
```

Exact-head evidence:

- normal CI #530 / run `33615062606`: PASS;
- exact Harness rc5 source-conformance #472 / run `33615062600`: PASS;
- PR #3: Open, Draft, mergeable;
- reviews: none;
- review threads: none.

Therefore M4-032 governance is CLOSED and M4-033 is the only newly authorized
engineering Gate.

## Compatibility baseline

DeepSeek Harness remains Adapter compatibility evidence only:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

Harness behavior does not define Lease revocation semantics.

## M4-033 authority reconciliation

Core §11 requires every CapabilityLease to be revocable, but the published
v1alpha1 `CapabilityLease` schema/type contains no revocation field. M4-030,
M4-031 and M4-032 explicitly defer revocation to M4-033.

M4-033 therefore MUST NOT add `revoked`, `revokedAt` or similar fields to the
CapabilityLease wire model merely for convenience. Revocation is independent,
authoritative lifecycle state keyed by stable `leaseRef`.

It MUST NOT be simulated by:

```text
remainingUses := 0
expiresAt := now
deleting the Lease
```

because usage exhaustion, TTL expiry, existence and revocation are distinct
facts.

## M4-033 protocol-first draft

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

Portable input:

```text
LeaseRevokeInput {
  profile: "M4-033_LEASE_REVOKE_V1"
  leaseRef: ref
}
```

Authoritative minimal operational projection:

```text
LeaseRevocationState {
  leaseRef: ref
  revoked: boolean
}
```

This state is not a second CapabilityLease wire model.

## M4-033 accepted draft semantics

The only legal authoritative mutation is monotonic:

```text
revoked: false -> true
```

Results:

```text
missing lease
  -> NOT_REVOKED / LEASE_REVOKE_NOT_FOUND

not revoked
  -> atomically revoked := true
  -> REVOKED / LEASE_REVOKED

already revoked
  -> ALREADY_REVOKED / LEASE_ALREADY_REVOKED
```

There is no portable unrevoke/reactivation operation. Repeated revocation is
state-idempotent.

Concurrent revoke operations targeting one Lease must be per-Lease linearizable:
for N concurrent attempts against one non-revoked Lease with no store failure,
exactly one returns REVOKED and N-1 return ALREADY_REVOKED.

Known-not-applied store failure returns
`LEASE_REVOKE_STORE_UNAVAILABLE`; ambiguous commit outcome returns
`LEASE_REVOKE_OUTCOME_UNKNOWN`. The primitive performs no automatic retry and
invokes the store at most once per invocation.

Because revocation is monotonic set-to-true, a later caller retry after an
ambiguous outcome cannot restore Lease authority or consume an additional usage
unit; it may observe ALREADY_REVOKED if the first attempt committed. The original
ambiguous result itself remains fail-closed.

## Critical composition boundary

M4-032 remains a counter-only atomic consume primitive and does not become
revocation-aware retroactively.

The sequence:

```text
observe not-revoked
concurrent revoke commits
consume usage
execute
```

is not an execution-safe authorization composition. A stale not-revoked snapshot
is not a reservation.

M4-033 establishes authoritative revocation state only. A later composition/PEP
Gate must prove that revocation cannot linearize before execution authority is
irreversibly acquired while the action still proceeds. M4-033 does not invent
that later orchestration early.

## Parent/child boundary

M4-033 targets only the exact `leaseRef`. It does not walk `parentLeaseRef`,
automatically revoke descendants, consume parents or prove attenuation.
M4-034 remains responsible for parent-child attenuation semantics and any
accepted propagation rule.

## Protocol-first Gate boundary

The authorized protocol-first delta is exactly:

```text
specs/0040-m4-capability-lease-revocation.md
fixtures/lease-revocation/cases.json
docs/handoff/CURRENT.md
```

No production TypeScript, CapabilityLease schema/type, Shared TCK registration,
dependency, lockfile, Adapter/Harness baseline, M4-034+, M4-040+ or M6 behavior
may change before this protocol-first exact head is dual-green.

## Resume instruction

1. refresh PR #3 exact head/base/reviews/threads;
2. verify the protocol-first delta from `89e5f511...` is exactly the three
   authorized files above;
3. require exact-head normal CI + pinned Harness rc5 source-conformance
   dual-green;
4. only then authorize M4-033 production implementation;
5. keep M4-034+, M4-040+, M6 and PR merge unauthorized.
