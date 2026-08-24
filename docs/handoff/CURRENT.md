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
- M4-001 through M4-006 implementation boundaries: **ACCEPTED**
- M4-006 final governance head: `1e9b5f10c816c4fc7717a130bc1ee6231ab39a6d`
- M4-006 final governance CI: **PASS — CI #324 / run `32687409510`**
- M4-006 final governance Harness: **PASS — #268 / run `32687409515`**
- M4-006 governance: **CLOSED**
- Current gate: **M4-007 P0 — explain API**
- M4-007 authorization: **AUTHORIZED**
- M4-007 implementation: **NOT STARTED**
- M4-008+, M4-020+ and M6: **NOT AUTHORIZED by the current gate**

Live GitHub state overrides this file.

## Accepted compatibility baseline

DeepSeek Harness remains an Adapter compatibility target, never protocol authority:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

M4 policy syntax, matching, decision and explanation semantics MUST NOT be inferred
from Harness APIs or runtime behavior.

## Repository topology after accepted-milestone merge cleanup

The previously stacked accepted milestone PRs are now merged into `main` without
rewriting their accepted commits:

```text
main
  └─ merge M2 PR #1: 52233e19...
       └─ accepted M2 head: 6a9c641...
  └─ merge M3 PR #2: 57430273...
       └─ final accepted M3 governance head: 65870612...
```

PR #3 was retargeted from `feat/m3-shared-tck-foundation` to `main` and remains
Draft. Its M4 commit ancestry was not rebased, squashed, or force-rewritten.

## M4-006 closure

Accepted implementation head:

```text
de614120fdbf5c210c3b4f823d215a9ea89916b5
```

Implementation evidence:

- CI #320 / run `32685942246`: PASS;
- Harness #264 / run `32685942253`: PASS;
- 33 test files / 444 tests: PASS;
- M4-006 default-deny suite: 35 PASS;
- strict TypeScript: PASS;
- frozen install and 124-entry supply-chain policy: PASS;
- architecture / 16-schema shape / schema baseline: PASS;
- oxlint: 0 warnings / 0 errors;
- Shared TCK external consumer: 44 assets PASS.

Final governance head:

```text
1e9b5f10c816c4fc7717a130bc1ee6231ab39a6d
```

Final governance evidence:

```text
CI #324 / 32687409510: SUCCESS
Harness #268 / 32687409515: SUCCESS
```

Therefore M4-007 is formally authorized.

## M4-007 recovered normative boundary

Authority to reconcile before implementation:

```text
specs/0001-safe-runtime-core.md
specs/0002-state-machines-and-precedence.md
schemas/v1alpha1/capability-decision.schema.json
packages/protocol/src/capability.ts
specs/0020-m4-deterministic-rule-ordering.md
specs/0021-m4-effect-resolution.md
specs/0022-m4-defensive-default-deny.md
```

Recovered facts:

1. `CapabilityDecision` already exists and optionally carries `policyRef`,
   `matchedRuleRefs`, `reasonCode`, and `reason`.
2. M4-005 intentionally does not publish decisive rule IDs and explicitly defers
   explanation representation to M4-007/M4-024.
3. M4-006 distinguishes a conforming default deny from defensive fail-closed deny;
   its failure-side `effect: deny` is not proof of an explicit policy deny.
4. M4-004 rule-ID order inside equal bands is deterministic presentation only,
   never authorization precedence.
5. Full applicability, subject resolution and full policy evaluation remain
   M4-020/M4-021 responsibilities.
6. Stable decision identity, persisted rule/policy refs, receipt/provenance and
   guarantee assignment remain later gates.

## M4-007 protocol-first candidate

Normative candidate:

```text
specs/0023-m4-policy-effect-explanation.md
```

Portable candidate corpus:

```text
fixtures/policy-explanation/cases.json
```

The candidate is intentionally narrow:

```text
fully-applicable M4-004 bands
+ exact M4-005 effect bindings
+ presence-preserving policy spec
  -> reuse M4-005
  -> reuse M4-006
  -> structured deterministic explanation
```

Normal explanation bases are:

```text
EXPLICIT_DENY
HIGHEST_BAND_ASK
HIGHEST_BAND_ALLOW
DEFAULT_DENY
FAIL_CLOSED
```

The output uses `contributingRuleIds`, not protocol `matchedRuleRefs`.

Rules:

- explicit deny explains all fully-applicable deny contributors;
- ask explains only ask contributors in the highest structural band;
- allow explains all rules in the highest structural band;
- default deny has no contributing rule IDs;
- M4-006 fail-closed deny has no contributing rule IDs and retains its exact reason
  code;
- M4-005 invalid input produces explanation failure rather than a fabricated deny
  explanation;
- rule-ID presentation is Unicode code-point lexicographic only;
- no free-form reason text, resource locator, constraint, secret, request argument,
  policy source text, `policyRef`, decision ID, timestamp or guarantee level enters
  this primitive.

For JavaScript/TypeScript, M4-007 must additionally materialize its narrow input
through own data-property descriptors before invoking M4-005 so accessor-backed
fields/array elements cannot execute getters during explanation.

## Current acceptance gate

The current candidate changes are specification + portable fixtures + refreshed
handoff only.

Before production TypeScript implementation:

1. the candidate spec/fixture head must pass normal CI;
2. exact Harness rc5 source-conformance on the same head must remain green;
3. failures must be diagnosed from that exact head;
4. no schema, validator, TCK, strict TypeScript, frozen lockfile, supply-chain,
   architecture or fail-closed rule may be weakened.

After that dual-green prerequisite, the next implementation step is limited to the
M4-007 explanation primitive and its runtime hardening/tests.

## Boundaries that remain enforced

- Protocol/spec precedes implementation.
- Specs/schemas/TCK are semantic authority.
- Harness is compatibility evidence only.
- M4-003 normalization is not provider containment.
- M4-004 structural ordering is not full rule applicability.
- M4-005 effect resolution assumes full applicability.
- M4-006 finalization is not a persisted CapabilityDecision.
- M4-007 explanation is not full PDP evaluation or durable provenance.
- `contributingRuleIds` MUST NOT be mechanically promoted to
  `CapabilityDecision.matchedRuleRefs`.
- Approval, lease, decision receipt/provenance and guarantee assignment remain later
  gates.
- M4-008+, M4-020+ and M6 remain unauthorized until their gates are explicitly
  opened.

## Resume instruction

On the next session:

1. read `docs/handoff/README.md` and this file;
2. fetch PR #3 live base/head and exact-head workflows;
3. live GitHub facts override this snapshot;
4. if the M4-007 spec/fixture candidate is not exact-head dual-green, finish that
   gate first;
5. only after that candidate is dual-green, implement the M4-007 TypeScript
   projection;
6. on failure inspect the exact current-head job/log before editing;
7. do not start M4-008+, M4-020+ or M6 early.
