# M4-008 — Deterministic CapabilityPolicy Diagnostics

> Status: DRAFT NORMATIVE M4 PROFILE  
> Milestone: `M4 — Capability Broker v0.1`  
> Gate: `M4-008 P1 — policy diagnostics`

This specification defines a deterministic, machine-readable diagnostics layer
for authoring and preflight inspection of a CapabilityPolicy that has already
passed M4-002 schema validation.

M4-008 is deliberately **not** another validator, compiler, PDP, or authorization
gate. A diagnostic never changes whether M4-002 accepts a document, how M4-003
normalizes a resource selector, how M4-004 orders rules, how M4-005 resolves an
effect, how M4-006 fails closed, or how M4-007 explains the resulting effect.

## 1. Authority and reconciliation

M4-008 refines only the diagnostics boundary established by:

1. `specs/0018-m4-capability-policy-schema-validation.md`;
2. `specs/0019-m4-canonical-resource-normalization.md`;
3. `specs/0020-m4-deterministic-rule-ordering.md`;
4. `specs/0021-m4-effect-resolution.md`;
5. `specs/0022-m4-defensive-default-deny.md`;
6. `specs/0023-m4-policy-effect-explanation.md`;
7. `schemas/v1alpha1/capability-policy.schema.json`.

DeepSeek Harness remains Adapter compatibility evidence only and does not define
policy diagnostics.

The accepted lower-level contracts remain authoritative. M4-008 MUST reuse their
portable failure/redundancy facts rather than inventing a second interpretation
of resource selectors, wildcard syntax, priority, or effect precedence.

## 2. Design goals

M4-008 exists to make policy authoring and deployment preflight safer without
coupling operator feedback to the authorization path.

It MUST provide:

- deterministic structured diagnostics;
- stable severity and machine-readable codes;
- RFC 6901 source locations;
- bounded output;
- privacy-preserving output that does not copy resource strings, constraints,
  secrets, or free-form policy source;
- safe runtime handling when JavaScript callers bypass the typed/validated path.

It MUST NOT provide:

- authorization decisions;
- policy mutation or auto-fix;
- schema default insertion or coercion;
- subject resolution;
- capability matching;
- arbitrary constraint interpretation;
- lease semantics;
- approval semantics;
- guarantee assignment;
- decision receipts or durable provenance;
- hot reload or atomic swap;
- Adapter/Harness enforcement;
- request-dependent shadowing/unreachability analysis that requires M4-021.

## 3. Input boundary

The normal logical input is the detached immutable `ValidatedPolicyDocument`
produced by successful M4-002 validation.

```text
M4-001 load
  -> M4-002 schema validation
  -> validated snapshot
  -> M4-008 diagnostics
```

M4-008 MUST NOT accept a schema-invalid document and relabel schema errors as
policy diagnostics. M4-002 remains the only authority for schema conformance.

A runtime implementation MAY expose an `unknown` input for fail-closed API
safety, but it MUST require the narrow fields needed by diagnostics to be own
data properties with the expected JSON data shape. If that boundary cannot be
safely materialized, diagnostics fail with:

```text
POLICY_DIAGNOSTICS_INPUT_INVALID
```

That top-level failure is an API/runtime failure, not a diagnostic about policy
authoring.

## 4. Diagnostics are non-authoritative

A diagnostics result MUST NOT be used as an authorization result.

In particular:

- zero diagnostics does not prove a request is allowed;
- an `ERROR` diagnostic does not itself deny a request;
- a `WARNING` or `INFO` diagnostic does not weaken fail-closed behavior;
- callers MUST NOT bypass M4-002/M4-003/M4-004/M4-005/M4-006 because diagnostics
  appeared clean;
- M4-009 hot reload MUST rely on the authoritative policy-processing gates, not
  on absence of diagnostics alone.

`severity` describes operator attention, not authorization precedence.

## 5. Portable result contract

### 5.1 Success

```text
PolicyDiagnostics {
  status: "DIAGNOSED"
  diagnostics: [PolicyDiagnostic, ...]
  truncated: boolean
}
```

