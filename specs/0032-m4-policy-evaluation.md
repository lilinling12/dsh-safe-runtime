# Spec 0032 — M4 Policy Evaluation

Status: **M4-021 normative profile**  
Scope: **deterministic single-policy applicability evaluation and effect composition**  
Protocol authority: `specs/0001-safe-runtime-core.md`, `specs/0002-state-machines-and-precedence.md`, `schemas/v1alpha1/capability-policy.schema.json`  
Accepted prerequisites: **M4-003, M4-004, M4-005, M4-006, M4-007, M4-009, M4-020**

## 1. Purpose

M4-021 defines the portable policy-evaluation boundary that turns one immutable,
already schema-validated `CapabilityPolicy` snapshot plus already resolved
request identity/resource evidence into a deterministic policy effect.

This Gate closes the applicability gap deliberately left by M4-004 through
M4-007:

```text
resolved Subject
+ canonical Resource
+ request capability
+ request constraints evidence
+ one immutable validated CapabilityPolicy snapshot
  -> subject applicability
  -> capability applicability
  -> M4-004 resource applicability / structural precedence
  -> portable constraint boundary
  -> fully-applicable rule set
  -> M4-005 effect resolution
  -> M4-006 default-deny finalization
  -> M4-007 deterministic explanation
  -> policy-evaluation fact
```

M4-021 is still **not** a complete authorization/execution pipeline. It does not
look up or consume leases, route approval, create a protocol
`CapabilityDecision`, construct stable `matchedRuleRefs`, assign a guarantee
level, persist a receipt, prove delegation attenuation, or enforce an action.
Those remain later roadmap Gates.

## 2. Existing authority and non-redefinition rule

M4-021 MUST compose accepted semantics rather than reimplementing them:

1. M4-020 owns Subject identity/context resolution;
2. M4-003 owns canonical Resource and policy-resource-selector normalization;
3. M4-004 owns lexical resource matching, specificity, comparison-time priority,
   and structural precedence bands;
4. M4-005 owns global explicit-deny, highest-band selection and `ask > allow`;
5. M4-006 owns defensive default deny;
6. M4-007 owns deterministic effect explanation;
7. M4-009 owns immutable active-policy snapshot publication and snapshot
   isolation.

The v0.1 precedence remains exactly:

```text
explicit deny
  > more-specific resource
  > higher explicit priority
  > ask
  > allow
  > default deny
```

M4-021 MUST NOT add declaration order, subject-selector order, capability-array
order, resource-selector order, map/object order, policy epoch, Harness runtime
identity or any other hidden tie-breaker.

## 3. One immutable policy snapshot per evaluation

One M4-021 invocation evaluates exactly **one** `CapabilityPolicy` snapshot.
Multi-policy aggregation/merging is not defined by v0.1 M4-021.

The policy input MUST already have passed M4-002 schema validation. When the
caller uses the M4-009 hot-reload store, it MUST acquire one immutable ACTIVE
snapshot handle before evaluation and use that exact snapshot for the complete
invocation.

An evaluator MUST NOT reread the active store between rule-matching stages.
Therefore a concurrent policy swap cannot produce a result composed from two
policy epochs.

M4-021 does not construct `policyRef` from `metadata.name`, M4-009 epoch, source
path, digest or display data.

## 4. Evaluation input

The portable logical input is:

```text
PolicyEvaluationInput {
  policy: validated CapabilityPolicy snapshot
  subject: resolved M4-020 Subject
  capability: CapabilityName
  resource: canonical M4-003 Resource
  requestConstraints?: JSON object
}
```

`subject` MUST be the detached resolved Subject produced under Spec 0031, with an
authoritative materialized `sessionRef`.

`resource` MUST be the canonical M4-003 exact resource. M4-021 MUST NOT perform
OS path resolution, provider containment, realpath, DNS resolution, executable
resolution or secret dereference.

`capability` is matched as protocol capability text. Standard and extension
capability names use the existing CapabilityRequest lexical shape. M4-021 does
not maintain a second capability registry whose absence can turn an explicitly
policy-matched extension capability into an unknown value.

`requestConstraints`, when present, is request evidence only. It has no matching
semantics unless a rule declares a constraint predicate that a portable profile
knows how to evaluate.

## 5. Rule applicability is conjunction across dimensions

For a rule to become **fully applicable**, every policy-relevant matching
dimension owned by M4-021 must succeed:

```text
subject matches
AND capability matches
AND resource matches
AND every declared portable constraint predicate is satisfied
```

Rule array position has no semantic meaning.

Within selector arrays, alternatives are OR:

```text
subjects[]     -> any selector may match
capabilities[] -> any capability may match
resources[]    -> any selector may match
```

Across dimensions the result is AND.

A resource-only match is not full applicability, preserving the security-critical
M4-005 definition.

## 6. Subject selector profile

### 6.1 Why a profile is required here

`CapabilityPolicy.spec.rules[].subjects` is structurally an optional array of
strings, but pre-M4-021 Core/Schema intentionally did not define portable string
semantics. M4-020 explicitly deferred those semantics to this Gate.

M4-021 defines one deliberately narrow v0.1 profile: **exact Subject identity
selectors only**.

### 6.2 Exact selector syntax

A portable selector is:

```text
<SubjectKind>://<SubjectId>
```

where `<SubjectKind>` is exactly one of:

```text
agent
subagent
tool
plugin
system
verifier
human
service
```

and `<SubjectId>` is a valid M4-020 protocol reference string: non-empty and at
most 512 Unicode code points.

Examples:

```text
agent://agent/root
subagent://subagent:child
service://service:ci
```

Parsing uses the **first** literal `://` delimiter. Everything after that first
delimiter is opaque Subject ID data. Therefore:

```text
selector: agent://svc://worker
kind:     agent
id:       svc://worker
```

is valid and unambiguous.

Accepted text is exact. There is no trimming, case folding, Unicode
normalization, percent decoding, escaping or alias lookup.

### 6.3 Matching

A selector matches a resolved Subject if and only if:

```text
selector.kind == subject.kind
AND
selector.id == subject.id
```

using exact code-point-preserving string equality.

The selector does not inspect or match:

- `subject.parent`;
- `subject.sessionRef`;
- display names;
- roles/groups/teams;
- Harness `SessionId`;
- Harness agent/subagent/provider names;
- workflow/run identifiers;
- delegation depth.

### 6.4 Omitted `subjects`

If a rule omits `subjects`, the Subject dimension is unconstrained and therefore
matches every already-resolved standard Subject.

If `subjects` is present, at least one exact selector MUST match.

The schema already forbids an empty `subjects` array. A runtime input that
bypasses schema validation and supplies empty/duplicate/malformed subject
selectors MUST fail closed rather than acquiring implementation-specific
meaning.

### 6.5 No wildcard/prefix semantics

M4-021 v0.1 defines no subject wildcard. In particular these are not valid
portable selectors:

```text
*://agent/root
agent://*
agent://agent/*
agent:agent/root
agent/root
```

Policy authors who want a rule to apply to all resolved Subjects omit the
`subjects` field. Implementations MUST NOT add prefix, glob, regex, descendant,
parent, session, role/group or fuzzy matching while claiming this v0.1 profile.

The current CapabilityPolicy JSON Schema remains a structural string boundary;
subject-selector grammar is a semantic policy-evaluation rule in the same way
that M4-003/M4-004 own semantics beyond the generic `resources[]` string shape.
M4-021 therefore does not need to weaken or duplicate schema validation.

## 7. Capability matching

A rule capability selector matches if one element of `rule.capabilities` equals
the request capability exactly.

No wildcard, prefix, namespace inheritance or case folding is defined.

Examples:

```text
fs.read       == fs.read       -> match
fs.read       != fs.*          -> `fs.*` is not a valid schema capability name
fs.read       != FS.READ       -> no match
vendor.op.run == vendor.op.run -> exact extension capability may match
```

An extension capability that is explicitly named by a schema-valid rule is not
denied merely because it is absent from the built-in TypeScript
`StandardCapability` union. Conversely an otherwise valid capability with no
fully applicable rule reaches the normal default-deny path.

The schema already requires non-empty unique capability arrays. Runtime callers
that bypass the validated-policy boundary and provide malformed/duplicate
capability selector data MUST fail closed.

## 8. Resource matching and structural precedence

M4-021 MUST reuse M4-004 rather than implement another resource matcher.

For rules that pass the Subject and capability dimensions, M4-021 supplies their
`id`, `resources` and optional `priority` to the accepted M4-004 ordering
primitive for the canonical request resource.

M4-004 then determines:

1. which remaining rules resource-match;
2. the best matching selector specificity for each rule;
3. effective comparison priority;
4. canonical structural precedence bands.

A rule absent from the M4-004 matched bands has not passed the resource
dimension and MUST NOT participate in later constraint or effect evaluation.

Any M4-003/M4-004 semantic failure MUST fail closed. M4-021 MUST preserve the
underlying stable component reason rather than treating malformed policy
resource syntax as a normal no-match.

Provider identity remains opaque and does not create lexical authorization
semantics.

## 9. Constraint boundary

### 9.1 Recovered fact

Both CapabilityRequest and CapabilityPolicy currently model `constraints` as an
open JSON object (`additionalProperties: true`). No existing Core profile defines
a portable predicate vocabulary, comparison operator, containment rule, JSON
subset relation, numeric comparison rule, argv grammar or extension registry
whose semantics M4-021 could safely assume.

M4-021 MUST NOT invent generic constraint semantics from object shape.

### 9.2 v0.1 M4-021 portable rule

For a rule that has already matched Subject, capability and resource:

```text
constraints omitted -> no additional predicate -> applicable
constraints {}      -> zero declared predicates -> applicable
constraints non-empty -> portable predicate semantics unavailable -> FAIL_CLOSED
```

The required fail-closed reason is:

```text
POLICY_CONSTRAINT_PROFILE_UNSUPPORTED
```

The fail-closed effective effect is always `deny`.

A non-empty constrained rule that does **not** pass Subject, capability or
resource matching MUST NOT fail an otherwise independent evaluation merely by
existing in the policy. Its constraint body is irrelevant because that rule
cannot become applicable to this request.

This ordering prevents both unsafe behaviors:

- silently ignoring a constraint and over-authorizing; and
- globally rejecting a request because an unrelated rule contains an extension
  predicate.

A future normative constraint profile may define registered predicates and their
attenuation semantics. It must not retroactively reinterpret existing unknown
objects as though M4-021 had already understood them.

### 9.3 Request constraints

A non-empty `requestConstraints` object does not by itself make a rule fail or
match. It is policy-relevant request evidence available to a future/registered
constraint evaluator.

When every otherwise matching rule has no declared constraint predicate, the
request may still be evaluated using the subject/capability/resource dimensions.

M4-021 MUST NOT compare `requestConstraints` and rule `constraints` by generic
JSON equality, subset, deep-merge or stringification.

## 10. Fields that do not determine M4-021 applicability

The following policy fields do not add matching dimensions in this Gate:

- `rule.effect`: consumed only after full applicability by M4-005;
- `rule.priority`: consumed only by M4-004 structural precedence;
- `rule.lease`: not a predicate and MUST NOT cause lease lookup/consumption here;
- `spec.delegation`: M4-021 does not prove delegation attenuation;
- `metadata.name`: does not affect rule matching or construct `policyRef`.

A schema-valid `lease` object on a fully applicable rule does not change its
M4-021 effect. Lease lookup/consumption remains M4-022 and lease issuance/
attenuation remains later lease work.

## 11. Deterministic evaluation pipeline

For one immutable validated snapshot, the portable logical order is:

```text
1. validate/materialize the narrow M4-021 input boundary
2. validate/materialize policy rule identity and matching fields without getters
3. preflight every present subject selector using §6
4. select rules whose Subject dimension matches
5. select rules whose capability dimension matches
6. run accepted M4-004 ordering against the canonical Resource
7. identify subject+capability+resource matched rules from M4-004 bands
8. inspect constraints only for those matched rules
9. if any such rule has non-empty constraints -> FAIL_CLOSED deny
10. otherwise those rules are the fully-applicable rule set
11. restrict the M4-004 bands to that exact fully-applicable set
12. build exact one-to-one M4-005 effect bindings
13. call M4-005 effect resolution
14. call M4-006 with the same snapshot's policy spec
15. call M4-007 for the same bands/effects/policy spec
16. return detached deterministic evaluation fact
```

Because the current portable constraint profile has only zero-predicate success
or unsupported fail-closed, step 11 does not remove any successfully constrained
rule. It remains explicit so future constraint profiles cannot accidentally feed
resource-only bands into M4-005.

After any failure, later policy-relevant stages MUST NOT be used to manufacture an
allow/ask result.

## 12. Output model

M4-021 returns a policy-evaluation fact, not a protocol `CapabilityDecision`.

