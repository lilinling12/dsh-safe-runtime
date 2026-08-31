# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK and accepted exact-head evidence
> remain semantic authority.

## Snapshot

- Recorded at: `2026-08-31`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M4 — Capability Broker v0.1`
- Active pull request: `#3 — feat(policy): begin M4 capability broker`
- Branch: `feat/m4-capability-broker`
- Base: `main@57430273e065be8d38807d67b175fa154c801d43`
- M4-001 through M4-014: **GOVERNANCE CLOSED**
- M4-020 Subject resolution: **GOVERNANCE CLOSED**
- M4-021 policy evaluation: **GOVERNANCE CLOSED**
- M4-022 lease lookup: **IMPLEMENTATION ACCEPTED / FINAL GOVERNANCE VERIFICATION**
- M4-023+, M4-030+, M4-040+ and M6: **NOT AUTHORIZED until M4-022 final-governance exact head is dual-green**

Live GitHub state overrides this file.

## Live ancestry note

The long-running PR retains known ancestry-only drift relative to `main`. The
reconciled merge-base `65870612d039ce026a6952c16d5e069b11bd24a7` and
`main@57430273e065be8d38807d67b175fa154c801d43` point to the same source tree
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

Harness behavior MUST NOT define Core Subject identity, policy/PDP semantics,
Lease identity/lifecycle, guarantees, plugin trust, or PEP behavior.

## M4-022 accepted implementation

Normative specification:

```text
specs/0033-m4-capability-lease-lookup.md
```

Portable corpus:

```text
fixtures/lease-lookup/cases.json
```

Portable cases: `28`.

Protocol-first exact head:

```text
2def23a6f0523eea17540ec6327fcca372bb4702
```

Exact-head evidence:

- CI #449: PASS;
- Harness rc5 source-conformance #391: PASS.

Accepted implementation exact head:

```text
ef465fcfc50687b2590e20001d2ad7a123d2ab73
```

Exact-head evidence:

- CI #459 / run `33367497095`: PASS;
- Harness rc5 source-conformance #401 / run `33367497083`: PASS.

Acceptance audit:

```text
docs/acceptance/m4-022-acceptance-audit.md
```

Acceptance-record exact head:

```text
778c9ff6cae329dfd5c892028cc795b67bc105fe
```

Exact-head evidence:

- CI #461 / run `33367807229`: PASS;
- Harness rc5 source-conformance #403 / run `33367807191`: PASS.

The accepted implementation uses the existing CapabilityLease schema and reuses
M4-003 exact Resource normalization. It added the minimal
`@dsh-safe/policy-engine` workspace package export boundary needed by the broker;
the corresponding lockfile delta was explicitly audited to the single expected
capability-broker importer dependency (`+3/-0`) with no integrity churn.

## M4-022 semantic boundary

M4-022 is deterministic **candidate lookup**, not Lease validity or authorization.
A Lease is a candidate only when all three lookup dimensions match exactly:

```text
lease.subjectRef == resolvedSubject.id
lease.capability == request capability
canonical lease Resource == canonical request Resource
```

Important accepted properties:

- no synthetic `kind/id` or `kind://id` Lease identity;
- request and Lease capability validation profiles remain distinct as existing
  schemas define them;
- no case fold, aliases, prefix inheritance or wildcard capability matching;
- Lease Resource is exact structured data, not an M4-004 selector;
- providerIdentity presence/value participates in exact Resource equality;
- duplicate `leaseRef` fails the whole snapshot before request filtering;
- all exact candidates are returned in Unicode code-point order; ordering is
  presentation only and never consumption/authorization precedence;
- omitted or empty constraints mean zero portable predicates;
- non-empty constraints on an otherwise exact match fail closed as
  `LEASE_CONSTRAINT_PROFILE_UNSUPPORTED`;
- constraints on nonmatching Leases are not traversed merely to block an
  unrelated request;
- failure payloads do not echo attacker-controlled refs or values.

Hostile runtime hardening reads security-relevant lookup fields through own data
properties and fails closed on accessors, revoked Proxies, sparse/named/symbol
snapshot arrays and unreadable descriptors. It deliberately does **not** inspect
lifecycle/provenance fields merely to invent later-Gate semantics.

## Later Gates remain separate

M4-022 does not determine or mutate:

- TTL / expiry validity — M4-030;
- maxUses / remaining-use validity — M4-031;
- atomic consume — M4-032;
- revocation — M4-033;
- parent-child attenuation — M4-034.

It also does not invoke approval (M4-023), construct a durable
CapabilityDecision/receipt (M4-024), assign guarantee level (M4-025), enforce a
PEP (M4-040+) or implement M6.

An expired-looking or `remainingUses: 0` schema-valid Lease can therefore still
be an M4-022 candidate. It is not thereby active, usable or authorized.

## Final governance condition

The M4-022 acceptance-record head is dual-green. Final governance is now limited
to exactly:

```text
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md   # append-only
docs/roadmap.md           # only M4-022 marker
```

The final-governance exact head MUST itself reach:

1. normal CI PASS;
2. exact pinned Harness rc5 source-conformance PASS.

Before that evidence exists, M4-022 MUST NOT be declared governance closed and
M4-023 MUST NOT start.

After exact-head dual-green verification, M4-022 governance is CLOSED and the
next and only newly authorized engineering Gate is:

```text
M4-023 P0 — approval routing, protocol-first
```

M4-024+, M4-030+, M4-040+ and M6 remain unauthorized by that transition.

## Boundaries that remain enforced

- Specs/schemas/TCK remain semantic authority.
- Harness remains compatibility evidence only.
- Never weaken schema validation, TCK, strict TypeScript, frozen installs,
  supply-chain policy, architecture boundaries, source-conformance or fail-closed
  behavior for CI.
- Candidate lookup is not authorization and is never the atomic consume point.
- No merge of PR #3 without explicit user authorization.

## Resume instruction

1. refresh PR #3 exact head/base/reviews/threads and exact-head workflows;
2. audit the M4-022 final-governance delta against acceptance-record head
   `778c9ff6...` and require only CURRENT, append-only HISTORY and only the
   M4-022 roadmap marker;
3. explicitly require HISTORY deletions = `0`;
4. require final-governance exact-head normal CI + pinned Harness dual-green;
5. only then declare **M4-022 GOVERNANCE CLOSED** and authorize **M4-023 P0
   approval routing protocol-first**;
6. keep M4-024+, M4-030+, M4-040+ and M6 unauthorized;
7. keep PR #3 Draft and do not merge without explicit authorization.
