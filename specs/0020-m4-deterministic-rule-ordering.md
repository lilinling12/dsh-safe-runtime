# M4-004 — Deterministic Rule Ordering and Portable Resource Pattern Profile

> Status: DRAFT NORMATIVE M4 PROFILE  
> Milestone: `M4 — Capability Broker v0.1`  
> Gate: `M4-004 P0 — deterministic rule ordering`

This specification closes the remaining ambiguity between the M1 deterministic
precedence profile and the accepted M4-003 resource-normalization boundary. It
defines the portable lexical resource-pattern semantics, resource specificity,
comparison-time priority semantics, and deterministic precedence-band output
needed by later effect evaluation.

M4-004 is deliberately **not** an authorization-decision gate. It does not
implement explicit-deny semantics, `ASK > ALLOW`, default deny, subject matching,
capability matching, constraint evaluation, lease handling, approval routing, or
PDP orchestration.

## 1. Authority and reconciliation

This profile refines, but does not replace, the existing v0.1 authority:

1. `specs/0001-safe-runtime-core.md` §8.3;
2. `specs/0002-state-machines-and-precedence.md` §1;
3. `specs/0019-m4-canonical-resource-normalization.md`;
4. `schemas/v1alpha1/capability-policy.schema.json`;
5. `schemas/v1alpha1/defs.schema.json#/$defs/resource`.

The existing deterministic decision order remains:

```text
explicit deny
  > more-specific resource
  > higher priority
  > ask
  > allow
  > default deny
```

M4-004 owns only the middle structural portion required before effect selection:

```text
portable resource-pattern match
  -> resource specificity
  -> comparison-time priority
  -> deterministic precedence bands
```

M4-005 owns effect selection. M4-006 owns the no-match/default-deny boundary.
DeepSeek Harness remains an Adapter compatibility target and MUST NOT define
policy pattern or precedence semantics.

## 2. Scope

M4-004 MUST define and the reference implementation MUST provide:

1. a portable v0.1 lexical pattern language over M4-003 canonical locator data;
2. deterministic selector-to-resource lexical matching;
3. a language-independent resource-specificity tuple;
4. deterministic comparison of resource specificity;
5. comparison-time semantics for optional policy `priority`;
6. deterministic grouping of resource-matched rule candidates into precedence
   bands;
7. deterministic, non-semantic ordering of rule identifiers within an equal
   precedence band;
8. fail-closed behavior for malformed pattern or ordering input;
9. portable fixtures that do not depend on TypeScript or JavaScript iteration
   behavior.

M4-004 MUST NOT:

- select `deny`, `ask`, or `allow`;
- give a rule higher authorization precedence because of its effect;
- invoke approval;
- apply `defaultEffect`;
- classify tools;
- evaluate subjects, capabilities, arbitrary constraints, delegation or leases;
- infer provider containment from locator strings;
- resolve filesystem paths, URLs, DNS names, executables, secrets or provider
  identities;
- derive semantics from policy array/object iteration order.

## 3. Input boundaries

### 3.1 Canonical resource

Resource matching consumes the accepted M4-003 structure:

```text
CanonicalResource {
  scheme: ResourceScheme
  locator: string
  providerIdentity?: string
}
```

Only `scheme` and `locator` participate in the portable M4-004 lexical match.
`providerIdentity` remains opaque and MUST NOT affect lexical match or
specificity.

A successful lexical match MUST NOT be described as provider-enforced
containment. For provider-backed filesystems, actual identity and containment
remain owned by the active provider/PEP.

### 3.2 Rule-ordering candidate

The portable candidate projection is:

```text
RuleOrderingCandidate {
  id: string
  resources: [PolicyResourceSelector, ...]
  priority?: integer
}
```

The projection intentionally omits `effect`. An M4-004 implementation MUST NOT
require or inspect a rule effect to compute structural precedence.

The projection also omits subject, capability, constraints and lease fields.
Later policy evaluation is responsible for intersecting those dimensions with
this resource-ordering result.

Candidate requirements:

1. `id` MUST be non-empty and at most 128 Unicode code points;
2. candidate IDs MUST be unique within one ordering invocation;
3. `resources` MUST be non-empty;
4. every resource selector MUST pass M4-003 selector normalization before pattern
   compilation;
