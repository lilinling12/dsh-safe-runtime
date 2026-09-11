# R1-004 Publishable `@dsh-safe/adapter-dsh` Package Acceptance Audit

Status: **IMPLEMENTATION ACCEPTANCE CANDIDATE — GOVERNANCE CLOSURE NOT YET ESTABLISHED**  
Milestone: `R1 — DeepSeek Harness Plugin Alpha Release`  
Gate: `R1-004 P0 — make @dsh-safe/adapter-dsh publishable`  
Profile: `R1-004_ADAPTER_DSH_PACKAGE_V1`  
Pinned Harness: `0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a`

## 1. Scope and authority

This audit applies Spec 0058 and portable cases ADPKG-001..ADPKG-036 to the
reviewed R1-004 package/build implementation.

R1-004 accepts one narrowly scoped property:

```text
PACKAGE_ARTIFACT_VALID
```

It means the repository can build the already accepted R1-002/R1-003 Adapter
package root from a clean checkout, emit executable ESM plus declarations, create
and inspect a real npm-compatible tarball, and preserve the exact Alpha peer and
security boundaries.

It does **not** establish:

```text
EXTERNAL_INSTALL_VERIFIED
npm/registry publication
registry namespace ownership
GitHub Release readiness
release-tag readiness
npm provenance / signed release / SBOM completeness
future Harness-version compatibility
process isolation or arbitrary in-process plugin sandboxing
complete host-effect mediation
R1-005+
M5-003+
PR #3 merge or Ready-for-review authorization
```

Authority remains:

```text
GitHub live exact-head state
> normative Specs / architecture / compatibility contracts
> Schema / Shared TCK
> accepted exact-head implementation/conformance evidence
> acceptance audits
> CURRENT / HISTORY / roadmap / PR body / chat
```

DeepSeek Harness remains compatibility and exact-source type/runtime evidence. It
does not become portable safe-runtime protocol authority merely because the
publication build consumes its public type surface.

## 2. Predecessor and protocol-first authority

R1-003 final governance predecessor:

```text
463cc6d8b8811245cfb8f44eaebb16cba502d974
CI #684 / run 34574349469: PASS
Harness #626 / run 34574349464: PASS
Harness step 10 pinned-source typecheck: PASS
Harness step 11 real rc5 runtime conformance: PASS
```

R1-004 protocol-first exact head:

```text
3ce15c7796bd32ecebcb220207fad3ccd03b7834
CI #685 / run 34574938355: PASS
Harness #627 / run 34574938359: PASS
Harness step 10 pinned-source typecheck: PASS
Harness step 11 real rc5 runtime conformance: PASS
```

The protocol-first authority froze:

```text
specs/0058-r1-adapter-dsh-publishable-package.md
fixtures/adapter-dsh-package/cases.json
profile: R1-004_ADAPTER_DSH_PACKAGE_V1
cases: ADPKG-001..ADPKG-036
```

No package/build implementation preceded that same-head dual-green authority.
Git ancestry confirms the reviewed implementation line descends from
`3ce15c7796bd32ecebcb220207fad3ccd03b7834` without replacing that accepted
ancestor.

## 3. Registry diagnostic and exact type authority

During implementation recovery, an isolated evidence branch tested the obvious
registry-devDependency route for the accepted exact rc5 type baseline. Current npm
resolution returned:

```text
ERR_PNPM_NO_MATCHING_VERSION
No matching version found for @deepseek-ai/dsh-agent@0.1.0-rc.5
```

That diagnostic is not authority to broaden compatibility or silently substitute
rc6. The accepted baseline remains:

```text
0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a
```

Upstream source evidence identifies that exact commit as the rc5 family
release/publication source state. R1-004 therefore uses the exact pinned upstream
commit as publication-compilation type input rather than pretending a currently
unresolvable registry coordinate is available as a development dependency.

This distinction is important:

```text
build-time type authority = exact upstream source commit 47f943...
runtime package ownership = exact peerDependencies
portable protocol authority = dsh-safe normative contracts
external consumer installability = R1-005, not claimed here
```

