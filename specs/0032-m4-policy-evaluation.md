# Spec 0032 — M4 Policy Evaluation

Status: **M4-021 normative profile**  
Scope: **deterministic single-policy applicability evaluation and effect composition**  
Protocol authority: `specs/0001-safe-runtime-core.md`, `specs/0002-state-machines-and-precedence.md`, `schemas/v1alpha1/capability-policy.schema.json`  
Accepted prerequisites: **M4-003, M4-004, M4-005, M4-006, M4-007, M4-009, M4-020**

## 1. Purpose

M4-021 defines the portable boundary that turns one immutable, already
schema-validated `CapabilityPolicy` snapshot plus already resolved request
evidence into a deterministic policy effect.

```text
resolved Subject
+ canonical Resource
+ request capability
+ request constraint evidence
+ one immutable validated CapabilityPolicy snapshot
  -> subject applicability
  -> capability applicability
  -> M4-004 resource applicability / structural precedence
  -> portable constraint boundary
  -> fully-applicable rules
  -> M4-005 effect resolution
  -> M4-006 default-deny finalization
  -> M4-007 deterministic explanation
  -> policy-evaluation fact
```

M4-021 is not the complete authorization/execution pipeline. It does not look up
or consume leases, route approval, create a protocol `CapabilityDecision`,
construct stable `matchedRuleRefs`, assign a guarantee level, persist a receipt,
prove delegation attenuation, or enforce an action.

## 2. Existing authority and non-redefinition rule

M4-021 MUST compose accepted semantics instead of reimplementing them:

1. M4-020 owns Subject identity/context resolution;
2. M4-003 owns canonical Resource and policy-resource-selector normalization;
3. M4-004 owns lexical resource matching, specificity, comparison-time priority,
   rule-ID uniqueness, and structural precedence bands;
4. M4-005 owns global explicit deny, highest-band selection, and `ask > allow`;
5. M4-006 owns defensive default deny;
6. M4-007 owns deterministic effect explanation;
7. M4-009 owns immutable active-policy publication and snapshot isolation.

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
order, resource-selector order, object/map order, policy epoch, Harness runtime
identity, subject-selector specificity, or any other hidden tie-breaker.

## 3. One immutable policy snapshot per evaluation

One invocation evaluates exactly one `CapabilityPolicy` snapshot. Multi-policy
aggregation is not defined by this profile.

The policy MUST already have passed M4-002 schema validation. When the caller
uses the M4-009 store, it MUST acquire one immutable ACTIVE snapshot handle and
use that same handle for the complete evaluation. The evaluator MUST NOT reread
the active store between matching stages.

M4-009 epoch is local snapshot identity only. M4-021 MUST NOT use it as policy
precedence or synthesize a `policyRef` from it, `metadata.name`, a source path,
or a digest.

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

`subject` MUST be the detached resolved Subject produced under Spec 0031 with a
materialized authoritative `sessionRef`.

`resource` MUST be the canonical M4-003 exact Resource. M4-021 does not perform
OS path resolution, provider containment, realpath, DNS resolution, executable
resolution, or secret dereference.

`capability` uses the existing CapabilityRequest lexical profile and is preserved
exactly. Standard and extension capability names share the same matching rule.

`requestConstraints`, when present, is request evidence only. It has no generic
matching semantics by itself.

## 5. Full applicability

A rule is **fully applicable** only when every M4-021 matching dimension succeeds:

```text
subject matches
AND capability matches
AND resource matches
AND every declared portable constraint predicate is satisfied
```

Within selector arrays, alternatives are OR. Across dimensions, matching is AND.
Rule array position has no semantic meaning. A resource-only M4-004 match is not
full applicability.

## 6. Request-independent policy semantic preflight

M4-002 proves JSON-Schema shape, but some semantics intentionally belong to later
policy profiles. Before request-dependent filtering, M4-021 MUST preflight the
entire rule set for the semantic invariants it owns or reuses:

1. rule IDs MUST be globally unique across the complete policy rule array;
2. every present Subject selector MUST satisfy §7;
3. malformed runtime projections MUST fail closed rather than being repaired.

Global rule-ID uniqueness is security-relevant even when one duplicate would
later fail the Subject or capability dimension: later explanation and provenance
must never have two policy rules sharing the same identifier. M4-021 MUST NOT
filter first and thereby hide a duplicate ID.

The required duplicate-ID failure preserves the accepted M4-004 reason:

```text
RULE_ORDERING_DUPLICATE_RULE_ID
```

with M4-021 failure stage `INPUT`.

