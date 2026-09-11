# M4-007 Acceptance Audit — Deterministic Policy Effect Explanation

Status: **ACCEPTED AT IMPLEMENTATION BOUNDARY**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-007 P0 — explain API`  
Accepted implementation head: `1c8bc9ef50a6c680a930814821267e76d79357ac`  
Audit date: `2026-08-24`

This document is an acceptance record, not a new source of protocol semantics.
Normative authority remains Spec 0023 plus the Core/precedence contracts it
references.

## 1. Authority reviewed

The acceptance review reconciled:

1. `specs/0001-safe-runtime-core.md` §8–§9;
2. `specs/0002-state-machines-and-precedence.md` §1;
3. `schemas/v1alpha1/capability-decision.schema.json`;
4. `packages/protocol/src/capability.ts`;
5. `specs/0020-m4-deterministic-rule-ordering.md`;
6. `specs/0021-m4-effect-resolution.md`;
7. `specs/0022-m4-defensive-default-deny.md`;
8. `specs/0023-m4-policy-effect-explanation.md`;
9. `fixtures/policy-explanation/cases.json`.

DeepSeek Harness was used only as exact-source Adapter compatibility evidence.

## 2. Accepted semantic boundary

M4-007 is a narrow deterministic explanation primitive over facts whose full
applicability has already been proven upstream.

Input is limited to:

```text
canonical fully-applicable M4-004 bands
+ exact M4-005 effect bindings
+ presence-preserving policy spec required by M4-006
```

The implementation delegates authorization semantics rather than re-implementing
them:

```text
safe runtime-data materialization
  -> resolveApplicableRuleEffects()   // M4-005 authority
  -> finalizeDefaultDeny()            // M4-006 authority
  -> deterministic explanation projection