No rc6 substitution, compatibility-range broadening, ambient declaration shim or
hand-written Harness type facsimile is accepted by this Gate.

## 4. Reviewed implementation delta

Git compare from the R1-004 protocol-first head
`3ce15c7796bd32ecebcb220207fad3ccd03b7834` to the final reviewed implementation
head shows the implementation line is four commits ahead and changes exactly six
paths:

```text
docs/handoff/CURRENT.md
package.json
packages/adapter-dsh/package.json
packages/adapter-dsh/scripts/build-publication.mjs
packages/adapter-dsh/tsconfig.publish.json
scripts/check-adapter-dsh-package.mjs
```

Notably absent from the implementation delta:

```text
pnpm-lock.yaml
production runtime TypeScript
protocol schemas / validators
Shared TCK
Spec 0058
R1-004 corpus
HISTORY.md
roadmap acceptance markers
GitHub workflows
R1-005+
M5-003+
```

The package/build implementation therefore remains within the R1-004 boundary and
does not rewrite accepted runtime semantics to justify publication.

## 5. Package identity and public metadata

The reviewed source manifest is:

```text
name:        @dsh-safe/adapter-dsh
version:     0.1.0-alpha.0
type:        module
license:     MIT
private:     absent
files:       ["dist"]
Node engine: ^22.19.0 || >=24.0.0
```

It adds coherent repository metadata with package directory, a focused package
description and focused keywords without asserting registry reservation,
provenance publication or release completion.

The monorepo root remains:

```text
private: true
packageManager: pnpm@11.7.0
Node engine: ^22.19.0 || >=24.0.0
```

Therefore package-level `private: true` was removed only together with a real
build, exports/files metadata and artifact checker; root publication protection
remains unchanged.

## 6. Single package-root export