M4-009 currently preflights resource selectors only. M4-021 does not retroactively
change M4-009 activation semantics in this Gate; a structurally valid policy with
an invalid Subject selector may remain loadable but MUST fail closed when passed
to M4-021. A future activation-profile revision may move the same semantic check
earlier without changing M4-021 matching meaning.

## 7. Subject selector profile

### 7.1 Exact syntax

`CapabilityPolicy.spec.rules[].subjects` is optional and structurally a string
array. M4-020 deliberately left its portable meaning to M4-021.

The v0.1 selector is exactly:

```text
<SubjectKind>://<SubjectId>
```

`<SubjectKind>` MUST be one exact standard kind:

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

`<SubjectId>` MUST be a valid M4-020 protocol ref: primitive string, non-empty,
and at most 512 Unicode code points at runtime.

Parsing uses the first literal `://`. Everything after it is opaque Subject ID
data, so this is valid and unambiguous:

```text
agent://svc://worker
```

No trimming, case folding, Unicode normalization, percent decoding, escaping,
or alias lookup is performed.

### 7.2 Exact matching

A selector matches iff:

```text
selector.kind == subject.kind
AND selector.id == subject.id
```

using exact preserved string equality.

The selector does not inspect `parent`, `sessionRef`, display names, roles,
groups, teams, Harness IDs/names, workflow IDs, provider names, or delegation
depth.

### 7.3 Omitted `subjects`

Omitting `subjects` means that the Subject dimension is unconstrained and matches
any already-resolved standard Subject. If `subjects` is present, at least one
selector MUST match.

An empty or duplicate `subjects` array remains schema-invalid. Runtime callers
that bypass M4-002 and supply malformed selector containers fail closed.

### 7.4 No wildcard/prefix semantics

There is no subject wildcard, prefix, glob, regex, descendant, parent, session,
role/group, or fuzzy matching.

Importantly, wildcard-looking characters inside `<SubjectId>` remain ordinary
opaque identity characters because M4-020 did not reserve them. Therefore:

```text
agent://*        -> exact selector for Subject id "*"
agent://agent/*  -> exact selector for Subject id "agent/*"
```

They MUST NOT match any other Subject ID. A policy author who wants all Subjects
omits `subjects`.

These are malformed selectors:

```text
*://agent/root   # unknown SubjectKind
agent:agent/root # missing :// delimiter
agent/root       # missing :// delimiter
agent://         # empty SubjectId
```

This preserves the full M4-020 identity domain while preventing hidden glob
semantics.

## 8. Capability matching

A rule matches the capability dimension iff one element of `rule.capabilities`
is exactly equal to the request capability.

There is no wildcard, prefix, namespace inheritance, or case folding.

An extension capability explicitly named by a schema-valid rule can match even
when it is absent from the built-in TypeScript `StandardCapability` union.
Conversely, a valid capability for which no rule becomes fully applicable follows
the normal default-deny path.

The schema already requires a non-empty unique capability array. A runtime caller
that bypasses the validated-policy boundary and provides malformed capability
selector data MUST fail closed.

## 9. Resource matching and structural precedence

M4-021 MUST reuse M4-004 rather than implement a second resource matcher.

After Subject and capability filtering, the evaluator passes the remaining
rules' `id`, `resources`, and optional `priority` to accepted M4-004 ordering for
the canonical request Resource.

M4-004 determines resource match, each rule's best matching-selector
specificity, comparison-time priority, and canonical structural bands. A rule
absent from the returned bands did not pass the resource dimension.

Any M4-003/M4-004 semantic failure fails closed and preserves that component's
stable reason. It MUST NOT be translated into an ordinary no-match/default deny.

Provider identity remains opaque and does not create lexical authorization
semantics.

## 10. Constraint boundary

### 10.1 Recovered protocol fact

CapabilityRequest and CapabilityPolicy currently model `constraints` as open JSON
objects (`additionalProperties: true`). Existing Core/specs define no portable
predicate vocabulary, comparison operator, containment rule, JSON subset rule,
argv grammar, or extension registry that M4-021 can safely assume.

M4-021 MUST NOT invent generic constraint semantics from object shape.

### 10.2 v0.1 portable rule

Only after a rule has matched Subject, capability, and resource:

```text
constraints omitted   -> zero predicates -> applicable
constraints {}        -> zero predicates -> applicable
constraints non-empty -> unsupported portable predicate profile -> FAIL_CLOSED
```

The stable failure is:

```text
stage: CONSTRAINT
reasonCode: POLICY_CONSTRAINT_PROFILE_UNSUPPORTED
effect: deny
```

