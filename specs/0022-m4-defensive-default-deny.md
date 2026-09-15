# M4-006 — Defensive Default-Deny Finalization

> Status: DRAFT NORMATIVE M4 PROFILE  
> Milestone: `M4 — Capability Broker v0.1`  
> Gate: `M4-006 P0 — default deny`

This specification defines the smallest portable default-deny finalization
primitive required after M4-005 deterministic effect resolution.

M4-006 is deliberately **not** the full PDP. It does not discover matching
rules, resolve subjects, classify capabilities, evaluate constraints, route
approval, issue leases, create `CapabilityDecision` records, assign guarantee
levels, produce receipts, or enforce actions.

## 1. Authority and reconciliation

M4-006 reconciles the following existing v0.1 requirements:

1. `specs/0001-safe-runtime-core.md` §8.3:
   - no matching rule uses `defaultEffect`;
   - missing `defaultEffect` MUST be treated as deny;
2. `specs/0002-state-machines-and-precedence.md` §1:
   - no matching rule => `defaultEffect`;
   - missing/unknown `defaultEffect` => `DENY / CONFIG_INVALID`;
3. `specs/0018-m4-capability-policy-schema-validation.md` §6:
   - the normative CapabilityPolicy schema requires `spec.defaultEffect`;
   - its only valid value is `deny`;
   - M4-002 MUST NOT synthesize or default the field;
   - a later evaluator must still fail closed if an unvalidated/internal object
     somehow bypasses that schema boundary;
4. `schemas/v1alpha1/capability-policy.schema.json`:
   - `spec.defaultEffect` is required and `const: "deny"`;
5. `specs/0021-m4-effect-resolution.md`:
   - M4-005 returns `NO_APPLICABLE_RULES` without converting it to deny.

These requirements apply at different trust boundaries and are not in conflict.
The normative processing model is:

```text
untrusted policy document
    -> M4-001 loader
    -> M4-002 schema validation
         missing/allow/ask/unknown defaultEffect => POLICY_SCHEMA_INVALID
         valid defaultEffect                    => exactly "deny"
    -> later PDP proves full rule applicability
    -> M4-005 effect resolution
         explicit rule effect OR NO_APPLICABLE_RULES
    -> M4-006 default-deny finalization
```

The defensive missing/unknown behavior in M4-006 MUST NOT be used to weaken the
M4-002 document-conformance boundary.

## 2. Input boundary

M4-006 consumes exactly two logical inputs:

1. a **successful M4-005 effect-resolution result**;
2. the policy `spec` object (or a presence-preserving projection of that object)
   from which `defaultEffect` can be checked as an explicitly present field.

Portable M4-005 success values are:

```text
ResolvedEffect {
  status: "RESOLVED"
  effect: "deny" | "ask" | "allow"
}

NoApplicableRules {
  status: "NO_APPLICABLE_RULES"
}
```

For JavaScript/TypeScript, M4-005's native success projection also carries
`ok: true`. M4-006 SHOULD consume that native projection directly instead of
requiring a caller to strip the language-level discriminant. `ok` is projection
metadata, not a new portable policy semantic.

### 2.1 Default-effect field presence is security-relevant

The second input MUST preserve whether `defaultEffect` is actually present on the
policy-spec object. A caller MUST NOT reduce that input to a scalar value before
this boundary, because doing so can erase the distinction between:

```text
own defaultEffect: "deny"
```

and, in prototype-bearing runtimes:

```text
missing own defaultEffect + inherited/prototype defaultEffect: "deny"
```

The latter is still a missing configuration field and MUST fail closed.

For JavaScript/TypeScript, M4-006 MUST use an own-property check such as
`Object.hasOwn(policySpec, "defaultEffect")`; ordinary prototype-chain property
lookup is not an authorization boundary.

M4-006 does **not** revalidate all other CapabilityPolicy `spec` fields. M4-002
remains the authoritative full schema-conformance gate. The policy-spec input is
used here only to preserve and verify the Core default-effect invariant.

M4-005 failures are not successful effect-resolution input. A caller SHOULD
propagate them rather than invoking M4-006. If a runtime caller nevertheless
passes a malformed/failure-shaped value, M4-006 MUST fail closed.

## 3. Normal validated-policy path

For a policy that has successfully passed M4-002, `spec.defaultEffect` MUST be an
own field whose only legal value is:

```text
deny
```

M4-006 MUST NOT recognize `allow` or `ask` as valid configured defaults merely
because they are standard rule effects. The CapabilityPolicy schema intentionally
forbids both.

