# M4-008 Acceptance Audit — Deterministic CapabilityPolicy Diagnostics

Status: **ACCEPTED AT IMPLEMENTATION BOUNDARY**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-008 P1 — policy diagnostics`  
Accepted implementation head: `2aa8250f6c98b9853497481c08e584df866863ff`  
Audit date: `2026-08-25`

This document records acceptance evidence. It does not create new protocol
semantics. Normative authority remains Spec 0024 and the accepted M4 contracts it
references.

## 1. Authority reviewed

The acceptance review reconciled:

1. `specs/0018-m4-capability-policy-schema-validation.md`;
2. `specs/0019-m4-canonical-resource-normalization.md`;
3. `specs/0020-m4-deterministic-rule-ordering.md`;
4. `specs/0021-m4-effect-resolution.md`;
5. `specs/0022-m4-defensive-default-deny.md`;
6. `specs/0023-m4-policy-effect-explanation.md`;
7. `specs/0024-m4-capability-policy-diagnostics.md`;
8. `schemas/v1alpha1/capability-policy.schema.json`;
9. `fixtures/policy-diagnostics/cases.json`.

DeepSeek Harness was used only as exact-source Adapter compatibility evidence.
It does not define M4-008 diagnostics semantics.

## 2. Accepted semantic boundary

M4-008 is a deterministic static authoring/preflight diagnostics layer over a
policy that has already crossed M4-001 loading and M4-002 schema validation.

The accepted normal pipeline is:

```text
M4-001 document loading
  -> M4-002 schema validation
  -> immutable validated policy snapshot
  -> M4-008 diagnostics
