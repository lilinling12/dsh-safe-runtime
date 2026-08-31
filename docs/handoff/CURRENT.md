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
- M4-001 through M4-014: **ACCEPTED / GOVERNANCE CLOSED**
- M4-020 Subject resolution: **GOVERNANCE CLOSED**
- M4-021 policy evaluation: **GOVERNANCE CLOSED**
- M4-022 lease lookup: **AUTHORIZED / PROTOCOL-FIRST IN PROGRESS**
- M4-023+, M4-030+, M4-040+ and M6: **NOT AUTHORIZED**

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

## M4-021 final closure

Final-governance exact head:

```text
211a7580f92ceb9df24ac0b0297d3f25009eb6c2
```

Exact-head evidence:

- CI #444 / run `33348911193`: PASS;
- Harness rc5 source-conformance #386 / run `33348911194`: PASS.

The final-governance net delta from the M4-021 acceptance-record head was limited
to CURRENT, append-only HISTORY and only the M4-021 roadmap marker. HISTORY was
explicitly re-audited to `+68/-0` after an intermediate whole-file write exposed
and corrected accidental historical churn.

Therefore **M4-021 governance is CLOSED**.

Accepted implementation remains:

```text
21487cb2107dd708aab255472a1c2f71d3659584
```

with acceptance audit `docs/acceptance/m4-021-acceptance-audit.md`.

## Current Gate — M4-022 P0 deterministic CapabilityLease lookup

Normative draft:

```text
specs/0033-m4-capability-lease-lookup.md
```

Portable corpus:

```text
fixtures/lease-lookup/cases.json
```

Portable cases: `28`.

M4-022 is deliberately a **candidate lookup** boundary, not Lease lifecycle or
authorization. It answers which existing Lease records in one coherent snapshot
match the exact request identity tuple. A returned candidate is not `allow`, not
a CapabilityDecision, and not proof of TTL/use/revocation/attenuation validity.

### Subject binding

Existing protocol fixtures use the same stable ref value in
`CapabilityRequest.subject.id` and `CapabilityLease.subjectRef`.

M4-022 therefore binds exactly:

```text
lease.subjectRef == resolvedSubject.id
```

It MUST NOT synthesize `kind/id`, `kind://id`, session-based, parent-based or
Harness-specific Lease identity. The M4-021 `<SubjectKind>://<SubjectId>` grammar
remains policy-selector syntax only.

### Capability binding

Request and Lease capability validation profiles remain distinct exactly as the
existing schemas define them:

- request capability uses the accepted CapabilityRequest lexical regex;
- CapabilityLease capability currently uses its own string length `3..256`
  schema surface;
- M4-022 MUST NOT retroactively impose the request regex on Lease records;
- matching is exact code-point equality.

Thus schema-valid Lease capability `Process.exec` is an ordinary mismatch for
request `process.exec`, while a runtime-bypass value outside the Lease field's own
domain fails closed.

### Resource binding

Lease resources are exact structured `CapabilityResource` values. Request and
Lease resources reuse accepted M4-003 normalization and then require exact:

```text
scheme
locator
providerIdentity presence
providerIdentity value when present
```

No M4-004 glob/wildcard semantics apply to Lease resources and no provider
containment is inferred from strings.

### Existing Lease model only

Ordinary portable lookup input is a snapshot of complete existing
`CapabilityLease` values under the existing schema. M4-022 does not create a
second reduced "lookup lease" wire model.

`CapabilityPolicy.rules[].lease` and `CapabilityRequest.requestedLease` describe
requested issuance bounds; neither is an existing Lease lookup key and neither
causes Lease creation in M4-022.

### Identity and multiplicity

Lease refs are globally unique across the complete snapshot before
request-dependent filtering. Duplicate refs fail closed as:

```text
LEASE_LOOKUP_DUPLICATE_LEASE_REF
```

All exact candidates are returned; none is silently selected by insertion order,
time, remaining uses, authorization kind or parent depth. Candidate refs are
Unicode code-point lexicographically sorted for deterministic presentation only.

### Constraint boundary

Current CapabilityLease `constraints` is an open JSON object without an accepted
generic portable predicate grammar. M4-022 therefore does not invent equality,
subset, argv, cwd or provider semantics.

For an otherwise exact Subject+capability+Resource match:

```text
constraints omitted -> zero predicates -> candidate
constraints {}      -> zero predicates -> candidate
constraints non-empty -> FAIL_CLOSED / LEASE_CONSTRAINT_PROFILE_UNSUPPORTED
```

Constraints on Subject/capability/Resource-nonmatching Leases are not traversed
merely to block unrelated requests.

### Later lifecycle Gates remain separate

M4-022 does not read host time or determine:

- TTL / expiry validity — M4-030;
- maxUses / remaining-use validity — M4-031;
- atomic consume — M4-032;
- revocation — M4-033;
- parent-child attenuation — M4-034.

Accordingly, an expired-looking or `remainingUses: 0` schema-valid Lease can be
returned only as a lookup **candidate**. It is not thereby usable.

M4-022 also does not invoke approval (M4-023), create a durable decision/receipt
(M4-024), assign guarantee (M4-025), enforce a PEP (M4-040+) or implement M6.

## Protocol-first Gate condition

**Production M4-022 implementation has NOT STARTED and is NOT AUTHORIZED yet.**

Before any M4-022 production implementation, the exact protocol-first head
containing Spec 0033, the 28-case corpus and this handoff transition MUST reach:

1. normal CI PASS;
2. exact pinned Harness rc5 source-conformance PASS.

The protocol-first delta from M4-021 final governance head
`211a7580f92ceb9df24ac0b0297d3f25009eb6c2` MUST contain only:

```text
specs/0033-m4-capability-lease-lookup.md
fixtures/lease-lookup/cases.json
docs/handoff/CURRENT.md
```

It MUST NOT contain production code, schema/TCK weakening, dependency/lockfile
changes, Harness baseline changes, M4-023+, M4-030+ or M6 implementation.

## Boundaries that remain enforced

- Specs/schemas/TCK remain semantic authority.
- Harness remains compatibility evidence only.
- Never weaken schema validation, TCK, strict TypeScript, frozen installs,
  supply-chain policy, architecture boundaries, source-conformance or fail-closed
  behavior for CI.
- Reuse M4-003 normalization rather than silently redefining Resource identity.
- Candidate lookup is not authorization and is never the atomic consume point.
- No merge of PR #3 without explicit user authorization.

## Resume instruction

1. refresh PR #3 exact head/base/reviews/threads and exact-head workflows;
2. audit protocol-first delta from `211a7580...` and require exactly Spec 0033,
   the 28-case corpus and CURRENT;
3. require normal CI plus exact pinned Harness rc5 source-conformance dual-green;
4. only then authorize M4-022 TypeScript production implementation;
5. keep M4-023+, M4-030+, M4-040+ and M6 unauthorized;
6. do not merge PR #3 without explicit authorization.
