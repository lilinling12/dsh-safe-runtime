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
- R1-004: **IMPLEMENTATION CANDIDATE / EXACT-HEAD VERIFICATION REQUIRED**
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

Protocol-first exact head:

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

## Disposable evidence completed

The isolated branch `evidence/r1-004-lockgen` is evidence tooling only and MUST
NOT enter PR #3 product history.

Source-backed publication compile evidence passed on its disposable workflow:

```text
exact upstream checkout
upstream frozen install
upstream build:lib:host
safe-runtime frozen install
exact @deepseek-ai workspace projection
public-root TypeScript emit
dist/index.js exists
dist/index.d.ts exists
```

A later disposable package probe also passed:

```text
files: [src/index.ts] publication graph
built-root runtime export smoke
real pnpm pack
packed-manifest inspection
workspace protocol dependency transformed to a non-workspace registry version
exact rc5/Cordis peers preserved
single root export
required JS/declaration roots present
forbidden source/test/workflow/secret content absent
R1-004 tarball evidence audit: PASS
```

## Implementation candidate boundary

The product candidate is intentionally package/build/check focused:

```text
packages/adapter-dsh/package.json
packages/adapter-dsh/tsconfig.publish.json
packages/adapter-dsh/scripts/build-publication.mjs
scripts/check-adapter-dsh-package.mjs
package.json
docs/handoff/CURRENT.md
```

It does not change:

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

The package remains `0.1.0-alpha.0`, exposes exactly one ESM root, emits matching
declarations, uses `files: ["dist"]`, declares the repository-supported Node
engine, preserves exact rc5/Cordis peers, and removes package-level `private` only
with the complete publication build and artifact audit.

`build-publication.mjs` clones only exact upstream commit `47f943...` into a
temporary directory, builds its public type surface with the pinned package
manager, projects the exact source packages only for compilation, emits the
accepted package-root graph, verifies runtime root exports, and cleans only
projection entries it created. It does not publish or persist Harness source in
the Adapter artifact.

`check-adapter-dsh-package.mjs` performs a real `pnpm pack` and rejects malformed
metadata, broadened peers, surviving `workspace:` protocol locators, extra public
subpaths, install-time scripts, source/test/workflow content and common secret or
local-artifact classes.

## Required exact-head verification

Do not accept this implementation until the same new exact SHA passes:

```text
normal CI, including check:adapter-dsh-package
+
Harness rc5 source-conformance
  step 10 pinned-source TypeScript
  step 11 real rc5 runtime
```

If either workflow fails, inspect the real current-head failed job/step/log before
editing. Do not infer failure from the disposable evidence workflow or an older
run.

After an implementation exact head becomes dual-green, independently review the
changed-file scope, lockfile/package manifest, tarball audit output and non-claims,
then create the separate R1-004 acceptance audit. Do not update HISTORY or the
roadmap acceptance marker before acceptance/governance.

## Current authorization

```text
R1-004 IMPLEMENTATION CANDIDATE: VERIFY EXACT HEAD
R1-005+ NOT AUTHORIZED
M5-003+ PAUSED
REGISTRY PUBLISH NOT AUTHORIZED
GITHUB RELEASE / TAG NOT AUTHORIZED
PR #3 REMAINS OPEN / DRAFT / UNMERGED
```
