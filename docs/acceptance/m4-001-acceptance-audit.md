# M4-001 Acceptance Audit — Capability Policy Document Loader

Status: **ACCEPTED AT IMPLEMENTATION BOUNDARY**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-001 P0 — YAML/JSON loader`  
Audit closed: `2026-08-22`  
PR: `#3 — feat(policy): begin M4 capability broker`  
Accepted M3 base: `65870612d039ce026a6952c16d5e069b11bd24a7`  
Accepted implementation head: `9443d907b2b9db6819fe697a49abd6bf47bf1edf`  
Exact Harness compatibility baseline: `0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a`

This document is an acceptance record, not a normative specification. M4-001 is
accepted because the document-loading boundary defined by Spec 0017 has direct
fail-closed implementation and test evidence. This acceptance does **not** imply
that a successfully loaded value is a valid or authorized CapabilityPolicy.
Schema validation and all policy evaluation semantics remain later gates.

## 1. Authority and scope

The audit reconciles, in descending authority:

1. `specs/0017-m4-capability-policy-document-loader.md`;
2. existing M1 CapabilityPolicy normative semantics and schema;
3. language-independent sources under `fixtures/policy-loader/`;
4. `packages/policy-engine` loader implementation and tests;
5. exact-head normal CI evidence;
6. Harness rc5 source-conformance as compatibility evidence only.

DeepSeek Harness is not document-format or CapabilityPolicy authority. M4-001
contains no Harness parser, event, package type, approval, or execution semantic.

Explicitly out of scope and still unauthorized by this acceptance:

- M4-002 CapabilityPolicy schema validation;
- M4-003 canonical resource normalization;
- M4-004 deterministic rule ordering;
- M4-005 deny/ask/allow evaluation;
- M4-006 default deny;
- lease/approval routing and later Capability Broker gates;
- M6 Workspace Transaction behavior.

## 2. Loader contract audit

| Requirement | Result | Direct evidence |
| --- | --- | --- |
| Explicit JSON/YAML selection | **PASS** | loader dispatches only declared `JSON` or `YAML`; unsupported formats fail without sniffing |
| Detached JSON-compatible output | **PASS** | scalar/array/object projection only; repeated-load mutation test proves detachment |
| No M4-002 validation | **PASS** | syntactically valid non-CapabilityPolicy YAML loads successfully by test |
| JSON duplicate keys | **PASS** | custom recursive parser rejects before object materialization |
| JSON malformed/trailing input | **PASS** | strict parser boundary and negative fixtures/tests |
| YAML single document | **PASS** | multiple documents fail explicitly |
| YAML aliases/anchors | **PASS** | both alias and standalone-anchor fixtures fail closed |
| YAML explicit/custom tags | **PASS** | explicit tag metadata rejected |
| YAML merge keys | **PASS** | isolated merge-key fixture maps to the dedicated portable reason |
| YAML duplicate keys | **PASS** | parser error classification plus defensive projection check |
| YAML non-string keys | **PASS** | key node must resolve to a string without coercion |
| Non-JSON/non-finite values | **PASS** | scalar projection accepts only JSON-domain values and finite numbers |
| Prototype-safe object construction | **PASS** | `Object.fromEntries` plus `__proto__` regression proves ordinary own data without prototype mutation |
| Deterministic portable failures | **PASS** | fixed Spec 0017 reason vocabulary; parser diagnostics remain non-authoritative detail |

## 3. Untrusted-input resource-boundary audit

**PASS.** Defaults are finite and caller overrides must be positive safe integers:

```text
maxSourceBytes:       1,048,576
maxDepth:             64
maxContainerEntries:  100,000
```

JSON checks byte length before recursive parsing and enforces depth/entry budgets
while constructing the value.

YAML applies two layers of protection:

1. byte length is checked before parser invocation;
2. the public `yaml` Parser CST is traversed iteratively before Composer runs,
   enforcing nesting depth and semantic container-entry budgets against
   attacker-controlled structure;
3. AST-to-JSON projection independently rechecks depth and container entries as
   defense in depth.

The CST accounting is aligned to upstream parser structure: block sequences and
flow collections expose one CST item per semantic member, while block maps may
contain comment-only bookkeeping items that do not consume the semantic entry
budget. The preflight therefore does not confuse parser punctuation/comments
with policy container entries.