A non-empty constrained rule that does not pass Subject, capability, or resource
matching MUST NOT block an otherwise independent request merely by existing in
the policy.

This ordering avoids both over-authorization (silently ignoring a constraint)
and unrelated global failure (interpreting an irrelevant extension predicate).

### 10.3 Request constraints

Non-empty `requestConstraints` alone neither matches nor rejects a rule. It is
request evidence available to a future registered/normative constraint evaluator.

M4-021 MUST NOT compare request and rule constraints using generic JSON equality,
subset, merge, serialization, or host-language object semantics.

## 11. Non-matching fields

These fields do not add M4-021 applicability dimensions:

- `rule.effect` — consumed only by M4-005 after full applicability;
- `rule.priority` — consumed only by M4-004;
- `rule.lease` — does not trigger lease lookup or consumption here;
- `spec.delegation` — does not prove attenuation here;
- `metadata.name` — does not determine matching or create policy identity.

A schema-valid `lease` on a fully applicable rule does not change the M4-021
effect. Lease lookup is M4-022; approval routing is M4-023.

## 12. Deterministic evaluation pipeline

One conforming invocation follows this logical order:

```text
1. validate/materialize the narrow M4-021 runtime input
2. materialize the complete policy rule identity/matching projection safely
3. preflight global rule-ID uniqueness
4. preflight every present Subject selector
5. select rules matching the resolved Subject
6. select rules matching the exact capability
7. invoke accepted M4-004 for canonical Resource matching/structural bands
8. identify Subject+capability+resource matched rules
9. inspect constraints only for those matched rules
10. any non-empty matched-rule constraints -> FAIL_CLOSED deny
11. otherwise those rules are the exact fully-applicable set
12. preserve/restrict the M4-004 bands to that exact set
13. build exact one-to-one M4-005 effect bindings
14. invoke M4-005
15. invoke M4-006 with the same policy spec
16. invoke M4-007 with the same bands/effects/policy spec
17. return detached deterministic evaluation fact
```

After a failure, later stages MUST NOT manufacture an allow/ask result.

The current zero-predicate constraint profile does not remove any successfully
checked rule at step 11, but the stage remains explicit so future constraint
profiles cannot accidentally feed resource-only candidates into M4-005.

## 13. Output model

M4-021 returns a policy-evaluation fact, **not** a protocol
`CapabilityDecision`.

### 13.1 Successful effect fact

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

`fullyApplicableRuleIds` is the complete full-match set, sorted with the existing
M4-004 Unicode code-point comparator for deterministic presentation only.

`contributingRuleIds` preserves M4-007 semantics:

- explicit deny: all fully-applicable deny rules across structural bands;
- highest-band ask: ask rules from the highest band;
- highest-band allow: all rules from the highest band;
- default deny: empty.

Neither list is `CapabilityDecision.matchedRuleRefs`. Stable persisted decision
references remain a later decision/provenance concern.

### 13.2 Fail-closed result

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

Accepted component reasons, including
`RULE_ORDERING_DUPLICATE_RULE_ID`, M4-003/M4-004 resource failures, M4-005
failures, and M4-006/M4-007 failures, MUST be preserved with the owning M4-021
stage rather than rewritten into a normal default deny.

A fail-closed result is not proof that an explicit policy deny matched. Failure
output MUST NOT echo Subject IDs, resource locators, capabilities, constraint
bodies, source text, exception messages, or stacks.

## 14. Runtime hostile-object boundary

Portable fixtures are JSON, but language bindings may receive prototypes,
accessors, sparse arrays, named/symbol array properties, symbols, and proxies.

The TypeScript reference implementation MUST treat runtime containers as
untrusted. Authorization-relevant values MUST come from own data-property
descriptors. Getters MUST NOT execute to decide an effect. Unexpected own fields
in the narrow public input projection, symbol fields, sparse/named/symbol
selector-array properties, descriptor failures, and revoked proxies MUST fail
closed.

The implementation MUST not retain caller-owned mutable containers. Successful
output, nested rule-ID lists, and failure output MUST be detached and immutable.

These are runtime hardening requirements, not new portable JSON semantics.

## 15. Re-evaluation invariant

An M4-021 fact applies only to the policy-relevant facts actually evaluated. If
an Adapter or later classifier rewrites any such value after evaluation,
including Subject identity/context, capability, canonical resource operand, or
constraint/argument evidence used by a predicate, the caller MUST reject the
stale result or evaluate again before execution, preserving Core §8.3.