### 3.1 Existing resolved rule effect

Given an own `defaultEffect: deny` and a successful M4-005 resolved effect:

```text
RESOLVED deny  -> deny
RESOLVED ask   -> ask
RESOLVED allow -> allow
```

M4-006 does not reorder or reinterpret an already resolved M4-005 rule effect.

### 3.2 No applicable rules

Given:

```text
M4-005 status: NO_APPLICABLE_RULES
policy spec:   own defaultEffect == deny
```

M4-006 resolves:

```text
deny
```

This is the v0.1 default-deny behavior.

## 4. Defensive invalid-configuration path

M4-002 normally prevents missing or invalid `defaultEffect` from entering later
processing. M4-006 nevertheless MUST defend its runtime boundary because internal
callers, language bindings, stale caches, corrupted projections, or future PDP
composition bugs may bypass the validated snapshot invariant.

The following default-effect states are configuration-invalid at M4-006:

```text
policy spec is not an object
missing own defaultEffect
inherited/prototype-only defaultEffect
own defaultEffect == undefined
own defaultEffect == null
own defaultEffect == allow
own defaultEffect == ask
own defaultEffect == unknown string
own defaultEffect == non-string value
```

For all such states, M4-006 MUST return a **fail-closed configuration-invalid
result whose effective effect is deny**.

Portable meaning:

```text
CONFIG_INVALID {
  failClosedEffect: "deny"
  reason: "DEFAULT_EFFECT_CONFIG_INVALID"
}
```

This rule applies even when the supplied M4-005 value says `RESOLVED allow` or
`RESOLVED ask`. A missing/invalid default-effect configuration MUST NOT become an
allow merely because another processing fragment produced an explicit effect.

This is defense in depth. It does not mean a schema-invalid document has become a
valid policy; it means bypassing the M4-002 default-effect assertion cannot create
permission.

## 5. Malformed M4-005 input

M4-006 MUST validate the narrow M4-005 success projection at runtime rather than
trust TypeScript/static types as an authorization boundary.

Portable accepted shapes are exactly:

```text
{ status: "RESOLVED", effect: "deny" | "ask" | "allow" }
{ status: "NO_APPLICABLE_RULES" }
```

A language-specific success discriminant already defined by M4-005 MAY also be
present. In the TypeScript reference projection the exact accepted shapes are:

```text
{ ok: true, status: "RESOLVED", effect: "deny" | "ask" | "allow" }
{ ok: true, status: "NO_APPLICABLE_RULES" }
```

No other own fields are permitted in the M4-006 M4-005-input projection.
Required fields MUST be own properties. Inherited prototype values MUST NOT
become authorization input.

Malformed input MUST produce:

```text
INPUT_INVALID {
  failClosedEffect: "deny"
  reason: "DEFAULT_DENY_INPUT_INVALID"
}
```

Examples include:

- non-object input;
- missing/inherited `status`;
- unknown status;
- `RESOLVED` without an own valid effect;
- `NO_APPLICABLE_RULES` with an effect field;
- effect-resolution failure objects supplied as though they were successes;
- unexpected own string or symbol fields.

M4-006 MUST NOT convert malformed upstream state into a normal successful deny,
because later diagnostics/PDP composition must still distinguish an invalid
processing path from a conforming default-effect decision.

## 6. Output model

M4-006 returns a primitive finalization fact, not a protocol
`CapabilityDecision`.

Portable success:

```text
FINALIZED {
  effect: "deny" | "ask" | "allow"
}
```

Portable fail-closed outcomes:

```text
FAIL_CLOSED {
  failClosedEffect: "deny"
  reason: "DEFAULT_EFFECT_CONFIG_INVALID"
       | "DEFAULT_DENY_INPUT_INVALID"
}
```

A TypeScript projection MAY encode these as:

```text
{ ok: true, status: "FINALIZED", effect }

{ ok: false,
  status: "FAIL_CLOSED",
  effect: "deny",
  reason }
```

The `effect: "deny"` field on a failure is a mandatory fail-closed enforcement
fact. It MUST NOT be interpreted as proof that a valid policy explicitly decided
deny.

M4-006 MUST NOT add:

- decision IDs;
- request IDs;
- policy/rule references;
- reason text intended for end users;
- guarantee levels;
- timestamps;
- approval state;
- lease state;
- receipt fields.

M4-007 explain and later PDP/decision/provenance gates own richer explanation.

## 7. Deterministic algorithm

