# M4-021 Acceptance Audit — Policy Evaluation

Status: **ACCEPTED AT IMPLEMENTATION BOUNDARY**

Accepted implementation head:

```text
21487cb2107dd708aab255472a1c2f71d3659584
```

Normative authority:

- `specs/0001-safe-runtime-core.md` — Subject/Capability/Resource/Policy evaluation model;
- `specs/0002-state-machines-and-precedence.md` — deterministic canonicalization and precedence;
- `specs/0032-m4-policy-evaluation.md` — M4-021 profile;
- `schemas/v1alpha1/capability-policy.schema.json` — structural policy boundary;
- accepted M4-003/M4-004/M4-005/M4-006/M4-007/M4-020 primitives.

Portable corpus:

```text
fixtures/policy-evaluation/cases.json
```

Portable cases: `31`.

Compatibility evidence only:

```text
DeepSeek Harness 0.1.0-rc.5
commit 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

## Acceptance result

M4-021 is accepted at the implementation boundary as a deterministic,
fail-closed single-policy applicability/effect composition layer.

The implementation performs only:

1. hostile-object-safe materialization of the narrow evaluation input;
2. exact resolved-Subject applicability under the Spec 0032 selector profile;
3. exact capability matching;
4. delegation of Resource matching/specificity/priority bands to accepted M4-004;
5. the reviewed portable constraint boundary;
6. delegation of effect resolution to accepted M4-005;
7. delegation of default deny to accepted M4-006;
8. delegation of deterministic explanation to accepted M4-007;
9. construction of a detached immutable M4-021 evaluation fact.

It does not perform lease lookup/consumption, approval routing, final
`CapabilityDecision` persistence, stable `matchedRuleRefs`, guarantee assignment,
delegation attenuation proof, receipt/provenance persistence, provider execution,
or PEP enforcement.

## Live-state reconciliation

The acceptance review refreshed GitHub live state before this record.

At review time:

- PR #3: `OPEN / DRAFT / mergeable`;
- branch: `feat/m4-capability-broker`;
- accepted implementation exact head:
  `21487cb2107dd708aab255472a1c2f71d3659584`;
- base: `main@57430273e065be8d38807d67b175fa154c801d43`;
- submitted reviews: none;
- review threads: none.

The PR body still describes an older M4 Gate and is not used as semantic or
acceptance authority.

The long-running branch retains the known ancestry-only drift. No rebase,
squash, force rewrite or ancestry cleanup is performed merely to change GitHub
compare counters.

## Protocol-first evidence

Protocol-first exact head:

```text
3e9575ec90db6b509d818716cc9d3dc48c6febd4
```

Exact-head evidence:

- CI #425 / run `33327340780`: **PASS**;
- Harness rc5 source-conformance #367: **PASS**.

The protocol-first head contained Spec 0032, the 31-case portable corpus and the
M4-021 handoff transition, with no production evaluator implementation.

Protocol-first review fixed two semantic ambiguities before production code:

1. `agent://*` remains exact opaque Subject ID data; `*` is not retroactively
   reserved as a wildcard inside the already accepted M4-020 Subject ID domain;
2. rule ID uniqueness is checked over the complete policy before
   request-dependent Subject/capability filtering, preventing hidden duplicate
   rule identities.

Production implementation began only after that exact protocol-first head was
dual-green.

## Implementation delta audit

Compared with protocol-first head
`3e9575ec90db6b509d818716cc9d3dc48c6febd4`, the accepted implementation changes
only the M4-021 policy-engine projection:

- `packages/policy-engine/src/index.ts`;
- `packages/policy-engine/src/policy-evaluation-types.ts`;
- `packages/policy-engine/src/policy-evaluation.ts`;
- `packages/policy-engine/src/policy-evaluation.test.ts`.

No protocol schema, compatibility baseline, portable corpus, Shared TCK asset,
dependency version, lockfile, Harness pin, provider implementation or later-Gate
module was changed by the implementation delta.

The final acceptance-blocker correction from
`255e3b8d1c8b0d111cf68ac2eebab930ac14c26f` to the accepted head is limited to:

- `policy-evaluation.ts`: validate every materialized rule capability against the
  existing CapabilityRequest lexical profile before request filtering;
- `policy-evaluation.test.ts`: hostile regression proving malformed capability
  selectors fail closed even when the rule would otherwise be Subject-irrelevant.

This correction prevents schema-invalid policy capability text from being
silently reinterpreted as an ordinary no-match when a caller bypasses M4-002.

## Subject-selector review

The portable v0.1 Subject selector is exactly:

```text
<SubjectKind>://<SubjectId>
```

Properties reviewed and accepted:

- SubjectKind is one of the eight standard M4-020 kinds;
- only the first literal `://` is structural;
- the remainder is opaque Subject ID data;
- matching is exact kind + exact ID equality;
- no trimming, case-folding, Unicode normalization or alias resolution;
- no wildcard, prefix, regex, role/group, parent/descendant or session matching;
- omitted `subjects` means the Subject dimension is unconstrained;
- `*` is ordinary ID data and has no wildcard semantics;
- malformed Subject selectors fail closed as
  `POLICY_SUBJECT_SELECTOR_INVALID`.

Parent/session values do not secretly affect selector specificity or precedence.

## Capability review

Request and rule capability names use the existing capability lexical profile and
exact string equality.

There is no wildcard, prefix, namespace inheritance or case folding.
Schema-valid extension capability names can match exactly; absence from a built-
in TypeScript union is not a second authorization registry.

The accepted runtime hardening also validates every rule capability before
request-dependent filtering. Therefore malformed arrays, duplicates and
schema-invalid capability strings fail closed instead of silently producing
`DEFAULT_DENY` through an accidental no-match path.

## Resource/precedence composition review

M4-021 does not implement a second Resource matcher or precedence algorithm.
After Subject and capability filtering, candidates are passed to the accepted
M4-004 ordering primitive using the already canonicalized M4-003 Resource.

The accepted precedence remains:

```text
explicit deny
  > more-specific resource
  > higher explicit priority
  > ask
  > allow
  > default deny
```

Subject-selector order, capability-array order, resource-array order, source rule
order, policy epoch and Harness identity do not become hidden tie-breakers.

Global duplicate rule IDs fail before request filtering using the accepted
`RULE_ORDERING_DUPLICATE_RULE_ID` reason.

## Constraint boundary review

Core/Schema still define `constraints` as open JSON objects without a portable
predicate vocabulary. The implementation therefore does not invent object
comparison semantics.

For a rule that already matches Subject + capability + Resource:

```text
constraints omitted -> applicable
constraints {}      -> applicable
constraints non-empty -> FAIL_CLOSED deny
```

Stable unsupported-profile reason:

```text
POLICY_CONSTRAINT_PROFILE_UNSUPPORTED
```

An unrelated rule whose Subject/capability/Resource dimensions do not match is
not forced through its constraint body. Hostile tests prove an irrelevant
constraint Proxy is not traversed.

Non-empty request constraints do not create an implicit JSON equality/subset
language.

## Effect/default/explanation composition review

Fully applicable rule IDs are bound one-to-one to effects and passed to the
accepted M4-005 resolver. No M4-021-local `deny > ask > allow` copy is used.

The result is then finalized through M4-006 and explained through M4-007. The
implementation explicitly narrows the correlated explanation basis/reason pairs;
an impossible pair fails closed rather than being coerced into an allow/ask
result.

Successful output is one of:

```text
EXPLICIT_DENY
HIGHEST_BAND_ASK
HIGHEST_BAND_ALLOW
DEFAULT_DENY
```

with deterministic, detached rule-ID lists.

These IDs are implementation-level evaluation facts, not persisted
`CapabilityDecision.matchedRuleRefs`.

## Hostile runtime boundary review

Authorization-relevant input is derived from own data properties only.
The implementation rejects or fails closed on:

- top-level accessors;
- Subject accessors/inherited identity;
- rule accessors;
- symbol authority fields;
- sparse/named selector arrays;
- revoked Proxies and descriptor/ownKeys failures;
- malformed capability selector arrays/text;
- invalid constraint object shape when that constraint is policy-relevant.