### 12.1 Successful evaluated effect

```text
EVALUATED {
  status: "EVALUATED"
  effect: "deny" | "ask" | "allow"
  basis:
      "EXPLICIT_DENY"
    | "HIGHEST_BAND_ASK"
    | "HIGHEST_BAND_ALLOW"
    | "DEFAULT_DENY"
  reasonCode:
      "POLICY_EXPLICIT_DENY"
    | "POLICY_HIGHEST_BAND_ASK"
    | "POLICY_HIGHEST_BAND_ALLOW"
    | "POLICY_DEFAULT_DENY"
  fullyApplicableRuleIds: [string, ...]
  contributingRuleIds: [string, ...]
}
```

`fullyApplicableRuleIds` is the complete M4-021 full-match set, sorted by Unicode
code-point lexicographic order for deterministic presentation only.

`contributingRuleIds` preserves M4-007 semantics:

- explicit deny: all fully-applicable deny rules across structural bands;
- highest-band ask: ask rules from the highest band;
- highest-band allow: all rules in the highest band;
- default deny: empty.

Neither list is protocol `CapabilityDecision.matchedRuleRefs`. M4-024 owns stable
persisted decision/provenance references.

### 12.2 Fail-closed evaluation failure

A failure is logically:

```text
FAIL_CLOSED {
  status: "FAIL_CLOSED"
  effect: "deny"
  stage:
      "INPUT"
    | "SUBJECT_SELECTOR"
    | "RESOURCE"
    | "CONSTRAINT"
    | "EFFECT"
    | "DEFAULT_DENY"
    | "EXPLAIN"
  reasonCode: stable bounded code
}
```

M4-021-specific reasons are:

```text
POLICY_EVALUATION_INPUT_INVALID
POLICY_SUBJECT_SELECTOR_INVALID
POLICY_CONSTRAINT_PROFILE_UNSUPPORTED
```

For delegated accepted components, M4-021 MUST preserve their existing stable
reason code and identify the owning stage instead of translating the failure into
a normal default deny.

A `FAIL_CLOSED` result is not proof that a policy rule explicitly denied the
request. It is an enforcement fact that evaluation could not safely establish a
normal policy result.

Failure output MUST NOT echo Subject IDs, resource locators, capability values,
constraint bodies, policy source text, exception messages or stacks.

## 13. Rule identity, ordering and privacy

Rule IDs remain the schema-defined non-empty strings used by M4-004/M4-005.
M4-021 MUST preserve their accepted bounds and uniqueness rules.

For deterministic output:

- `fullyApplicableRuleIds` MUST be sorted by the existing M4-004 Unicode
  code-point comparator;
- `contributingRuleIds` MUST preserve M4-007 deterministic ordering;
- source rule order MUST NOT become authorization precedence.

Evaluation output MUST NOT include:

- raw policy source;
- request `reason`;
- request arguments/constraint values;
- resource contents;
- secrets;
- Harness objects;
- provider tokens.

## 14. Runtime hostile-object boundary

Portable fixtures are JSON data, but language bindings may receive prototype
properties, accessors, sparse arrays, symbols or proxies.

The TypeScript reference implementation MUST treat raw runtime containers as
untrusted even when static types appear valid.

Authorization-relevant fields MUST be read only from own data properties.
Getters for policy rules, selector arrays, subject identity, capability,
resource, constraints, effects or priority MUST NOT be executed to decide an
effect.

Unexpected own fields in M4-021's narrow input projection, symbol fields,
sparse/named/symbol selector-array properties, descriptor failures and revoked
Proxies MUST fail closed.

This hardening is a language-runtime boundary and MUST NOT redefine the portable
JSON semantics.

## 15. Re-evaluation invariant

An M4-021 result applies only to the exact policy-relevant input facts evaluated.
If an execution Adapter or later classifier rewrites any policy-relevant value
after evaluation, including:

```text
subject identity/context
capability
a canonical resource operand
constraint/argument evidence used by a predicate
```

the caller MUST reject the stale result or perform a new evaluation before
execution, preserving Core §8.3.

M4-021 does not invent an input digest or claim that a later PEP already enforces
this invariant. PEP integration remains M4-040+.

## 16. Delegation and subagent boundary

A resolved `subagent` may be matched by an exact subject selector, but M4-021 does
not thereby prove that the child is entitled to exercise a parent capability.

