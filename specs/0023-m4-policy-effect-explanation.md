# M4-007 — Deterministic Policy Effect Explanation

> Status: DRAFT NORMATIVE M4 PROFILE  
> Milestone: `M4 — Capability Broker v0.1`  
> Gate: `M4-007 P0 — explain API`

This specification defines the smallest portable explanation primitive for the
effect facts already owned by M4-005 deterministic effect resolution and M4-006
defensive default-deny finalization.

M4-007 is deliberately **not** the full PDP and does not construct a protocol
`CapabilityDecision`. It explains why the narrow M4-005/M4-006 composition
produced its effect from an already-proven fully-applicable rule set.

## 1. Authority and reconciliation

M4-007 refines the explanation boundary established by:

1. `specs/0001-safe-runtime-core.md` §8–§9;
2. `specs/0002-state-machines-and-precedence.md` §1;
3. `schemas/v1alpha1/capability-decision.schema.json`;
4. `packages/protocol/src/capability.ts`;
5. `specs/0020-m4-deterministic-rule-ordering.md`;
6. `specs/0021-m4-effect-resolution.md`;
7. `specs/0022-m4-defensive-default-deny.md`.

The protocol `CapabilityDecision` already permits `policyRef`,
`matchedRuleRefs`, `reasonCode`, and `reason`. M4-007 MUST NOT redefine those
fields or claim that its output is a complete decision record.

The accepted precedence remains:

```text
explicit deny
  > more-specific resource
  > higher priority
  > ask
  > allow
  > default deny
```

M4-007 explains that precedence result; it MUST NOT add another tie-breaker.

## 2. Scope

M4-007 MUST provide a deterministic explanation for:

1. explicit deny selected by M4-005's global deny rule;
2. ask selected from the highest structural band;
3. allow selected from the highest structural band;
4. default deny produced from `NO_APPLICABLE_RULES`;
5. M4-006 fail-closed configuration/input-invalid finalization.

M4-007 MUST NOT:

- resolve subjects;
- classify capabilities or tools;
- decide whether a raw policy rule is fully applicable;
- resource-match raw selectors;
- evaluate arbitrary constraints;
- issue or consume leases;
- invoke approval;
- assign guarantee levels;
- create decision/request IDs or timestamps;
- create `CapabilityDecision` or `CapabilityReceipt` records;
- persist provenance;
- perform adapter enforcement;
- infer policy identity or construct `policyRef`;
- populate protocol `matchedRuleRefs`;
- use rule declaration order as authorization semantics.

DeepSeek Harness remains Adapter compatibility evidence only.

## 3. Input boundary

The portable logical inputs are exactly the facts required by M4-005/M4-006:

```text
bands
  canonical M4-004 structural bands restricted to fully applicable rules

effects
  exact one-to-one M4-005 rule effect bindings for those same rules

policySpec
  policy spec object or presence-preserving equivalent required by M4-006
```

A resource-only M4-004 match is not sufficient. Every rule represented here MUST
already have full applicability proven by an upstream conforming evaluator.

M4-007 MUST reuse M4-005 and M4-006 semantics rather than independently
redefining effect precedence or default deny.

### 3.1 No raw CapabilityPolicy evaluation

The explain API MUST NOT accept a raw CapabilityPolicy and claim that it has
evaluated subjects, capabilities, constraints, leases, or other later-PDP
dimensions.

A later M4-021 PDP may supply the fully-applicable bands/effects to this
primitive after completing those checks.

### 3.2 Data-only runtime boundary

Language bindings whose object model can contain prototype properties,
accessors, sparse arrays, proxies, or symbol/named array properties MUST treat
the explanation input as untrusted runtime data.

The TypeScript reference implementation MUST materialize the narrow bands/effects
projection using own data-property descriptors before invoking M4-005. It MUST
reject accessor-backed required fields or array elements without invoking
property getters.

This materialization is a language-runtime hardening rule, not a new portable
policy semantic. Once materialized, M4-005 remains the authority for canonical
band/effect validation.

## 4. Output model

M4-007 returns an explanation primitive, not a `CapabilityDecision`.

### 4.1 Explained effect

Portable explained output:

```text
PolicyEffectExplanation {
  status: "EXPLAINED"
  effect: "deny" | "ask" | "allow"
  basis:
      "EXPLICIT_DENY"
    | "HIGHEST_BAND_ASK"
    | "HIGHEST_BAND_ALLOW"
    | "DEFAULT_DENY"
    | "FAIL_CLOSED"
  reasonCode: string
  contributingRuleIds: [string, ...]
}
```

The TypeScript projection MAY add `ok: true` as a language-level discriminant.

`contributingRuleIds` MUST be a detached immutable list in deterministic Unicode
code-point lexicographic ascending order. That order is presentation only and
MUST NOT become authorization precedence.

### 4.2 Explanation failure

If M4-007 cannot safely materialize the runtime input, or M4-005 rejects the
bands/effect relation, M4-007 cannot truthfully explain a finalized effect.

