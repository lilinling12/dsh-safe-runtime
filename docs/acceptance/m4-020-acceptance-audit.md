# M4-020 Acceptance Audit — Subject Resolution

Status: **ACCEPTED AT IMPLEMENTATION BOUNDARY**

Accepted implementation head:

```text
31b3b190fc92372f2ccc2f6527b91826153f7917
```

Normative authority:

- `specs/0001-safe-runtime-core.md` — canonical identity and Subject model;
- `specs/0002-state-machines-and-precedence.md` — canonicalization before policy matching;
- `specs/0031-m4-subject-resolution.md` — M4-020 profile;
- `schemas/v1alpha1/defs.schema.json` and `capability-request.schema.json`;
- `@dsh-safe/protocol` Subject type projection.

Portable corpus:

- `fixtures/subject-resolution/cases.json` — 30 cases;
- `fixtures/subject-resolution/README.md` — fixture-only `$fixtureString` encoding;
- `fixtures/capability/invalid/request-subagent-null-parent.json`, registered as `CAP-REQ-003`.

Compatibility evidence only:

```text
DeepSeek Harness 0.1.0-rc.5
commit 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

## Acceptance result

M4-020 is accepted at the implementation boundary as a narrow, deterministic,
fail-closed Subject identity/context resolver.

The accepted implementation performs only:

1. authoritative request-session reference validation;
2. hostile-object-safe Subject structural inspection;
3. exact standard SubjectKind validation;
4. bounded protocol-ref validation;
5. the Core-required non-null parent rule for `subagent`;
6. exact Subject/request session consistency;
7. detached immutable resolved-Subject construction.

It does not authenticate an actor, look up a parent, prove lineage, attenuate
delegation, match `CapabilityPolicy.rules[].subjects`, evaluate policy, produce a
CapabilityDecision, resolve approval/lease state, emit provenance/receipt data,
assign guarantees or perform PEP enforcement.

## Live-state reconciliation

The acceptance review refreshed GitHub live state before creating this record.

At review time:

- PR #3: `OPEN / DRAFT / mergeable`;
- branch: `feat/m4-capability-broker`;
- exact implementation head: `31b3b190fc92372f2ccc2f6527b91826153f7917`;
- base: `main@57430273e065be8d38807d67b175fa154c801d43`;
- submitted reviews: none;
- review threads: none.

The PR body remains stale and describes earlier M4 Gates. It is operational
metadata only and is not used as protocol or acceptance authority.

The long-running branch retains the previously reconciled ancestry-only drift;
no rebase or force rewrite is performed merely to change compare counters.

## Protocol-first evidence

The corrected protocol-first exact head was:

```text
d2a879addd832791c10277be97ce3a7b09e95241
```

with:

- CI #405 / run `33313398737`: **PASS**;
- Harness rc5 source-conformance #347 / run `33313398644`: **PASS**.

Before production implementation, protocol-first review identified and corrected
an existing Core↔Schema mismatch: Core requires every subagent to have a Parent
Subject, while the previous schema required the `parent` property but still
allowed `null`.

The correction keeps the existing protocol `ref` lexical contract and changes
only the subagent conditional so `parent` must be a non-null `ref`. The schema
compatibility baseline was refreshed rather than disabled, and a schema-invalid
CapabilityRequest fixture was added.

The TypeScript Subject projection was then aligned in commit
`8fbf53fd1df7132ee76b58979ce3586b95f3eb83`; that exact head itself reached:

- CI #406: **PASS**;
- Harness rc5 source-conformance #348: **PASS**.

Production resolver implementation proceeded only after the protocol-first Gate
was dual-green.

## Implementation delta audit

Compared with protocol-first head
`d2a879addd832791c10277be97ce3a7b09e95241`, accepted implementation head
`31b3b190fc92372f2ccc2f6527b91826153f7917` is nine commits ahead and zero
behind.

Its net delta is limited to seven expected paths:

- `packages/protocol/src/common.ts` — Core/Schema-aligned Subject union;
- `fixtures/manifest.json` — registration of the reviewed null-parent invalid fixture;
- `packages/policy-engine/package.json` — build protocol declarations before strict no-emit typecheck;
- `packages/policy-engine/src/index.ts` — M4-020 implementation-stage export;
- `packages/policy-engine/src/subject-resolution-types.ts`;
- `packages/policy-engine/src/subject-resolution.ts`;
- `packages/policy-engine/src/subject-resolution.test.ts`.

No policy selector grammar, PDP orchestration, approval/lease logic, PEP,
provider implementation, Harness pin, lockfile, dependency version, capability
vocabulary or later-Gate behavior changed.

## Deterministic input inspection review

The resolver follows the reviewed order:

```text
requestSessionRef
-> Subject record/array readability
-> complete own-key set
-> kind descriptor + validation
-> id descriptor + validation
-> parent descriptor + validation
-> sessionRef descriptor + validation
-> exact session equality
-> detached immutable result
```

Request session validation happens before the Subject object is touched. Tests
prove an invalid request session does not trigger hostile Subject proxy traps.

Subject authority is derived only from own data properties. The resolver uses
`Reflect.ownKeys` and own property descriptors rather than direct property reads,
spread, serialization or coercion. Therefore inherited identity fields cannot
manufacture a Subject and accessor-backed normative fields do not execute
getters.

Unexpected own string fields and all own symbol fields fail closed.

Thrown `ownKeys`/descriptor operations and revoked Proxy states map to the stable
`SUBJECT_INPUT_UNREADABLE` reason rather than escaping attacker-controlled
errors.

## Subject kind and reference review

Accepted kinds are exactly:

```text
agent
subagent
tool
plugin
system
verifier
human
service
```

There is no trimming, case folding, Unicode normalization, alias lookup, display-
name mapping or Harness-name mapping.

Protocol refs are accepted only when they are primitive strings with 1..512
Unicode code points. Production validation uses bounded `for...of` traversal and
returns immediately once the portable maximum is exceeded. It does not allocate
an unbounded code-point array.

Whitespace-only refs remain accepted because M4-020 intentionally preserves the
existing schema `minLength: 1` contract; tightening that lexical rule would be a
separate protocol change.

## Parent semantics review

For `subagent`:

- `parent` must be an own data property;
- it must be a non-empty protocol ref;
- `null`, missing, non-string, empty and oversized values fail as
  `SUBJECT_PARENT_INVALID`.

For all other standard Subject kinds, the pre-existing protocol surface is
preserved: `parent` may be omitted, `null` or a valid non-empty ref.

M4-020 assigns no parent-existence, descendant, delegation or lineage-proof
semantics to that value.

## Session consistency review

The request-level `CapabilityRequest.sessionRef` remains the authoritative
request context.

- it is validated before Subject inspection;
- when Subject `sessionRef` is absent, the request session is materialized into
  the resolved Subject;
- when present, Subject `sessionRef` must itself be a valid protocol ref and must
  equal the request session exactly;
- case or Unicode differences are not normalized;
- a mismatch fails as `SUBJECT_SESSION_MISMATCH`.

No concatenated or newly invented `subjectRef` is generated.

## Result detachment and failure-sanitization review

On success, the resolver constructs a fresh Subject containing only reviewed
primitive fields and freezes both the nested Subject and outer result. Caller
mutation of the input object cannot alter the resolved identity/context.

On failure, the result contains only:

```text
{ status: "ERROR", reason: <stable reason> }
```

No attacker-supplied kind, ID, parent, session, thrown error, stack, getter value
or proxy diagnostic is echoed.

Stable reasons are exactly:

```text
SUBJECT_REQUEST_SESSION_INVALID
SUBJECT_INPUT_INVALID
SUBJECT_INPUT_UNREADABLE
SUBJECT_FIELDS_INVALID
SUBJECT_KIND_INVALID
SUBJECT_ID_INVALID
SUBJECT_PARENT_INVALID
SUBJECT_SESSION_REF_INVALID
SUBJECT_SESSION_MISMATCH
```

## Portable and hostile-runtime test review

The production test suite consumes all 30 reviewed JSON cases directly.
`$fixtureString` is expanded only by test fixture materialization according to
`fixtures/subject-resolution/README.md`; the production resolver has no support
for that directive.

The M4-020 suite contains 40 tests total: 30 portable cases plus hostile/runtime
coverage. It proves, among other properties:

- all eight standard kinds;
- omitted/equal Subject sessionRef handling;
- subagent parent requirements;
- non-subagent null/string parent preservation;
- exact 512/513 code-point boundaries;
- empty/oversized request and Subject refs;
- exact case-sensitive session mismatch;
- whitespace-only ref preservation;
- unknown/case-changed kinds;
- unexpected fields;
- non-object and array rejection;
- inherited identity rejection;
- getter non-execution for every normative field;
- symbol-field rejection;
- ownKeys and descriptor trap failure;
- revoked Proxy handling;
- deterministic short-circuit inspection order;
- detached/frozen successful result;
- non-echoing failure payloads.

The schema-invalid subagent-null-parent fixture is also registered in the shared
fixture manifest so it participates in repository schema-conformance checks
rather than existing as an undiscovered file.

## Intermediate CI findings

Two implementation-candidate defects were exposed and corrected without
weakening a Gate:

1. policy-engine's strict no-emit typecheck could not resolve the workspace
   protocol declarations. The package now follows the already accepted
   capability-broker pattern: build `@dsh-safe/protocol`, then run strict
   `tsc --noEmit`. Strictness and dependencies were not relaxed.
2. the new test initially calculated repository root one directory too high,
   causing an `ENOENT` before the Subject suite ran. Only the fixture path was
   corrected; resolver semantics were unchanged.

The final accepted head is fully green.

## Exact accepted-head evidence

At `31b3b190fc92372f2ccc2f6527b91826153f7917`:

- normal CI #414 / run `33323729301`: **PASS**;
- Harness rc5 source-conformance #356 / run `33323729321`: **PASS**.

Normal CI evidence includes:

- architecture boundaries: PASS;
- 16-schema shape check: PASS;
- schema compatibility baseline: PASS;
- strict workspace TypeScript: PASS;
- 43 test files / 767 tests: PASS;
- M4-020 Subject-resolution suite: 40 tests PASS;
- frozen install and supply-chain policy: PASS (124 entries);
- packed Shared TCK external consumer: PASS (44 installed assets).

Harness #356 completed successfully through the exact pinned rc5 source flow,
including source checkout, public type-surface build, reproducible install,
workspace projection/idempotence, real binding typecheck and runtime
conformance.

No Gate was weakened to obtain green status.

## Acceptance findings

The review found no acceptance-blocking defect in the final M4-020 net
implementation delta.

In particular:

- protocol-first sequencing was preserved;
- Core↔Schema subagent-parent semantics are aligned;
- Subject TypeScript projection matches that corrected protocol surface;
- request session is authoritative and inspected first;
- hostile JS object mechanics fail closed without getter execution;
- refs are bounded using the existing schema contract;
- Subject kind and session matching are exact and deterministic;
- resolved values are detached and immutable;
- failure values are stable and sanitized;
- all 30 portable cases are consumed by the production test suite;
- the shared invalid schema fixture is actually registered;
- no policy subject-selector grammar or M4-021 behavior was invented;
- Harness remains compatibility evidence only.

## Governance gate

This audit accepts M4-020 only at its implementation boundary.

The next state change must create an M4-020 acceptance-record head that:

1. changes `@dsh-safe/policy-engine` package stage from M4-020 conformance to
   M4-020 accepted;
2. refreshes `docs/handoff/CURRENT.md` with exact protocol-first and accepted
   implementation evidence;
3. makes no production Subject-resolution behavior, protocol schema, portable
   corpus, Shared TCK, dependency, lockfile, Harness baseline or security-boundary
   change.

That acceptance-record exact head must reach normal CI plus exact pinned Harness
rc5 source-conformance dual-green.

Only then may a final governance commit append M4-020 acceptance to
`docs/handoff/HISTORY.md`, mark only M4-020 accepted in `docs/roadmap.md`, and
determine the next authorized Gate from the roadmap. The final governance head
must itself be dual-green.

Until those transitions complete:

```text
M4-020 implementation: ACCEPTED
M4-020 governance: PENDING
M4-021+: NOT AUTHORIZED
M4-040+: NOT AUTHORIZED
M6: NOT AUTHORIZED
```
