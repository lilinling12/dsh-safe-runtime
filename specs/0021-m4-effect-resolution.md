# M4-005 — Deterministic Effect Resolution

> Status: DRAFT NORMATIVE M4 PROFILE  
> Milestone: `M4 — Capability Broker v0.1`  
> Gate: `M4-005 P0 — deny / ask / allow`

This specification defines the smallest portable effect-resolution primitive
required by the v0.1 Capability Policy precedence model after full rule
applicability and M4-004 structural precedence have already been established.

M4-005 is deliberately **not** the full PDP. It does not decide whether a policy
rule matches a subject, capability, constraint or resource. It does not apply
`defaultEffect`, route approval, issue a lease, create a `CapabilityDecision`,
produce a receipt, assign a guarantee level, or perform adapter enforcement.

## 1. Authority and reconciliation

This profile refines the effect-specific portion of:

1. `specs/0001-safe-runtime-core.md` §8.2–§8.3;
2. `specs/0002-state-machines-and-precedence.md` §1;
3. `specs/0020-m4-deterministic-rule-ordering.md` §7 and §11;
4. `schemas/v1alpha1/capability-policy.schema.json`.

The v0.1 decision precedence remains:

```text
explicit deny
  > more-specific resource
  > higher priority
  > ask
  > allow
  > default deny
```

M4-004 already owns resource matching, specificity, priority and structural
precedence bands. M4-005 owns exactly:

```text
fully applicable rules + M4-004 structural bands
  -> global explicit-deny check
  -> highest applicable structural band
  -> ASK > ALLOW within that band
  -> resolved effect or NO_APPLICABLE_RULES
```

M4-006 owns default-effect/no-match resolution. M4-020/M4-021 own subject
resolution and full policy evaluation. DeepSeek Harness remains compatibility
evidence only.

## 2. Critical terminology: fully applicable rule

A **fully applicable rule** is a policy rule for which an upstream conforming
policy evaluator has already proven every policy-relevant match dimension that
exists for that rule and request, including as applicable:

- subject;
- capability;
- resource;
- constraints and other normative predicates.

M4-005 MUST NOT infer or partially recompute full applicability.

In particular, a rule that only resource-matches in M4-004 is **not** thereby
fully applicable. This distinction is security-critical because the global
explicit-deny rule applies to fully applicable denies, not to every deny whose
resource selector happened to match.

The current roadmap keeps subject resolution and full policy evaluation under
M4-020/M4-021. M4-005 therefore consumes an already-filtered effect input rather
than implementing those later gates early.

## 3. Input model

### 3.1 Structural bands

The caller supplies M4-004 structural precedence bands restricted to the same
set of fully applicable rules:

```text
RulePrecedenceBand {
  specificity: ResourceSpecificity
  effectivePriority: integer
  ruleIds: [string, ...]
}
```

The bands MUST preserve M4-004 semantics:

1. highest structural precedence first;
2. every band contains one or more unique rule IDs;
3. a rule ID appears in exactly one band;
4. rule IDs within a band are Unicode code-point lexicographic ascending;
5. bands are strictly descending by the M4-004 structural key;
6. no two adjacent or non-adjacent bands may have the same structural key;
7. specificity counts are non-negative safe integers;
8. effective priority is an integer in `[-1000000, 1000000]`.

M4-005 MUST fail closed if a runtime caller supplies malformed/noncanonical band
data rather than silently relying on array order.

### 3.2 Effect bindings

The caller supplies exactly one effect binding for every rule ID appearing in the
structural bands:

```text
ApplicableRuleEffect {
  ruleId: string
  effect: "deny" | "ask" | "allow"
}
```

Requirements:

1. every `ruleId` MUST be non-empty and at most 128 Unicode code points;
2. effect MUST be exactly lowercase `deny`, `ask`, or `allow`;
3. bindings MUST have unique rule IDs;
4. every band rule ID MUST have exactly one binding;
5. no binding may refer to a rule ID absent from the bands.

The 1:1 set relation prevents an implementation from accidentally resolving an
effect for a rule that was not proven fully applicable, or ignoring an applicable
rule because its effect was omitted.

The physical array order of effect bindings has no semantic meaning.

## 4. Output model

