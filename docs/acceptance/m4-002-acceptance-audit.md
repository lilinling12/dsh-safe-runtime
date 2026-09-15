# M4-002 Acceptance Audit — CapabilityPolicy Schema Validation

Status: **ACCEPTED AT IMPLEMENTATION BOUNDARY**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-002 P0 — schema validation`  
Audit closed: `2026-08-23`  
PR: `#3 — feat(policy): begin M4 capability broker`  
Accepted M3 base: `65870612d039ce026a6952c16d5e069b11bd24a7`  
Accepted M4-001 governance head: `129e147b1bfe84d6eadf289f3b097f526d2fad63`  
Accepted implementation head: `7b87c812fafab860d5ee95bebdfc706ec6e2ba06`  
Exact Harness compatibility baseline: `0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a`

This document is an acceptance record, not a normative specification. M4-002 is
accepted because the schema-conformance boundary defined by Spec 0018 has direct,
fail-closed implementation and exact-head evidence. This acceptance means only
that a detached snapshot conforms to the current CapabilityPolicy JSON Schema.
It does **not** mean the policy authorizes an action, is canonically normalized,
has deterministic rule precedence, or has been evaluated.

## 1. Authority and scope

The audit reconciles, in descending authority:

1. `specs/0018-m4-capability-policy-schema-validation.md`;
2. `schemas/v1alpha1/capability-policy.schema.json` and its root-reachable
   repository-controlled `$ref` graph;
3. existing M1 CapabilityPolicy/Core semantics, including the fail-closed
   `defaultEffect` invariant;
4. language-independent fixtures under `fixtures/policy-schema/`;
5. `packages/policy-engine` validator implementation and tests;
6. exact-head normal CI evidence;
7. Harness rc5 source-conformance as compatibility evidence only.

DeepSeek Harness remains an Adapter compatibility target and does not define
CapabilityPolicy schema or policy semantics.

Explicitly out of scope and still unauthorized by this acceptance:

- M4-003 canonical resource normalization;
- M4-004 deterministic rule ordering;
- M4-005 deny/ask/allow evaluation;
- M4-006 default-deny evaluation;
- M4-007 explain API and later policy diagnostics/hot reload;
- tool classification, PDP routing, lease consumption, approval routing;
- Harness plugin registration;
- M6 Workspace Transaction semantics.

## 2. Normative boundary audit

| Requirement | Result | Direct evidence |
| --- | --- | --- |
| Draft 2020-12 semantics | **PASS** | validator constructs `Ajv2020`; trusted schemas must declare the Draft 2020-12 meta-schema |
| Exact CapabilityPolicy root identity | **PASS** | trusted graph requires the repository root `$id` and definitions `$id` |
| Repository-controlled `$ref` resolution | **PASS** | local definitions schema is registered before root compilation; no policy-supplied schema path exists |
| No source parsing in M4-002 | **PASS** | validator accepts only the M4-001 JSON-compatible value boundary |
| Non-mutating validation | **PASS** | coercion/default insertion/property removal are disabled; regression tests compare input before/after |
| No `defaultEffect` synthesis | **PASS** | missing field remains invalid and reports `/spec/defaultEffect` + `required` |
| Existing schema not weakened | **PASS** | M4-002 changes add no modification to `capability-policy.schema.json`; current field remains required and `const: deny` |
| Detached success snapshot | **PASS** | successful output is recursively cloned, not shared with the input |
| Recursive immutability | **PASS** | every returned object/array is frozen; recursive regression test covers nested lease policy |
| Prototype-safe cloning | **PASS** | `Object.fromEntries` preserves `__proto__` as own data without prototype mutation |
| Portable invalid reason | **PASS** | schema invalidity returns only `POLICY_SCHEMA_INVALID` at the top-level portable reason boundary |
| Required/additional path normalization | **PASS** | missing/unexpected properties are normalized to the property itself using RFC 6901 escaping |
| Deterministic issue ordering | **PASS** | issues sort by `instancePath`, then `keyword`, then `schemaPath`; repeated validation regression is identical |
| Configuration failure is distinct | **PASS** | broken trusted schema graph raises `POLICY_SCHEMA_CONFIGURATION_ERROR`, never policy-valid or `POLICY_SCHEMA_INVALID` |
| No runtime network schema fetch | **PASS** | validator receives a trusted in-memory graph and configures no remote schema loader |
| No M4-003+ transformation | **PASS** | successful type remains generic validated JSON data; no resource normalization, ordering, effect or evaluation code exists in the M4-002 diff |

## 3. `defaultEffect` reconciliation audit

**PASS.** Spec 0018 resolves the previously recorded schema/prose boundary without
weakening either trust boundary:

```text
untrusted document
    ↓
M4-001 load
    ↓
M4-002 schema validation
    │   missing defaultEffect => POLICY_SCHEMA_INVALID
    ↓
validated snapshot
    ↓
later evaluator
        defensive invariant: missing defaultEffect must still never become allow
```

The current v0.1 schema continues to require `spec.defaultEffect` and constrains
it to `deny`. M4-002 neither inserts the field nor treats a missing field as
schema-valid. Core §8.3's missing-value fail-closed behavior remains a later
evaluator invariant that M4-006 must preserve defensively.

## 4. Strict validator and trusted schema graph audit

**PASS.** The reference validator is created with a strict profile and explicitly
disables data-changing features:

```text
allErrors: true
coerceTypes: false
removeAdditional: false
strict: true
useDefaults: false
validateSchema: true
```

The validator factory compiles the trusted graph once per constructed validator
and the returned validation function performs no filesystem or network I/O. The
schema-resource loading concern is intentionally outside the untrusted policy
validation path.