```

M4-008 is not a second schema validator and is not an authorization gate.
Diagnostic presence or absence does not change policy validity, resource
normalization, structural ordering, effect resolution, fail-closed behavior, or
M4-007 explanation.

The public runtime function accepts `unknown` only so direct JavaScript callers
can fail safely. That defensive shape inspection does not make schema-invalid
input schema-valid.

## 3. Accepted built-in diagnostics

The v0.1 diagnostics profile is deliberately limited to facts already justified
by accepted M4 semantics.

### Resource selector failures

Each rule resource selector is first passed through the accepted M4-003
`normalizePolicyResourceSelector()` boundary. Supported portable reasons are
preserved as diagnostic codes:

```text
RESOURCE_SCHEME_UNSUPPORTED
RESOURCE_LOCATOR_INVALID
RESOURCE_SELECTOR_SYNTAX_INVALID
RESOURCE_LIMIT_EXCEEDED
```

M4-008 does not maintain a second resource parser.

### Resource pattern syntax

After M4-003 normalization, pattern syntax is checked by a package-internal seam
that calls the existing M4-004 `compilePattern()` implementation.

The accepted implementation therefore does not duplicate `*` / `**` syntax and
does not manufacture a synthetic resource merely to test pattern validity.

The new helper is not exported from the policy-engine package root and does not
change existing M4-004 observable matching behavior.

### Duplicate rule IDs

A later exact duplicate rule ID receives:

```text
severity: WARNING
code: POLICY_DIAGNOSTIC_DUPLICATE_RULE_ID
instancePath: /spec/rules/<later>/id
relatedPaths: [/spec/rules/<first>/id]
```

Comparison is exact. No case folding or Unicode normalization is introduced.
This remains an authoring diagnostic, not a new schema-invalid condition.

### Redundant priority diagnostics

An explicit priority on a `deny` rule is warned as redundant for the accepted
v0.1 final-effect precedence because a fully-applicable explicit deny globally
dominates specificity, numeric priority, ask, and allow.

An explicit `priority: 0` on `allow` or `ask` is warned because M4-004 compares
missing priority as zero.

A deny rule with `priority: 0` receives only the deny-priority warning.

These diagnostics do not mutate policy or alter rule ordering.

### Empty rule set

An empty `spec.rules` array receives an informational diagnostic. The schema
permits it; M4-005 has no applicable rules and M4-006 retains default deny.

The diagnostic does not claim that later leases, delegation, subjects, or full
PDP composition have already been evaluated.

## 4. Explicitly deferred semantics

The accepted implementation does not diagnose or evaluate:

- subject reachability or overlap;
- capability overlap/full rule applicability;
- arbitrary constraint satisfiability;
- lease redundancy, attenuation, expiry, or consumption;
- approval reachability or outcome;
- request-dependent rule shadowing;
- complete-policy allow/deny reachability;
- guarantee strength;
- provider containment;
- DNS/network/URL equivalence;
- secret resolution;
- stable `matchedRuleRefs`;
- decision receipt or durable provenance.

Those remain later M4-020+ or provider-specific responsibilities.

## 5. Deterministic and privacy-preserving output

Portable findings contain only:

```text
severity
code
instancePath
relatedPaths? 
```

Paths are deterministic RFC 6901 JSON Pointers. Findings are emitted in the
source traversal order fixed by Spec 0024; this order is presentation/truncation
order only and never becomes authorization precedence.

The implementation does not copy policy resources, capabilities, subjects,
constraints, lease contents, secrets, policy source, host paths, stack traces,
or library-specific error objects into portable diagnostics.

The portable output cap is exactly 256 findings. A 257th proven finding causes
`truncated: true`; output remains capped at 256.

## 6. Portable conformance corpus

The final portable corpus contains 21 cases.

Before production implementation, acceptance review found two protocol-corpus
quality defects in the first candidate:

1. Spec 0024 required a control-code locator case but the corpus lacked it;
2. `future-fields-ignored` used non-schema lease key `ttlSeconds` instead of
   `ttlMs`.

The corrected protocol head is:

```text
28dd52c4712f072137226a34abd7d249130938c8
```

The correction was deliberately minimal: one portable control-code case plus one
lease-field correction. A temporary automation result that reformatted the
entire fixture file was rejected rather than copied into the product branch.

Exact corrected protocol-head evidence:

- CI #333 / run `32797955050`: PASS;
- Harness #275 / run `32797955082`: PASS;
- Harness compatibility steps 6–11: all PASS.

Production implementation began only after this corrected exact head was dual
green.

The final runtime test does not merely type-assert that fixtures are validated.
Each portable case is serialized through M4-001 JSON loading, passed through the
real M4-002 schema validator, and only then supplied to diagnostics.

## 7. JavaScript/TypeScript runtime hardening

The normal input is an M4-002 frozen JSON snapshot, but direct runtime callers
may bypass that typed boundary. The accepted implementation therefore uses own
data-property descriptors for the narrow fields it inspects.

It reads only:

```text
policy.spec
policy.spec.rules
rule.id
rule.effect
rule.resources
rule.priority (optional)
```

It deliberately does not read `capabilities`, `subjects`, `constraints`, or
`lease` to avoid inventing later-gate semantics.

The accepted tests prove:

- top-level `spec` accessors are rejected without getter execution;
- `rules` accessors are rejected without getter execution;
- `id`, `effect`, `resources`, and `priority` accessors are rejected without
  getter execution;
- accessor-backed rule/resource array elements are rejected;
- sparse arrays are rejected;
- named and symbol array properties are rejected;
- revoked top-level, rules-array, and resources-array proxies fail explicitly;
- inherited required rule fields cannot become diagnostics input;
- deferred capability/subject/constraint/lease getters are never invoked;
- caller input is not mutated;
- success/failure objects are frozen;
- diagnostics arrays/findings/related-path arrays are detached and frozen;
- >256 findings are capped deterministically with truncation proven.

No filesystem, network, process, clock, randomness, locale, or Harness operation
is used by the production diagnostics path.

## 8. Green-head review did not stop at first success

Initial implementation head:

```text
d87ad0bbb2bc5e6baa6daa08a7203976e1e192cf
```

It was already dual-green:

- CI #334 / run `32798382514`: PASS;
- Harness #276 / run `32798382516`: PASS;
- 35 test files / 509 tests;
- M4-008 suite: 32 tests.

Acceptance review deliberately strengthened the test evidence instead of
accepting the first green head. The follow-up test-only commit added:

1. real M4-001 -> M4-002 -> M4-008 portable fixture flow;
2. nested revoked-proxy coverage;
3. inherited required-field rejection.

No production semantics changed in that hardening commit.

Final accepted implementation head:

```text
2aa8250f6c98b9853497481c08e584df866863ff
```

## 9. Exact-head normal CI evidence

CI #335 / run `32798605219`: **PASS**

Evidence:

- `pnpm install --frozen-lockfile`: PASS;
- supply-chain policy: PASS (124 entries);
- architecture boundaries: PASS;
- schema shape: PASS (16 schemas);
- schema compatibility baseline: PASS;
- strict workspace TypeScript: PASS;
- test files: 35 PASS;
- repository tests: **510 PASS**;
- M4-008 diagnostics suite: **33 PASS**;
- M4-007 explanation suite: 33 PASS;
- M4-006 default-deny suite: 35 PASS;
- M4-005 effect-resolution suite: 32 PASS;
- M4-004 rule-ordering suite: 19 PASS;
- M4-004 resource-pattern suite: 24 PASS;
- M4-003 resource-normalizer regressions: 38 + 2 PASS;
- M4-002 validator regressions: 6 PASS;
- M4-001 loader regressions: 18 PASS;
- oxlint: **0 warnings / 0 errors on 113 files**;
- packed Shared TCK + external non-workspace consumer: **44 assets PASS**.

## 10. Exact Harness source-conformance evidence

Harness rc5 source-conformance #277 / run `32798605222`: **PASS**

All compatibility steps 6–11 passed:

1. build pinned Harness public type surface;
2. install safe-runtime dependencies reproducibly;
3. project exact pinned Harness workspace packages;
4. verify projection idempotence;
5. typecheck real rc5 binding against pinned source;
6. execute real rc5 runtime conformance.

Harness remains compatibility evidence only.

## 11. Scope audit

M4-008 production work is limited to:

```text
specs/0024-m4-capability-policy-diagnostics.md
fixtures/policy-diagnostics/cases.json
packages/policy-engine/src/policy-diagnostics-types.ts
packages/policy-engine/src/policy-diagnostics.ts
packages/policy-engine/src/policy-diagnostics.test.ts
packages/policy-engine/src/resource-pattern.ts   # internal compiler reuse seam
packages/policy-engine/src/index.ts
docs/handoff/CURRENT.md
```

There is no dependency, lockfile, schema, protocol CapabilityDecision, Adapter,
full-PDP, approval, lease, receipt/provenance, guarantee, classifier, plugin,
hot-reload, or M6 implementation change.

## 12. Acceptance verdict

```text
M4-008 protocol-first profile: PASS
M4-008 corrected portable corpus: PASS (21 cases)
M4-008 implementation: ACCEPTED AT IMPLEMENTATION BOUNDARY
M4-008 runtime hardening: PASS
Normal CI #335: PASS
Harness #277: PASS
M4-009 authorization: PENDING FINAL M4-008 GOVERNANCE-HEAD DUAL-GREEN
M4-020+: NOT AUTHORIZED BY M4-008
M6: NOT AUTHORIZED
```

The implementation boundary is accepted. Governance must now record this
acceptance, and the final governance head must itself pass normal CI and exact
Harness rc5 source-conformance before M4-009 or another later gate begins.