5. duplicate resource selector strings within one candidate MUST fail closed when
   runtime input bypasses the JSON Schema uniqueness boundary;
6. if `priority` is present it MUST be an integer in `[-1000000, 1000000]`;
7. an own `priority` value of `undefined`/null/non-integer is invalid rather than
   silently treated as absent.

Duplicate rule IDs are configuration-ambiguous because later decisions and
explanations must identify rules stably. They therefore fail M4-004 preparation
rather than falling back to declaration position.

## 4. Portable lexical resource-pattern language

### 4.1 Outer selector

M4-004 MUST consume the M4-003 canonical selector pair:

```text
CanonicalResourceSelector {
  scheme: ResourceScheme
  locatorPattern: string
}
```

It MUST NOT independently reinterpret the raw `scheme://pattern` source string.

A selector can match a resource only when:

```text
selector.scheme == resource.scheme
```

using exact case-sensitive equality.

### 4.2 Lexical hierarchy separator

The literal code point `/` is the v0.1 **pattern-language hierarchy separator**.
This is a portable lexical convention only.

It MUST NOT be interpreted as proof that the underlying provider uses POSIX path
semantics, and it MUST NOT cause:

- backslash rewriting;
- repeated-separator collapse;
- dot-segment resolution;
- case folding;
- realpath/symlink resolution;
- URL normalization.

Empty segments are significant. For example, the two separators in `https://`
produce an empty lexical segment and MUST NOT be collapsed.

### 4.3 `*` single-segment wildcard

Within one slash-delimited pattern segment, `*` is a reserved operator matching
zero or more Unicode code points from exactly one locator segment.

It MUST NOT cross `/`.

Examples:

```text
pattern: src/*.ts
matches: src/a.ts
matches: src/.ts
not:     src/lib/a.ts
```

`*` matching is anchored as part of the complete segment; it is not a substring
search performed independently of surrounding literal code points.

### 4.4 `**` multi-segment wildcard

`**` is a reserved operator matching zero or more complete slash-delimited
locator segments.

For v0.1, `**` is valid only as an entire pattern segment. Therefore:

```text
**
src/**
src/**/test/*.ts
**/*.pem
```

are valid, while:

```text
a**b
foo/**bar
***
```

are invalid pattern syntax.

This restriction prevents glob-library-specific interpretations from becoming
protocol semantics.

### 4.5 Other metacharacter-looking code points

M4-004 defines no `?`, character-class, brace-expansion, extglob, regex, escape,
or shell-glob semantics.

The following are ordinary literal code points in v0.1:

```text
? [ ] { } ( ) + . ^ $ |
```

Backslash `\` is also ordinary locator-pattern data. M4-004 performs no escape
processing. Therefore an asterisk is reserved as a wildcard operator and cannot
be escaped into a literal asterisk in v0.1.

This limitation is intentional and fail-closed. A future protocol revision may
add an explicit escaping profile, but implementations MUST NOT invent one.

### 4.6 Whole-locator anchoring

Selector matching MUST consume the complete locator.

No implicit leading or trailing `**` exists. For example:

```text
pattern: src/*.ts
locator: x/src/a.ts
result:  no match
```

### 4.7 Unicode domain

Matching and specificity MUST operate on Unicode code points, not UTF-16 code
units, bytes, locale collation, or normalized text.

M4-003 already forbids Unicode normalization and preserves accepted code points;
M4-004 MUST preserve that identity.

## 5. Resource specificity

### 5.1 Specificity tuple

Every syntactically valid canonical locator pattern has the portable tuple:

```text
ResourceSpecificity {
  literalCodePoints: non-negative integer
  globstarCount: non-negative integer
  starCount: non-negative integer
}
```

Counting rules:

1. every non-wildcard code point counts once in `literalCodePoints`, including
   every literal `/` separator;
2. each valid `**` segment counts as exactly one `globstarCount` operator;
3. the two `*` code points belonging to a `**` operator do not count as
   `starCount` or literals;
4. every other `*` operator counts once in `starCount`;
5. counts use Unicode code points rather than UTF-16 code units.

### 5.2 Specificity comparison

Specificity is compared lexicographically in this exact order:

1. higher `literalCodePoints` is more specific;
2. if equal, lower `globstarCount` is more specific;
3. if equal, lower `starCount` is more specific;
4. if all three are equal, the selectors have equal resource specificity.

The comparison is performed only among selectors that match the same canonical
resource.

This profile intentionally treats overlapping but structurally incomparable
patterns as equal when the tuple is equal. It does not attempt regular-language
containment proofs.

Examples for the same matching resource:

```text
src/file.ts        > src/*.ts          # more literal code points
src/*              > src/**            # same literal prefix; * is narrower than **
src/*/*            > src/**            # additional literal separator structure
src/**             == **/*.pem         # may tie for some resources depending on literal counts
```

The tuple, not these comments, is normative.

### 5.3 A rule with multiple matching selectors

A candidate rule matches the resource dimension when at least one of its resource
selectors matches.

If multiple selectors from the same rule match, the rule's resource specificity
is the **maximum** specificity among its matching selectors according to §5.2.

A broad selector in the same rule MUST NOT erase a more-specific selector that
also matched.

## 6. Priority semantics

The CapabilityPolicy schema allows an optional integer `priority` in
`[-1000000, 1000000]`.

For M4-004 comparison only:

```text
effectivePriority = priority when explicitly present
                    0        when absent
