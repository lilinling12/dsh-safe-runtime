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
- M4-021 P0 policy evaluation: **AUTHORIZED / PROTOCOL-FIRST IN PROGRESS**
- M4-022+, M4-040+ and M6: **NOT AUTHORIZED**

Live GitHub state overrides this file.

## Live ancestry note

The long-running PR retains known ancestry-only drift relative to `main`. The
reconciled merge-base `65870612d039ce026a6952c16d5e069b11bd24a7` and
`main@57430273e065be8d38807d67b175fa154c801d43` point to the same source tree
`ed0c142bf6bbd00f607cc169222f0bf67057fca5`.

Do not rebase, force-update, squash, or rewrite accepted ancestry merely to
change GitHub compare counters.

## Compatibility baseline

DeepSeek Harness is Adapter compatibility evidence only:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

Harness behavior MUST NOT define Core Subject identity, policy/PDP semantics,
selector grammar, precedence, guarantees, plugin trust, or PEP behavior.

## M4-020 final closure

Final-governance exact head:

```text
005f436007ce05ed607979ca77f12960544ca655
```

Exact-head evidence:

- CI #420 / run `33326180401`: PASS;
- Harness rc5 source-conformance #362 / run `33326180648`: PASS.

Final-governance delta was limited to:

- `docs/handoff/CURRENT.md`;
- append-only `docs/handoff/HISTORY.md`;
- only the M4-020 acceptance marker in `docs/roadmap.md`.

No production resolver/schema/corpus/TCK/dependency/lockfile/Harness/security
boundary changed in that transition. Therefore **M4-020 governance is CLOSED**.

M4-020 accepted implementation remains:

```text
31b3b190fc92372f2ccc2f6527b91826153f7917
```

with acceptance audit `docs/acceptance/m4-020-acceptance-audit.md`.

## Current Gate — M4-021 P0 policy evaluation

Normative profile under protocol-first review:

```text
specs/0032-m4-policy-evaluation.md
```

Initial Spec commit:

```text
48365467e6f9644c27bb010cc5ec6e844a313f2f
```

Portable corpus:

```text
fixtures/policy-evaluation/cases.json
```

Portable cases: `31`.

Initial corpus commit:

```text
9f0da13c679b5fc1235bf1c381d66fbe0a32f044
```

Protocol-first review then hardened the Subject-selector and rule-identity
boundary:

- corrected Spec head: `2fdd37a4db46c6fee2d4b0f063c5af6468ccbf2b`;
- corrected corpus head: `07db531af8d0bfc09cdad37a62f770e01fee835f`.

### M4-021 recovered composition boundary

M4-021 composes accepted primitives rather than creating another PDP algorithm:

```text
resolved M4-020 Subject
+ canonical M4-003 Resource
+ exact request capability
+ one immutable validated CapabilityPolicy snapshot
  -> exact Subject applicability
  -> exact capability applicability
  -> accepted M4-004 resource match / specificity / priority bands
  -> portable constraint boundary
  -> fully-applicable rules
  -> accepted M4-005 effect resolution
  -> accepted M4-006 default deny
  -> accepted M4-007 explanation
  -> M4-021 policy-evaluation fact
```

The accepted precedence remains unchanged:

```text
explicit deny
  > more-specific resource
  > higher explicit priority
  > ask
  > allow
  > default deny
```

### Subject selector semantics

`rules[].subjects` now has one deliberately narrow portable v0.1 grammar:

```text
<SubjectKind>://<SubjectId>
```

Properties:

- SubjectKind is exactly one standard M4-020 kind;
- parse the first literal `://` only;
- the remainder is opaque Subject ID data;
- exact kind + exact ID equality only;
- no trim, case-folding, Unicode normalization, alias lookup, prefix, glob,
  regex, parent/descendant, session, role/group, Harness-name or fuzzy semantics;
- omitted `subjects` means the Subject dimension is unconstrained;
- `*` inside Subject ID is ordinary opaque ID data, never a wildcard;
- malformed selectors fail closed with `POLICY_SUBJECT_SELECTOR_INVALID`.

