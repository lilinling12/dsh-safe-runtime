# M4-006 Acceptance Audit — Defensive Default-Deny Finalization

> Result: **ACCEPTED AT IMPLEMENTATION BOUNDARY**  
> Milestone: `M4 — Capability Broker v0.1`  
> Gate: `M4-006 P0 — default deny`

## 1. Accepted implementation head

```text
de614120fdbf5c210c3b4f823d215a9ea89916b5
```

This exact head is the accepted M4-006 implementation boundary. Later
acceptance/governance commits may record this result, but they MUST NOT redefine
or retroactively mutate the implementation evidence cited here.

## 2. Normative authority reconciled

M4-006 was accepted only after reconciling:

- `specs/0001-safe-runtime-core.md` §8.3;
- `specs/0002-state-machines-and-precedence.md` §1;
- `specs/0018-m4-capability-policy-schema-validation.md` §6;
- `schemas/v1alpha1/capability-policy.schema.json`;
- `specs/0021-m4-effect-resolution.md`;
- `specs/0022-m4-defensive-default-deny.md`.

The accepted boundary preserves two requirements that apply at different trust
levels:

1. M4-002 schema conformance requires `spec.defaultEffect` and permits only
   exactly `"deny"`; it never inserts a default;
2. later evaluation remains fail-closed when an internal/unvalidated path somehow
   loses, inherits, corrupts, or replaces that field.

M4-006 therefore does **not** make a schema-invalid policy valid. It records an
invalid configuration distinctly while carrying a mandatory fail-closed deny
fact.

DeepSeek Harness remains Adapter compatibility evidence only and did not define
these policy semantics.

## 3. Accepted semantic boundary

M4-006 consumes:

1. a successful M4-005 effect-resolution result; and
2. the policy `spec` object, or an equivalent presence-preserving projection from
   which `defaultEffect` can be verified as an explicit data field.

For the normal M4-002-validated path:

```text
resolved allow + own defaultEffect deny -> allow
resolved ask   + own defaultEffect deny -> ask
resolved deny  + own defaultEffect deny -> deny
NO_APPLICABLE_RULES + own defaultEffect deny -> deny
```

For defensive invalid configuration:

```text
missing / inherited / accessor-backed / undefined / null /
allow / ask / unknown / non-string defaultEffect
    -> FAIL_CLOSED
    -> effect: deny
    -> reason: DEFAULT_EFFECT_CONFIG_INVALID
```

Malformed upstream M4-005 success state resolves separately to:

```text
FAIL_CLOSED
  effect: deny
  reason: DEFAULT_DENY_INPUT_INVALID
```

The failure-side `effect: "deny"` is an enforcement fact, not evidence that a
valid policy explicitly decided deny.

## 4. Security-critical hardening completed before acceptance

### 4.1 Preserve default-effect field presence

An earlier green implementation accepted a pre-extracted scalar
`defaultEffect`. Acceptance review rejected that boundary because scalar
extraction can erase the distinction between:

```text
own defaultEffect: "deny"
```

and:

```text
missing own field + inherited prototype defaultEffect: "deny"
```

The accepted implementation instead receives the policy-spec object and verifies
field presence at the M4-006 boundary. Prototype-only `defaultEffect` cannot
become authorization input.

This hardening changed the normative Spec 0022, portable fixtures, implementation
and runtime tests before the accepted exact head was selected.

### 4.2 Reject accessor-backed authorization fields without executing getters

A second acceptance review identified that an own-property check followed by
normal `obj[key]` access can still execute an accessor getter. Although a normal
M4-002 JSON snapshot contains ordinary data properties, M4-006 explicitly owns a
defensive runtime boundary for callers that bypass that snapshot.

The accepted TypeScript implementation therefore reads security-relevant fields
through own-property descriptors and accepts only data descriptors. It rejects
accessor-backed:

- `policySpec.defaultEffect`;
- M4-005 `status`;
- M4-005 resolved `effect`;
- the TypeScript `ok` success discriminant when it is not an own data property.

Tests prove accessor getters are **not invoked**. Descriptor/proxy inspection
failures also fail closed.

## 5. Additional accepted runtime properties

The accepted implementation further proves:

1. policy-spec non-object input fails configuration-invalid and deny;
2. own `defaultEffect: undefined` fails closed;
3. `allow`, `ask`, unknown, null and non-string defaults cannot become valid
   configured defaults;
4. invalid default configuration is checked before malformed upstream state, so
   an invalid policy cannot escape fail-closed behavior through a partial allow;
5. native TypeScript M4-005 success outputs compose directly with M4-006;
6. M4-005 failures cannot be treated as success;
7. required M4-005 fields must be own data properties;
8. unexpected string/symbol fields on the narrow M4-005 projection fail closed;
9. M4-006 does not reject unrelated legitimate fields such as `rules` or
   `delegation` in the policy-spec object, because it is not a second schema
   validator;
10. both caller inputs remain unmodified;
11. all success/failure outputs are frozen;
12. no host time, randomness, filesystem, network, Harness behavior or object
    iteration order affects the outcome.

## 6. Portable fixtures and TypeScript runtime evidence