The TypeScript projection MAY add `ok: true` as a language-level discriminant.

### 5.2 Failure

```text
PolicyDiagnosticsFailure {
  status: "DIAGNOSTICS_FAILED"
  reason: "POLICY_DIAGNOSTICS_INPUT_INVALID"
}
```

The TypeScript projection MAY add `ok: false`.

A failure MUST NOT return a partial diagnostics array.

### 5.3 Diagnostic shape

```text
PolicyDiagnostic {
  severity: "ERROR" | "WARNING" | "INFO"
  code: string
  instancePath: string
  relatedPaths?: [string, ...]
}
```

`instancePath` and every `relatedPaths` entry MUST be RFC 6901 JSON Pointers into
the validated policy document.

Portable output contains no free-form human message. Human-readable or localized
text belongs to a presentation layer keyed by `code`.

## 6. Built-in v0.1 diagnostics

M4-008 v0.1 has a deliberately small built-in rule set. It reports only facts
that can already be justified by accepted M4 semantics.

### 6.1 Resource selector diagnostics — ERROR

Every `spec.rules[i].resources[j]` selector MUST be inspected with the accepted
M4-003 selector normalizer.

If normalization fails, M4-008 preserves the existing portable reason as the
diagnostic `code` at that exact resource array element path.

Applicable codes are:

```text
RESOURCE_SCHEME_UNSUPPORTED
RESOURCE_LOCATOR_INVALID
RESOURCE_SELECTOR_SYNTAX_INVALID
RESOURCE_LIMIT_EXCEEDED
```

A reference implementation MUST NOT duplicate M4-003 parsing rules by hand.

`RESOURCE_INPUT_INVALID` and `RESOURCE_PROVIDER_IDENTITY_INVALID` are not normal
policy-selector diagnostics because successful M4-002 validation already makes
`resources[]` elements strings and policy selectors carry no provider identity.
If the runtime input violates that prerequisite, the top-level result is
`POLICY_DIAGNOSTICS_INPUT_INVALID`.

### 6.2 Resource pattern syntax — ERROR

After M4-003 accepts a selector, its locator pattern MUST be inspected with the
accepted M4-004 pattern compiler/profile.

If the accepted v0.1 pattern profile rejects it, M4-008 reports:

```text
severity: "ERROR"
code: "RESOURCE_PATTERN_SYNTAX_INVALID"
instancePath: /spec/rules/<i>/resources/<j>
```

The reference implementation MUST reuse/factor the accepted M4-004 compiler. It
MUST NOT maintain a second `**` syntax implementation inside the diagnostics
module.

Refactoring a private compiler helper for reuse is allowed only if existing
M4-004 observable behavior and fixtures remain unchanged.

### 6.3 Duplicate rule identifier — WARNING

If two or more rules use exactly the same rule `id`, every occurrence after the
first is diagnosed as:

```text
severity: "WARNING"
code: "POLICY_DIAGNOSTIC_DUPLICATE_RULE_ID"
instancePath: /spec/rules/<later>/id
relatedPaths: ["/spec/rules/<first>/id"]
```

Comparison is exact Unicode code-point/string equality. No case folding or
Unicode normalization is permitted.

This is an authoring ambiguity warning, not a new schema-invalid condition.
M4-004 already rejects duplicate rule IDs when they coexist in one ordering
invocation, and later decision provenance needs stable rule identity. M4-008 does
not speculate about request-dependent full applicability.

For three or more occurrences, each later diagnostic relates to the first
occurrence only. This keeps output bounded and deterministic.

### 6.4 Redundant priority on explicit deny — WARNING

M4-005 gives every fully-applicable explicit deny global precedence over
specificity, numeric priority, ask, and allow. M4-007 likewise reports every
fully-applicable deny contributor independently of its structural band.

Therefore an explicit `priority` field on a rule whose effect is `deny` cannot
change the v0.1 policy effect once that rule is fully applicable.

M4-008 reports:

```text
severity: "WARNING"
code: "POLICY_DIAGNOSTIC_REDUNDANT_DENY_PRIORITY"
instancePath: /spec/rules/<i>/priority
```

This warning does not remove or rewrite the field.

### 6.5 Explicit zero priority — WARNING

For an `allow` or `ask` rule, M4-004 defines absent priority and explicit
`priority: 0` as the same comparison-time value.

M4-008 reports:

```text
severity: "WARNING"
code: "POLICY_DIAGNOSTIC_REDUNDANT_ZERO_PRIORITY"
instancePath: /spec/rules/<i>/priority
```

A deny rule with `priority: 0` receives only
`POLICY_DIAGNOSTIC_REDUNDANT_DENY_PRIORITY`; implementations MUST NOT emit both
warnings for the same field.

Non-zero priority on `allow` or `ask` is not diagnosed by this rule.

### 6.6 Empty rule set — INFO

The current CapabilityPolicy schema permits an empty `spec.rules` array. With no
applicable rules, M4-005 returns `NO_APPLICABLE_RULES`, and M4-006 finalizes the
required `defaultEffect: deny`.

M4-008 reports this authoring fact as:

```text
severity: "INFO"
code: "POLICY_DIAGNOSTIC_EMPTY_RULE_SET"
instancePath: /spec/rules
```

The diagnostic does not claim that a later lease/delegation/PDP composition has
already been evaluated.

## 7. Deliberately deferred diagnostics

M4-008 MUST NOT diagnose any of the following in v0.1 because the required
semantics are not yet owned by this gate:

- subject reachability or overlap;
- capability overlap or complete rule applicability;
- constraint satisfiability;
- lease redundancy, attenuation, expiry, or consumption;
- approval reachability;
- request-dependent rule shadowing;
- complete-policy allow/deny reachability;
- guarantee strength;
- Adapter enforcement coverage;
- provider containment;
- network/DNS/URL equivalence;
- secret resolution;
- persisted `matchedRuleRefs`/decision provenance.

These require M4-020+ or provider-specific authority. A diagnostics layer MUST
not create speculative security semantics simply because a warning would be
convenient.

## 8. Deterministic ordering

Diagnostics MUST be emitted in this exact source traversal order:

1. policy-level `POLICY_DIAGNOSTIC_EMPTY_RULE_SET`, when applicable;
2. rules by numeric array index ascending;
3. inside one rule:
   1. duplicate `id` warning;
   2. resource selectors by numeric array index ascending;
   3. priority advisory, if any.

At most one selector diagnostic is emitted for one resource array element: the
first authoritative failure in the accepted M4-003 -> M4-004 sequence.

Ordering exists only for deterministic presentation and bounded truncation. Rule
array order MUST NOT become authorization precedence.

`relatedPaths` MUST be detached and deterministically ordered. The current
v0.1 duplicate-ID rule emits exactly one related path.

## 9. Bounded output

The portable default diagnostics limit is:

```text
256 diagnostics
```

A conforming implementation MUST stop collecting once a 257th diagnostic would
be emitted and return:

```text
truncated: true
```

If no additional diagnostic exists:

```text
truncated: false
```

The implementation MAY stop scanning once truncation is proven. It MUST NOT
allocate output proportional to an attacker-controlled number of possible
findings after the limit is reached.

The hard limit is part of portable v0.1 behavior. A future configurable profile
requires a separate specification; M4-008 does not accept an unbounded caller
limit.

## 10. JavaScript/TypeScript runtime hardening

The normal input is an M4-002 frozen JSON snapshot. Nevertheless direct runtime
callers may bypass that boundary.

The TypeScript reference implementation MUST:

- read required policy/spec/rule fields through own data-property descriptors;
- reject accessor-backed required fields without invoking getters;
- reject sparse/accessor-backed rules/resources arrays;
- reject unexpected named/symbol properties on arrays;
- treat descriptor/proxy failures as `POLICY_DIAGNOSTICS_INPUT_INVALID`;
- avoid reading ignored subject/constraint/lease values merely to produce
  diagnostics;