Core attenuation remains mandatory. Parent/child capability, resource, TTL,
max-use, constraint and guarantee attenuation checks remain later delegation/
lease work. An `allow` effect from M4-021 is therefore only a policy effect fact,
not final execution authority for a child.

## 17. DeepSeek Harness boundary

DeepSeek Harness `0.1.0-rc.5` at
`47f943859bef60e4160492346772ded9b24f765a` remains compatibility evidence only.

M4-021 MUST NOT use Harness agent names, provider names, SessionId values,
subagent run IDs, workflow sequence numbers or plugin registration order as
portable Subject selectors or policy precedence.

No concrete Harness type belongs in the protocol or policy-engine core API for
this Gate.

## 18. Explicit non-goals

M4-021 MUST NOT:

- authenticate a Subject;
- perform directory/identity-provider lookup;
- infer Subject parent/descendant relationships from strings;
- define subject wildcards/prefixes/roles/groups;
- define a generic arbitrary-JSON constraint language;
- parse shell commands or tool arguments into new policy constraints;
- perform lease lookup or consumption (M4-022);
- route approval (M4-023);
- create/persist `CapabilityDecision` or stable `matchedRuleRefs` (M4-024);
- assign guarantee level (M4-025);
- prove delegation attenuation or consume parent leases;
- classify tools;
- perform PEP enforcement (M4-040+);
- aggregate multiple policies;
- interpret M4-009 epoch as policy identity;
- claim provider containment, process isolation or plugin sandboxing.

In particular:

```text
M4-021 EVALUATED allow != action authorized for execution
M4-021 EVALUATED ask   != approval granted
M4-021 EVALUATED deny  != persisted CapabilityDecision already exists
```

## 19. Portable fixture requirements

Before production implementation, M4-021 MUST publish language-independent
fixtures covering at least:

### Subject semantics

1. omitted `subjects` matches any resolved Subject;
2. exact kind+id selector match;
3. kind mismatch does not match;
4. ID mismatch does not match;
5. matching is case-sensitive/exact;
6. ID containing `://` remains opaque after the first delimiter;
7. malformed selector fails closed;
8. wildcard-looking selector fails closed;
9. parent/session fields do not alter exact kind+id selector matching.

### Capability/resource conjunction

10. exact capability match;
11. capability mismatch reaches default deny when no other rule applies;
12. extension capability can match exactly;
13. resource selector matching reuses M4-004 wildcard semantics;
14. resource mismatch does not create applicability;
15. subject + capability + resource are conjunctive;
16. resource specificity outranks priority for ask/allow;
17. explicit deny remains global across lower structural bands;
18. equal-band `ask > allow` remains preserved.

### Constraint boundary

19. omitted rule constraints are zero-predicate success;
20. empty rule constraints are zero-predicate success;
21. non-empty constraints on an otherwise matching rule fail closed;
22. non-empty constraints on a subject-nonmatching rule are not inspected as an
    applicability blocker;
23. non-empty constraints on a capability-nonmatching rule are not inspected;
24. non-empty constraints on a resource-nonmatching rule are not inspected;
25. non-empty request constraints do not invent matching semantics when a rule
    declares no constraint predicate.

### Composition/determinism

26. no applicable rule becomes M4-006/M4-007 default deny;
27. rule declaration permutation does not change the result;
28. complete fully-applicable rule IDs are deterministic and separate from
    effect contributors;
29. a schema-valid lease field does not change M4-021 applicability/effect;
30. one evaluation uses one immutable snapshot; policy epoch/order is not a
    precedence input.

Portable cases MUST not depend on JavaScript prototypes/accessors or Harness
objects. Hostile-runtime cases belong to the TypeScript conformance suite after
the protocol-first exact head is accepted.

## 20. Protocol-first completion criteria

M4-021 production implementation is NOT AUTHORIZED until one exact repository
head contains at least:

1. this Spec 0032;
2. a portable M4-021 evaluation corpus satisfying §19;
3. repository handoff state recording M4-020 final-governance evidence and the
   M4-021 boundary;
4. no production PDP implementation;
5. no M4-022+ lease/approval/receipt/guarantee/PEP implementation;
6. exact-head normal CI PASS;
7. exact pinned Harness rc5 source-conformance PASS.

Only after that dual-green protocol-first head may the TypeScript reference PDP
projection begin.