```

This comparison-time value MUST NOT be written back into the validated policy or
reported as a schema default.

Consequences:

```text
priority: 10  > absent
absent       == priority: 0
priority: -5 < absent
```

Resource specificity always dominates priority. A higher numeric priority MUST
NOT override a more-specific matching resource scope.

The `0` comparison baseline is required so negative priorities can rank below an
unprioritized rule while positive priorities rank above it. Treating mere
presence as higher precedence would make negative priorities semantically
misleading.

## 7. Deterministic precedence bands

### 7.1 Structural precedence key

Each resource-matched rule has the structural key:

```text
(
  resourceSpecificity.literalCodePoints DESC,
  resourceSpecificity.globstarCount ASC,
  resourceSpecificity.starCount ASC,
  effectivePriority DESC
)
```

### 7.2 Band grouping

Rules with the same structural key belong to the same `RulePrecedenceBand`.

Portable output shape:

```text
RulePrecedenceBand {
  specificity: ResourceSpecificity
  effectivePriority: integer
  ruleIds: [string, ...]
}
```

The full result is:

```text
RuleOrderingResult {
  bands: [RulePrecedenceBand, ...]
}
```

Bands MUST be ordered from highest structural precedence to lowest.

A resource with no matching candidate rule returns a successful empty band list:

```text
{ bands: [] }
```

M4-004 MUST NOT turn that condition into `deny`; M4-006 owns default-deny
behavior.

### 7.3 Ordering inside an equal band

Within one equal-precedence band, `ruleIds` MUST be sorted by Unicode code-point
lexicographic ascending order.

This order exists only for deterministic serialization, diagnostics, testing and
future explanation. It is **not authorization precedence**.

In particular, a later evaluator MUST NOT choose the first rule in an equal band
as the decision winner. M4-005 must apply effect precedence to the complete
relevant equal band after handling the global explicit-deny rule required by the
M1 profile.

### 7.4 Declaration order is not semantic precedence

Reordering policy rule array entries or reordering resource selector entries
within a rule MUST NOT change M4-004 semantic bands.

Array position MUST NOT be used as a hidden authorization tie-breaker.

## 8. Failure model

Portable M4-004 failures are fail-closed and MUST NOT produce partial precedence
output.

Required top-level reasons:

```text
RULE_ORDERING_INPUT_INVALID
RULE_ORDERING_DUPLICATE_RULE_ID
RESOURCE_PATTERN_SYNTAX_INVALID
```

M4-003 normalization failures retain their M4-003 reason when normalization is
performed at the M4-004 boundary; implementations MUST NOT relabel malformed
resource data as a successful non-match.

`RESOURCE_PATTERN_SYNTAX_INVALID` includes invalid placement of `**`, including
`a**b`, `foo/**bar`, and `***`.

## 9. Complexity and security requirements

Policy patterns are configuration input and may still be untrusted or
misconfigured. A conforming implementation:

1. MUST NOT use shell expansion;
2. MUST NOT invoke filesystem, network, process or provider resolution to match a
   portable selector;
3. MUST NOT evaluate patterns as regular expressions supplied by the policy;
4. MUST avoid an implementation strategy whose correctness depends on
   catastrophic-backtracking behavior;
5. SHOULD compile/tokenize each selector once when used repeatedly;
6. MUST remain bounded by the accepted M4-003 4096-code-point locator/pattern
   domain;
7. MUST use iterative or otherwise bounded control flow for adversarial wildcard
   input rather than unbounded recursion.

A reference implementation MAY use a custom segment matcher and iterative
`**` fallback algorithm. The algorithm is not normative; observable behavior is.

## 10. Relationship to provider containment

A match such as:

```text
workspace://src/**
```

against a canonical locator is a portable lexical policy match only.

It MUST NOT be used as evidence that a provider target is contained by a host
filesystem directory. Stronger filesystem authorization still requires the
provider's stable target identity and containment operation.

`providerIdentity` MUST NOT be parsed, prefix-compared, case-folded, decoded or
included in the M4-004 specificity tuple.

## 11. Relationship to later gates

### 11.1 M4-005 — deny / ask / allow

M4-005 will consume effect-bearing rules together with M4-004 structural match
information. It MUST preserve the existing v0.1 decision profile:

1. any fully matching explicit deny => deny;
2. otherwise use the highest structural precedence band;
3. within that equal band, ask outranks allow.

Those effect behaviors are stated here only to preserve the boundary; M4-004
MUST NOT implement them.

### 11.2 M4-006 — default deny

M4-006 owns no-match/defaultEffect handling. An empty M4-004 band list is not by
itself a final decision.

### 11.3 M4-021 — policy evaluation

The later PDP evaluator owns composition across subject, capability, resource,
constraints, leases and decision provenance. M4-004 resource match MUST NOT be
misreported as a complete rule match.

## 12. Portable fixture requirements

Language-independent M4-004 fixtures MUST directly cover at least:

### Pattern semantics

- exact full-locator match;
- exact non-match due to prefix/suffix difference;
- exact scheme mismatch;
- `*` matching zero and multiple code points within one segment;
- `*` refusing to cross `/`;
- `**` matching zero, one and multiple segments;
- preservation of empty `/` segments such as URL-style `://` content;
- `?`, brackets and braces remaining literal;
- invalid embedded/triple `**` syntax;
- non-BMP Unicode matching by code point.

### Specificity and ordering

- exact selector outranking a wildcard selector for the same resource;
- greater literal count outranking lower literal count;
- fewer `**` operators breaking a literal-count tie;
- fewer `*` operators breaking the remaining tie;
- specificity outranking numeric priority;
- positive priority > absent/zero > negative priority within equal specificity;
- absent priority == explicit zero;
- multiple matching selectors using the most-specific selector for that rule;
- equal-precedence rules grouped in one band;
- deterministic Unicode code-point ordering of rule IDs inside a band;
- candidate input permutation not changing output bands;
- resource-selector input permutation not changing rule rank;
- no matching resource returning an empty band list;
- duplicate rule IDs failing closed.

## 13. M4-004 acceptance boundary

M4-004 can be accepted only when all of the following are true on one exact
implementation head:

1. this normative profile is present;
2. portable pattern/order fixtures are present;
3. the reference implementation consumes M4-003 normalization rather than
   creating an independent resource parser;
4. wildcard matching is custom/portable and does not delegate protocol semantics
   to a host glob library;
5. resource specificity follows the exact tuple in §5;
6. absent priority is comparison-time zero and is not written back to policy;
7. output is precedence bands, preserving equal-band semantics for M4-005;
8. candidate/rule/resource declaration order does not become hidden policy
   precedence;
9. effects are not inspected or selected;
10. provider identity/containment remains outside lexical matching;
11. strict TypeScript, schemas, architecture boundaries, frozen lockfile,
    supply-chain policy, tests, lint and Shared TCK package checks remain green;
12. exact Harness rc5 source-conformance remains green as compatibility evidence
    only.

After implementation acceptance, governance records must themselves reach a final
exact-head dual-green state before M4-005 production work begins.

M4-005+, M6, and any stronger provider-enforcement claim remain unauthorized by
M4-004 acceptance alone.
