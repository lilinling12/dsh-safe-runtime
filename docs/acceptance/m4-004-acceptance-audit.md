# M4-004 Acceptance Audit — Deterministic Rule Ordering

Status: **ACCEPTED AT IMPLEMENTATION BOUNDARY**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-004 P0 — deterministic rule ordering`  
Audit closed: `2026-08-23`  
PR: `#3 — feat(policy): begin M4 capability broker`  
Accepted M3 base: `65870612d039ce026a6952c16d5e069b11bd24a7`  
Accepted M4-003 governance head: `d23194819d22a82a889dcd91f19807e2e6e048ab`  
Accepted implementation head: `69934dd62903b325b50e9f7b8df9849021e522b7`  
Exact Harness compatibility baseline: `0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a`

This document is an acceptance record, not a normative specification. M4-004 is
accepted because Spec 0020 now defines the previously ambiguous portable
resource-pattern and structural precedence semantics and the reference
implementation satisfies that boundary on one exact dual-green implementation
head.

Acceptance here does **not** mean a policy effect has been selected or an action
has been authorized. `deny`, `ask`, `allow`, default-deny evaluation, subject and
capability matching, arbitrary constraints, leases, approvals and PDP
composition remain later gates.

## 1. Authority and scope

The audit reconciles, in descending authority:

1. `specs/0001-safe-runtime-core.md` §8.3;
2. `specs/0002-state-machines-and-precedence.md` §1;
3. `specs/0019-m4-canonical-resource-normalization.md`;
4. `specs/0020-m4-deterministic-rule-ordering.md`;
5. `schemas/v1alpha1/capability-policy.schema.json`;
6. portable fixtures under `fixtures/rule-ordering/`;
7. `packages/policy-engine` reference implementation and tests;
8. exact-head normal CI evidence;
9. Harness rc5 source-conformance as compatibility evidence only.

The existing v0.1 decision profile remains:

```text
explicit deny
  > more-specific resource
  > higher priority
  > ask
  > allow
  > default deny
```

M4-004 implements only the structural portion required by later effect
evaluation:

```text
portable lexical resource match
  -> resource specificity
  -> comparison-time priority
  -> deterministic precedence bands
```

DeepSeek Harness does not define pattern or precedence semantics.

Explicitly out of scope and still unauthorized by this acceptance:

- M4-005 deny/ask/allow effect selection;
- M4-006 default-deny evaluation;
- M4-007 explain API and later policy diagnostics/hot reload;
- tool classification and PDP composition;
- lease/approval routing and plugin registration;
- M6 Workspace Transaction semantics.

## 2. Protocol gap closure

**PASS.** M1 defined the precedence order but intentionally did not specify a
portable wildcard grammar or resource-specificity algorithm. M4-003 then made
that deferral explicit: `*` and `**` were ordinary locator-pattern data until a
later normative gate defined matching and specificity.

Spec 0020 closes that interoperability gap before implementation by defining:

- `/` as a portable lexical hierarchy separator only, never provider containment;
- `*` as a zero-or-more-code-point wildcard within one segment;
- `**` as a zero-or-more-complete-segment wildcard valid only as an entire
  segment;
- whole-locator anchoring;
- no shell glob, regex, escape, `?`, character-class, brace or extglob semantics;
- Unicode code-point matching rather than UTF-16-code-unit semantics;
- a deterministic specificity tuple;
- comparison-time optional-priority semantics;
- equal-precedence bands rather than an arbitrary single winner.

The specification was self-reviewed before implementation. One non-normative
specificity example was corrected before fixture and implementation acceptance so
no known contradictory example remains in the accepted profile.

## 3. Portable resource-pattern audit

The reference matcher consumes the accepted M4-003 normalization boundary and
does not create a second policy-resource parser.

| Requirement | Result | Evidence |
| --- | --- | --- |
| Exact scheme equality | **PASS** | scheme mismatch portable case |
| Whole-locator anchoring | **PASS** | prefix and suffix non-match cases |
| `*` may match zero/multiple code points | **PASS** | portable cases |
| `*` never crosses `/` | **PASS** | portable negative case |
| `**` matches zero/one/many complete segments | **PASS** | portable cases |
| `**` valid only as an entire segment | **PASS** | embedded/prefixed/triple-star invalid cases |
| Empty slash segments preserved | **PASS** | `https://`-style portable cases |
| `?`, brackets and braces are literal | **PASS** | portable cases |
| Backslash is literal, not an escape or separator | **PASS** | portable case |
| Astral Unicode uses code points | **PASS** | literal and wildcard astral cases |
| Provider identity cannot alter lexical match | **PASS** | direct regression test |
| No host glob/regex/shell/path dependency | **PASS** | custom iterative matcher; no dependency change |

