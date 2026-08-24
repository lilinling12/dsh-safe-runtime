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
2. the policy's `defaultEffect` value as observed by the caller.

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

M4-006 MUST NOT accept a raw CapabilityPolicy and claim full policy evaluation.
The caller owns extraction of `defaultEffect` from its already validated policy
snapshot. Passing `undefined` represents the defensive case where an internal or
unvalidated path has lost or omitted the field.

M4-005 failures are not successful effect-resolution input. A caller SHOULD
propagate them rather than invoking M4-006. If a runtime caller nevertheless
passes a malformed/failure-shaped value, M4-006 MUST fail closed.

## 3. Normal validated-policy path

For a policy that has successfully passed M4-002, the only legal default-effect
input is:

```text
deny
```

M4-006 MUST NOT recognize `allow` or `ask` as valid configured defaults merely
because they are standard rule effects. The CapabilityPolicy schema intentionally
forbids both.

### 3.1 Existing resolved rule effect

Given a valid `defaultEffect: deny` and a successful M4-005 resolved effect:

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
defaultEffect: deny
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

The following are configuration-invalid at M4-006:

```text
missing / undefined
null
allow
ask
unknown string
non-string value
```

For all such values, M4-006 MUST return a **fail-closed configuration-invalid
result whose effective effect is deny**.

Portable meaning:

```text
CONFIG_INVALID {
  failClosedEffect: "deny"
  reason: "DEFAULT_EFFECT_CONFIG_INVALID"
}
```

This rule applies even when the supplied M4-005 value says `RESOLVED allow` or
`RESOLVED ask`. An invalid/unvalidated policy configuration MUST NOT become an
allow merely because another fragment of the same invalid policy produced an
explicit effect.

This is defense in depth. It does not mean a schema-invalid document has become a
valid policy; it means bypassing M4-002 cannot create permission.

## 5. Malformed M4-005 input

M4-006 MUST validate the narrow M4-005 success projection at runtime rather than
trust TypeScript/static types as an authorization boundary.

Required accepted shapes are exactly:

```text
{ status: "RESOLVED", effect: "deny" | "ask" | "allow" }
{ status: "NO_APPLICABLE_RULES" }
```

No additional own fields are permitted in the portable M4-006 input projection.
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
because later diagnostics/PDP composition must still be able to distinguish an
invalid processing path from a conforming default-effect decision.

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

1. validate `defaultEffect` runtime value;
2. if it is not exactly `deny`, return `DEFAULT_EFFECT_CONFIG_INVALID` with
   fail-closed effect deny;
3. validate the M4-005 success projection;
4. if malformed, return `DEFAULT_DENY_INPUT_INVALID` with fail-closed effect deny;
5. if status is `RESOLVED`, preserve its effect exactly;
6. if status is `NO_APPLICABLE_RULES`, finalize effect deny.

Validating the default effect first is intentional. An invalid policy
configuration cannot be allowed to escape fail-closed behavior merely because a
malformed or partial evaluator path also happened to produce `allow`.

## 8. Mutation and immutability

M4-006 MUST NOT mutate its input object.

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
- load or validate a raw policy document;
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

- resolved allow + `defaultEffect: deny` -> allow;
- resolved ask + `defaultEffect: deny` -> ask;
- resolved deny + `defaultEffect: deny` -> deny;
- no applicable rules + `defaultEffect: deny` -> deny.

### Defensive configuration path

- missing default effect -> fail-closed deny + config invalid;
- `allow` default -> fail-closed deny + config invalid;
- `ask` default -> fail-closed deny + config invalid;
- unknown string -> fail-closed deny + config invalid;
- null/non-string -> fail-closed deny + config invalid;
- resolved allow combined with invalid default still fails closed deny.

### Runtime input validation

- non-object effect-resolution input;
- inherited required status/effect fields;
- unknown status;
- missing effect for RESOLVED;
- invalid/case-changed resolved effect;
- extra effect on NO_APPLICABLE_RULES;
- extra own field on either shape;
- own symbol field in JavaScript runtime hardening;
- M4-005 failure-shaped input rejected rather than treated as success;
- caller input remains unmodified;
- outputs are frozen in the TypeScript projection.

## 11. M4-006 acceptance boundary

M4-006 can be accepted only when one exact implementation head proves all of the
following:

1. this normative profile is present;
2. portable default-deny fixtures are present;
3. valid M4-002 configuration accepts only exactly `defaultEffect: deny`;
4. `NO_APPLICABLE_RULES` finalizes to deny;
5. valid resolved M4-005 effects are preserved;
6. missing/unknown/invalid default-effect runtime values return configuration
   invalid while carrying mandatory fail-closed deny;
7. malformed M4-005 success projections fail closed with a distinct input-invalid
   reason;
8. inherited/extra runtime fields cannot become authorization input;
9. input is not mutated and outputs are frozen;
10. no schema/default insertion/PDP/approval/lease/decision/receipt/guarantee or
    enforcement semantics are implemented early;
11. strict TypeScript, schemas, architecture boundaries, frozen lockfile,
    supply-chain checks, tests, lint and Shared TCK packaging remain green;
12. exact Harness rc5 source-conformance remains green as compatibility evidence
    only.

After implementation acceptance, its governance records must themselves reach
exact-head normal-CI + Harness dual-green before M4-007 production work begins.

M4-007+, M4-020+, M6 and stronger enforcement claims remain unauthorized by
M4-006 acceptance alone.
