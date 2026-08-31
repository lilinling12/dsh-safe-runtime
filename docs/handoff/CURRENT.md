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
- M4-020 P0 Subject resolution: **GOVERNANCE CLOSED**
- M4-021 P0 policy evaluation: **IMPLEMENTATION ACCEPTED / FINAL GOVERNANCE IN PROGRESS**
- M4-022+, M4-040+ and M6: **NOT AUTHORIZED until M4-021 final exact-head dual-green**

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
selector grammar, precedence, guarantees, plugin trust, lease semantics, or PEP
behavior.

## M4-020 final closure

Final-governance exact head:

```text
005f436007ce05ed607979ca77f12960544ca655
```

- CI #420 / run `33326180401`: PASS;
- Harness rc5 source-conformance #362 / run `33326180648`: PASS.

Therefore **M4-020 governance is CLOSED**.

## M4-021 protocol-first record

Normative profile:

```text
specs/0032-m4-policy-evaluation.md
```

Portable corpus:

```text
fixtures/policy-evaluation/cases.json
```

Portable cases: `31`.

Protocol-first exact head:

```text
3e9575ec90db6b509d818716cc9d3dc48c6febd4
```

- CI #425 / run `33327340780`: PASS;
- Harness rc5 source-conformance #367: PASS.

Production evaluator work began only after this exact protocol-first head was
dual-green.

## M4-021 accepted implementation

Accepted implementation exact head:

```text
21487cb2107dd708aab255472a1c2f71d3659584
```

- CI #437 / run `33347983574`: PASS;
- Harness rc5 source-conformance #379 / run `33347983577`: PASS.

Acceptance audit:

```text
docs/acceptance/m4-021-acceptance-audit.md
```

The accepted evaluator composes M4-020 Subject resolution with exact capability
matching, accepted M4-004 resource ordering, M4-005 effect resolution, M4-006
default deny, and M4-007 explanation. It does not duplicate those precedence
algorithms.

Accepted Subject selector grammar is exactly:

```text
<SubjectKind>://<SubjectId>
```

with exact standard kind + opaque exact ID equality. Omitted `subjects` is
unconstrained; there is no wildcard/prefix/regex/role/group/parent/descendant/
session/Harness-name matching. `*` remains ordinary Subject ID data.

Rule IDs are globally unique before request-dependent filtering. Capability
selectors use the existing CapabilityRequest lexical profile and exact equality.
Final acceptance hardening verifies every materialized rule capability before
request filtering so callers bypassing M4-002 cannot turn malformed policy text
into an ordinary no-match.

Current Core/Schema still provide no portable generic constraint predicate
language. Therefore omitted or empty rule constraints mean zero predicates,
while a non-empty constraint on an otherwise matching rule fails closed as
`POLICY_CONSTRAINT_PROFILE_UNSUPPORTED`; irrelevant constrained rules are not
traversed.

No lease lookup/consumption, approval routing, persisted CapabilityDecision,
stable matched-rule references, receipt/provenance, guarantee assignment,
delegation attenuation proof, provider execution or PEP enforcement is claimed
by M4-021.

## M4-021 acceptance-record evidence

Acceptance-record exact head:

```text
17c7c9ddd69f78490a0008f9cd86a0208fdc723a
```

- CI #440 / run `33348242609`: PASS;
- Harness rc5 source-conformance #382 / run `33348242607`: PASS.

That transition changed only:

- `docs/acceptance/m4-021-acceptance-audit.md`;
- this handoff snapshot;
- the policy-engine package stage to `M4-021-POLICY-EVALUATION-ACCEPTED`.

It made no production evaluator behavior, protocol Spec/corpus/schema, Shared
TCK, dependency/lockfile, Harness baseline or later-Gate change.

## Final-governance gate

Final M4-021 governance is now being prepared. The final-governance delta from
acceptance-record head `17c7c9dd...` is restricted to:

1. this `docs/handoff/CURRENT.md` snapshot;
2. append-only `docs/handoff/HISTORY.md`;
3. only the M4-021 acceptance marker in `docs/roadmap.md`.

The resulting exact head MUST pass both normal CI and exact pinned Harness rc5
source-conformance before M4-021 can be declared **GOVERNANCE CLOSED**.

Until that exact-head dual-green evidence exists:

```text
M4-021 implementation: ACCEPTED
M4-021 governance: PENDING FINAL EXACT-HEAD EVIDENCE
M4-022+: NOT AUTHORIZED
M4-040+: NOT AUTHORIZED
M6: NOT AUTHORIZED
```

## Boundaries that remain enforced

- Specs/schemas/TCK remain semantic authority.
- Harness remains compatibility evidence only.
- Never weaken schema validation, TCK, strict TypeScript, frozen installs,
  supply-chain policy, architecture boundaries, source-conformance, or
  fail-closed behavior for CI.
- Unknown/malformed semantic input fails closed; it must not silently no-match
  when doing so could create permission.
- No merge of PR #3 without explicit user authorization.

## Resume instruction

1. refresh PR #3 exact head/base/reviews/threads and workflows;
2. verify the final-governance net delta from `17c7c9dd...` is exactly CURRENT,
   append-only HISTORY, and only the M4-021 roadmap marker;
3. verify HISTORY parent→commit has zero deletions;
4. require normal CI + pinned Harness rc5 source-conformance dual-green on the
   exact final-governance head;
5. only after that declare M4-021 governance CLOSED and authorize M4-022 P0 lease
   lookup as the next protocol-first Gate;
6. do not merge PR #3 without explicit authorization.