A lexical match remains only a portable policy fact. It is not evidence of
provider-backed filesystem containment, and `providerIdentity` remains opaque.

## 4. Specificity audit

**PASS.** Every valid matching selector receives exactly:

```text
ResourceSpecificity {
  literalCodePoints
  globstarCount
  starCount
}
```

Comparison is lexicographic:

1. higher `literalCodePoints`;
2. lower `globstarCount`;
3. lower `starCount`.

Counts are over Unicode code points. Literal `/` separators count as literals;
`**` contributes one globstar and no stars/literals for its two asterisks.

When multiple selectors of one rule match, the implementation scans the complete
selector set and retains the maximum specificity. A broad selector in the same
rule therefore cannot erase a more-specific match.

Portable coverage directly verifies exact-over-wildcard ordering, literal-count
ordering, globstar tie-breaking, star tie-breaking and most-specific-selector
selection.

## 5. Priority and equal-band audit

**PASS.** Optional priority is comparison-time only:

```text
explicit priority -> that integer
absent priority   -> 0
```

No priority default is inserted into the validated policy. At equal resource
specificity:

```text
positive > absent/0 > negative
```

Resource specificity always dominates priority, including a portable boundary
case comparing `+1000000` on a broad selector with `-1000000` on an exact
selector.

Rules sharing the complete structural key remain in one precedence band. The
implementation does not choose the first rule as an authorization winner.
`ruleIds` inside a band are sorted solely for deterministic representation using
Unicode code-point lexicographic order, with a non-BMP regression case that would
not be safely specified by JavaScript's default UTF-16 string ordering.

Candidate-array and resource-selector permutations produce the same semantic
bands. Policy declaration position is therefore not a hidden precedence rule.

## 6. Effect isolation audit

**PASS.** M4-004's candidate projection intentionally contains only:

```text
id
resources
priority?
```

Production ordering code does not import, inspect, compare or select policy
effects. A direct regression test adds `allow` and `deny`-looking runtime fields
to otherwise identical candidates and verifies that the ordering result is
unchanged.

This preserves the required next-gate boundary:

- M4-005 must implement global fully-matching explicit deny and then `ASK > ALLOW`
  inside the highest relevant structural band;
- M4-004 does not implement either behavior early.

An empty resource-match result is successful `bands: []`, not a deny decision.
M4-006 remains responsible for no-match/default-deny semantics.

## 7. Runtime fail-closed and determinism audit

**PASS.** Runtime values that bypass JSON Schema are handled explicitly:

- duplicate rule IDs fail with `RULE_ORDERING_DUPLICATE_RULE_ID`;
- duplicate selector strings within one candidate fail closed;
- invalid pattern placement fails with `RESOURCE_PATTERN_SYNTAX_INVALID`;
- M4-003 normalization failures are retained rather than converted to non-match;
- own `priority: undefined`, null, non-integer and out-of-range values are invalid;
- required candidate fields must be own properties rather than inherited
  prototype data;
- candidate IDs are bounded to the current 128-code-point schema domain;
- M4-003 bounds locator/pattern input to 4096 Unicode code points.

The matcher uses iterative star/globstar fallback and does not evaluate policy
text as a regular expression or shell glob. Output success objects, specificity
objects, bands and rule-id arrays are frozen.

## 8. Portable fixture audit

`fixtures/rule-ordering/` contains **37 language-independent cases**:

- `pattern-cases.json`: 22 portable matcher/specificity cases;
- `ordering-cases.json`: 15 portable structural-ordering/failure cases.

Reference tests additionally cover provider-identity irrelevance, effect-field
isolation, undefined priority, inherited required fields and permutation
execution.

The portable fixture vocabulary is separate from the TypeScript API and does not
depend on JavaScript iteration or sorting behavior.

## 9. Implementation-scope audit