Portable failure:

```text
PolicyEffectExplanationFailure {
  status: "EXPLAIN_FAILED"
  reasonCode:
      "POLICY_EXPLAIN_INPUT_INVALID"
    | M4-005 failure reason
}
```

The TypeScript projection MAY add `ok: false`.

An `EXPLAIN_FAILED` result is not `allow`, `ask`, or `deny`, and MUST NOT be
treated as authorization success. M4-007 does not invent a final effect for an
M4-005 failure.

By contrast, an M4-006 `FAIL_CLOSED` result already contains a normative
fail-closed enforcement fact (`effect: deny`). M4-007 explains that fact as a
successful explanation with `basis: "FAIL_CLOSED"`.

## 5. Explanation basis semantics

### 5.1 Explicit deny

If M4-005 resolves `deny`, the explanation basis is:

```text
basis: "EXPLICIT_DENY"
reasonCode: "POLICY_EXPLICIT_DENY"
effect: "deny"
```

`contributingRuleIds` contains every fully-applicable rule whose effect is
`deny`, across all structural bands.

This set is intentionally independent of specificity and priority because the
v0.1 global explicit-deny rule dominates both.

The list is globally sorted by Unicode code-point order. Band order MUST NOT be
encoded into the list as hidden precedence.

### 5.2 Highest-band ask

If M4-005 resolves `ask`, then no fully-applicable deny exists and at least one
`ask` exists in the highest structural band.

```text
basis: "HIGHEST_BAND_ASK"
reasonCode: "POLICY_HIGHEST_BAND_ASK"
effect: "ask"
```

`contributingRuleIds` contains exactly the `ask` rules from the highest
structural band. Allow rules in the same band and all lower-band rules are not
effect-contributing for this result.

### 5.3 Highest-band allow

If M4-005 resolves `allow`, then:

- no fully-applicable deny exists;
- the highest structural band contains no ask;
- every rule in that highest band has effect `allow`.

```text
basis: "HIGHEST_BAND_ALLOW"
reasonCode: "POLICY_HIGHEST_BAND_ALLOW"
effect: "allow"
```

`contributingRuleIds` contains every rule ID from the highest structural band.

Lower-band allows/asks are not effect-contributing.

### 5.4 Default deny

If M4-005 returns `NO_APPLICABLE_RULES` and M4-006 successfully finalizes the
validated policy default:

```text
basis: "DEFAULT_DENY"
reasonCode: "POLICY_DEFAULT_DENY"
effect: "deny"
contributingRuleIds: []
```

M4-007 MUST NOT invent a rule ID for default deny.

### 5.5 Defensive fail closed

If M4-005 succeeds but M4-006 returns `FAIL_CLOSED`, M4-007 explains the existing
fail-closed enforcement fact:

```text
basis: "FAIL_CLOSED"
effect: "deny"
reasonCode:
    "DEFAULT_EFFECT_CONFIG_INVALID"
  | "DEFAULT_DENY_INPUT_INVALID"
contributingRuleIds: []
```

No rule may be presented as the cause of this deny. The deny exists because the
configuration/processing boundary failed closed, not because a conforming policy
rule was proven to deny.

M4-006 validates default-effect configuration before its M4-005 success
projection. M4-007 MUST preserve that ordering and MUST NOT replace a
configuration-invalid fail-closed explanation with an explicit-rule
explanation, even if the supplied rule set includes deny.

## 6. Relationship to `matchedRuleRefs`

`contributingRuleIds` and protocol `CapabilityDecision.matchedRuleRefs` are
different concepts.

M4-007 `contributingRuleIds` means only the rules that contribute to the narrow
M4-005 effect-selection result according to §5.

It does **not** mean:

- every raw rule whose resource selector matched;
- every fully-applicable rule;
- a stable cross-policy rule reference;
- persisted decision provenance.

A later M4-021 PDP owns the complete matching set. A later M4-024
decision/receipt/provenance gate owns stable decision references and decides how
rule IDs become `matchedRuleRefs`.

Therefore M4-007 MUST NOT mechanically construct `matchedRuleRefs` or prefix
rule IDs with an invented policy/rule namespace.

## 7. Reason-code semantics

The normal portable reason codes are:

```text
POLICY_EXPLICIT_DENY
POLICY_HIGHEST_BAND_ASK
POLICY_HIGHEST_BAND_ALLOW
POLICY_DEFAULT_DENY
```

M4-006 fail-closed reason codes are preserved exactly:

```text
DEFAULT_EFFECT_CONFIG_INVALID
DEFAULT_DENY_INPUT_INVALID
```

M4-005 explanation failures preserve the existing M4-005 reasons exactly:

```text
EFFECT_RESOLUTION_INPUT_INVALID
EFFECT_RESOLUTION_EFFECT_INVALID
EFFECT_RESOLUTION_RULE_SET_MISMATCH
EFFECT_RESOLUTION_BANDS_NONCANONICAL
```

