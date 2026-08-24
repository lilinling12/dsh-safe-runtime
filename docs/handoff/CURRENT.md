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
- M4-005 acceptance record: `docs/acceptance/m4-005-acceptance-audit.md`
- Accepted M4-005 implementation head: `81e09435f1c038205977e740f8ac11c4d1bab796`
- M4-005 normal CI: **PASS — CI #304 / run `32684842763`**
- M4-005 Harness rc5 source-conformance: **PASS — #248 / run `32684842738`**
- Next gate after final governance verification: **M4-006 P0 — default deny**

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

M4 policy syntax, matching and decision semantics must not be inferred from
Harness APIs or runtime behavior.

## M4-005 acceptance boundary

Normative authority:

```text
specs/0001-safe-runtime-core.md
specs/0002-state-machines-and-precedence.md
specs/0020-m4-deterministic-rule-ordering.md
specs/0021-m4-effect-resolution.md
schemas/v1alpha1/capability-policy.schema.json
```

Acceptance record:

```text
docs/acceptance/m4-005-acceptance-audit.md
```

M4-005 is a narrow deterministic effect-resolution primitive. It consumes only
rules whose full applicability has already been proven by an upstream evaluator,
plus their accepted M4-004 structural bands.

Accepted semantics:

1. any fully applicable explicit deny in any structural band resolves `deny`;
2. if no deny exists, only the highest M4-004 structural band participates in
   ask/allow selection;
3. `ask > allow` only inside that highest equal band;
4. deterministic rule-ID presentation order never becomes authorization
   precedence;
5. empty fully-applicable input returns `NO_APPLICABLE_RULES`, not deny;
6. malformed/noncanonical structural bands fail closed;
7. split equal structural keys fail closed;
8. the band rule-ID set and effect-binding set must match exactly 1:1;
9. unknown/case-changed effects fail closed;
10. runtime required fields must be own properties; inherited prototype data does
    not become authorization input;
11. unexpected band/effect-binding fields fail closed;
12. specificity counts are non-negative safe integers and priority remains within
    `[-1000000, 1000000]`;
13. rule IDs are bounded to 128 Unicode code points with early-exit `for...of`
    traversal, avoiding input-sized temporary arrays for oversized runtime input;
14. non-BMP rule IDs retain Unicode code-point comparison semantics;
15. resolver input is not mutated and success/failure primitives are frozen;
16. M4-004 comparators are reused rather than redefining specificity/order.

M4-005 does **not** consume raw CapabilityPolicy as a full evaluator and does not
implement subject resolution, capability matching, arbitrary constraints,
`defaultEffect`, approval routing, leases, CapabilityDecision construction,
guarantee assignment, receipts, classifier behavior or Adapter enforcement.

## M4-005 exact-head evidence

Accepted implementation head:

```text
81e09435f1c038205977e740f8ac11c4d1bab796
```

Normal CI #304 / run `32684842763`:

- `pnpm install --frozen-lockfile`: PASS;
- supply-chain lockfile policy: PASS (124 entries);
- architecture boundaries: PASS;
- schema shape: PASS (16 schemas);
- schema compatibility baseline: PASS;
- strict workspace TypeScript: PASS;
- repository tests: PASS (32 files / 409 tests);
- M4-005 effect-resolution suite: PASS (32 tests);
- M4-004 rule-ordering regressions: PASS (19 tests);
- M4-004 resource-pattern regressions: PASS (24 tests);
- M4-003 normalization regressions: PASS (38 + 2 tests);
- M4-002 validator regressions: PASS (6 tests);
- M4-001 loader regressions: PASS (18 tests);
- oxlint: PASS (0 warnings / 0 errors on 104 files);
- packed Shared TCK + external non-workspace consumer: PASS (44 registered assets).

Harness rc5 source-conformance #248 / run `32684842738`:

- exact pinned Harness public type build: PASS;
- reproducible safe-runtime install: PASS;
- exact workspace projection: PASS;
- projection idempotence: PASS;
- exact rc5 binding typecheck: PASS;
- real rc5 runtime conformance: PASS.

Harness steps 6–11 all PASS.

The earlier CI #301 failed before tests on two strict TypeScript narrowing errors
in internal M4-005 helper unions. They were corrected with explicit `ok`
discriminants only. No `any`, assertion, compiler relaxation, fixture weakening,
schema change or semantic weakening was introduced.

Acceptance review then hardened runtime rule-ID validation from input-sized
`Array.from()` allocation to a bounded Unicode-code-point `for...of` traversal,
and added prototype/extra-field/astral-boundary tests. The hardened exact head is
the accepted implementation head above.

## Governance closure rule

M4-005's implementation boundary is accepted, but governance records that record
this acceptance must themselves pass both normal CI and exact Harness rc5
source-conformance before M4-006 begins.

Therefore:

```text
M4-001 implementation: ACCEPTED
M4-002 implementation: ACCEPTED
M4-003 implementation: ACCEPTED
M4-004 implementation: ACCEPTED
M4-005 implementation: ACCEPTED
M4-006 implementation: NOT STARTED
M4-006 authorization: PENDING FINAL M4-005 GOVERNANCE-HEAD DUAL-GREEN
M4-007+: NOT AUTHORIZED
M4-020+: NOT AUTHORIZED BY M4-005
M6: NOT AUTHORIZED
```

Do not start M4-006 production code until the final governance head containing
M4-005's acceptance audit, package stage, roadmap, this handoff, append-only
history and synchronized PR description is dual-green.

## Next gate — M4-006 default deny

After final governance dual-green, the next and only newly authorized policy
engine gate is:

```text
M4-006 P0 — default deny
```

M4-006 must begin protocol-first by re-reading Core §8.3, the deterministic
precedence profile, CapabilityPolicy `defaultEffect`, M4-002 schema-validation
semantics, and Spec 0021's explicit `NO_APPLICABLE_RULES` boundary.

M4-006 must not be broadened into full M4-021 policy evaluation. Subject
resolution, capability/constraint matching, approval routing, lease handling,
decision receipt, classifier/plugin integration and enforcement remain later
roadmap gates.

## Boundaries that remain enforced

- Protocol/spec precedes implementation.
- `specs/` is semantic authority; TypeScript packages are projections.
- DeepSeek Harness is an Adapter and cannot define Capability Broker semantics.
- Successful M4-001 loading is not policy validity or authorization.
- Successful M4-002 validation is not policy evaluation or authorization.
- Successful M4-003 normalization is not provider containment or authorization.
- Successful M4-004 resource ordering is not a complete rule match or decision.
- Successful M4-005 effect resolution assumes full applicability was already
  proven and is not itself a complete PDP or persisted CapabilityDecision.
- Filesystem containment remains provider-owned.
- Do not weaken TypeScript strictness, schemas, compatibility baseline,
  validators, conformance tests, frozen installs, architecture/security gates or
  supply-chain checks for CI.
- M4-007+, M4-020+ and M6 remain unauthorized by this gate.

## Resume instruction

On the next work session:

1. read `docs/handoff/README.md` and this file;
2. fetch PR #3 live head and exact-head workflow results;
3. live GitHub evidence overrides this snapshot;
4. if M4-005 governance closure is not dual-green, finish it first;
5. only after final governance dual-green, begin M4-006 protocol-first;
6. inspect exact current-head diagnostics on any failure; never infer from stale
   logs;
7. do not start M4-007+, M4-020+ or M6 early.