Diff from accepted M4-003 governance head
`d23194819d22a82a889dcd91f19807e2e6e048ab` to accepted M4-004 implementation
head `69934dd62903b325b50e9f7b8df9849021e522b7` contains only:

- `specs/0020-m4-deterministic-rule-ordering.md`;
- two portable `fixtures/rule-ordering/*.json` files;
- `resource-pattern.ts` and tests;
- `rule-ordering.ts`, types and tests;
- `packages/policy-engine/src/index.ts` public-stage/export updates.

There are no dependency, lockfile, schema, Adapter, Harness-binding, lease,
approval, effect-evaluator, default-deny or PDP changes in the M4-004 diff.

## 10. Exact implementation-head evidence

Accepted implementation head:

```text
69934dd62903b325b50e9f7b8df9849021e522b7
```

Normal CI #291 / run `32607126915`:

| Gate | State | Evidence |
| --- | --- | --- |
| Frozen install | **PASS** | `pnpm install --frozen-lockfile` |
| Supply-chain policy | **PASS** | 124 lockfile entries |
| Architecture boundaries | **PASS** | boundary verification |
| Schema shape | **PASS** | 16 schemas |
| Schema compatibility baseline | **PASS** | baseline unchanged |
| Strict workspace TypeScript | **PASS** | all workspace projections |
| Repository tests | **PASS** | 31 files / 377 tests |
| M4-004 rule-ordering suite | **PASS** | 19 tests |
| M4-004 resource-pattern suite | **PASS** | 24 tests |
| M4-003 normalization regressions | **PASS** | 38 + 2 tests |
| M4-002 validator regressions | **PASS** | 6 tests |
| M4-001 loader regressions | **PASS** | 18 tests |
| Lint | **PASS** | 0 warnings / 0 errors on 101 files |
| Testkit package boundary | **PASS** | 44 assets + external non-workspace consumer |

The immediately preceding CI #289 failed only on three strict TypeScript
narrowing diagnostics in internal helper unions. The repair introduced explicit
`ok` discriminants; it did not add assertions, `any`, compiler relaxations, or
change the normative/fixture semantics.

Exact Harness rc5 source-conformance #235 / run `32607126899`:

| Step | State |
| --- | --- |
| Build pinned Harness public type surface | **PASS** |
| Install safe-runtime dependencies reproducibly | **PASS** |
| Project exact pinned Harness workspace packages | **PASS** |
| Verify projection idempotence | **PASS** |
| Typecheck real rc5 binding against pinned source | **PASS** |
| Execute real rc5 runtime conformance | **PASS** |

No schema, pattern rule, fixture expectation, TypeScript strictness, frozen
lockfile, architecture boundary, supply-chain policy, compatibility gate or
security invariant was weakened to obtain this evidence.

## 11. Acceptance verdict

```text
M4-004 normative pattern/order contract: PASS
M4-004 portable wildcard profile: PASS
M4-004 Unicode code-point semantics: PASS
M4-004 resource specificity: PASS
M4-004 optional-priority comparison: PASS
M4-004 deterministic precedence bands: PASS
M4-004 declaration-order independence: PASS
M4-004 provider-boundary preservation: PASS
M4-004 effect isolation: PASS
M4-004 runtime fail-closed boundary: PASS
M4-004 implementation scope: PASS
M4-004 exact-head CI: PASS
M4-004 Harness compatibility: PASS
M4-004: ACCEPTED AT IMPLEMENTATION BOUNDARY
M4-005: NEXT GATE ONLY AFTER FINAL GOVERNANCE HEAD IS DUAL-GREEN
M4-006+: NOT AUTHORIZED
M6: NOT AUTHORIZED
```

## 12. Next-gate constraint

Governance tracking may now mark only `M4-004` complete. The final governance
head containing this acceptance record, package stage, roadmap, current handoff,
append-only history and PR description must itself pass normal CI and exact
Harness rc5 source-conformance before M4-005 production work begins.

The next and only potentially authorized implementation gate after that final
dual-green is:

```text
M4-005 P0 — deny / ask / allow
```

M4-005 must begin protocol-first by re-reading the existing global explicit-deny
and equal-band effect precedence semantics. It must consume M4-004 structural
bands without turning rule-id presentation order into authorization precedence.
M4-006 default-deny behavior must not be started early.
