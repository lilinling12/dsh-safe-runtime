# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK and accepted exact-head evidence
> remain semantic authority.

## Snapshot

- Recorded at: `2026-08-31`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M4 — Capability Broker v0.1`
- Active pull request: `#3 — feat(policy): begin M4 capability broker`
- PR state at final-governance review: `OPEN / DRAFT / mergeable`
- Branch: `feat/m4-capability-broker`
- Main: `57430273e065be8d38807d67b175fa154c801d43`
- M4-001 through M4-014: **ACCEPTED / GOVERNANCE CLOSED**
- M4-020 P0 Subject resolution: **IMPLEMENTATION ACCEPTED / ACCEPTANCE-RECORD DUAL-GREEN / FINAL GOVERNANCE IN PROGRESS**
- M4-021+, M4-040+ and M6: **NOT AUTHORIZED UNTIL M4-020 FINAL GOVERNANCE IS DUAL-GREEN**

Live GitHub state overrides this file.

## Live ancestry note

The long-running PR retains known ancestry-only drift relative to `main`. The
previously reconciled merge-base `65870612d039ce026a6952c16d5e069b11bd24a7`
and `main@57430273e065be8d38807d67b175fa154c801d43` point to the same source tree
`ed0c142bf6bbd00f607cc169222f0bf67057fca5`.

Do not rebase, force-update or rewrite accepted ancestry merely to change GitHub
compare counters.

## Accepted compatibility baseline

DeepSeek Harness remains Adapter compatibility evidence only:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

Harness runtime behavior MUST NOT define Core protocol semantics, identity,
policy/PDP semantics, plugin precedence, PEP behavior or provider security
guarantees.

## M4-014 final closure

Final-governance head:

```text
5d5140c9fc2bedaf7d218e5f7dd38637628d1b6c
```

Exact final-governance evidence:

- CI #398 / run `33312906693`: PASS;
- Harness rc5 source-conformance #340 / run `33312906680`: PASS.

Therefore **M4-014 governance is CLOSED**.

## Current Gate — M4-020 Subject resolution

Normative profile:

```text
specs/0031-m4-subject-resolution.md
```

Portable corpus:

```text
fixtures/subject-resolution/cases.json
```

Portable cases: `30`.

Fixture-only boundary expansion syntax:

```text
fixtures/subject-resolution/README.md
```

The schema-invalid null-subagent-parent CapabilityRequest fixture is registered
in `fixtures/manifest.json` as `CAP-REQ-003`.

### Protocol-first exact head

```text
d2a879addd832791c10277be97ce3a7b09e95241
```

Exact protocol-first evidence:

- CI #405 / run `33313398737`: PASS;
- Harness rc5 source-conformance #347 / run `33313398644`: PASS.

The protocol-first Gate corrected an existing Core↔Schema mismatch: Core requires
Subagent to have a Parent Subject, while the previous schema required the field
but allowed `null`. The corrected schema requires `subagent.parent` to be a
non-null existing protocol `ref`; the compatibility baseline was refreshed
rather than disabled.

### TypeScript protocol projection

The Subject type projection was aligned at:

```text
8fbf53fd1df7132ee76b58979ce3586b95f3eb83
```

That exact head reached normal CI and pinned Harness source-conformance
dual-green before production resolver work continued.

### Accepted implementation head

```text
31b3b190fc92372f2ccc2f6527b91826153f7917
```

Exact accepted-head evidence:

- CI #414 / run `33323729301`: PASS;
- Harness rc5 source-conformance #356 / run `33323729321`: PASS;
- 43 test files / 767 tests: PASS;
- M4-020 Subject-resolution suite: 40 tests PASS;
- architecture boundaries: PASS;
- 16-schema shape check: PASS;
- schema compatibility baseline: PASS;
- strict workspace TypeScript: PASS;
- frozen install / supply-chain policy: PASS (124 entries);
- packed Shared TCK external consumer: PASS (44 installed assets).

Acceptance audit:

```text
docs/acceptance/m4-020-acceptance-audit.md
```

Acceptance audit commit:

```text
d37a381f586367622ce885ed4a1163e413144d40
```

Package implementation-acceptance marker commit:

```text
7ec3549929a4896a7aa12fb6fba7a8cf923bd9fd
```

### Acceptance-record exact head

```text
3e761499a250c48552042c03b106f89ba68a2f68
```

Exact acceptance-record evidence:

- CI #417 / run `33323912340`: PASS;
- Harness rc5 source-conformance #359 / run `33323912336`: PASS.

