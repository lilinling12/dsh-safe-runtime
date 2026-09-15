# M4-005 Acceptance Audit — Deterministic Effect Resolution

> Result: **ACCEPTED AT IMPLEMENTATION BOUNDARY**  
> Milestone: `M4 — Capability Broker v0.1`  
> Gate: `M4-005 P0 — deny / ask / allow`

## 1. Accepted implementation head

```text
81e09435f1c038205977e740f8ac11c4d1bab796
```

This head is the accepted M4-005 implementation boundary. Later governance-only
commits may record this acceptance, but they MUST NOT retroactively change the
implementation evidence cited here.

## 2. Normative authority reviewed

M4-005 was implemented only after reconciling:

- `specs/0001-safe-runtime-core.md` §8.2–§8.3;
- `specs/0002-state-machines-and-precedence.md` §1;
- `specs/0020-m4-deterministic-rule-ordering.md`;
- `specs/0021-m4-effect-resolution.md`;
- `schemas/v1alpha1/capability-policy.schema.json`;
- the roadmap separation between M4-005, M4-006, M4-020 and M4-021.

DeepSeek Harness remains Adapter compatibility evidence only and did not define
policy semantics.

## 3. Accepted semantic boundary

M4-005 is a narrow effect-resolution primitive over rules whose **full
applicability has already been proven by an upstream evaluator**.

It consumes:

1. canonical M4-004 structural precedence bands restricted to fully applicable
   rules; and
2. exactly one `deny | ask | allow` binding for every rule in those bands.

It resolves only:

```text
any fully applicable deny in any band -> deny
otherwise highest structural band only
  -> ask if any ask exists in that band
  -> otherwise allow
empty fully-applicable input -> NO_APPLICABLE_RULES
```

The accepted implementation explicitly does **not**:

- consume a raw CapabilityPolicy as a complete evaluator;
- resolve subjects;
- match capabilities;
- evaluate arbitrary constraints;
- resource-match raw selectors;
- apply `defaultEffect`;
- convert no-match into deny;
- route approval;
- issue or consume leases;
- create a `CapabilityDecision`;
- assign guarantee level;
- create a receipt;
- expose decisive rule IDs as an explanation surface;
- perform Adapter enforcement.

Those remain later gates.

## 4. Security and determinism properties accepted

The exact implementation head proves all of the following:

1. explicit deny is global across all fully-applicable structural bands;
2. without deny, lower-band ask/allow cannot override the highest structural
   band;
3. ask beats allow only inside the highest equal structural band;
4. deterministic rule-ID presentation order never becomes authorization
   precedence;
5. empty bands plus empty effects returns `NO_APPLICABLE_RULES`, preserving the
   M4-006 default-deny boundary;
6. malformed or noncanonical structural bands fail closed;
7. equal structural keys split across multiple bands fail closed;
8. band rule IDs must be unique globally and canonical within each band;
9. effect bindings and band rule IDs must form an exact 1:1 set;
10. unknown/case-changed effects fail closed;
11. required runtime fields are read as own properties; inherited prototype
    values do not become authorization input;
12. unexpected own fields on bands/effect bindings fail closed;
13. specificity counts must be non-negative safe integers;
14. priorities must remain integers in `[-1000000, 1000000]`;
15. rule IDs are bounded to 128 Unicode code points using an early-exit `for...of`
    traversal rather than input-sized `Array.from(...)` allocation;
16. non-BMP identifiers retain Unicode code-point ordering semantics;
17. resolver input objects/arrays are not mutated;
18. success/failure result primitives are frozen;
19. M4-004 comparators are reused for structural validation instead of inventing
    another specificity/Unicode ordering algorithm.

## 5. Portable fixtures and runtime hardening

Language-independent fixture corpus:

```text
fixtures/effect-resolution/cases.json
```

Portable cases: **23**.

They cover:

- allow / ask / deny singleton outcomes;
- lower-band deny overriding higher-band allow/ask;
- higher-band allow/ask defeating lower-band ask/allow when no deny exists;
- equal-band `ask > allow`;
- all-allow highest-band resolution;
- empty input preserving `NO_APPLICABLE_RULES`;
- effect-binding order permutation;
- noncanonical rule-ID order;
- non-BMP code-point ordering;
- reverse band order;
- split equal structural keys;
- duplicate rule IDs;
- duplicate/missing/extra bindings;
- unknown effect;
- negative/unsafe specificity;
- out-of-range priority.