M4-021 does not invent an input digest or claim that a PEP already enforces this.
PEP integration remains M4-040+.

## 16. Delegation and subagent boundary

An exact selector may match a resolved `subagent`, but that does not prove child
entitlement to a parent capability. Core attenuation remains mandatory. Parent
existence, capability/resource containment, TTL/max-use, constraint attenuation,
and guarantee inheritance remain later delegation/lease concerns.

Therefore `EVALUATED allow` is only a policy effect fact, not final execution
authority for a child.

## 17. DeepSeek Harness boundary

DeepSeek Harness `0.1.0-rc.5` at
`47f943859bef60e4160492346772ded9b24f765a` remains compatibility evidence only.
Harness agent names, provider names, SessionId values, subagent run IDs, workflow
sequence values, and plugin registration order MUST NOT become portable Subject
selectors or precedence inputs.

No concrete Harness type belongs in the policy-engine core API for M4-021.

## 18. Explicit non-goals

M4-021 MUST NOT:

- authenticate a Subject or perform directory/identity-provider lookup;
- infer Subject parent/descendant relationships from strings;
- define Subject wildcard/prefix/role/group semantics;
- define a generic arbitrary-JSON constraint language;
- parse shell/tool arguments into invented policy predicates;
- perform lease lookup/consumption (M4-022);
- route approval (M4-023);
- create/persist a protocol `CapabilityDecision`, receipt, or stable
  `matchedRuleRefs` (M4-024 and later provenance work);
- assign guarantee level (M4-025);
- prove delegation attenuation or consume parent leases;
- classify tools;
- enforce at a PEP (M4-040+);
- aggregate multiple policies;
- treat M4-009 epoch as policy identity;
- claim provider containment, process isolation, or plugin sandboxing.

```text
M4-021 EVALUATED allow != action authorized for execution
M4-021 EVALUATED ask   != approval granted
M4-021 EVALUATED deny  != persisted CapabilityDecision exists
```

## 19. Portable fixture requirements

Before production implementation, a language-independent corpus MUST cover at
least:

### Subject semantics

1. omitted `subjects` matches any resolved Subject;
2. exact kind+id selector match;
3. kind mismatch;
4. ID mismatch;
5. exact/case-sensitive matching;
6. Subject ID containing `://` after the first delimiter;
7. malformed selector fail closed;
8. wildcard-looking Subject ID remains literal, never wildcard;
9. parent/session do not alter exact kind+id selector matching.

### Capability/resource conjunction

10. exact capability match;
11. capability mismatch -> default deny if no other rule applies;
12. exact extension capability match;
13. M4-004 resource wildcard semantics are reused;
14. resource mismatch;
15. Subject+capability+resource conjunction;
16. resource specificity outranks priority for ask/allow;
17. explicit deny remains global across lower structural bands;
18. equal-band `ask > allow`.

### Constraint boundary

19. omitted constraints -> zero-predicate success;
20. empty constraints -> zero-predicate success;
21. non-empty constraints on an otherwise matching rule -> fail closed;
22. non-empty constraints on a Subject-nonmatching rule are not a blocker;
23. non-empty constraints on a capability-nonmatching rule are not a blocker;
24. non-empty constraints on a resource-nonmatching rule are not a blocker;
25. non-empty request constraints do not invent semantics when the rule declares
    no predicate.

### Composition/determinism

26. no applicable rule -> M4-006/M4-007 default deny;
27. rule declaration permutation does not change the result;
28. full-match IDs are deterministic and distinct from effect contributors;
29. schema-valid lease data does not change M4-021 applicability/effect;
30. policy epoch/order is not a precedence input;
31. duplicate rule IDs fail closed before request-dependent filtering, including
    when one duplicate would otherwise not match Subject/capability.

Portable cases MUST NOT depend on JavaScript prototypes/accessors or Harness
objects. Hostile-runtime cases belong to the TypeScript implementation suite only
after the protocol-first exact head is dual-green.

## 20. Protocol-first completion criteria

Production M4-021 implementation is NOT AUTHORIZED until one exact repository
head contains:

1. this Spec 0032;
2. a portable M4-021 corpus satisfying §19;
3. handoff state recording M4-020 final closure and the M4-021 boundary;
4. no production PDP implementation;
5. no M4-022+ lease/approval/receipt/guarantee/PEP implementation;
6. exact-head normal CI PASS;
7. exact pinned Harness rc5 source-conformance PASS.

Only after that exact dual-green protocol-first head may the TypeScript reference
policy evaluator begin.