Language-independent fixture corpus:

```text
fixtures/default-deny/cases.json
```

Portable cases: **20**.

They cover:

- resolved allow / ask / deny preservation;
- no-applicable-rules default deny;
- missing and non-object policy-spec configuration;
- allow / ask / unknown / null / numeric default invalidation;
- invalid default overriding resolved allow/ask defensively;
- malformed/non-object M4-005 input;
- unknown status;
- missing/case-changed resolved effect;
- illegal effect on no-applicable result;
- extra upstream fields;
- M4-005 failure-like input.

TypeScript runtime hardening expands the M4-006 test file to **35 tests** and
covers, in addition:

- direct composition with real M4-005 resolved and no-applicable outputs;
- real policy-spec objects containing `rules`/`delegation`;
- prototype-only default-effect rejection;
- own undefined default-effect rejection;
- accessor-backed defaultEffect rejection without getter invocation;
- inherited M4-005 status/effect rejection;
- accessor-backed status/effect rejection without getter invocation;
- unexpected symbol-field rejection;
- input non-mutation and frozen outputs.

## 7. Exact-head normal CI evidence

Normal CI #320 / run `32685942246` on
`de614120fdbf5c210c3b4f823d215a9ea89916b5`:

- `pnpm install --frozen-lockfile`: **PASS**;
- supply-chain lockfile policy: **PASS — 124 entries**;
- architecture boundaries: **PASS**;
- schema shape: **PASS — 16 schemas**;
- schema compatibility baseline: **PASS**;
- strict workspace TypeScript: **PASS**;
- repository tests: **PASS — 33 files / 444 tests**;
- M4-006 default-deny suite: **PASS — 35 tests**;
- M4-005 effect-resolution regressions: **PASS — 32 tests**;
- M4-004 rule-ordering regressions: **PASS — 19 tests**;
- M4-004 resource-pattern regressions: **PASS — 24 tests**;
- M4-003 resource-normalization regressions: **PASS — 38 + 2 tests**;
- M4-002 schema-validator regressions: **PASS — 6 tests**;
- M4-001 loader regressions: **PASS — 18 tests**;
- oxlint: **PASS — 0 warnings / 0 errors on 107 files**;
- packed Shared TCK + external non-workspace consumer: **PASS — 44 assets**.

No TypeScript strictness, schema, fixture expectation, architecture rule, frozen
install, supply-chain policy or fail-closed invariant was weakened.

## 8. Exact-head Harness compatibility evidence

Harness rc5 source-conformance #264 / run `32685942253` on the same exact head:

- step 6 — Build pinned Harness public type surface: **PASS**;
- step 7 — Install safe-runtime dependencies reproducibly: **PASS**;
- step 8 — Project exact pinned Harness workspace packages: **PASS**;
- step 9 — Verify workspace projection idempotence: **PASS**;
- step 10 — Typecheck real rc5 binding against pinned source: **PASS**;
- step 11 — Execute real rc5 runtime conformance: **PASS**.

Harness remains compatibility evidence only.

## 9. Scope audit

Compared with final M4-005 governance head
`29561bcb24540055f7a7b495f862190c15b51874`, the accepted M4-006 implementation
changes only:

- `specs/0022-m4-defensive-default-deny.md`;
- `fixtures/default-deny/cases.json`;
- `packages/policy-engine/src/default-deny-types.ts`;
- `packages/policy-engine/src/default-deny.ts`;
- `packages/policy-engine/src/default-deny.test.ts`;
- `packages/policy-engine/src/index.ts`.

There are no dependency, lockfile, schema, Adapter, Harness-workflow, subject
resolution, full-PDP, approval, lease, CapabilityDecision, receipt, guarantee,
classifier, plugin or M6 implementation changes in the accepted scope.

## 10. Explicit non-claims

M4-006 acceptance does not claim that the repository now has full policy
evaluation. In particular, M4-006 does not implement:

- unknown-capability classification/evaluation;
- subject matching;
- capability matching;
- arbitrary constraint evaluation;
- raw policy rule collection;
- approval routing;
- lease semantics;
- CapabilityDecision construction;
- matched-rule explanation/provenance;
- guarantee-level selection;
- receipts;
- Adapter enforcement.

Those remain later roadmap gates.

## 11. Acceptance conclusion

M4-006 is **ACCEPTED AT IMPLEMENTATION BOUNDARY** at:

```text
de614120fdbf5c210c3b4f823d215a9ea89916b5
```

This does **not** immediately authorize M4-007 production work. The acceptance
audit, package stage, CURRENT handoff, roadmap, append-only HISTORY and PR
metadata must be synchronized, and the resulting final governance head must
itself pass both normal CI and exact Harness rc5 source-conformance.

Until that final governance head is dual-green:

```text
M4-006 implementation: ACCEPTED
M4-006 governance closure: PENDING
M4-007 implementation: NOT STARTED
M4-007 authorization: PENDING FINAL M4-006 GOVERNANCE DUAL-GREEN
M4-020+: NOT AUTHORIZED BY THIS GATE
M6: NOT AUTHORIZED
```