The current CapabilityPolicy root's external `$ref` reaches
`defs.schema.json#/$defs/leaseRequest`. That reachable definition contains no
`format` assertion, so `@dsh-safe/policy-engine` does not require
`ajv-formats` at runtime for M4-002. The package therefore exact-pins only the
runtime validator (`ajv@8.20.0`) in addition to the already accepted YAML loader.
The repository root may retain `ajv-formats` for other tooling; it is not a
policy-engine runtime dependency.

This conclusion is intentionally scoped to the current root-reachable schema. If
a future normative CapabilityPolicy revision references a definition requiring a
format such as `date-time`, that revision must provide strict format semantics and
new conformance evidence rather than silently ignoring the assertion.

## 5. Portable fixture audit

`fixtures/policy-schema/cases.json` registers 16 language-independent cases:

### Valid

- minimal current v0.1 CapabilityPolicy with `defaultEffect: deny`;
- policy using the referenced lease-request schema.

### Invalid

- missing `defaultEffect`;
- non-deny `defaultEffect`;
- wrong `apiVersion`;
- wrong `kind`;
- empty metadata name;
- missing metadata name;
- unknown top-level property;
- unknown `spec` property;
- rule missing `resources`;
- unknown rule effect;
- duplicate capability;
- duplicate resource;
- invalid lease value;
- additional rule property.

Each negative portable case records `POLICY_SCHEMA_INVALID` plus the expected
normalized affected path and failed keyword. Reference tests additionally require
all returned issues to carry a non-empty `schemaPath`.

The fixtures are already parsed JSON-domain documents at the M4-002 semantic
boundary. Loader syntax failures remain owned by M4-001 and are not relabeled as
schema failures.

## 6. Reference implementation audit

The implementation keeps the security and architecture boundary narrow:

- `trusted-policy-schema.ts` binds exact trusted `$schema` / `$id` identities and
  performs no filesystem/network access;
- `capability-policy-schema-validator.ts` owns strict Ajv compilation,
  validation, portable issue normalization and deterministic sorting;
- `policy-schema-types.ts` owns the portable result types, configuration error,
  detached cloning and recursive freezing;
- no `any` escape hatch is introduced;
- no TypeScript strictness or architecture rule is weakened;
- `@dsh-safe/policy-engine` remains independent of DeepSeek Harness concrete
  types and runtime APIs.

A diff from accepted M4-001 governance head `129e147b...` to accepted M4-002
implementation head `7b87c812...` contains only Spec 0018, portable M4-002
fixtures, validator/types/trusted-schema code and tests, package export/dependency
updates, and synchronized lockfile changes. No M4-003+ implementation is present.

## 7. Exact implementation-head evidence

Accepted implementation head:

```text
7b87c812fafab860d5ee95bebdfc706ec6e2ba06
```

Normal CI #260 / run `32603117802`:

| Gate | State | Evidence |
| --- | --- | --- |
| Frozen install | **PASS** | `pnpm install --frozen-lockfile` |
| Supply-chain policy | **PASS** | 124 lockfile entries verified |
| Architecture boundaries | **PASS** | boundary verification |
| Schema shape | **PASS** | 16 schemas |
| Schema compatibility baseline | **PASS** | existing baseline unchanged |
| Strict workspace TypeScript | **PASS** | workspace typechecks, including `policy-engine` |
| Repository tests | **PASS** | 27 files / 294 tests |
| M4-002 validator tests | **PASS** | 6 tests |
| M4-001 loader regressions | **PASS** | 18 tests |
| JSON parser regressions | **PASS** | 9 tests |
| Lint | **PASS** | 0 warnings / 0 errors |
| Testkit package boundary | **PASS** | 44 registered assets + external non-workspace consumer |

Exact Harness rc5 source-conformance #204 / run `32603117850`:

| Step | State |
| --- | --- |
| Build pinned Harness public type surface | **PASS** |
| Install safe-runtime dependencies reproducibly | **PASS** |
| Project exact pinned Harness workspace packages | **PASS** |
| Verify projection idempotence | **PASS** |
| Typecheck real rc5 binding against pinned source | **PASS** |
| Execute real rc5 runtime conformance | **PASS** |

No schema, validator, fixture expectation, TypeScript strictness, test, frozen
lockfile requirement, architecture boundary, supply-chain policy, compatibility
gate, or security claim was weakened to obtain this result.

## 8. Acceptance verdict

```text
M4-002 normative schema-validation contract: PASS
M4-002 defaultEffect reconciliation: PASS
M4-002 portable fixtures: PASS
M4-002 strict validator profile: PASS
M4-002 detached immutable snapshot boundary: PASS
M4-002 deterministic diagnostics: PASS
M4-002 trusted local schema graph / no runtime network fetch: PASS
M4-002 implementation scope: PASS
M4-002 exact-head CI: PASS
M4-002 Harness compatibility: PASS
M4-002: ACCEPTED AT IMPLEMENTATION BOUNDARY
M4-003: NEXT GATE ONLY AFTER FINAL GOVERNANCE HEAD IS DUAL-GREEN
M4-004+: NOT AUTHORIZED
M6: NOT AUTHORIZED
```

## 9. Next-gate constraint

Governance tracking may now mark only `M4-002` complete. The final governance
head containing this acceptance record, package stage, roadmap, current handoff,
append-only history and PR description must itself pass normal CI and exact
Harness rc5 source-conformance before M4-003 production work begins.

The next and only potentially authorized implementation gate after that final
dual-green is:

```text
M4-003 P0 — canonical resource normalization
```

M4-003 must begin protocol-first. It must not infer normalization semantics from
Harness behavior or from incidental TypeScript representation details, and it
must not start M4-004 ordering or M4-005/006 evaluation early.