This preserves the full already-accepted M4-020 Subject ID domain instead of
reserving new wildcard characters after the fact.

### Capability semantics

Capability selection is exact string equality under the existing
CapabilityRequest lexical profile. No wildcard/prefix/namespace inheritance or
case folding exists.

A schema-valid extension capability can match when explicitly named by a rule;
a valid capability with no fully-applicable rule reaches normal default deny.

### Rule identity preflight

Rule IDs MUST be globally unique across the complete policy before
request-dependent filtering. This prevents a duplicate ID from being hidden just
because one duplicate later fails Subject/capability matching.

The failure preserves accepted M4-004 reason:

```text
RULE_ORDERING_DUPLICATE_RULE_ID
```

The portable corpus includes a dedicated cross-filter duplicate case.

### Constraint boundary

Current Core/Schema expose request/rule `constraints` as open JSON objects but do
not define a portable predicate language. M4-021 therefore MUST NOT invent JSON
equality/subset/merge/argv semantics.

For a rule that already matches Subject + capability + resource:

```text
constraints omitted -> zero predicates -> applicable
constraints {}      -> zero predicates -> applicable
constraints non-empty -> FAIL_CLOSED deny
```

Stable reason:

```text
POLICY_CONSTRAINT_PROFILE_UNSUPPORTED
```

A non-empty constrained rule that is irrelevant because Subject, capability, or
resource did not match is not inspected as an applicability blocker.
Non-empty request constraints alone do not invent policy semantics.

### Snapshot and later-Gate boundaries

- one evaluation uses one immutable policy snapshot;
- M4-009 epoch is not policy precedence/identity;
- `rule.lease` does not trigger lease lookup in M4-021;
- `ask` remains a policy effect and does not invoke approval yet;
- no `CapabilityDecision`/stable `matchedRuleRefs` is persisted here;
- no guarantee level is assigned;
- no receipt/provenance is created;
- no delegation attenuation is proved;
- no PEP enforcement is performed.

M4-022 lease lookup, M4-023 approval routing, M4-024 decision/receipt/provenance,
M4-025 guarantee assignment, and M4-040+ enforcement remain unauthorized.

## Protocol-first Gate condition

**Production M4-021 evaluator implementation has NOT STARTED and is NOT
AUTHORIZED yet.**

Before any `packages/policy-engine` M4-021 evaluator implementation, the exact
protocol-first head containing Spec 0032, the 31 portable cases, and this handoff
transition MUST reach both:

1. normal CI PASS;
2. exact pinned Harness rc5 source-conformance PASS.

The protocol-first delta MUST NOT contain production evaluator code, schema/TCK
weakening, dependency/lockfile changes, Harness baseline changes, or M4-022+
implementation.

## Boundaries that remain enforced

- Specs/schemas/TCK remain semantic authority.
- Harness remains compatibility evidence only.
- Never weaken schema validation, TCK, strict TypeScript, frozen installs,
  supply-chain policy, architecture boundaries, source-conformance, or
  fail-closed behavior for CI.
- M4-021 must reuse M4-003/004/005/006/007/020 rather than duplicate their
  semantics.
- Unknown/malformed semantic input fails closed; it must not silently no-match
  when doing so could create permission.
- No Subject authentication or directory lookup is claimed.
- No parent existence/lineage proof is inferred from a parent ref.
- No merge of PR #3 without explicit user authorization.

## Resume instruction

1. refresh PR #3 exact head/base/reviews/threads and exact-head workflows;
2. audit the M4-021 protocol-first delta from M4-020 final head
   `005f436007ce05ed607979ca77f12960544ca655`;
3. require normal CI plus pinned Harness rc5 source-conformance dual-green on the
   exact protocol-first head;
4. only after that evidence authorize TypeScript M4-021 evaluator work;
5. do not start M4-022+ and do not merge PR #3 without explicit authorization.
