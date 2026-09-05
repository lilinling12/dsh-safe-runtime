# M4-002 CapabilityPolicy Schema Validation

Status: **SPECIFIED**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-002 P0 — schema validation`  
Normative schema: `schemas/v1alpha1/capability-policy.schema.json`  
Schema dialect: **JSON Schema Draft 2020-12**

This specification defines the boundary between the M4-001 portable document
loader and later CapabilityPolicy processing. It does not define resource
normalization, rule ordering, policy evaluation, approval, leases, or Harness
integration.

Normative terms **MUST**, **MUST NOT**, **SHOULD**, and **MAY** have their usual
RFC 2119 / RFC 8174 meanings.

---

## 1. Authority and inputs

M4-002 validates a JSON-compatible value produced by the successful M4-001
loader against the repository's normative CapabilityPolicy schema:

```text
schemas/v1alpha1/capability-policy.schema.json
```

The validator MUST use JSON Schema Draft 2020-12 semantics and MUST resolve the
schema's repository-controlled `$ref` dependencies by their declared `$id`.

M4-002 MUST NOT reinterpret YAML or JSON source text. Parsing, duplicate-key
handling, YAML restrictions, and loader resource limits remain M4-001 concerns.

The logical input is:

```text
PolicyDocumentJsonValue
```

A successful M4-001 load does **not** imply M4-002 validity.

---

## 2. Validation is non-mutating

Schema validation MUST NOT mutate the input value.

In particular, a conforming implementation MUST NOT:

- coerce scalar types;
- insert schema defaults;
- remove additional properties;
- rename properties;
- normalize resources;
- reorder rules or arrays;
- translate effects;
- synthesize `defaultEffect`;
- otherwise make an invalid document valid by editing it.

A document either satisfies the normative schema as supplied to this gate or it
fails validation.

---

## 3. Successful output is a validated snapshot

On success, the validator MUST return a detached JSON-compatible snapshot of the
validated document.

The returned snapshot MUST:

1. contain the same JSON data as the validated input;
2. share no mutable object/array identity with the input;
3. contain only ordinary JSON-compatible objects, arrays and scalars;
4. be immutable to the extent supported by the implementation language/runtime;
5. preserve object keys exactly, including keys such as `__proto__` as ordinary
   data;
6. perform no M4-003 canonicalization or later semantic transformation.

For JavaScript/TypeScript implementations, every returned object and array in the
validated snapshot MUST be frozen recursively. The snapshot MAY be represented by
a language-specific typed view, but such typing MUST NOT add semantics beyond the
normative schema.

This snapshot boundary prevents a caller from validating one object and then
mutating that same object into a different policy before the next processing
stage.

---

## 4. Invalid result

A schema-invalid document MUST return a fail-closed result and MUST NOT return a
validated snapshot.

The portable top-level reason is:

```text
POLICY_SCHEMA_INVALID
```

The failure MUST include one or more normalized issues. Each issue MUST contain:

```text
instancePath
keyword
schemaPath
```

where:

- `instancePath` is an RFC 6901 JSON Pointer identifying the affected document
  location as precisely as the validator can determine;
- `keyword` is the JSON Schema keyword whose assertion failed;
- `schemaPath` is the JSON Pointer/URI fragment identifying the failed assertion
  in the normative schema graph.

Implementations MAY include a human-readable diagnostic message, but message text
is non-normative and MUST NOT be required for portable conformance.

Library-specific error objects, arbitrary parameter maps, stack traces, absolute
host paths, and internal schema-loader state MUST NOT become the portable result
contract.

### 4.1 Required-property path normalization

For a failed `required` assertion, the normalized `instancePath` MUST point to the
missing property rather than only its parent object.

Example:

```text
parent instance path: /spec
missing property:     defaultEffect
normalized path:      /spec/defaultEffect
```

The property segment MUST be escaped according to RFC 6901.

### 4.2 Additional-property path normalization

For a failed `additionalProperties` assertion, the normalized `instancePath`
MUST point to the unexpected property itself, using RFC 6901 escaping.

This keeps diagnostics deterministic and useful without making a particular JSON
Schema library's raw parameter object normative.

### 4.3 Deterministic issue ordering

When more than one issue exists, issues MUST be sorted lexicographically by:

1. normalized `instancePath`;
2. `keyword`;
3. `schemaPath`.

Two conforming implementations validating the same document against the same
schema graph MUST therefore expose the same issue ordering whenever they report
the same failed assertions.

---

## 5. Schema configuration failures are not policy failures

The CapabilityPolicy schema and its referenced schemas are repository-controlled
runtime configuration, not attacker-controlled policy input.

Failure to compile the schema graph, resolve a required `$ref`, select Draft
2020-12 semantics, or initialize the validator MUST fail the validator boundary
closed and MUST be distinguishable from `POLICY_SCHEMA_INVALID`.

An implementation MUST NOT report a policy as valid when validator initialization
is unavailable or broken.

A JavaScript/TypeScript implementation SHOULD compile the repository-controlled
schema graph once and reuse the compiled validator rather than recompiling it for
each untrusted policy document.

---

## 6. `defaultEffect` reconciliation

There is no permission in M4-002 to weaken the existing v0.1 schema.

The current normative CapabilityPolicy schema requires:

```text
spec.defaultEffect
```

and constrains its value to:

```text
deny
```

Therefore, at the **document/schema conformance boundary** defined by M4-002:

- a missing `spec.defaultEffect` is schema-invalid;
- `spec.defaultEffect: allow` is schema-invalid;
- `spec.defaultEffect: ask` is schema-invalid;
- `spec.defaultEffect: deny` satisfies this field's schema assertion.

Core §8.3 separately states that an evaluator MUST treat a missing
`defaultEffect` as deny. That requirement is a **fail-closed evaluation
invariant**, not permission for the schema validator to synthesize the field or
accept a schema-invalid document.

The two requirements apply at different trust boundaries:

```text
untrusted document
    ↓
