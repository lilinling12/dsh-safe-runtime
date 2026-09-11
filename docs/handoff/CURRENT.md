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
- R1-004 implementation: **ACCEPTED at reviewed implementation head `73ed70fe...`**
- R1-004 acceptance record: **CANDIDATE / EXACT-HEAD VERIFICATION REQUIRED**
- R1-004 governance closure: **PENDING**
- R1-005+: **NOT AUTHORIZED**
- M5-003+: **PAUSED until R1 Alpha release governance closes**
- npm/registry publish, release tag and GitHub Release: **NOT AUTHORIZED**
- PR #3 merge / Ready transition: **NOT AUTHORIZED without explicit user authorization**

Live GitHub state overrides this snapshot.

## R1-004 authority

Normative contract:

```text
specs/0058-r1-adapter-dsh-publishable-package.md
fixtures/adapter-dsh-package/cases.json
profile: R1-004_ADAPTER_DSH_PACKAGE_V1
ADPKG-001..ADPKG-036
```

Pinned Harness compatibility/type authority remains exactly:

```text
0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a
```

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

The later handoff correction head `e3d438dadf3e08b3f0fd82d5d3df3b6fe6ee274d`
was also exact-head dual-green:

```text
CI #687 / run 34631333150: PASS
Harness #629 / run 34631333146: PASS
```

## Registry diagnostic and build authority

A disposable evidence branch proved that current npm resolution cannot be used as
the exact rc5 build-time authority:

```text
ERR_PNPM_NO_MATCHING_VERSION
No matching version found for @deepseek-ai/dsh-agent@0.1.0-rc.5
```

This does not authorize changing the accepted baseline. Upstream commit
`47f943859bef60e4160492346772ded9b24f765a` is the release/publication source
commit for the `0.1.0-rc.5` family, and direct release commit
`abe560f81edebe5f6a5b62706ff502daa0dccd40` records `release(dsh): 0.1.0-rc.5`.

R1-004 therefore uses the exact pinned upstream source only as deterministic
publication-compilation type input. Runtime ownership remains the existing exact
peer dependency contract. No rc6 substitution, peer broadening or registry
facsimile is permitted.

## Disposable evidence boundary

The isolated branch `evidence/r1-004-lockgen` is evidence tooling only and MUST
NOT enter PR #3 product history.

Its source-backed publication and real-package probes proved the chosen build
approach before product implementation, including exact source checkout, frozen
upstream install, public-root emit, runtime export smoke, real `pnpm pack`, packed
manifest transformation and tarball content inspection.

That evidence remains supporting evidence only; product acceptance is based on the
later exact product-head CI + Harness results below.

## Reviewed implementation

The R1-004 product delta remains package/build/check focused:

```text
packages/adapter-dsh/package.json
packages/adapter-dsh/tsconfig.publish.json
packages/adapter-dsh/scripts/build-publication.mjs
scripts/check-adapter-dsh-package.mjs
package.json
docs/handoff/CURRENT.md
```

It did not change:

```text
pnpm-lock.yaml
production runtime TypeScript
protocol schemas / validators
Shared TCK
R1-004 Spec or corpus
HISTORY.md
roadmap acceptance markers
GitHub workflows
R1-005+
M5-003+
```

The first formal implementation head was:

```text
86b93d23e1dd39e0a01f8be01780e6e06589dc93
Harness #630 / run 34632798920: PASS
CI #688 / run 34632798817: FAIL
```

The CI failure was a duplicate post-build runtime import after the publication
build had intentionally removed its temporary exact-peer projection. It was not a
package-build semantic failure.

The minimal repair removed only that redundant post-cleanup import from the
archive checker. Runtime-root smoke remains inside the publication build while the
exact pinned peer projection exists.

Final reviewed implementation head:

```text
73ed70fe07d939f02d664162b799e40ff333c02d
CI #689 / run 34633103705: PASS
Harness #631 / run 34633103717: PASS
Harness step 10 pinned-source typecheck: PASS
Harness step 11 real rc5 runtime conformance: PASS
```

Normal CI at that exact head includes:

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

The independently reviewed implementation therefore satisfies
ADPKG-001..ADPKG-036 at the implementation head and is accepted as:

```text
R1_004_IMPLEMENTATION_ACCEPTED
PACKAGE_ARTIFACT_VALID
```

It does **not** establish `EXTERNAL_INSTALL_VERIFIED`.

## Acceptance audit candidate

Separate acceptance record:

```text
docs/acceptance/r1-004-adapter-dsh-publishable-package.md
```

Acceptance record commit:

```text
52956f24b3b6ac56bf64f013fb5d7d4bd272366a
```

The audit independently records:

```text
implementation scope review
exact peer/type authority
single-root public package surface
build/declaration artifact ownership
real .tgz manifest/content audit
lockfile discipline
first-failure diagnosis + minimal remediation
ADPKG-001..ADPKG-036 reconciliation
R1-005 / registry / release / security non-claims
```

The acceptance record plus this CURRENT synchronization define the new acceptance
candidate head. Do not perform governance closure until **that same exact head**
passes both normal CI and exact pinned Harness source/runtime conformance.

## Required acceptance exact-head verification

The current acceptance candidate must pass on one exact SHA:

```text
normal CI
+
Harness rc5 source-conformance
  step 10 pinned-source TypeScript
  step 11 real rc5 runtime
```

If either workflow fails, inspect the real current-head failed job/step/log before
editing. Do not infer a failure from older implementation or evidence runs.

When this acceptance head becomes dual-green, the next authorized change is a
**separate governance-only closure patch** restricted to:

```text
docs/handoff/HISTORY.md   append-only R1-004 closure record
docs/roadmap.md           only the R1-004 acceptance marker/details
docs/handoff/CURRENT.md   R1-004 governance-closed state
```

That governance head must itself obtain same-SHA normal CI + Harness dual-green
before R1-004 is governance closed.

Do not begin R1-005 before that closure.

## Current authorization

```text
R1-004 IMPLEMENTATION: ACCEPTED
R1-004 ACCEPTANCE RECORD: VERIFY CURRENT EXACT HEAD
R1-004 GOVERNANCE CLOSURE: PENDING
R1-005+ NOT AUTHORIZED
M5-003+ PAUSED
REGISTRY PUBLISH NOT AUTHORIZED
GITHUB RELEASE / TAG NOT AUTHORIZED
PR #3 REMAINS OPEN / DRAFT / UNMERGED
```
