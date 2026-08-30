# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK and accepted exact-head evidence
> remain semantic authority.

## Snapshot

- Recorded at: `2026-08-30`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M4 — Capability Broker v0.1`
- Active pull request: `#3 — feat(policy): begin M4 capability broker`
- PR state: `OPEN / DRAFT / mergeable`
- Branch: `feat/m4-capability-broker`
- Main: `57430273e065be8d38807d67b175fa154c801d43`
- M4-001 through M4-014: **ACCEPTED / GOVERNANCE CLOSED**
- M4-020 P0 Subject resolution: **AUTHORIZED / PROTOCOL-FIRST IN PROGRESS**
- M4-021+, M4-040+ and M6: **NOT AUTHORIZED**

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

Accepted implementation head:

```text
4290249c282426e7e95aa0ad133ff17a7ca9a9c0
```

Acceptance audit:

```text
docs/acceptance/m4-014-acceptance-audit.md
```

Acceptance audit commit:

```text
ecfa7aa0e079835f57ae5c11dbbf7a46d7ec6ccb
```

Acceptance-record head:

```text
290fa8d28d4823114b26fba942f1904dfd093e46
```

Acceptance-record exact-head evidence:

- CI #391 / run `33304165439`: PASS;
- Harness rc5 source-conformance #333 / run `33304165445`: PASS.

Final-governance head:

```text
5d5140c9fc2bedaf7d218e5f7dd38637628d1b6c
```

Final-governance net delta from the acceptance-record head is limited to:

- `docs/handoff/CURRENT.md`;
- `docs/handoff/HISTORY.md` with append-only `+48 / -0`;
- `docs/roadmap.md` with only M4-014 acceptance state changed.

Exact final-governance evidence:

- CI #398 / run `33312906693`: PASS;
- Harness rc5 source-conformance #340 / run `33312906680`: PASS.

Therefore **M4-014 governance is CLOSED**. No closure-only follow-up commit is
required; this M4-020 material change records the exact closure evidence.

## Current Gate — M4-020 Subject resolution

Normative profile under construction:

```text
specs/0031-m4-subject-resolution.md
```

Portable corpus under construction:

```text
fixtures/subject-resolution/cases.json
```

Current portable cases: `30`.

Fixture-only boundary expansion syntax is documented in:

```text
fixtures/subject-resolution/README.md
```

### Recovered protocol authority

Core §4/§5 and the protocol types/schema already establish:

- Subject represents who requests capability;
- standard kinds are `agent`, `subagent`, `tool`, `plugin`, `system`,
  `verifier`, `human`, `service`;
- identity refs are stable/non-secret and not derived from mutable display names;
- Subagent MUST have a Parent Subject;
- CapabilityRequest has an authoritative required top-level `sessionRef`;
- Subject carries optional `sessionRef`;
- Core precedence requires subject canonicalization before policy matching.

### Normative mismatch found before implementation

`specs/0001-safe-runtime-core.md` requires a Subagent parent, but the pre-M4-020
`defs.schema.json` conditional required the `parent` property while still
allowing `null`.

Protocol-first M4-020 corrects this mismatch rather than coding around it:

- any non-null Subject `parent` now uses the existing `ref` shape/bound;
- `subagent.parent` must resolve through `ref` and therefore cannot be null;
- a schema-invalid CapabilityRequest fixture with `subagent.parent: null` has
  been added;
- `schemas/v1alpha1/baseline.sha256` has been refreshed rather than disabling
  the compatibility check.

This is a bug fix aligning Schema with the already existing Core MUST, not a new
delegation model.

### M4-020 intended boundary

M4-020 resolves only Subject identity/context:

```text
untrusted Subject + authoritative requestSessionRef
  -> bounded own-data validation
  -> exact standard SubjectKind
  -> exact protocol refs
  -> subagent non-null parent rule
  -> exact subject/request session consistency
  -> detached immutable resolved Subject
```

It does not authenticate an actor, look up a parent, prove lineage, evaluate
delegation attenuation, match policy rules or produce a CapabilityDecision.

`CapabilityPolicy.spec.rules[].subjects` already exists structurally, but its
portable selector grammar is not defined by current Core/schema. M4-020 MUST NOT
invent hidden `kind:id`, wildcard, prefix, parent/descendant, role/group or
Harness-name matching. M4-021 owns policy subject matching and full policy
evaluation protocol-first.

### Runtime hardening required later

After the protocol-first exact head is dual-green, the TypeScript implementation
must cover:

- inherited normative fields cannot manufacture identity;
- accessor-backed fields do not execute getters;
- unexpected own string/symbol fields fail closed;
- arrays, descriptor failures, ownKeys failures and revoked Proxies fail closed;
- validation order is deterministic and bounded;
- no string coercion or Unicode/case normalization;
- result is detached and recursively frozen;
- rejected values are not echoed or retained.

## Current Gate status

Protocol-first work is still being assembled. Production Subject resolver code
has **NOT STARTED**.

Before implementation begins, the exact protocol-first head must include and
synchronize:

1. Spec 0031;
2. 30-case portable Subject-resolution corpus;
3. fixture expansion encoding documentation;
4. corrected Subject schema;
5. schema-invalid null-subagent-parent CapabilityRequest fixture;
6. refreshed schema compatibility baseline;
7. any fixture manifest/TCK registration required by repository checks;
8. this handoff state.

That exact head must reach normal CI plus exact pinned Harness rc5
source-conformance dual-green.

Until then:

```text
M4-014: GOVERNANCE CLOSED
M4-020: AUTHORIZED / PROTOCOL-FIRST IN PROGRESS
M4-020 production implementation: NOT STARTED
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
2. finish only the M4-020 protocol-first artifact set;
3. run exact-head normal CI plus Harness rc5 source-conformance;
4. do not start production Subject resolver until protocol-first is dual-green;
5. do not start M4-021 or any later Gate.
