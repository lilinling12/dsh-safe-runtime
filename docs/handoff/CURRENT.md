# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK and accepted exact-head evidence
> remain semantic authority.

## Snapshot

- Recorded at: `2026-08-24`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M4 — Capability Broker v0.1`
- Active pull request: `#3 — feat(policy): begin M4 capability broker`
- PR state: `OPEN / DRAFT`
- Branch: `feat/m4-capability-broker`
- Base: `main@57430273e065be8d38807d67b175fa154c801d43`
- M2: **ACCEPTED / MERGED** — PR #1 merge commit `52233e19c15504d5c5f77522bb4bf58a2d23c56f`
- M3: **ACCEPTED / MERGED** — PR #2 merge commit `57430273e065be8d38807d67b175fa154c801d43`
- M4-001 through M4-007 implementation boundaries: **ACCEPTED**
- M4-007 acceptance record: `docs/acceptance/m4-007-acceptance-audit.md`
- Accepted M4-007 implementation head: `1c8bc9ef50a6c680a930814821267e76d79357ac`
- M4-007 normal CI: **PASS — CI #329 / run `32716573950`**
- M4-007 Harness rc5 source-conformance: **PASS — #271 / run `32716573857`**
- M4-007 governance closure: **PENDING FINAL GOVERNANCE-HEAD DUAL-GREEN**
- M4-008 implementation: **NOT STARTED**
- M4-008 authorization: **PENDING FINAL M4-007 GOVERNANCE-HEAD DUAL-GREEN**
- M4-020+ and M6: **NOT AUTHORIZED by the current gate**

Live GitHub state overrides this file.

## Accepted compatibility baseline

DeepSeek Harness remains an Adapter compatibility target, never protocol authority:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

M4 explanation/matching/decision semantics are not inferred from Harness.

## Repository topology

Accepted M2 and M3 milestone PRs are merged into `main` using merge commits so
accepted exact SHAs remain reachable in main ancestry.

PR #3 is directly based on `main` and remains Draft while M4 is in progress. M4
history was not rebased, squashed, or force-rewritten during the base cleanup.

## M4-007 authority

Accepted normative profile:

```text
specs/0023-m4-policy-effect-explanation.md
```

Reconciled authority:

```text
specs/0001-safe-runtime-core.md
specs/0002-state-machines-and-precedence.md
schemas/v1alpha1/capability-decision.schema.json
packages/protocol/src/capability.ts
specs/0020-m4-deterministic-rule-ordering.md
specs/0021-m4-effect-resolution.md
specs/0022-m4-defensive-default-deny.md
```

Portable corpus:

```text
fixtures/policy-explanation/cases.json
```

## Accepted M4-007 semantic boundary

M4-007 explains only the effect facts owned by M4-005/M4-006 over an
already-proven fully-applicable rule set.

Composition:

```text
safe JavaScript data materialization
  -> M4-005 resolveApplicableRuleEffects()
  -> M4-006 finalizeDefaultDeny()
  -> deterministic explanation projection
```

Accepted explanation bases:

```text
EXPLICIT_DENY
HIGHEST_BAND_ASK
HIGHEST_BAND_ALLOW
DEFAULT_DENY
FAIL_CLOSED
```

Accepted contributor semantics:

1. explicit deny -> every fully-applicable deny contributor across all bands;
2. ask -> only ask contributors in the highest structural band;
3. allow -> all rules in the highest structural band;
4. default deny -> no contributing rules;
5. defensive M4-006 fail closed -> no contributing rules.

`contributingRuleIds` is deliberately not `CapabilityDecision.matchedRuleRefs`.

It does not claim a complete match set, stable cross-policy rule references, or
durable decision provenance.

Rule-ID list ordering is deterministic Unicode code-point presentation only and
never becomes authorization precedence.

M4-005 invalid input returns `EXPLAIN_FAILED`; it is not converted into a
fabricated deny explanation.

## Runtime hardening

Before M4-005 sees JavaScript input, M4-007 materializes the narrow bands/effects
projection using own data-property descriptors.

The accepted runtime suite proves:

- accessor-backed band fields do not execute getters;
- accessor-backed top-level array elements do not execute getters;
- accessor-backed nested specificity fields do not execute getters;
- accessor-backed effect bindings do not execute getters;
- accessor-backed rule-ID array elements do not execute getters;
- sparse arrays fail at the language boundary;
- named/symbol array properties fail at the language boundary;
- revoked proxies in bands/effects fail explicitly;
- inherited required effect fields cannot become authorization input;
- policy-spec accessors/revoked proxies preserve M4-006 fail-closed behavior;
- caller inputs are not mutated;
- success/failure objects are frozen;
- contributor arrays are detached and frozen;
- no policyRef/matchedRuleRefs/decisionId/guaranteeLevel/free-form reason is invented.

