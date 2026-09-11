# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before changes;
> normative specs/schemas/TCK and accepted exact-head evidence remain authority.

## Snapshot

- Recorded at: `2026-09-12`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `R1 — DeepSeek Harness Plugin Alpha Release`
- Active PR: `#3 — feat(policy): begin M4 capability broker`
- Branch: `feat/m4-capability-broker`
- Base: `main@57430273e065be8d38807d67b175fa154c801d43`
- R1-001: **GOVERNANCE CLOSED**
- R1-002: **GOVERNANCE CLOSED**
- R1-003: **GOVERNANCE CLOSED**
- R1-004: **GOVERNANCE CLOSED**
- R1-005: **PROTOCOL-FIRST CORRECTION CANDIDATE / EXACT-HEAD VERIFICATION REQUIRED**
- R1-006+: **NOT AUTHORIZED**
- M5-003+: **PAUSED until R1 Alpha release governance closes**
- npm/registry publish, release tag and GitHub Release: **NOT AUTHORIZED**
- PR #3 merge / Ready transition: **NOT AUTHORIZED without explicit user authorization**

Live GitHub state overrides this snapshot.

## R1-004 governance closure authority

R1-004 final governance exact head:

```text
2eb227f2fb54f9249ddde9739bb7e2e515d96ba8
CI #694 / run 34650123869: PASS
Harness #636 / run 34650123861: PASS
Harness job 103430059925 step 10 pinned-source typecheck: PASS
Harness job 103430059925 step 11 real rc5 runtime conformance: PASS
```

The governance delta from acceptance exact head
`705b67569890f51542934d0c0d48dd3b4accb4d1` is restricted to:

```text
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md   +61/-0 append-only
docs/roadmap.md           only R1-004 marker/details
```

No production code, Spec/corpus/Schema, Shared TCK, dependency/lockfile,
Harness baseline/workflow, R1-005 implementation, M5-003+, registry/release or PR
merge/readiness state changed in that governance transition.

Therefore:

```text
R1-004 GOVERNANCE CLOSED
R1-005 P0 PROTOCOL/DESIGN-FIRST WORK AUTHORIZED
```

## R1-005 authority

Roadmap Gate:

```text
R1-005 P0 — external tarball consumer + real Harness smoke gate
```

New normative candidate:

```text
specs/0059-r1-external-tarball-consumer-harness-smoke.md
fixtures/adapter-dsh-external-consumer/cases.json
profile: R1-005_EXTERNAL_TARBALL_CONSUMER_V1
cases: ATCON-001..ATCON-040
```

Pinned compatibility/runtime authority remains exactly:

```text
0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a
```

R1-005 inherits the accepted R1-004 Adapter artifact contract:

```text
@dsh-safe/adapter-dsh@0.1.0-alpha.0
single public ESM package root
built JS + declarations
exact Cordis/Harness peer versions
real pnpm-pack tarball
no Adapter install-time scripts
```

## External-consumer boundary

R1-005 defines a clean consumer as a new directory outside both the safe-runtime
repository/workspace and the pinned Harness source workspace. Runtime resolution
must come from that consumer's installed package tree.

Forbidden consumer shortcuts include:

```text
workspace: links
source-directory file:/link: dependencies
npm link / pnpm link
NODE_PATH source injection
safe-runtime source/deep imports
Harness source imports
safe-runtime repository node_modules runtime reuse
```

The Adapter under test must be the real R1-004 `.tgz` and must be imported only
through installed `@dsh-safe/adapter-dsh`.

## Exact rc5 acquisition boundary

The accepted baseline MUST NOT be changed to rc6/latest/next/ranges merely because
registry state has moved.

The current external evidence still shows public npm centered on newer Harness
coordinates while the accepted exact source commit contains package manifests for
the rc5 family. For example, exact pinned upstream
`packages/core/agent/package.json` declares:

```text
@deepseek-ai/dsh-agent 0.1.0-rc.5
```

and upstream workspace peer dependencies.

R1-005 therefore separates:

```text
EXTERNAL_TARBALL_CONSUMER_VERIFIED   # required by this Gate
PUBLIC_REGISTRY_INSTALL_VERIFIED     # separate optional fact
```

If any exact rc5 runtime package is unavailable publicly, R1-005 permits a
bounded exact-source peer-tarball bridge only when it:

1. checks out and verifies exactly `47f943...`;
2. uses reproducible upstream install/build inputs;
3. computes the complete runtime workspace-package dependency closure;
4. packs every required unavailable workspace package into a real `.tgz`;
5. verifies packed name/version and rejects surviving `workspace:` locators;
6. installs only those tarballs into the external consumer;
7. records archive SHA-256 and source authority.