M4-005 returns a primitive effect-resolution result, **not** a protocol
`CapabilityDecision`.

Portable success outcomes are:

```text
RESOLVED_DENY
RESOLVED_ASK
RESOLVED_ALLOW
NO_APPLICABLE_RULES
```

A language projection MAY encode the first three as:

```text
{ status: "RESOLVED", effect: "deny" | "ask" | "allow" }
```

and the empty case as:

```text
{ status: "NO_APPLICABLE_RULES" }
```

The result MUST NOT contain:

- `decisionId`;
- `requestId`;
- `guaranteeLevel`;
- `policyRef`;
- `matchedRuleRefs`;
- approval results;
- lease information;
- timestamps;
- receipt fields.

Those belong to later PDP/decision/receipt gates.

M4-005 also intentionally does not publish decisive rule IDs. M4-007 explain and
M4-024 decision/provenance work may define that representation later without
turning M4-005's deterministic serialization into policy precedence.

## 5. Resolution algorithm

Given valid canonical bands and exact effect bindings:

### 5.1 Empty input

If and only if both `bands` and effect bindings are empty:

```text
NO_APPLICABLE_RULES
```

This is **not** a deny decision. M4-006 owns `defaultEffect` and default-deny.

### 5.2 Global explicit deny

If any fully applicable rule in **any** structural band has effect `deny`:

```text
RESOLVED_DENY
```

The deny wins regardless of resource specificity or numeric priority.

Examples:

```text
high-specificity allow + low-specificity deny -> deny
high-priority ask + low-priority deny          -> deny
```

This is the normative meaning of `explicit deny` appearing before resource
specificity in the v0.1 precedence profile.

A deny that is not fully applicable MUST NOT be included in M4-005 input and
therefore MUST NOT influence the result.

### 5.3 Highest structural band

If there is no fully applicable deny, only the first/highest M4-004 structural
band participates in effect selection.

Lower structural bands MUST be ignored for `ask`/`allow` once the highest band is
known.

Therefore:

```text
high-specificity allow + low-specificity ask -> allow
high-priority allow + lower-priority ask      -> allow
```

provided no fully applicable deny exists anywhere.

### 5.4 Equal-band effect precedence

Within the highest structural band:

```text
ask > allow
```

If at least one rule in the highest band has `ask`, resolve `ask`; otherwise all
remaining valid effects in that band are `allow`, so resolve `allow`.

Rule-ID presentation order MUST NOT affect this result.

## 6. Why M4-005 does not consume raw CapabilityPolicy rules

A raw CapabilityPolicy rule contains subject, capability, resource, constraint,
lease and effect data. Consuming raw rules in M4-005 would force this gate to
invent full matching semantics assigned to later roadmap gates.

Therefore a conforming M4-005 reference primitive MUST NOT accept a raw policy
and claim complete policy evaluation. It consumes only:

1. already-proven fully applicable structural bands; and
2. exact effect bindings for the same rules.

A later M4-021 PDP may produce this input after subject/capability/constraint
resolution and then compose the effect result with M4-006 and subsequent
approval/lease/decision-record work.

## 7. Relationship to M4-004

M4-005 MUST preserve M4-004 structural semantics and MUST NOT create an
independent specificity or priority algorithm.

Validation of incoming bands MAY reuse M4-004's public specificity comparator and
Unicode code-point comparator. It MUST NOT reinterpret policy resource selectors.

The caller is expected to construct fully-applicable bands by retaining only
fully applicable rules while preserving their M4-004 structural keys. A future
PDP may obtain those keys from the M4-004 resource-ordering phase.

M4-005's global deny scan intentionally spans all valid bands; ask/allow
resolution intentionally uses only the highest band.

## 8. Failure model

Malformed effect-resolution input MUST fail closed and MUST NOT return an allow,
ask, deny, or no-applicable success outcome.

Required portable top-level failures:

```text
EFFECT_RESOLUTION_INPUT_INVALID
EFFECT_RESOLUTION_EFFECT_INVALID
EFFECT_RESOLUTION_RULE_SET_MISMATCH
EFFECT_RESOLUTION_BANDS_NONCANONICAL
```

Meaning:

