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
- R1-004 implementation: **ACCEPTED**
- R1-004 acceptance audit: **ACCEPTED / EXACT-HEAD DUAL-GREEN**
- R1-004 governance: **CLOSURE CANDIDATE — THIS GOVERNANCE EXACT HEAD MUST BE DUAL-GREEN**
- R1-005: **NOT AUTHORIZED UNTIL R1-004 GOVERNANCE EXACT HEAD IS DUAL-GREEN**
- R1-006+: **NOT AUTHORIZED**
- M5-003+: **PAUSED until R1 Alpha release governance closes**
- npm/registry publish, release tag and GitHub Release: **NOT AUTHORIZED**
- PR #3 merge / Ready transition: **NOT AUTHORIZED without explicit user authorization**

Live GitHub state overrides this snapshot.

## R1-004 accepted authority chain

R1-003 predecessor governance head:

```text
463cc6d8b8811245cfb8f44eaebb16cba502d974
CI #684 / run 34574349469: PASS
Harness #626 / run 34574349464: PASS
```

R1-004 protocol-first exact head:

```text
3ce15c7796bd32ecebcb220207fad3ccd03b7834
CI #685 / run 34574938355: PASS
Harness #627 / run 34574938359: PASS
Harness step 10 pinned-source typecheck: PASS
Harness step 11 real rc5 runtime conformance: PASS
```

Normative artifacts:

```text
specs/0058-r1-adapter-dsh-publishable-package.md
fixtures/adapter-dsh-package/cases.json
profile: R1-004_ADAPTER_DSH_PACKAGE_V1
cases: ADPKG-001..ADPKG-036
```

Pinned Harness compatibility/type authority remains exactly:

```text
0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a
```

## Final reviewed implementation

Final reviewed implementation head:

```text
73ed70fe07d939f02d664162b799e40ff333c02d
CI #689 / run 34633103705: PASS
Harness #631 / run 34633103717: PASS
Harness step 10 pinned-source typecheck: PASS
Harness step 11 real rc5 runtime conformance: PASS
```

The reviewed product delta is package/build/check focused:

```text
packages/adapter-dsh/package.json
packages/adapter-dsh/tsconfig.publish.json
packages/adapter-dsh/scripts/build-publication.mjs
scripts/check-adapter-dsh-package.mjs
package.json
docs/handoff/CURRENT.md
```

It does not change production runtime TypeScript, `pnpm-lock.yaml`, protocol
schemas/validators, Shared TCK, R1-004 Spec/corpus, GitHub workflows or later
R1/M5 implementation.

The package contract remains:

```text
@dsh-safe/adapter-dsh@0.1.0-alpha.0
ESM only
single public package root
exports.types -> ./dist/index.d.ts
exports.import -> ./dist/index.js
files -> ["dist"]
Node -> ^22.19.0 || >=24.0.0
exact Cordis 4.0.1 + exact DSH 0.1.0-rc.5 peers
no install-time scripts
```

The publication build uses only exact upstream source commit `47f943...` as the
build-time Harness type authority, emits the accepted root graph, performs the
built-root runtime export smoke while the exact source projection exists and
removes only projection entries it owns.

The real tarball audit performs `pnpm pack` and verifies package identity,
metadata, exact peer baseline, single-root exports, required JS/declaration
artifacts, transformed non-workspace protocol dependency, and exclusion of
source/test/workflow/secret/local-artifact classes.

Normal CI at the reviewed implementation head includes:

```text
frozen-lockfile install: PASS
supply-chain policy: PASS (126 entries)
architecture boundaries: PASS
schema shape: PASS (16 schemas)
schema compatibility baseline: PASS
strict workspace typecheck: PASS
75 test files / 1448 tests: PASS
oxlint: 0 errors
packed Shared TCK external consumer: PASS (44 assets)
R1-004 Adapter package audit: PASS (32 packed files)
```

## Registry condition and exact-source authority

A disposable evidence probe found that current npm resolution does not provide the
accepted exact rc5 coordinate:

```text
ERR_PNPM_NO_MATCHING_VERSION
No matching version found for @deepseek-ai/dsh-agent@0.1.0-rc.5
```

That fact does not authorize rc6 substitution or compatibility broadening. The
accepted baseline remains exact rc5 at `47f943...`; runtime ownership remains the
exact peer contract.

This registry condition is deliberately carried forward as an R1-005 external
consumer/install-authority issue. R1-004 does not claim a clean external consumer
can currently obtain every exact peer from the public registry.

## Acceptance audit and exact-head verification

Acceptance audit:

```text
docs/acceptance/r1-004-adapter-dsh-publishable-package.md
commit: 52956f24b3b6ac56bf64f013fb5d7d4bd272366a
```

The audit reconciles ADPKG-001..ADPKG-036 and records the accepted claim only as:

```text
R1_004_IMPLEMENTATION_ACCEPTED
PACKAGE_ARTIFACT_VALID
R1_004_GOVERNANCE_CLOSURE_PENDING
R1_005_NOT_YET_AUTHORIZED
```

Acceptance synchronization exact head:

```text
705b67569890f51542934d0c0d48dd3b4accb4d1
CI #691 / run 34644280041: PASS
Harness #633 / run 34644280031: PASS
Harness job 103411193588 step 10 pinned-source typecheck: PASS
Harness job 103411193588 step 11 real rc5 runtime conformance: PASS
```

Therefore the implementation and acceptance record are independently exact-head
dual-green and R1-004 governance transition is authorized.

## Preserved non-claims

R1-004 does not establish:

```text
EXTERNAL_INSTALL_VERIFIED
registry namespace ownership
npm/registry publication
GitHub Release or release tag readiness
npm provenance / signed release / SBOM completeness
future Harness-version compatibility
arbitrary in-process plugin sandboxing
process isolation
complete host-effect mediation
external-effect rollback
M5-003+ resumption
PR #3 merge / Ready authorization
```

Package build cleanup is build-environment hygiene, not runtime isolation.

## Governance-closure delta boundary

The authorized R1-004 governance transition is restricted to exactly:

```text
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md   # append-only
docs/roadmap.md           # only R1-004 acceptance marker/details
```

It must not change production code, source-conformance, Spec/corpus/Schema,
Shared TCK, dependencies/lockfile, Harness baseline/workflow, R1-005+
implementation, M5-003+ work, registry state, GitHub Release/tag state or PR
merge/readiness state.

## Next allowed action

Verify the resulting governance exact head through both normal CI and exact
pinned Harness rc5 source-conformance on the same SHA.

Required evidence:

```text
normal CI
Harness pinned-source TypeScript step 10
Harness real rc5 runtime conformance step 11
```

Only after that same governance SHA is dual-green may repository state be
interpreted as:

```text
R1-004 GOVERNANCE CLOSED
R1-005 P0 EXTERNAL TARBALL CONSUMER AUTHORIZED FOR PROTOCOL-FIRST / DESIGN-FIRST WORK
R1-006+ NOT AUTHORIZED
M5-003+ PAUSED
REGISTRY PUBLISH / GITHUB RELEASE / TAG NOT AUTHORIZED
PR #3 REMAINS OPEN / DRAFT / UNMERGED
```

R1-005 must resolve its external consumer's exact peer acquisition/install
authority explicitly. The current rc5 registry-resolution condition cannot be
papered over by silently using rc6 or workspace/source-path shortcuts.
