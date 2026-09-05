# M4-003 Acceptance Audit — Canonical Resource Normalization

Status: **ACCEPTED AT IMPLEMENTATION BOUNDARY**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-003 P0 — canonical resource normalization`  
Audit closed: `2026-08-23`  
PR: `#3 — feat(policy): begin M4 capability broker`  
Accepted M4-002 governance head: `3cddafdacfb21f62ae25dad9338f3df6165a0461`  
Accepted implementation head: `edd91190eb4489e7b73a8cc7fde05140939cb36d`  
Exact Harness compatibility baseline: `0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a`

This document records implementation acceptance only. It does not redefine the
normative contract in Spec 0019 and does not authorize rule matching, rule
ordering, effect evaluation, default-deny evaluation, lease behavior, approval
routing, or Workspace Transaction semantics.

## 1. Normative authority and scope

M4-003 is governed by:

1. `specs/0019-m4-canonical-resource-normalization.md`;
2. existing M1 Capability resource semantics in `specs/0001-safe-runtime-core.md`;
3. precedence-stage ordering in `specs/0002-state-machines-and-precedence.md`;
4. `schemas/v1alpha1/defs.schema.json#/$defs/resource`;
5. language-independent fixtures under `fixtures/resource-normalization/`;
6. the TypeScript projection in `packages/policy-engine`;
7. exact-head normal CI and Harness compatibility evidence.

DeepSeek Harness remains Adapter compatibility evidence only. Provider target
keys, display paths, process paths, local realpaths and Harness implementation
details are not protocol authority.

## 2. Accepted semantic boundary

M4-003 establishes a **structural, rejecting** canonicalization boundary.
Successful normalization does not rewrite an accepted locator into an operating
system path, URL, executable, secret value, provider target, or containment
claim.

The accepted boundary has two operations:

```text
CapabilityResource -> CanonicalResource
policy resources[] string -> CanonicalResourceSelector
```

The exact resource shape remains:

```text
scheme
locator
providerIdentity?  // opaque provider-owned token
```

The policy selector outer shape is parsed only as:

```text
<scheme>://<locator-pattern>
```

using the first literal `://`. Wildcards remain pattern data at M4-003 and are
not interpreted.

## 3. Contract audit

| Requirement | Result | Evidence |
| --- | --- | --- |
| Standard schemes only | **PASS** | exact lowercase guard for workspace/hostfs/process/network/secret/session/config/external |
| No silent scheme case-folding | **PASS** | differently-cased fixture fails `RESOURCE_SCHEME_UNSUPPORTED` |
| Non-empty locator/pattern | **PASS** | portable negative fixtures |
| 4096 Unicode code-point bound | **PASS** | production bounded `for...of`; BMP and astral 4096/4097 fixtures |
| C0 controls rejected | **PASS** | newline, NUL and tab coverage |
| `U+007F` rejected | **PASS** | dedicated portable DEL regression |
| Spaces preserved | **PASS** | leading/trailing and interior spaces remain byte/code-point exact |
| Unicode preserved | **PASS** | decomposed Unicode is not normalized |
| Dot segments not resolved | **PASS** | `/src/../secrets.txt` remains unchanged |
| Provider identity opaque | **PASS** | no parsing/case-folding/path conversion; exact preservation fixture |
| Provider identity optional only when absent | **PASS** | own `providerIdentity: undefined` is rejected as invalid runtime input |
| Inherited fields excluded | **PASS** | direct runtime tests prove prototype fields never become authorization input |
| Additional exact-resource fields fail closed | **PASS** | `displayPath` regression plus own-key whitelist |
| Selector split uses first `://` | **PASS** | `network://https://...` fixture |
| Wildcard semantics deferred | **PASS** | no matcher/specificity implementation in M4-003 diff |
| No host/provider resolution | **PASS** | production normalizer imports no fs/path/URL/DNS/Harness capability |
| Detached success value | **PASS** | caller mutation regression |
| Frozen TypeScript result | **PASS** | result/resource freeze regression |
| Idempotence | **PASS** | every successful portable case is normalized twice |
| Deterministic portable failures | **PASS** | explicit reason + field contract and ordered validation |
| No secret dereference | **PASS** | no lookup/provider operation in normalizer |
| No policy decision | **PASS** | no allow/deny/ask/evaluator code |

## 4. Runtime fail-closed hardening

The acceptance review intentionally tested values that bypass JSON Schema and
static TypeScript types.

The implementation accepts only **own data fields** as resource structure:

- inherited `scheme` does not satisfy the required scheme field;
- inherited `locator` does not satisfy the required locator field;
- inherited `providerIdentity` is ignored when the optional own field is absent;
- an own `providerIdentity` whose runtime value is `undefined` is invalid rather
  than silently treated as absent;
- unexpected own string or symbol keys fail the exact-resource object boundary.

This preserves the schema's `required` / `additionalProperties: false` intent at
the runtime defense-in-depth layer and prevents prototype-chain data from
becoming authorization input.

## 5. Unicode boundary audit

Spec 0019 defines the string limit in **Unicode code points**, not JavaScript
UTF-16 code units.

The reference implementation therefore uses a bounded `for...of` traversal and
does not use `string.length` as the semantic limit. Portable hardening fixtures
prove:

```text
😀 x 4096 code points -> PASS
😀 x 4097 code points -> RESOURCE_LIMIT_EXCEEDED
```

This prevents an implementation from accidentally rejecting valid astral input
at half the portable limit or accepting an over-limit input because of a
language-specific counting rule.

## 6. Provider/security boundary audit

M4-003 preserves the existing M1/M2 provider boundary:

- `providerIdentity` is an opaque token, not a path or URI;
- no provider token is synthesized from locator text;
- no provider token is decoded into locator text;
- no locator/display path/token string prefix is treated as filesystem
  containment;
- no symlink, junction, reparse-point, mount, hardlink or realpath operation is
  performed by `policy-engine` normalization;
- actual provider identity/containment remains an Adapter/runtime responsibility
  through the provider seam.

The accepted M2 adapter-local target map continues to prevent a guessed opaque
token from manufacturing a provider target. M4-003 neither duplicates nor
weakens that seam.

## 7. Portable fixture audit

Language-independent resource-normalization fixtures cover **35 portable
cases** across:

- exact resource valid/invalid domains;
- selector valid/invalid domains;
- scheme identity;
- spaces and Unicode preservation;
- no dot-segment resolution;
- provider identity preservation and validation;
- first-delimiter parsing;
- 4096/4097 limits;
- astral Unicode code-point limits;
- C0 and DELETE controls.

The fixture-only `$repeatCodePoint` / `$concat` vocabulary exists solely to
materialize deterministic large test values. Template objects are never protocol
inputs.

The TypeScript suite adds direct runtime-only cases that cannot be represented
in JSON, including own `undefined` and inherited prototype properties.

## 8. Implementation-scope audit

Diff from accepted M4-002 governance head
`3cddafdacfb21f62ae25dad9338f3df6165a0461` to accepted M4-003 implementation
head `edd91190eb4489e7b73a8cc7fde05140939cb36d` changes only:

- `specs/0019-m4-canonical-resource-normalization.md`;
- `fixtures/resource-normalization/cases.json`;
- `fixtures/resource-normalization/unicode-boundary-cases.json`;
- `packages/policy-engine/src/resource-normalization-types.ts`;
- `packages/policy-engine/src/resource-normalizer.ts`;
- resource-normalizer fixture/runtime-boundary tests;
- `packages/policy-engine/src/index.ts` stage/exports.

There is no dependency or lockfile change, schema mutation, Harness import,
matcher, specificity comparator, deterministic rule ordering, effect precedence,
default-deny evaluator, lease consumption, approval routing or M6 implementation.

## 9. Exact implementation-head evidence

Accepted implementation head:

```text
edd91190eb4489e7b73a8cc7fde05140939cb36d
```

Normal CI #275 / run `32604956296`:

- `pnpm install --frozen-lockfile`: **PASS**;
- supply-chain lockfile policy: **PASS — 124 entries**;
- architecture boundaries: **PASS**;
- schema shape: **PASS — 16 schemas**;
- schema compatibility baseline: **PASS**;
- strict workspace TypeScript: **PASS**;
- repository tests: **PASS — 29 files / 334 tests**;
- M4-003 portable normalizer suite: **PASS — 38 tests**;
- M4-003 runtime object-boundary suite: **PASS — 2 tests**;
- M4-002 validator regressions: **PASS — 6 tests**;
- M4-001 loader regressions: **PASS — 18 tests**;
- JSON parser regressions: **PASS — 9 tests**;
- oxlint: **PASS — 0 warnings / 0 errors**;
- packed Shared TCK + external non-workspace consumer: **PASS — 44 registered assets**.

Exact Harness rc5 source-conformance #219 / run `32604956288`:

- build pinned Harness public type surface: **PASS**;
- install safe-runtime dependencies reproducibly: **PASS**;
- project exact pinned Harness workspace packages: **PASS**;
- verify workspace projection idempotence: **PASS**;
- typecheck real rc5 binding against pinned source: **PASS**;
- execute real rc5 runtime conformance: **PASS**.

No schema, validator, fixture expectation, TypeScript strictness, frozen lockfile,
supply-chain rule, architecture boundary, compatibility gate or security
invariant was weakened to obtain this evidence.

## 10. Acceptance verdict

```text
M4-003 normative contract: PASS
M4-003 portable fixture coverage: PASS
M4-003 structural/rejecting normalization: PASS
M4-003 Unicode code-point semantics: PASS
M4-003 prototype/own-property fail-closed boundary: PASS
M4-003 provider opacity boundary: PASS
M4-003 no-host-path-inference boundary: PASS
M4-003 no M4-004+ scope leakage: PASS
M4-003 exact-head normal CI: PASS
M4-003 exact-head Harness compatibility: PASS
M4-003: ACCEPTED AT IMPLEMENTATION BOUNDARY
```

## 11. Next-gate constraint

M4-004 is **not yet authorized** by this record alone.

The governance head that records this acceptance must update package stage,
roadmap, CURRENT handoff, append-only HISTORY and PR state, then pass both normal
CI and exact Harness rc5 source-conformance.

Only after that final governance-head dual-green may the next gate be considered:

```text
M4-004 P0 — deterministic rule ordering
```

Before M4-004 implementation, re-read the existing precedence specification and
all relevant policy/schema semantics. Do not infer ordering from JavaScript
array behavior, object key order, Harness behavior, or roadmap shorthand.