The Adapter package exposes exactly one package subpath:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  }
}
```

No `binding`, `ports`, provider, source-conformance, fixture, test or internal
subpath is exported through package metadata.

No legacy `main`, `module` or top-level `types` field introduces a second or
broader root surface.

The source root is also explicit rather than wildcard-based. It re-exports only
the accepted R1-002/R1-003 Alpha values and types from `src/index.ts`; package
internal normalization, dispatcher, provider, replay, sidecar, correlation,
compatibility and test/source-conformance helpers remain package-internal.

## 7. Public runtime and declaration surface

The publication compiler starts from exactly:

```text
files: ["src/index.ts"]
```

with:

```text
rootDir: src
outDir: dist
noEmit: false
declaration: true
declarationMap: false
sourceMap: false
```

TypeScript therefore emits the runtime/declaration graph reachable from the
curated root instead of publishing source or exposing every source module as a
public subpath.

The build requires both:

```text
dist/index.js
dist/index.d.ts
```

and performs a built-output runtime namespace smoke while the exact rc5 peer type
projection is available. The allowed runtime namespace is exactly:

```text
DshAdapterError
createDshRc5Adapter
createDshRc5Plugin
```

The remainder of the accepted Alpha package-root contract is type-only and is
preserved through explicit exports from `src/index.ts`, including Adapter/plugin
interfaces, feature matrix, runtime/audit event types and the reviewed public
port types.

Because the publication graph originates from the explicit root, its relative
declaration dependencies are emitted under `dist` and therefore remain inside the
package `files` allowlist. The declaration surface does not rely on absent
monorepo-only `src` paths.

## 8. Deterministic source-backed publication build

`packages/adapter-dsh/scripts/build-publication.mjs` is the explicit publication
build entry.

It first requires the repository-pinned package manager exactly:

```text
pnpm 11.7.0
```

It then creates an isolated temporary upstream checkout and performs:

```text
git init temporary Harness worktree
git fetch --depth=1 origin 47f943859bef60e4160492346772ded9b24f765a
git checkout --detach FETCH_HEAD
git rev-parse HEAD == 47f943859bef60e4160492346772ded9b24f765a
pnpm install --frozen-lockfile
pnpm run build:lib:host
```

Only after the exact source identity is verified does it project the discovered
`@deepseek-ai/*` workspace packages into the safe-runtime compilation environment.

The build then:

```text
builds @dsh-safe/protocol
removes stale Adapter dist
runs tsc -p tsconfig.publish.json
checks dist/index.js
checks dist/index.d.ts
imports the built root and verifies the exact runtime value allowlist
```

The projection is build-time only. In `finally`, the script removes only links it
recorded as its own, verifies each owned projection still resolves to the exact
source it created before deletion, and removes the temporary Harness checkout.

The tarball therefore does not persist or package Harness source, and consumer
runtime does not depend on source-conformance workspace projection.

## 9. Exact peers and lockfile discipline

Published runtime ownership remains exact peer-based:

```text
@deepseek-ai/cordis             4.0.1
@deepseek-ai/dsh-agent          0.1.0-rc.5
@deepseek-ai/dsh-llm            0.1.0-rc.5
@deepseek-ai/dsh-session        0.1.0-rc.5
@deepseek-ai/dsh-tools          0.1.0-rc.5
@deepseek-ai/dsh-user-approval  0.1.0-rc.5
```

None of those peers was broadened, moved into ordinary bundled dependencies or
replaced by rc6.

No Harness build-time development dependency was added to the Adapter manifest.
The exact type input is the pinned source commit described above, so
`pnpm-lock.yaml` is unchanged by the entire R1-004 implementation delta.

The existing Adapter development dependency remains only:

```text
@types/node 22.19.0
```

This avoids unrelated resolution/integrity churn while preserving the accepted
runtime peer ownership model.

## 10. Safe-runtime protocol dependency

The source manifest intentionally retains:

```text
@dsh-safe/protocol: workspace:*
```

R1-004 does not redesign the protocol package or change the repository's workspace
versioning convention.

The package checker inspects the **packed** manifest and rejects the artifact if
`@dsh-safe/protocol` is missing, empty or still begins with `workspace:`. The real
`pnpm pack` evidence passes that check, proving the generated Adapter artifact
contains a non-workspace protocol version suitable for later registry resolution.

This is a packed-manifest property only. R1-004 does not publish protocol or claim
an external consumer has installed it from a registry.

## 11. Actual tarball audit

Normal CI runs:

```text
pnpm check:adapter-dsh-package
```

as part of `pnpm check:all`.

The checker first executes the clean Adapter publication build and then runs a
real package-manager pack operation:

```text
pnpm --filter @dsh-safe/adapter-dsh pack --pack-destination <temporary-dir>
```

It requires exactly one `.tgz`, opens that archive with `tar`, lists its actual
file set and extracts the packed `package/package.json` for manifest inspection.

The actual archive must contain:

```text
package/package.json
package/dist/index.js
package/dist/index.d.ts
```

The checker rejects archive entries matching internal or sensitive classes,
including:

```text
src/
source-conformance/
fixtures/
coverage/
node_modules/
.github/
.env*
*.tsbuildinfo
credential/secret/token/private-key names
*.log
```

The packed manifest audit requires:

```text
exact package name/version
no private field
ESM type
MIT license
exact Node engine
non-empty description
exact repository URL/package directory
focused keywords
exactly one root exports key
exact dist/index.js import target
exact dist/index.d.ts types target
files == ["dist"]
exact rc5/Cordis peer map
non-workspace @dsh-safe/protocol dependency
no preinstall/install/postinstall scripts
```

At the final reviewed implementation head CI reports:

```text
R1-004 Adapter package audit PASS (32 packed files).
```

This is direct `.tgz` evidence rather than a predicted file-list assertion.

## 12. Clean-state and supply-chain evidence

The final reviewed CI starts from a GitHub Actions clean checkout, installs with:

```text
pnpm install --frozen-lockfile
```

and reports the lockfile unchanged/up to date plus supply-chain policy success for
126 entries before executing the full repository verification pipeline.

R1-004 package verification is therefore not relying on:

```text
untracked dist
prior local .tgz output
developer-global Harness packages
local unpublished npm registry
registry credentials
environment secrets
an earlier source-conformance workflow worktree
```

The publication build creates its own temporary exact-source type input and its
own output on every run.

## 13. Runtime security and semantic non-regression

R1-004 changes package/build/check files only. It does not modify production
runtime TypeScript.

Therefore it adds no new:

```text
policy semantics
approval semantics
Capability semantics
Lease semantics
provider identity/resource semantics
runtime events
lifecycle behavior
execution rollback
sandbox/process-isolation guarantees
```

The package description and keywords do not claim arbitrary in-process plugin
sandboxing, process isolation, complete host-effect mediation, rollback or
zero-trust containment.

The same-process Adapter/plugin security boundary and all previously accepted M4,
R1-002 and R1-003 limitations remain unchanged.

## 14. Remediation history

The first formal product implementation head was:

```text
86b93d23e1dd39e0a01f8be01780e6e06589dc93
Harness #630 / run 34632798920: PASS
CI #688 / run 34632798817: FAIL
```

The failure occurred only after ordinary typecheck/tests/lint/testkit packaging
had passed, inside the new Adapter package checker. The publication build itself
had already completed its built-root runtime smoke while exact peer projection was
present. The checker then attempted to dynamically import `dist/index.js` a
second time **after** the build's `finally` cleanup correctly removed its temporary
peer projection.

Node therefore reported:

```text
ERR_MODULE_NOT_FOUND: Cannot find package '@deepseek-ai/dsh-llm'
```

The repair did not weaken package validation or add permanent peer copies. It
removed only that duplicate post-cleanup import from the tarball checker and left
the runtime-root smoke inside the publication build, where its exact peer
environment is intentionally available.

The repair also removed the now-unused checker imports. No package contract,
compatibility baseline, runtime behavior, lockfile or test strictness changed.

Final repair commit/head:

```text
73ed70fe07d939f02d664162b799e40ff333c02d
```

## 15. Final reviewed implementation evidence

Final reviewed implementation head:

```text
73ed70fe07d939f02d664162b799e40ff333c02d
```

Live PR state was rechecked at that head:

```text
PR #3: Open
Draft: true
Merged: false
Base: main@57430273e065be8d38807d67b175fa154c801d43
Head: feat/m4-capability-broker@73ed70fe07d939f02d664162b799e40ff333c02d
```

Exact-head verification:

```text
CI #689 / run 34633103705: PASS
Harness #631 / run 34633103717: PASS
Harness step 10 pinned-source typecheck: PASS
Harness step 11 real rc5 runtime conformance: PASS
```

CI evidence at that exact head includes:

```text
frozen-lockfile install: PASS
supply-chain policy: PASS (126 entries)
architecture boundaries: PASS
schema shape: PASS (16 schemas)
schema compatibility baseline: PASS
strict workspace typecheck: PASS
75 test files / 1448 tests: PASS
oxlint: 0 errors
packed Shared TCK external dummy consumer: PASS (44 assets)
R1-004 Adapter package audit: PASS (32 packed files)
```

The Harness workflow independently rebuilt the exact pinned upstream public type
surface, reinstalled safe-runtime reproducibly, projected the exact workspace,
verified projection idempotence, passed step 10 exact-source binding typecheck and
passed step 11 real rc5 runtime conformance.

## 16. ADPKG-001..ADPKG-036 reconciliation

All 36 R1-004 cases are satisfied by the reviewed repository and exact-head
evidence:

| Cases | Result | Reviewed evidence |
| --- | --- | --- |
| ADPKG-001..002 | SATISFIED | R1-003 governance predecessor is exact-head dual-green; PR #3 remains Open/Draft/unmerged and later Gates/release actions remain unauthorized. |
| ADPKG-003..004 | SATISFIED | Package remains `@dsh-safe/adapter-dsh@0.1.0-alpha.0`; package-level `private` was removed only with the coherent build/exports/files/check change while root remains private. |
| ADPKG-005..008 | SATISFIED | Explicit single-root publication build emits ESM + declarations and compiles Harness-facing graph against exact source commit `47f943...`; no TS runtime entry, ambient Harness shim or hand-written facsimile is introduced. |
| ADPKG-009..013 | SATISFIED | Manifest exports exactly `.` to built JS/declaration roots; source root is explicit; runtime smoke requires exactly the three accepted public runtime values; no legacy metadata creates a second surface. |
| ADPKG-014..016 | SATISFIED | `files: ["dist"]`; actual `.tgz` is inspected and forbidden source/internal/workflow/temp/secret/log classes are rejected. |
| ADPKG-017..020 | SATISFIED | Real pinned-pnpm `.tgz` is generated and inspected; packed identity/version/private state are checked; `workspace:*` protocol locator must be transformed; protocol itself is not redesigned or published. |
| ADPKG-021..023 | SATISFIED | Exact Cordis/rc5 peer map is enforced; peers remain peers; no Harness devDependency or lockfile churn is introduced because exact source-backed type authority is used. |
| ADPKG-024..027 | SATISFIED | Node engine, MIT/repository/description/keywords/exports/files are explicit; clean build command exists; no install-time execution script is present. |
| ADPKG-028..030 | SATISFIED | Clean GitHub checkout + frozen install builds from exact source authority, built-root smoke runs against emitted output, and the single-root publication compiler emits the declaration dependency graph into packaged `dist`. |
| ADPKG-031..032 | SATISFIED | Metadata makes no sandbox/isolation/complete-mediation claim; implementation delta contains no production runtime TypeScript or new policy/approval/capability/lease/provider/event/lifecycle behavior. |
| ADPKG-033 | SATISFIED | Final implementation head `73ed70fe...` is same-head CI #689 + Harness #631 dual-green, including Harness steps 10/11. |
| ADPKG-034..035 | SATISFIED | Acceptance is `PACKAGE_ARTIFACT_VALID` only; no external-consumer claim, registry publish, release tag, GitHub Release, provenance publication or credential setup occurred. |
| ADPKG-036 | SATISFIED | Protocol-first head `3ce15c779...` was dual-green before package implementation; its pre-implementation delta remained restricted to Spec 0058, corpus and CURRENT. |

No unresolved R1-004 corpus case remains at the reviewed implementation head.

## 17. R1-005 boundary and known registry condition

Current npm resolution of the exact rc5 package coordinate was observed to be
unavailable during R1-004 implementation recovery. R1-004 does not hide or
normalize away that fact.

This Gate proves a truthful package artifact against the accepted exact source and
peer contract. It does not prove that a clean external consumer can obtain every
peer from the current public registry and execute the full runtime matrix.

That distinction is exactly why R1-005 remains separate. Before R1-005 can be
accepted, its protocol-first design must explicitly define the external consumer's
exact peer acquisition/install authority and then prove the same tarball through
its required behavioral smoke without workspace/source-path cheating.

No R1-005 implementation is authorized by this audit alone.

## 18. Security and release non-claims

R1-004 acceptance does not establish:

```text
arbitrary in-process plugin sandboxing
process isolation
complete filesystem/process/network/secret mediation
external-effect rollback
zero-trust host containment
future Harness compatibility
external consumer installation
registry scope reservation
npm publication
release tag
GitHub Release
npm provenance
signed release
SBOM completeness
release-channel support policy
```

Package build cleanup is build-environment hygiene, not runtime isolation or
external-effect rollback.

## 19. Acceptance verdict

At final reviewed implementation head:

```text
73ed70fe07d939f02d664162b799e40ff333c02d
```

R1-004 implementation acceptance criteria are satisfied and
ADPKG-001..ADPKG-036 are fully reconciled.

Verdict:

```text
R1_004_IMPLEMENTATION_ACCEPTED
PACKAGE_ARTIFACT_VALID
R1_004_GOVERNANCE_CLOSURE_PENDING
R1_005_NOT_YET_AUTHORIZED
```

This audit is a separate acceptance commit. Its own exact head must obtain normal
CI plus exact pinned Harness rc5 source/runtime conformance before the governance
closure patch may update CURRENT, append-only HISTORY and only the R1-004 roadmap
acceptance marker/details.

Acceptance is not authorization to mark PR #3 Ready, merge it, publish a package,
create a release tag or GitHub Release, configure registry credentials, resume
M5-003+, or begin R1-005 implementation before R1-004 governance closure is
itself exact-head dual-green.