```

Accepted explanation bases are:

```text
EXPLICIT_DENY
HIGHEST_BAND_ASK
HIGHEST_BAND_ALLOW
DEFAULT_DENY
FAIL_CLOSED
```

M4-007 does not resolve subjects, classify tools/capabilities, evaluate raw
CapabilityPolicy rules, match arbitrary constraints, route approval, issue or
consume leases, assign guarantees, create decision/request IDs or timestamps,
persist provenance, create CapabilityDecision/CapabilityReceipt records, or
perform Adapter enforcement.

## 3. Rule-contribution semantics

### Explicit deny

When M4-005 resolves `deny`, `contributingRuleIds` contains every
fully-applicable explicit-deny rule across all structural bands.

This is correct because v0.1 explicit deny is global and dominates specificity
and priority.

The list is Unicode code-point lexicographic presentation only. It is not a new
authorization tie-breaker.

### Highest-band ask

When M4-005 resolves `ask`, `contributingRuleIds` contains exactly the ask rules
from the highest structural band.

Allow rules in that band and all lower-band rules are not effect-contributing.

### Highest-band allow

When M4-005 resolves `allow`, `contributingRuleIds` contains every rule from the
highest structural band, which M4-005 has already proven contains only allow
effects after the global-deny and ask checks.

### Default deny

`NO_APPLICABLE_RULES` plus valid `defaultEffect: deny` explains as
`DEFAULT_DENY` with an empty contributor list. No synthetic rule is invented.

### Defensive fail closed

A policy-spec configuration rejected by M4-006 explains as `FAIL_CLOSED`,
`effect: deny`, with the exact M4-006 failure reason and no contributing rule.

This deny is explicitly an enforcement fact, not proof that any policy rule
explicitly denied the request.

## 4. `contributingRuleIds` is not `matchedRuleRefs`

The accepted API deliberately exposes bare `contributingRuleIds`, not protocol
`CapabilityDecision.matchedRuleRefs`.

It does not claim:

- the complete raw or fully-applicable match set;
- cross-policy stable references;
- durable decision provenance;
- a persisted CapabilityDecision relationship.

M4-021 owns full policy evaluation. M4-024 owns durable decision
receipt/provenance and stable policy/rule references.

No invented `policyRef`, rule-ref namespace, decision ID, timestamp, guarantee
level, or free-form reason text is emitted by M4-007.

## 5. Portable conformance corpus

`fixtures/policy-explanation/cases.json` contains 18 portable cases covering:

- single explicit deny;
- lower-band deny overriding a higher-band allow;
- multiple denies across bands with global deterministic presentation;
- ask over allow in the highest band;
- multiple highest-band asks;
- higher-band allow over lower-band ask;
- multiple highest-band allows;
- no-applicable-rules default deny;
- invalid default configuration fail closed;
- invalid default configuration taking precedence over an explicit rule effect;
- invalid effect;
- missing and extra effect bindings;
- noncanonical band ordering;
- malformed empty band;
- effect-binding permutation invariance;
- non-BMP Unicode rule-ID ordering;
- policy-spec extra fields not entering explanation output.

M4-005 invalid inputs return `EXPLAIN_FAILED`; they are not converted into a
fabricated deny explanation.

## 6. JavaScript/TypeScript untrusted-object hardening

M4-007 adds a language-runtime hardening layer before M4-005 without redefining
portable policy semantics.

The accepted implementation materializes the narrow bands/effects projection by
own data-property descriptors.

It rejects or safely contains:

- accessor-backed band fields;
- accessor-backed top-level array elements;
- accessor-backed nested specificity fields;
- accessor-backed effect bindings;
- accessor-backed rule-ID array elements;
- sparse arrays;
- named array properties;
- symbol array properties;
- revoked proxies in the materialized bands/effects boundary;
- inherited required effect fields.

Security-relevant getters are not invoked.

Policy-spec default-effect inspection remains owned by M4-006, so
accessor-backed or revoked policy specs preserve M4-006's
`DEFAULT_EFFECT_CONFIG_INVALID` fail-closed behavior without getter execution.

Successful explanations and failure results are frozen. Contributor arrays are
detached and frozen. Caller inputs are not mutated.

## 7. Green-head review did not stop at first success

The initial implementation head
`ab01ff5207d3a714f4cc00c3e3909ff091d0a4f5` was already dual-green:

- normal CI #328: PASS;
- Harness #270: PASS;
- 34 test files / 472 tests;
- M4-007 suite: 28 tests.

Acceptance review deliberately did not stop there.

A follow-up security-evidence commit added explicit regressions for:

1. nested specificity accessors;
2. effect-binding accessors;
3. rule-ID element accessors;
4. revoked policy-spec fail-closed composition;
5. frozen explanation failures.

No production semantics were weakened or changed by that hardening commit.

Final accepted implementation head:

```text
1c8bc9ef50a6c680a930814821267e76d79357ac
```

## 8. Exact-head normal CI evidence

CI #329 / run `32716573950`: **PASS**

Evidence:

- `pnpm install --frozen-lockfile`: PASS;
- supply-chain policy: PASS (124 entries);
- architecture boundaries: PASS;
- schema shape: PASS (16 schemas);
- schema compatibility baseline: PASS;
- strict workspace TypeScript: PASS;
- test files: 34 PASS;
- repository tests: 477 PASS;
- M4-007 explanation suite: 33 PASS;
- M4-006 default-deny regressions: 35 PASS;
- M4-005 effect-resolution regressions: 32 PASS;
- M4-004 rule-ordering regressions: 19 PASS;
- M4-004 resource-pattern regressions: 24 PASS;
- M4-003 resource normalizer regressions: 38 + 2 PASS;
- M4-002 validator regressions: 6 PASS;
- M4-001 loader regressions: 18 PASS;
- oxlint: 0 warnings / 0 errors on 110 files;
- packed Shared TCK + external non-workspace consumer: 44 assets PASS.

## 9. Exact Harness source-conformance evidence

Harness rc5 source-conformance #271 / run `32716573857`: **PASS**

All compatibility steps 6–11 passed:

1. build pinned Harness public type surface;
2. install safe-runtime dependencies reproducibly;
3. project exact pinned Harness workspace packages;
4. verify projection idempotence;
5. typecheck real rc5 binding against pinned source;
6. execute real rc5 runtime conformance.

Harness does not define M4-007 semantics.

## 10. Scope audit

Relative to final M4-006 governance head `1e9b5f10...`, M4-007 work is limited
to:

```text
specs/0023-m4-policy-effect-explanation.md
fixtures/policy-explanation/cases.json
packages/policy-engine/src/policy-effect-explanation-types.ts
packages/policy-engine/src/policy-effect-explanation.ts
packages/policy-engine/src/policy-effect-explanation.test.ts
packages/policy-engine/src/index.ts
docs/handoff/CURRENT.md
```

There is no dependency, lockfile, schema, protocol CapabilityDecision,
Adapter, Harness-workflow, subject-resolution, full-PDP, approval, lease,
receipt/provenance, guarantee, classifier, plugin, or M6 implementation change.

## 11. Acceptance verdict

```text
M4-007 protocol-first profile: PASS
M4-007 portable explanation fixtures: PASS
M4-007 implementation: ACCEPTED AT IMPLEMENTATION BOUNDARY
M4-007 runtime hardening: PASS
Normal CI #329: PASS
Harness #271: PASS
M4-008 authorization: PENDING FINAL M4-007 GOVERNANCE-HEAD DUAL-GREEN
M4-020+: NOT AUTHORIZED BY M4-007
M6: NOT AUTHORIZED
```

The implementation boundary is accepted, but acceptance governance must now be
recorded and that final governance head must itself pass normal CI and exact
Harness rc5 source-conformance before M4-008 or another later gate begins.