M4-007 adds exactly one boundary-specific failure:

```text
POLICY_EXPLAIN_INPUT_INVALID
```

It is used only when the language binding cannot safely materialize the narrow
data-only projection before M4-005 can validate it.

M4-007 does not emit free-form `reason` text. Human-readable/localized messages
are presentation concerns and can accidentally disclose sensitive policy data.
The protocol `CapabilityDecision.reason` remains optional and is not populated by
this primitive.

## 8. Determinism, mutation, and privacy

A conforming implementation:

1. MUST NOT mutate caller inputs;
2. MUST return detached explanation data;
3. MUST order `contributingRuleIds` by Unicode code-point lexicographic order;
4. MUST NOT use object/map insertion order as semantic precedence;
5. MUST NOT include resource locators, constraints, secrets, request arguments,
   or policy source text in explanation output;
6. MUST NOT access filesystem, network, process, clock, randomness, locale, or
   Harness APIs;
7. MUST preserve M4-004/M4-005 rule-ID length and Unicode semantics through
   delegated validation.

For TypeScript/JavaScript:

- success/failure objects MUST be frozen;
- `contributingRuleIds` MUST be frozen;
- accessor getters for authorization/explanation-relevant input fields MUST NOT
  be executed;
- revoked proxy/descriptor inspection failures MUST return
  `POLICY_EXPLAIN_INPUT_INVALID`;
- sparse/accessor-backed arrays and unexpected own named/symbol array properties
  MUST be rejected before M4-005.

## 9. Relationship to later gates

### M4-008 diagnostics

M4-008 may add richer policy diagnostics. It MUST NOT retroactively change the
M4-007 effect basis or rule-contribution semantics.

### M4-020 / M4-021 PDP

Subject resolution and full policy evaluation remain later gates. M4-007 assumes
full applicability; it does not prove it.

### M4-023 approval

`HIGHEST_BAND_ASK` means policy effect `ask`, not approval granted. Approval
routing and outcome mapping remain M4-023.

### M4-024 decision receipt / provenance

M4-024 owns durable decision identity, policy/rule references, timestamps, and
receipt/provenance persistence. M4-007 output is an in-memory deterministic
explanation primitive only.

### M4-025 guarantee level

M4-007 assigns no guarantee level and MUST NOT infer enforcement strength from
the policy effect.

## 10. Portable fixture requirements

Language-independent fixtures MUST directly cover at least:

- single explicit deny;
- lower-band deny overriding a higher-band allow;
- multiple denies across bands with deterministic global rule-ID presentation;
- ask beating allow inside the highest band;
- multiple highest-band asks;
- highest-band allow beating lower-band ask;
- multiple highest-band allows;
- empty applicable input producing default deny with no rule IDs;
- invalid default configuration explaining M4-006 fail-closed with no rule IDs;
- invalid default configuration taking precedence over an explicit rule effect;
- malformed effect value returning an M4-005 explanation failure;
- band/effect rule-set mismatch returning explanation failure;
- noncanonical band ordering returning explanation failure;
- effect-binding permutation not changing explanation;
- rule declaration/effect-binding order not changing rule-ID presentation;
- non-BMP rule IDs using Unicode code-point ordering.

The TypeScript runtime suite MUST additionally cover accessor-backed fields and
array elements, inherited fields, sparse arrays, symbol/named array properties,
revoked proxies, input non-mutation, and frozen detached outputs.

## 11. M4-007 acceptance boundary

M4-007 can be accepted only when one exact implementation head proves:

1. this normative profile exists;
2. portable explanation fixtures exist;
3. implementation consumes only fully-applicable bands/effects plus policy-spec
   default configuration and does not evaluate raw policy;
4. M4-005/M4-006 are reused for effect/default semantics;
5. explicit deny explains all fully-applicable deny contributors without hidden
   specificity/priority ordering;
6. ask/allow explain only the effect-contributing rules from the highest band;
7. default deny has no contributing rule IDs;
8. M4-006 fail-closed deny has no contributing rule IDs and retains its exact
   reason code;
9. M4-005 invalid input returns `EXPLAIN_FAILED`, not a fabricated deny
   explanation;
10. `contributingRuleIds` is explicitly not `matchedRuleRefs`;
11. no `CapabilityDecision`, receipt, approval, lease, guarantee, PDP or Adapter
    enforcement semantics are implemented early;
12. JavaScript runtime inputs cannot trigger accessor getters while being
    materialized for explanation;
13. outputs are deterministic, detached and frozen without leaking policy
    resource/constraint/secret data;
14. strict TypeScript, schemas, architecture boundaries, frozen lockfile,
    supply-chain policy, tests, lint and Shared TCK package checks remain green;
15. exact Harness rc5 source-conformance remains green as compatibility evidence
    only.

After implementation acceptance, M4-007 governance records must themselves reach
exact-head normal-CI + Harness dual-green before M4-008 or another later M4 gate
is authorized.