The acceptance-record transition changed only the M4-020 acceptance audit,
policy-engine package stage and this handoff state; it made no production
resolver, schema, corpus, Shared TCK, dependency, lockfile, Harness baseline or
security-boundary change.

### Accepted M4-020 boundary

M4-020 resolves only Subject identity/context:

```text
untrusted Subject + authoritative requestSessionRef
  -> request session validation first
  -> bounded own-data validation
  -> exact standard SubjectKind
  -> exact protocol refs
  -> subagent non-null parent rule
  -> exact subject/request session consistency
  -> detached immutable resolved Subject
```

Accepted properties include:

- standard kinds are exactly `agent`, `subagent`, `tool`, `plugin`, `system`,
  `verifier`, `human`, `service`;
- primitive refs remain the existing 1..512 Unicode-code-point contract;
- no trim, case-folding, Unicode normalization, string coercion or alias lookup;
- request `sessionRef` is authoritative and validated before Subject inspection;
- Subject `sessionRef` is materialized when absent and must match exactly when
  present;
- inherited identity fields cannot manufacture Subject identity;
- accessor-backed normative fields do not execute getters;
- unexpected own string/symbol fields fail closed;
- arrays, ownKeys/descriptor failures and revoked Proxies fail closed;
- subagent parent is required/non-null while non-subagent parent preserves the
  pre-existing omitted/null/ref surface;
- output is detached and immutable;
- failures expose stable reasons only and do not echo attacker-controlled data.

M4-020 does **not** authenticate actors, look up parents, prove lineage, perform
delegation attenuation, define policy Subject selectors, evaluate a full PDP,
resolve leases/approval, emit receipts/provenance, assign guarantees or enforce a
PEP.

`CapabilityPolicy.spec.rules[].subjects` exists structurally, but its portable
selector grammar remains deliberately undefined by M4-020. M4-021 must recover
and define subject matching protocol-first rather than inventing hidden
`kind:id`, wildcard, prefix, parent/descendant, role/group or Harness-name
semantics.

## Final-governance Gate

The acceptance-record head is dual-green, so final M4-020 governance is now
permitted. The final-governance candidate is strictly limited to:

1. this `docs/handoff/CURRENT.md` state update;
2. append-only M4-020 acceptance history in `docs/handoff/HISTORY.md`;
3. changing only M4-020 from unchecked to accepted in `docs/roadmap.md`.

No production resolver, schema, fixture/corpus, Shared TCK, dependency,
lockfile, Harness baseline, architecture boundary or security guarantee may
change in this transition.

The resulting final-governance exact head must reach normal CI plus exact pinned
Harness rc5 source-conformance dual-green. Only that evidence closes M4-020 and
permits M4-021 to become the next protocol-first Gate.

Until that final exact head is dual-green:

```text
M4-014: GOVERNANCE CLOSED
M4-020 implementation: ACCEPTED
M4-020 acceptance-record: DUAL-GREEN
M4-020 governance: FINAL-GOVERNANCE IN PROGRESS
M4-021+: NOT AUTHORIZED
M4-040+: NOT AUTHORIZED
M6: NOT AUTHORIZED
```

## Boundaries that remain enforced

- Specs/schemas/TCK remain semantic authority.
- Harness remains Adapter compatibility evidence only.
- No subject display-name/Harness-name mapping becomes protocol identity.
- No policy `subjects[]` selector semantics are invented in M4-020.
- No authentication/directory lookup claim is introduced.
- No parent existence or lineage proof is claimed from a parent ref.
- Delegation attenuation remains a later authorization/lease concern.
- Full policy evaluation remains M4-021.
- Lease lookup remains M4-022.
- Approval remains M4-023.
- Receipt/provenance remains M4-024.
- Guarantee assignment remains M4-025.
- Actual pre-execution PEP remains M4-040+.
- M6 workspace transaction remains unauthorized.
- Never weaken schemas, validators, TCK, strict TypeScript, frozen installs,
  supply-chain policy, architecture boundaries, compatibility evidence or
  fail-closed behavior for CI.

## Resume instruction

1. refresh PR #3 exact head/base/reviews/threads and workflows;
2. verify final-governance net delta is only CURRENT, append-only HISTORY and the
   M4-020 roadmap acceptance marker;
3. require normal CI plus pinned Harness rc5 source-conformance on that exact
   final-governance head;
4. only after dual-green treat M4-020 governance as CLOSED and authorize M4-021
   as the next protocol-first Gate;
5. do not merge PR #3 without explicit authorization.