- not mutate the caller document;
- return frozen success/failure objects;
- return a frozen detached diagnostics array;
- freeze each diagnostic and `relatedPaths` array;
- execute no filesystem, network, process, clock, randomness, locale, or Harness
  operation.

M4-008 MUST NOT re-run the full JSON Schema validator internally. Its runtime
shape checks only protect the diagnostics API from unsafe direct calls; M4-002
remains schema authority.

## 11. Privacy and disclosure

Portable diagnostics expose only severity, stable code, JSON Pointer locations,
and optional related JSON Pointer locations.

They MUST NOT copy into output:

- resource selector strings;
- capabilities;
- subjects;
- constraints;
- lease contents;
- secret references or secret values;
- policy source text;
- absolute host paths;
- stack traces;
- library-specific error objects.

A UI may dereference a JSON Pointer against policy content already available to
that authorized user, but the diagnostics engine itself does not duplicate
potentially sensitive content.

## 12. Relationship to M4-009 hot reload

M4-009 may use diagnostics to give operators useful feedback during reload, but
absence/presence of M4-008 diagnostics MUST NOT replace authoritative load,
schema, normalization, pattern, and later evaluation validation.

An atomic-swap implementation must retain the last known-good policy when the
new policy fails an authoritative gate. M4-008 itself neither swaps policies nor
defines that behavior.

## 13. Portable fixture requirements

Language-independent fixtures MUST cover at least:

- valid policy with no diagnostics;
- empty rule set info;
- duplicate rule ID and first-occurrence related path;
- exact duplicate non-ASCII rule ID;
- differently-cased IDs not treated as duplicates;
- missing resource selector delimiter;
- unsupported/differently-cased resource scheme;
- empty locator pattern;
- control code point in locator pattern;
- invalid embedded `**`;
- invalid triple `***`;
- valid literal `?`, brackets, braces and backslash remaining undiagnosed by the
  M4-004 syntax rule;
- positive/negative/zero priority on deny producing exactly one deny-priority
  warning;
- zero priority on allow;
- zero priority on ask;
- non-zero priority on allow/ask producing no priority warning;
- deterministic multi-diagnostic source traversal order;
- ignored subjects/constraints/lease fields not acquiring premature diagnostics.

The TypeScript suite MUST additionally generate a >256-diagnostic policy to prove
truncation and cover accessor/proxy/sparse/named/symbol-array boundaries, input
non-mutation, frozen detached outputs, and absence of getter execution.

## 14. M4-008 acceptance boundary

M4-008 can be accepted only when one exact implementation head proves:

1. this profile and portable fixtures exist before production implementation;
2. diagnostics consume an M4-002 validated snapshot boundary and do not become a
   replacement schema validator;
3. M4-003 selector failures retain their accepted portable reason codes;
4. M4-004 pattern syntax is reused/factored, not duplicated;
5. duplicate IDs use exact comparison and remain an authoring warning rather
   than a new schema-invalid rule;
6. deny-priority and zero-priority warnings are justified only by already
   accepted M4-004/M4-005 semantics;
7. no M4-020+ subject/capability/constraint/lease/approval/full-PDP semantics are
   implemented early;
8. diagnostic order and 256-item truncation are deterministic;
9. output does not copy policy resource/subject/constraint/secret content;
10. JavaScript runtime inputs cannot trigger getters while being inspected;
11. diagnostics and related path arrays are detached/frozen and caller input is
    not mutated;
12. no filesystem/network/process/time/random/Harness dependency enters the
    diagnostics implementation;
13. no schema, validator, M4-003/M4-004/M4-005/M4-006/M4-007 behavior,
    TypeScript strictness, frozen lockfile, supply-chain policy, architecture
    boundary, TCK, or compatibility gate is weakened;
14. exact-head normal CI and exact Harness rc5 source-conformance are both green.

After implementation acceptance, the governance head recording M4-008 must itself
reach exact-head normal-CI + Harness dual-green before M4-009 or another later M4
gate is authorized.
