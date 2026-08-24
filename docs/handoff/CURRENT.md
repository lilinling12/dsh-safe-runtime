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
- Stacked base: `feat/m3-shared-tck-foundation@65870612d039ce026a6952c16d5e069b11bd24a7`
- M2 acceptance: **ACCEPTED**
- M3 acceptance: **ACCEPTED**
- M4-001 acceptance: **ACCEPTED AT IMPLEMENTATION BOUNDARY**
- M4-002 acceptance: **ACCEPTED AT IMPLEMENTATION BOUNDARY**
- M4-003 acceptance: **ACCEPTED AT IMPLEMENTATION BOUNDARY**
- M4-004 acceptance: **ACCEPTED AT IMPLEMENTATION BOUNDARY**
- M4-005 acceptance: **ACCEPTED AT IMPLEMENTATION BOUNDARY**
- M4-006 acceptance: **ACCEPTED AT IMPLEMENTATION BOUNDARY**
- M4-006 acceptance record: `docs/acceptance/m4-006-acceptance-audit.md`
- Accepted M4-006 implementation head: `de614120fdbf5c210c3b4f823d215a9ea89916b5`
- M4-006 normal CI: **PASS — CI #320 / run `32685942246`**
- M4-006 Harness rc5 source-conformance: **PASS — #264 / run `32685942253`**
- Next gate after final governance verification: **M4-007 P0 — explain API**

Live GitHub state always overrides this file. PR #3 remains intentionally stacked
on the final accepted M3 governance head so M4 work cannot mutate the accepted M3
evidence line.

## Accepted compatibility baseline

DeepSeek Harness remains an Adapter compatibility target, never protocol authority:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

M4 policy syntax, matching, decision and explanation semantics must not be inferred
from Harness APIs or runtime behavior.

## M4-006 acceptance boundary

Normative authority:

```text
specs/0001-safe-runtime-core.md
specs/0002-state-machines-and-precedence.md
specs/0018-m4-capability-policy-schema-validation.md
specs/0021-m4-effect-resolution.md
specs/0022-m4-defensive-default-deny.md
schemas/v1alpha1/capability-policy.schema.json
```

Acceptance record:

```text
docs/acceptance/m4-006-acceptance-audit.md
```

M4-006 is a narrow defensive default-deny finalizer after successful M4-005 effect
resolution. It is not full policy evaluation and does not make schema-invalid
policies valid.

Accepted semantics and security properties:

1. the normal validated-policy path still requires an own `defaultEffect: deny`;
2. resolved M4-005 allow/ask/deny is preserved when that default configuration is
   valid;
3. `NO_APPLICABLE_RULES` plus valid default configuration finalizes to deny;
4. missing/inherited/accessor-backed/undefined/null/allow/ask/unknown/non-string
   default effect yields `DEFAULT_EFFECT_CONFIG_INVALID` plus mandatory fail-closed
   effect deny;
5. invalid default configuration is checked before malformed upstream state so a
   schema-bypassing policy fragment cannot escape fail-closed behavior through a
   partial allow;
6. malformed M4-005 success input yields distinct `DEFAULT_DENY_INPUT_INVALID`
   plus fail-closed deny;
7. M4-006 receives the policy-spec object (or presence-preserving equivalent)
   rather than a pre-extracted scalar, preserving own-field presence as a security
   fact;
8. security-relevant JavaScript fields are read through own data-property
   descriptors rather than ordinary property access, so accessor getters are
   rejected without being executed;
9. descriptor/proxy inspection failures fail closed;
10. inherited M4-005 status/effect values cannot become authorization input;
11. unexpected own string/symbol fields on the narrow M4-005 projection fail
    closed;
12. unrelated valid policy-spec fields such as `rules` and `delegation` are not
    rejected because M4-006 is not a second schema validator;
13. native M4-005 TypeScript success outputs compose directly with M4-006;
14. M4-005 failures are never treated as success;
15. caller inputs are not mutated and all returned primitives are frozen.

The failure result's `effect: deny` is a fail-closed enforcement fact, not proof
that a valid policy explicitly decided deny.

M4-006 does **not** implement subject resolution, capability matching, unknown-
capability classification, arbitrary constraints, raw rule collection, approval,
leases, CapabilityDecision construction, explain/provenance, guarantee assignment,
receipts, classifier/plugin integration or Adapter enforcement.

## M4-006 exact-head evidence

Accepted implementation head:

```text
de614120fdbf5c210c3b4f823d215a9ea89916b5
```

Normal CI #320 / run `32685942246`:

- `pnpm install --frozen-lockfile`: PASS;
- supply-chain lockfile policy: PASS (124 entries);
- architecture boundaries: PASS;
- schema shape: PASS (16 schemas);
- schema compatibility baseline: PASS;
- strict workspace TypeScript: PASS;
- repository tests: PASS (33 files / 444 tests);
- M4-006 default-deny suite: PASS (35 tests);
- M4-005 effect-resolution regressions: PASS (32 tests);
- M4-004 rule-ordering regressions: PASS (19 tests);
- M4-004 resource-pattern regressions: PASS (24 tests);
- M4-003 normalization regressions: PASS (38 + 2 tests);
- M4-002 validator regressions: PASS (6 tests);
- M4-001 loader regressions: PASS (18 tests);
- oxlint: PASS (0 warnings / 0 errors on 107 files);
- packed Shared TCK + external non-workspace consumer: PASS (44 registered assets).

Harness rc5 source-conformance #264 / run `32685942253`:

- step 6 — pinned Harness public type build: PASS;
- step 7 — reproducible safe-runtime install: PASS;
- step 8 — exact workspace projection: PASS;
- step 9 — projection idempotence: PASS;
- step 10 — exact rc5 binding typecheck: PASS;
- step 11 — real rc5 runtime conformance: PASS.

Two security defects were found and fixed during acceptance review even after
intermediate heads were green:

1. scalar `defaultEffect` input erased field-presence information and was replaced
   by a presence-preserving policy-spec boundary;
2. own-property checks followed by ordinary property access could execute getters,
   so the accepted head requires own data-property descriptors and tests that
   getters are never called.

No standards were weakened to preserve CI.

## Scope audit

Compared with final M4-005 governance head
`29561bcb24540055f7a7b495f862190c15b51874`, M4-006 changes only:

```text
specs/0022-m4-defensive-default-deny.md
fixtures/default-deny/cases.json
packages/policy-engine/src/default-deny-types.ts
packages/policy-engine/src/default-deny.ts
packages/policy-engine/src/default-deny.test.ts
packages/policy-engine/src/index.ts
```

There are no dependency, lockfile, schema, Adapter, Harness-workflow, full-PDP,
approval, lease, decision-record, receipt, guarantee, classifier or M6 changes.

## Governance closure rule

M4-006's implementation boundary is accepted, but the governance records that
record this acceptance must themselves pass normal CI and exact Harness rc5
source-conformance before M4-007 begins.

Therefore:

```text
M4-001 implementation: ACCEPTED
M4-002 implementation: ACCEPTED
M4-003 implementation: ACCEPTED
M4-004 implementation: ACCEPTED
M4-005 implementation: ACCEPTED
M4-006 implementation: ACCEPTED
M4-007 implementation: NOT STARTED
M4-007 authorization: PENDING FINAL M4-006 GOVERNANCE-HEAD DUAL-GREEN
M4-008+: NOT AUTHORIZED
M4-020+: NOT AUTHORIZED BY M4-006
M6: NOT AUTHORIZED
```

Do not start M4-007 production code until the final governance head containing
M4-006's acceptance audit, package stage, roadmap, this handoff, append-only
history and synchronized PR description is dual-green.

## Next gate — M4-007 explain API

After final governance dual-green, the next and only newly authorized policy-
engine gate is:

```text
M4-007 P0 — explain API
```

M4-007 must begin protocol-first. Before defining its representation, re-read:

- Core CapabilityDecision semantics;
- `schemas/v1alpha1/capability-decision.schema.json`;
- existing explanation/provenance requirements in specs/roadmap;
- M4-004/M4-005/M4-006 result boundaries.

M4-007 must not steal M4-024 full decision-receipt/provenance responsibilities or
M4-021 full policy evaluation. In particular, deterministic rule-ID presentation
order must not be repurposed as authorization precedence.

## Boundaries that remain enforced

- Protocol/spec precedes implementation.
- `specs/` is semantic authority; TypeScript packages are projections.
- DeepSeek Harness is an Adapter and cannot define Capability Broker semantics.
- Successful M4-001 loading is not policy validity or authorization.
- Successful M4-002 validation is not full policy evaluation.
- Successful M4-003 normalization is not provider containment or authorization.
- Successful M4-004 resource ordering is not a complete rule match or decision.
- Successful M4-005 effect resolution assumes full applicability was already
  proven and is not itself a complete PDP or persisted CapabilityDecision.
- Successful M4-006 finalization is still a primitive effect fact, not a persisted
  CapabilityDecision, receipt, guarantee claim or enforcement action.
- Filesystem containment remains provider-owned.
- Do not weaken TypeScript strictness, schemas, compatibility baseline,
  validators, conformance tests, frozen installs, architecture/security gates or
  supply-chain checks for CI.
- M4-008+, M4-020+ and M6 remain unauthorized by this gate.

## Resume instruction

On the next work session:

1. read `docs/handoff/README.md` and this file;
2. fetch PR #3 live head and exact-head workflow results;
3. live GitHub evidence overrides this snapshot;
4. if M4-006 governance closure is not dual-green, finish it first;
5. only after final governance dual-green, begin M4-007 protocol-first;
6. inspect exact current-head diagnostics on any failure; never infer from stale
   logs;
7. do not start M4-008+, M4-020+ or M6 early.