Getter execution is not used to manufacture authority.

Successful results are detached and recursively immutable. Failure output is
bounded to stable stage/reason data and does not echo attacker-controlled Subject
IDs, capability text, resource locators, rule values, exception messages or
stacks.

## Portable and hostile-runtime test review

The production suite consumes all 31 reviewed JSON cases directly.

At accepted implementation head, the M4-021 suite contains 43 tests total:

- 31 portable cases;
- hostile/runtime coverage including accessor rejection, sparse/named arrays,
  symbol fields, revoked Proxies, irrelevant constraint non-traversal, literal
  star Subject ID handling, immutable outputs, failure sanitization, and the
  final malformed-capability-selector regression.

Repository-wide CI at the accepted head retains all existing architecture,
schema, compatibility, TypeScript, supply-chain and packed-testkit Gates.

## Intermediate findings corrected without weakening Gates

Implementation review found and corrected several candidate defects:

1. an internal TypeScript `ok` discriminant had leaked into the public portable
   M4-021 result shape; output was corrected to the Spec 0032 `status` contract;
2. correlated explanation basis/reason types required explicit narrowing rather
   than widening the result union;
3. a new sparse-array test initially added one lint warning; the test was
   rewritten so M4-021 adds no lint debt beyond the existing repository baseline;
4. final acceptance review found malformed rule capability strings could become
   ordinary no-match when M4-002 was bypassed; the accepted head validates them
   before request filtering and adds a regression test.

No schema, TCK, strict TypeScript, frozen install, supply-chain, architecture,
source-conformance or fail-closed Gate was weakened to obtain green status.

## Exact accepted-head evidence

At `21487cb2107dd708aab255472a1c2f71d3659584`:

- normal CI #437 / run `33347983574`: **PASS**;
- Harness rc5 source-conformance #379 / run `33347983577`: **PASS**.

Normal CI includes the complete repository verification chain: frozen install,
supply-chain policy, architecture boundaries, 16-schema shape, schema
compatibility baseline, strict workspace TypeScript, repository tests, lint and
packed Shared TCK external-consumer checks.

Harness #379 completed against the exact pinned rc5 source baseline and does not
change protocol authority.

## Acceptance findings

The final M4-021 implementation review found no acceptance-blocking defect after
the malformed-capability-selector correction.

In particular:

- protocol-first sequencing was preserved;
- Subject selector semantics are exact, narrow and language-independent;
- capability matching is exact and defensive against malformed policy input;
- Resource matching and precedence reuse accepted M4 primitives;
- rule identity is globally stable before request filtering;
- constraints cannot be silently ignored to gain permission;
- irrelevant constraints are not traversed as global blockers;
- effect/default/explanation semantics are composed, not duplicated;
- hostile JavaScript runtime mechanics fail closed;
- success output is detached/immutable and failure output is sanitized;
- all 31 portable cases are consumed by production tests;
- Harness remains compatibility evidence only;
- no M4-022+ behavior was implemented.

## Governance gate

This audit accepts M4-021 **only at its implementation boundary**.

The next state transition must create an M4-021 acceptance-record head that:

1. changes `@dsh-safe/policy-engine` stage from M4-021 implementation review to
   M4-021 accepted;
2. refreshes `docs/handoff/CURRENT.md` with exact protocol-first and accepted
   implementation evidence;
3. makes no production evaluator behavior, protocol spec/corpus/schema, Shared
   TCK, dependency/lockfile, Harness baseline or later-Gate change.

That acceptance-record exact head must itself reach normal CI plus exact pinned
Harness rc5 source-conformance dual-green.

Only after that may final governance:

- append M4-021 acceptance to `docs/handoff/HISTORY.md` without rewriting history;
- mark only M4-021 accepted in `docs/roadmap.md`;
- refresh `CURRENT.md` to final closure;
- determine whether M4-022 is the next authorized Gate from the roadmap.

Until those transitions complete:

```text
M4-021 implementation: ACCEPTED
M4-021 governance: PENDING
M4-022+: NOT AUTHORIZED
M4-040+: NOT AUTHORIZED
M6: NOT AUTHORIZED
```