M4-001 parse/load
    ↓
M4-002 schema conformance
    │   missing defaultEffect => INVALID
    ↓
validated snapshot
    ↓
later evaluator
        defensive invariant: if an unvalidated/internal object somehow lacks
        defaultEffect, it still MUST NOT become allow; it is treated as deny
```

M4-006 or the later evaluation gate MUST preserve that defensive Core invariant.
M4-002 MUST NOT implement evaluation behavior in order to demonstrate it.

---

## 7. Normative schema graph

M4-002 MUST validate against the exact repository-controlled schema graph rooted
at:

```text
https://safe-runtime.dev/schema/v1alpha1/capability-policy.schema.json
```

Referenced schemas MUST be resolved by their declared `$id`, including:

```text
https://safe-runtime.dev/schema/v1alpha1/defs.schema.json
```

A runtime validator MUST NOT fetch schemas from the network while validating an
untrusted policy. Required schemas MUST be bundled/registered from trusted
repository/package resources.

Remote `$ref` resolution, network retrieval, dynamic schema installation, and
policy-supplied schemas are outside M4-002.

---

## 8. Strict validator profile

The reference implementation MUST use a strict Draft 2020-12 validator profile.

The profile MUST NOT enable behavior equivalent to:

```text
coerceTypes
useDefaults
removeAdditional
```

Unknown/ignored schema constructs in the trusted schema graph MUST fail validator
initialization rather than silently weakening validation.

All schema assertions present in the normative schema graph are authoritative,
including but not limited to:

- object/array/scalar types;
- `required`;
- `additionalProperties`;
- `const` and `enum`;
- string length/pattern constraints;
- numeric bounds;
- array `minItems` / `uniqueItems`;
- object `minProperties`;
- conditional assertions;
- `$ref` resolution.

M4-002 MUST NOT maintain a hand-written partial reimplementation of those schema
semantics and claim full schema conformance.

---

## 9. Portable fixture requirements

Language-independent M4-002 fixtures MUST cover at least:

### Valid

- current v0.1 CapabilityPolicy with `defaultEffect: deny`;
- a policy using the referenced lease-request definition.

### Invalid

- missing `defaultEffect`;
- non-deny `defaultEffect`;
- wrong `apiVersion`;
- wrong `kind`;
- missing/empty metadata name;
- unknown top-level property;
- unknown `spec` property;
- rule missing a required field;
- unknown rule effect;
- duplicate capability/resource array item;
- invalid lease-request value;
- additional rule property.

Fixtures for M4-002 MUST contain already parsed JSON-compatible values. Loader
syntax errors, YAML aliases/tags/duplicates, and source-size limits belong to
M4-001 and MUST NOT be relabeled as schema failures.

---

## 10. Reference implementation requirements

The TypeScript reference implementation MUST:

1. consume the M4-001 JSON-compatible value boundary;
2. use a Draft 2020-12 validator against trusted local schema resources;
3. initialize the schema graph once;
4. disable data-mutating/coercing validator features;
5. return deterministic normalized issues;
6. return a recursively frozen detached snapshot only on success;
7. introduce no `any` escape hatch for schema data or validation results;
8. preserve existing TypeScript strictness and package architecture rules;
9. declare all runtime dependencies in `packages/policy-engine/package.json`;
10. remain independent of DeepSeek Harness concrete types and runtime APIs.

---

## 11. Explicitly out of scope

M4-002 MUST NOT implement or silently imply:

- M4-003 canonical resource normalization;
- M4-004 deterministic rule ordering;
- M4-005 deny/ask/allow evaluation;
- M4-006 default-deny evaluation;
- M4-007 explain API;
- policy hot reload;
- capability/tool classification;
- lease consumption;
- approval routing;
- Harness plugin registration;
- Workspace Transaction semantics;
- network schema retrieval.

Successful M4-002 validation means only:

```text
this detached snapshot conforms to the current CapabilityPolicy JSON Schema
```

It does not mean:

```text
this policy authorizes an action
this policy is semantically normalized
this policy has been evaluated
this deployment enforces the policy
```

---

## 12. M4-002 acceptance criteria

M4-002 may be accepted only when all of the following are true:

1. this specification and portable fixtures are present;
2. the existing CapabilityPolicy schema is not silently weakened;
3. the trusted schema graph compiles under strict Draft 2020-12 semantics;
4. all required positive/negative fixtures produce the expected result;
5. validator input remains byte-for-byte/logically unchanged after validation;
6. success snapshots are detached and recursively immutable in TypeScript;
7. diagnostics are normalized and deterministically ordered;
8. no schema is fetched from the network at policy-validation time;
9. no M4-003+ behavior is implemented;
10. exact-head normal CI passes with frozen install, schema/baseline,
    architecture, strict TypeScript, tests and lint green;
11. exact Harness rc5 source-conformance remains green as compatibility evidence
    only.