A conforming implementation performs these checks in order:

1. validate that the policy-spec input is an object and has an **own**
   `defaultEffect` field whose value is exactly `deny`;
2. otherwise return `DEFAULT_EFFECT_CONFIG_INVALID` with fail-closed effect deny;
3. validate the M4-005 success projection;
4. if malformed, return `DEFAULT_DENY_INPUT_INVALID` with fail-closed effect deny;
5. if status is `RESOLVED`, preserve its effect exactly;
6. if status is `NO_APPLICABLE_RULES`, finalize effect deny.

Validating default-effect presence/value first is intentional. An unvalidated
configuration cannot escape fail-closed behavior merely because a malformed or
partial evaluator path also happened to produce `allow`.

## 8. Mutation and immutability

M4-006 MUST NOT mutate either input object.

For JavaScript/TypeScript implementations, every returned success or failure
result MUST be frozen. The output contains only scalar fields, so shallow freezing
is sufficient.

No dependency on host time, random values, filesystem state, network state,
object iteration order, Harness behavior, or locale is permitted.

## 9. Explicit non-goals

M4-006 MUST NOT:

- change the CapabilityPolicy schema;
- insert `defaultEffect` into a policy document;
- accept `defaultEffect: allow` or `ask` as schema-conforming;
- perform full M4-002 schema validation again;
- discover whether rules match;
- resolve subject/capability/constraint semantics;
- classify unknown capabilities;
- invoke M4-005 on raw rules;
- call approval for ask;
- issue/consume/revoke leases;
- construct `CapabilityDecision` or CapabilityReceipt records;
- assign guarantee levels;
- implement M4-007 explanation;
- perform Adapter enforcement.

Unknown capability default-deny from Core §8.3 remains a later full-PDP matching
concern because M4-006 is not a capability classifier/evaluator.

## 10. Portable fixture requirements

Language-independent M4-006 fixtures MUST cover at least:

### Valid path

- resolved allow + policy spec with own `defaultEffect: deny` -> allow;
- resolved ask + own `defaultEffect: deny` -> ask;
- resolved deny + own `defaultEffect: deny` -> deny;
- no applicable rules + own `defaultEffect: deny` -> deny.

### Defensive configuration path

- missing default-effect field -> fail-closed deny + config invalid;
- `allow` default -> fail-closed deny + config invalid;
- `ask` default -> fail-closed deny + config invalid;
- unknown string -> fail-closed deny + config invalid;
- null/non-string -> fail-closed deny + config invalid;
- resolved allow combined with invalid default still fails closed deny;
- prototype/inherited-only default effect fails closed in prototype-bearing runtime
  hardening.

### Runtime input validation

- non-object effect-resolution input;
- inherited required status/effect fields;
- unknown status;
- missing effect for RESOLVED;
- invalid/case-changed resolved effect;
- extra effect on NO_APPLICABLE_RULES;
- extra own field on either M4-005 shape;
- own symbol field in JavaScript runtime hardening;
- M4-005 failure-shaped input rejected rather than treated as success;
- caller inputs remain unmodified;
- outputs are frozen in the TypeScript projection.

## 11. M4-006 acceptance boundary

M4-006 can be accepted only when one exact implementation head proves all of the
following:

1. this normative profile is present;
2. portable default-deny fixtures are present;
3. valid M4-002 configuration accepts only an own `defaultEffect: deny`;
4. missing/inherited default-effect presence cannot be erased before the M4-006
   runtime check;
5. `NO_APPLICABLE_RULES` finalizes to deny;
6. valid resolved M4-005 effects are preserved;
7. missing/unknown/invalid default-effect runtime states return configuration
   invalid while carrying mandatory fail-closed deny;
8. malformed M4-005 success projections fail closed with a distinct input-invalid
   reason;
9. inherited/extra M4-005 runtime fields cannot become authorization input;
10. inputs are not mutated and outputs are frozen;
11. no schema weakening/default insertion/PDP/approval/lease/decision/receipt/
    guarantee or enforcement semantics are implemented early;
12. strict TypeScript, schemas, architecture boundaries, frozen lockfile,
    supply-chain checks, tests, lint and Shared TCK packaging remain green;
13. exact Harness rc5 source-conformance remains green as compatibility evidence
    only.

After implementation acceptance, its governance records must themselves reach
exact-head normal-CI + Harness dual-green before M4-007 production work begins.

M4-007+, M4-020+, M6 and stronger enforcement claims remain unauthorized by
M4-006 acceptance alone.