This bridge does not establish public-registry installability and does not
broaden compatibility.

## Required external runtime smoke

The installed package root must be tested against the real installed rc5
Cordis/Harness path for at least:

```text
HANDLER ALLOW
HANDLER DENY with body non-entry
HANDLER ASK + ALLOWED_ONCE
HANDLER ASK + REJECTED
omitted policy -> DENY_ALL/default deny
installed required features -> exact rc5 public feature matrix reports present
await fiber.dispose() -> no stale Adapter registration
```

CANCELLED and UNAVAILABLE ASK outcomes should be included in the same external
suite where practical and remain fail closed.

The smoke may use only minimal test-owned Cordis services/agents/tools. It must
not replace the actual ToolRuntime/approval pipeline with a structural fake.

## R1-005 claim boundary

R1-005 acceptance may establish only:

```text
R1_005_EXTERNAL_TARBALL_CONSUMER_ACCEPTED
EXTERNAL_TARBALL_CONSUMER_VERIFIED
EXACT_RC5_RUNTIME_SMOKE_VERIFIED
```

It does not automatically establish:

```text
PUBLIC_REGISTRY_INSTALL_VERIFIED
FUTURE_HARNESS_COMPATIBILITY_VERIFIED
RELEASE_REPRODUCIBILITY_VERIFIED
REGISTRY_PROVENANCE_VERIFIED
PROCESS_ISOLATION_VERIFIED
COMPLETE_HOST_EFFECT_MEDIATION_VERIFIED
```

R1-006 owns compatibility/install UX. R1-007/R1-008 own release/provenance and
actual publication. M14 remains the future process-isolated Plugin Host.

## Protocol-first correction rationale

Initial R1-005 protocol-first head:

```text
0591e7af8f6b7f2f258d86cfff6fe973a516f699
CI #695 / run 34650647529: PASS
Harness #637 / run 34650647706: PASS
Harness job 103431757382 step 10: PASS
Harness job 103431757382 step 11: PASS
```

Post-green source review found one draft-only overconstraint: Spec 0059 had
required the exact rc5 external consumer to manufacture an unsupported-feature
activation attempt, while the accepted rc5 public `AdapterFeatureMatrix` fixes
`toolsPreExecute` and `toolsMonotonicGuard` as present compatibility facts.

The correction preserves the inherited R1-003 fail-closed rule for any future
separately accepted baseline that truthfully lacks a required feature, but forbids
monkey-patching/faking rc5 solely to create that negative case. Current rc5 smoke
must instead assert the installed public feature matrix reports every selected-mode
requirement present.

This correction is protocol-only. R1-005 executable implementation remains
unauthorized until the corrected exact head is again normal-CI + Harness dual-green.

## Protocol-first delta boundary

Before R1-005 implementation begins, the repository delta from the R1-004
closure head is restricted to exactly:

```text
specs/0059-r1-external-tarball-consumer-harness-smoke.md
fixtures/adapter-dsh-external-consumer/cases.json
docs/handoff/CURRENT.md
```

Not authorized until this exact protocol-first head is dual-green:

```text
external-consumer executable scripts/tests
package.json scripts
pnpm-lock.yaml
production TypeScript
source-conformance implementation
HISTORY
roadmap R1-005 acceptance marker
R1-006+
M5-003+
registry publish
GitHub Release/tag
PR #3 merge / Ready
```

## Required protocol-first verification

The new protocol-first exact head must pass on one SHA:

```text
normal CI
+
Harness rc5 source-conformance
  step 10 pinned-source TypeScript
  step 11 real rc5 runtime
```

If either fails, inspect only the current exact-head failed job/step before
editing. Do not weaken the fixture/spec boundary or reuse older green evidence.

After the protocol-first exact head is dual-green, R1-005 implementation may begin
in the sequence frozen by Spec 0059: Adapter tarball reuse -> exact peer
acquisition/closure audit -> source-tarball bridge only if necessary -> external
install -> source-leak/version audit -> real runtime smokes -> independent
acceptance review.

## Current authorization

```text
R1-004 GOVERNANCE CLOSED
R1-005 PROTOCOL-FIRST CORRECTION CANDIDATE: VERIFY EXACT HEAD
R1-005 IMPLEMENTATION: NOT YET AUTHORIZED
R1-006+ NOT AUTHORIZED
M5-003+ PAUSED
REGISTRY PUBLISH / GITHUB RELEASE / TAG NOT AUTHORIZED
PR #3 REMAINS OPEN / DRAFT / UNMERGED
```