The first implementation head `ab01ff52...` was already dual-green, but acceptance
review added five explicit hardening regressions before accepting `1c8bc9ef...`.

## Exact accepted implementation evidence

Accepted head:

```text
1c8bc9ef50a6c680a930814821267e76d79357ac
```

Normal CI #329 / run `32716573950`:

- frozen install: PASS;
- supply-chain policy: PASS (124 entries);
- architecture boundaries: PASS;
- schema shape: PASS (16 schemas);
- schema compatibility baseline: PASS;
- strict TypeScript: PASS;
- 34 test files / 477 tests: PASS;
- M4-007 explanation suite: 33 PASS;
- M4-006 default-deny suite: 35 PASS;
- M4-005 effect-resolution suite: 32 PASS;
- M4-004 rule-ordering suite: 19 PASS;
- M4-004 resource-pattern suite: 24 PASS;
- M4-003 normalization regressions: 38 + 2 PASS;
- M4-002 validator regressions: 6 PASS;
- M4-001 loader regressions: 18 PASS;
- oxlint: 0 warnings / 0 errors on 110 files;
- Shared TCK packed artifact + external consumer: 44 assets PASS.

Harness #271 / run `32716573857`:

- pinned Harness public type build: PASS;
- reproducible safe-runtime install: PASS;
- exact workspace projection: PASS;
- projection idempotence: PASS;
- exact rc5 binding typecheck: PASS;
- real rc5 runtime conformance: PASS.

No quality or security gate was weakened.

## Scope audit

Relative to final M4-006 governance head `1e9b5f10...`, M4-007 changes only:

```text
specs/0023-m4-policy-effect-explanation.md
fixtures/policy-explanation/cases.json
packages/policy-engine/src/policy-effect-explanation-types.ts
packages/policy-engine/src/policy-effect-explanation.ts
packages/policy-engine/src/policy-effect-explanation.test.ts
packages/policy-engine/src/index.ts
docs/handoff/CURRENT.md
```

Acceptance governance adds only the acceptance record and state synchronization.

There are no dependency, lockfile, schema, protocol CapabilityDecision, Adapter,
Harness workflow, subject resolution, full PDP, approval, lease, receipt,
provenance, guarantee, classifier, plugin, or M6 implementation changes.

## Governance closure rule

M4-007 is accepted at its implementation boundary, but the governance head that
records acceptance must itself pass:

```text
normal CI
+ exact Harness rc5 source-conformance
```

Until that happens:

```text
M4-007 implementation: ACCEPTED
M4-007 governance closure: PENDING
M4-008 implementation: NOT STARTED
M4-008 authorization: PENDING FINAL M4-007 GOVERNANCE-HEAD DUAL-GREEN
M4-020+: NOT AUTHORIZED
M6: NOT AUTHORIZED
```

Do not begin M4-008 production work before the final M4-007 governance head is
dual-green.

## Boundaries that remain enforced

- Protocol/spec precedes implementation.
- Specs/schemas/TCK remain semantic authority.
- Harness is compatibility evidence only.
- M4-004 ordering is not full applicability.
- M4-005 assumes full applicability.
- M4-006 finalization is not a persisted CapabilityDecision.
- M4-007 explanation is not a full PDP or durable provenance.
- `contributingRuleIds` must not be mechanically promoted to `matchedRuleRefs`.
- Subject resolution/full policy evaluation remain M4-020/M4-021.
- Approval remains M4-023.
- Decision receipt/provenance remains M4-024.
- Guarantee assignment remains M4-025.
- M4-008 and all later gates remain blocked until explicitly authorized.
- Never weaken schemas, validators, TCK, strict TypeScript, frozen installs,
  supply-chain policy, architecture boundaries, compatibility evidence, or
  fail-closed behavior for CI.

## Resume instruction

On the next session:

1. read `docs/handoff/README.md` and this file;
2. fetch PR #3 live base/head and exact-head workflows;
3. live GitHub state overrides this snapshot;
4. finish M4-007 final governance closure if it is not exact-head dual-green;
5. only after closure may M4-008 begin protocol-first;
6. inspect exact current-head diagnostics before fixing any failure;
7. do not start M4-020+ or M6 early.