Regression coverage includes:

- source-byte limit;
- ordinary block depth limit;
- 512-level flow nesting;
- 256-level block nesting;
- oversized 512-item flow fan-out against a 64-entry budget;
- ordinary container-entry overflow.

All limit failures map to `POLICY_DOCUMENT_LIMIT_EXCEEDED` and return no partial
loaded document.

## 4. Parser and supply-chain audit

**PASS.** General YAML syntax is delegated to exact-pinned `yaml@2.9.0`; the
repository lockfile is synchronized and frozen-install validation remains active.
The loader then narrows the parser output to the smaller Spec 0017 portable
profile rather than accepting the parser's full feature set.

The implementation does not enable custom constructors, tag handlers, merge
semantics, includes, interpolation, filesystem access, network access, or code
execution. TypeScript strictness is retained; YAML AST values are narrowed through
public parser type guards rather than `any` escape hatches.

## 5. Portable fixture audit

`fixtures/policy-loader/cases.json` registers language-independent source cases
for:

- valid equivalent JSON and YAML documents;
- duplicate JSON and YAML keys;
- multiple YAML documents;
- YAML alias;
- standalone YAML anchor;
- YAML custom tag;
- YAML merge key;
- YAML non-string key;
- malformed JSON and YAML.

The merge fixture is intentionally isolated from anchor semantics so the expected
`POLICY_DOCUMENT_YAML_MERGE_FORBIDDEN` reason cannot be masked by an unrelated
anchor rejection.

## 6. Exact implementation-head evidence

Accepted implementation head:

```text
9443d907b2b9db6819fe697a49abd6bf47bf1edf
```

| Gate | State | Evidence |
| --- | --- | --- |
| Normal CI | **PASS** | CI #248 / run `32582943266` |
| Frozen install | **PASS** | `pnpm install --frozen-lockfile` |
| Supply-chain policy | **PASS** | 124 lockfile entries verified |
| Architecture boundaries | **PASS** | boundary verification |
| Schema shape | **PASS** | 16 schemas |
| Schema compatibility baseline | **PASS** | unchanged compatibility gate |
| Strict TypeScript | **PASS** | `packages/policy-engine` and workspace typechecks |
| Repository tests | **PASS** | 26 files / 288 tests |
| M4-001 loader tests | **PASS** | 18 tests |
| JSON parser tests | **PASS** | 9 tests |
| Lint | **PASS** | 0 warnings / 0 errors |
| Testkit package boundary | **PASS** | 44 registered assets + external non-workspace consumer |
| Exact Harness rc5 source-conformance | **PASS** | Harness #192 / run `32582943175` |
| Pinned Harness public-type build | **PASS** | step 6 |
| Reproducible safe-runtime install | **PASS** | step 7 |
| Exact workspace projection | **PASS** | step 8 |
| Projection idempotence | **PASS** | step 9 |
| Exact rc5 binding typecheck | **PASS** | step 10 |
| Real rc5 runtime conformance | **PASS** | step 11 |

No schema, validator, TypeScript strictness, test expectation, frozen lockfile,
architecture boundary, supply-chain policy, compatibility check, or security
claim was weakened to obtain this result.

## 7. Acceptance verdict

```text
M4-001 normative loader contract: PASS
M4-001 portable fixtures: PASS
M4-001 implementation: PASS
M4-001 untrusted-input limits: PASS
M4-001 exact-head CI: PASS
M4-001 Harness compatibility: PASS
M4-001: ACCEPTED AT IMPLEMENTATION BOUNDARY
M4-002: NEXT GATE ONLY AFTER FINAL GOVERNANCE HEAD IS DUAL-GREEN
M4-003+: NOT AUTHORIZED
M6: NOT AUTHORIZED
```

## 8. Next-gate constraint

After this acceptance record, governance tracking may mark only `M4-001` done.
The resulting final governance head must itself pass normal CI and exact Harness
rc5 source-conformance before M4-002 work begins.

M4-002 must start protocol-first. In particular, it must explicitly reconcile the
existing boundary between the current CapabilityPolicy schema (which requires
`spec.defaultEffect` with value `deny`) and Core normative prose (which states
that a missing `defaultEffect` must deny). That semantic question must not be
silently resolved inside validator implementation.