- `EFFECT_RESOLUTION_INPUT_INVALID`: malformed object/array/number/string shape,
  invalid rule ID, duplicate rule ID within a band, unsafe specificity count or
  out-of-range priority;
- `EFFECT_RESOLUTION_EFFECT_INVALID`: unknown or differently-cased effect;
- `EFFECT_RESOLUTION_RULE_SET_MISMATCH`: missing/extra/duplicate effect binding or
  the band/effect rule-ID sets differ;
- `EFFECT_RESOLUTION_BANDS_NONCANONICAL`: bands are not in strict M4-004
  structural order, equal structural keys were split, or rule IDs inside a band
  are not canonical Unicode code-point order.

Failures MUST be deterministic and independent of host object iteration order.

## 9. Mutation and immutability

M4-005 MUST NOT mutate input bands, rule-ID arrays, effect-binding arrays or
objects.

Reference TypeScript success/failure outputs MUST be frozen. Because the success
primitive contains no mutable nested data, shallow freezing is sufficient for the
result itself.

## 10. Explicit non-goals

M4-005 MUST NOT:

- resolve subjects;
- match capabilities;
- evaluate arbitrary rule constraints;
- resource-match raw selectors;
- normalize resources;
- apply `defaultEffect`;
- map `NO_APPLICABLE_RULES` to deny;
- call an Approval Port for `ask`;
- map approval result to allow/deny;
- issue or consume leases;
- create `CapabilityDecision` IDs or timestamps;
- assign `guaranteeLevel`;
- produce `matchedRuleRefs` or explanation trees;
- create CapabilityReceipt records;
- classify tools;
- perform adapter enforcement.

In particular:

```text
RESOLVED_ASK != approval granted
RESOLVED_ALLOW != action executed
RESOLVED_DENY != CapabilityDecision record already persisted
```

They are effect-selection facts for later composition.

## 11. Portable fixture requirements

Language-independent M4-005 fixtures MUST directly cover at least:

### Core effect semantics

- one allow => allow;
- one ask => ask;
- one deny => deny;
- deny in a lower structural band still beats a higher-band allow;
- deny in a lower structural band still beats a higher-band ask;
- highest-band allow beats lower-band ask when no deny exists;
- highest-band ask beats lower-band allow;
- ask beats allow inside one equal band;
- all allows in highest band => allow;
- empty bands + empty effects => `NO_APPLICABLE_RULES`.

### Determinism and canonical-input validation

- effect-binding permutation does not change outcome;
- rule IDs inside an equal band cannot be noncanonical;
- bands cannot be supplied in reverse structural order;
- equal structural keys cannot be split across multiple bands;
- duplicate band rule ID fails closed;
- duplicate effect binding fails closed;
- missing effect binding fails closed;
- extra effect binding fails closed;
- unknown/case-changed effect fails closed;
- malformed specificity and out-of-range priority fail closed;
- non-BMP rule IDs are validated using Unicode code-point order.

## 12. M4-005 acceptance boundary

M4-005 can be accepted only when all of the following hold on one exact
implementation head:

1. this normative profile is present;
2. portable effect-resolution fixtures are present;
3. production implementation consumes structural bands/effect bindings and does
   not accept raw CapabilityPolicy as a complete evaluator;
4. any fully applicable deny in any band resolves deny;
5. absent deny restricts ask/allow selection to the highest structural band;
6. `ask > allow` applies only inside that highest equal band;
7. empty applicable input remains `NO_APPLICABLE_RULES`, not deny;
8. malformed/noncanonical bands and rule-set mismatches fail closed;
9. M4-004 comparators are reused where needed rather than redefining resource
   specificity;
10. no approval/defaultEffect/lease/decision/receipt/guarantee/PDP semantics are
    implemented early;
11. strict TypeScript, schemas, architecture boundaries, frozen lockfile,
    supply-chain policy, tests, lint and Shared TCK package checks remain green;
12. exact Harness rc5 source-conformance remains green as compatibility evidence
    only.

After implementation acceptance, final governance records must themselves reach
exact-head normal-CI + Harness dual-green before M4-006 production work begins.

M4-006+, M4-020+, M6 and stronger enforcement claims remain unauthorized by
M4-005 acceptance alone.