TypeScript runtime-only hardening additionally covers:

- caller input non-mutation;
- inherited effect fields rejected;
- inherited band required fields rejected;
- inherited specificity required fields rejected;
- unexpected band fields rejected;
- unexpected effect-binding fields rejected;
- 129 astral-code-point rule ID rejected by the bounded validator;
- frozen success/failure outputs.

## 6. Exact-head CI evidence

Normal CI #304 / run `32684842763` on
`81e09435f1c038205977e740f8ac11c4d1bab796`:

- `pnpm install --frozen-lockfile`: **PASS**;
- supply-chain lockfile policy: **PASS (124 entries)**;
- architecture boundaries: **PASS**;
- schema shape: **PASS (16 schemas)**;
- schema compatibility baseline: **PASS**;
- strict workspace TypeScript: **PASS**;
- repository tests: **PASS (32 files / 409 tests)**;
- M4-005 effect-resolution suite: **PASS (32 tests)**;
- M4-004 rule-ordering regressions: **PASS (19 tests)**;
- M4-004 resource-pattern regressions: **PASS (24 tests)**;
- M4-003 normalizer regressions: **PASS (38 + 2 tests)**;
- M4-002 schema validator regressions: **PASS (6 tests)**;
- M4-001 loader regressions: **PASS (18 tests)**;
- oxlint: **PASS — 0 warnings / 0 errors on 104 files**;
- packed Shared TCK + external non-workspace consumer: **PASS — 44 assets**.

The earlier CI #301 failed before tests on two strict TypeScript narrowing errors
inside M4-005 helper unions. They were fixed by introducing explicit internal
`ok` discriminants. No assertion, `any`, TypeScript relaxation, fixture rewrite,
schema change or semantic weakening was used.

## 7. Exact-head Harness compatibility evidence

Harness rc5 source-conformance #248 / run `32684842738` on the same exact head:

- Build pinned Harness public type surface: **PASS**;
- Install safe-runtime dependencies reproducibly: **PASS**;
- Project exact pinned Harness workspace packages: **PASS**;
- Verify workspace projection idempotence: **PASS**;
- Typecheck real rc5 binding against pinned source: **PASS**;
- Execute real rc5 runtime conformance: **PASS**.

Harness steps 6–11 all passed. This is compatibility evidence only; Harness did
not define M4-005 policy semantics.

## 8. Scope audit

Compared with the final M4-004 governance head
`a8c0da0a32f5040089326cc36e0262a6b8a2c84b`, the M4-005 implementation changes
are limited to:

- `specs/0021-m4-effect-resolution.md`;
- `fixtures/effect-resolution/cases.json`;
- `packages/policy-engine/src/effect-resolution-types.ts`;
- `packages/policy-engine/src/effect-resolution.ts`;
- `packages/policy-engine/src/effect-resolution.test.ts`;
- `packages/policy-engine/src/index.ts`.

There are no dependency, lockfile, schema, Adapter, Harness workflow, approval,
default-effect, PDP, lease, decision-record, receipt, classifier or M6 changes in
the accepted implementation scope.

## 9. Acceptance conclusion

M4-005 is **ACCEPTED AT IMPLEMENTATION BOUNDARY** at
`81e09435f1c038205977e740f8ac11c4d1bab796`.

This acceptance does **not** authorize M4-006 production work immediately. The
acceptance audit, package stage, CURRENT handoff, roadmap, append-only HISTORY
and PR description must be synchronized and the resulting final governance head
must itself pass both normal CI and exact Harness rc5 source-conformance.

Until that final governance head is dual-green:

```text
M4-005 implementation: ACCEPTED
M4-005 governance closure: PENDING
M4-006 implementation: NOT STARTED
M4-006 authorization: PENDING FINAL M4-005 GOVERNANCE DUAL-GREEN
M4-007+: NOT AUTHORIZED
M4-020+: NOT AUTHORIZED BY THIS GATE
M6: NOT AUTHORIZED
```
