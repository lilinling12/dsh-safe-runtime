# R1-004 — Publishable `@dsh-safe/adapter-dsh` Package Contract

Status: **DRAFT NORMATIVE SPECIFICATION**  
Release track: `R1 — DeepSeek Harness Plugin Alpha Release`  
Gate: `R1-004 P0 — make @dsh-safe/adapter-dsh publishable`  
Conformance profile: `R1-004_ADAPTER_DSH_PACKAGE_V1`  
Pinned Harness compatibility baseline: `0.1.0-rc.5` / `47f943859bef60e4160492346772ded9b24f765a`  
Depends on: R1-002 public Adapter API; R1-003 native plugin/bootstrap integration; accepted package-root allowlist  
Separated from: R1-005 external tarball consumer smoke; R1-006 compatibility/install UX; R1-007 release/provenance automation; registry publish; GitHub Release

## 1. Purpose

R1-004 turns the already accepted Adapter/plugin source surface into a truthful npm
package artifact. The Gate is packaging and build-contract work, not a new runtime
or security semantic.

The Gate answers one question:

> Can the repository produce an installable npm tarball whose package root exposes
> exactly the accepted Alpha API as executable ESM plus matching declarations,
> whose dependency/peer metadata is truthful, and whose contents contain no
> workspace-only or internal test material?

A manifest that merely removes `private: true` is not sufficient. The current
ordinary Adapter tsconfig intentionally excludes Harness-facing `binding.ts`,
`public-api.ts`, `plugin.ts` and `index.ts`; therefore R1-004 MUST establish a real
publication build path that emits the package root rather than pointing metadata
at files that do not exist.

## 2. Entry precondition

R1-003 governance exact head:

```text
463cc6d8b8811245cfb8f44eaebb16cba502d974
```

passed on that same SHA:

```text
CI #684 / run 34574349469: PASS
Harness #626 / run 34574349464: PASS
Harness step 10 pinned-source typecheck: PASS
Harness step 11 real rc5 runtime conformance: PASS
```

R1-003 is therefore GOVERNANCE CLOSED and R1-004 protocol/design work is
authorized. PR #3 remains Open / Draft / unmerged. R1-005+, M5-003+, registry
publish, GitHub Release and PR merge remain unauthorized.

## 3. Existing package facts

At R1-004 entry the Adapter package is:

```json
{
  "name": "@dsh-safe/adapter-dsh",
  "version": "0.1.0-alpha.0",
  "private": true,
  "type": "module",
  "license": "MIT"
}
```

It already declares exact rc5 Harness/Cordis peers and depends on
`@dsh-safe/protocol` through `workspace:*`.

The accepted package root already exposes the curated R1-002/R1-003 Alpha API,
including `createDshRc5Adapter`, `createDshRc5Plugin`, their public option/handler
and event types, `DshAdapterError`, and `AdapterFeatureMatrix`.

`@dsh-safe/protocol` already publishes an ESM `exports` root from `dist`, restricts
files to `dist`, and has a real build script. R1-004 does not redesign protocol.

## 4. Publication build is a first-class contract

R1-004 MUST add a deterministic package build path that emits all runtime modules
reachable from the accepted public root and matching `.d.ts` declarations.

The publication build MUST include the Harness-facing graph that ordinary package
`typecheck` intentionally excludes. It MUST NOT solve this by:

- publishing TypeScript source as the runtime entry;
- pointing `exports` to a nonexistent `dist/index.js`;
- adding ambient `declare module` shims that weaken exact upstream typing;
- replacing exact pinned Harness types with hand-written local facsimiles;
- depending on source-conformance workspace projection at consumer runtime;
- copying arbitrary monorepo source into the tarball.

The ordinary repository typecheck topology MAY remain narrow if required, but the
publication build MUST have its own explicit, reproducible dependency/type input
and MUST fail when the accepted rc5 public types no longer compile.

## 5. Runtime package root

The npm package MUST expose exactly one public subpath:

```text
@dsh-safe/adapter-dsh
```

with ESM import and TypeScript declaration targets from built output, expected in
shape:

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

Equivalent metadata is allowed only if it preserves the same single-root public
surface and built-artifact semantics.

No package subpath for `binding`, `ports`, source-conformance helpers, fixtures,
internal lifecycle helpers, package-stage markers, provider ports or testkit
material may become publicly exported in R1-004.

Legacy `main`/`module` fields MUST NOT point to a different runtime surface than
`exports`. If added for tooling compatibility they MUST be semantically identical
to the ESM root and MUST NOT create a second API.

## 6. Type declaration contract

The tarball MUST contain declarations for the same public root and those
declarations MUST typecheck in isolation against the package's declared
runtime/peer dependency contract.

The declaration root MUST NOT expose package-private source paths that are absent
from the tarball. Internal relative declaration imports are permitted only when
the referenced built declaration is packaged.

The accepted R1-002/R1-003 root allowlist remains the semver authority. R1-004
MUST NOT accidentally make internal exported source symbols public merely because
the compiler emitted their declarations.

## 7. `files` allowlist and tarball minimization

The package MUST use an explicit publication allowlist. Runtime build output is
required; repository/source/test material is denied by default.

At minimum the packed artifact MUST NOT contain:

```text
src/
source-conformance/
fixtures/
coverage/
node_modules/
*.tsbuildinfo
local temp/output files
.github/
workflow files
secrets/credentials/tokens
absolute local paths
```

npm-standard license/README/package metadata may be present. The package SHOULD
prefer `files: ["dist"]` unless an additional packaged file is independently
necessary and explicitly justified.

R1-004 conformance MUST inspect the actual generated `.tgz` file list, not only a
predicted or source-tree list.

## 8. `private` and publication safety

The package-level `private: true` MAY be removed only in the R1-004 implementation
that simultaneously establishes all required build, exports, files and metadata
checks.

Removing `private: true` does not authorize publication. This Gate MUST NOT invoke
`npm publish`, `pnpm publish`, create a registry version, create a GitHub Release,
tag a release, or add registry credentials.

The monorepo root remains private.

## 9. Package identity and version

The package identity remains:

```text
@dsh-safe/adapter-dsh
```

and the development version remains:

```text
0.1.0-alpha.0
```

unless an independently authorized release/version Gate changes it. R1-004 MUST
NOT consume a new public version merely to test packaging.

Registry scope ownership/availability MUST be re-confirmed before actual publish;
R1-004 metadata does not assert that a registry namespace has been reserved.

## 10. Node / module engine contract

The package is ESM (`type: module`) and MUST declare an explicit Node engine
compatible with the repository-supported runtime baseline. The initial Alpha
contract SHOULD match the root runtime policy:

```text
^22.19.0 || >=24.0.0
```

The publication build and package checks MUST execute on a supported Node version.
R1-004 does not claim older Node support merely because TypeScript can emit code.

## 11. DeepSeek/Cordis peer dependencies

The existing exact supported Alpha peer baseline remains authoritative:

```text
@deepseek-ai/cordis             4.0.1
@deepseek-ai/dsh-agent          0.1.0-rc.5
@deepseek-ai/dsh-llm            0.1.0-rc.5
@deepseek-ai/dsh-session        0.1.0-rc.5
@deepseek-ai/dsh-tools          0.1.0-rc.5
@deepseek-ai/dsh-user-approval  0.1.0-rc.5
```

R1-004 MUST NOT broaden these ranges to imply untested compatibility. Range/matrix
expansion belongs to R1-006 after evidence.

Peers required by emitted runtime code MUST NOT be silently moved into ordinary
bundled dependencies solely to make packing easier. Development-only copies MAY
be used for reproducible compilation if exact and justified, but published
runtime ownership remains peer-based.

## 12. Safe-runtime protocol dependency

The Adapter's `@dsh-safe/protocol` dependency MUST become a valid installable
version/range in the packed manifest. A published tarball MUST NOT retain
`workspace:*` or another workspace-only protocol locator.

The source manifest MAY continue to use pnpm workspace protocol if the actual
pack transform is deterministic and the generated tarball manifest is verified.
Otherwise R1-004 MUST use a repository-supported versioning approach that remains
consistent with the current `0.1.0-alpha.0` package family.

R1-004 does not publish protocol; it only verifies Adapter package metadata is
valid for a future registry install.

## 13. Required descriptive metadata

The publishable package MUST declare enough metadata for provenance and consumer
inspection without inventing release state:

- `license: MIT`;
- repository URL and package directory;
- meaningful description;
- focused keywords;
- explicit Node engine;
- `exports` and packaged declaration/runtime entry;
- explicit `files` allowlist.

A homepage/bugs URL MAY be added if canonical. `publishConfig`, provenance flags,
registry URL and access mode SHOULD remain release-engineering concerns unless
needed to make the tarball truthful; R1-007 owns the final publish pipeline.

## 14. Build/package scripts

The Adapter package MUST expose an explicit build command suitable for clean
release preparation. It MUST NOT rely on a developer having previously run a
Harness source-conformance workflow.

The repository MAY add a dedicated package-verification script analogous to the
existing testkit package check. That check MUST be runnable by normal CI and MUST
fail on missing root JS/declarations, unexpected files, invalid packed manifest,
workspace-only dependency specifiers or public-export drift.

## 15. Actual tarball inspection

R1-004 conformance MUST build and create a real npm-compatible tarball using the
repository's pinned package manager. The tarball MUST then be inspected directly.

The inspection MUST verify at least:

1. package identity/version;
2. no `private: true` in packed manifest;
3. ESM root `exports` resolves to files physically in the tarball;
4. corresponding declaration root exists;
5. `files` policy excludes internal source/test/workflow material;
6. no `workspace:` dependency specifier survives packing;
7. declared peers equal the accepted rc5 baseline;
8. Node engine matches the supported Alpha runtime;
9. license/repository metadata is present and coherent;
10. package root public declaration/value surface remains the accepted allowlist.

The check MUST inspect the generated archive or its npm pack manifest output tied
to that archive. A hand-authored expected file list without packing is not enough.

## 16. Tarball content is not external-consumer acceptance

R1-004 MAY generate/install the tarball only as needed for internal package
self-verification, but it MUST NOT claim the R1-005 external-consumer Gate.

R1-005 separately requires a clean consumer outside the workspace to install the
same tarball with exact supported Harness and execute ALLOW / DENY / ASK,
default-deny, disposal and unsupported-feature smoke.

Therefore R1-004 acceptance language MUST say `PACKAGE_ARTIFACT_VALID`, not
`EXTERNAL_INSTALL_VERIFIED`.

## 17. Package root runtime smoke inside R1-004

After building, repository-local package checks SHOULD import the built public
root by package artifact path or equivalent built-output resolution and prove at
least that the accepted runtime values exist:

```text
createDshRc5Adapter
createDshRc5Plugin
DshAdapterError
```

This is a packaging/root-resolution smoke only. Real Harness behavioral
conformance remains the exact pinned Harness workflow and R1-005 external smoke.

## 18. Reproducibility and clean-state requirements

R1-004 build/package verification MUST work from a clean checkout with frozen
lockfile installation. It MUST NOT depend on untracked files, developer-global
packages, prior `dist`, repository-local npm cache contents, environment secrets,
or an unpublished local registry.

Generated `dist` and `.tgz` files used only for verification SHOULD remain
untracked unless repository policy explicitly requires checked-in release
artifacts. Release archives MUST NOT be committed merely to prove packability.

## 19. Security and supply-chain boundaries

The tarball MUST not include credentials, environment snapshots, logs, source
fixtures containing secrets, private keys, CI artifacts, local absolute paths or
unexpected executable install scripts.

R1-004 MUST NOT add `preinstall`, `install` or `postinstall` scripts simply to
make the package function. If such a script becomes genuinely necessary, the Gate
must stop and reopen design/security review rather than silently adding execution
at install time.

R1-004 does not establish npm provenance, SBOM completeness, signed releases or
registry integrity policy; those remain R1-007/R1-008 work.

## 20. Non-sandbox and guarantee boundary

Packaging MUST NOT change or relabel runtime guarantees. The published package is
still a same-process Adapter/plugin. Accepted M4-050 direct Node host effects
remain potentially ungoverned and M14 remains the future process-isolated plugin
host.

Package descriptions/keywords MUST NOT use wording that implies arbitrary plugin
sandboxing, process isolation, complete mediation, rollback or zero-trust host
containment.

## 21. No semantic runtime rewrite

R1-004 implementation SHOULD be package/build/check focused. A production runtime
change is permitted only if packaging exposes an actual module-resolution/build
defect in the already accepted public graph; such a change MUST preserve the
R1-002/R1-003 API and obtain both normal CI and exact pinned Harness conformance.

R1-004 MUST NOT add policy, approval, capability, lease, provider, event or
lifecycle behavior to justify package publication.

## 22. Lockfile discipline

If R1-004 requires development dependencies to compile the Harness-facing public
graph, every dependency MUST be exact, justified and reflected in the frozen
lockfile without unrelated version or integrity churn.

The preferred order is:

1. reuse already declared exact peer packages when the package manager can make
   them available reproducibly for build;
2. otherwise add only the minimum exact development-time packages required by the
   public compile graph;
3. never weaken peer compatibility ranges or install arbitrary `latest` versions.

Lockfile review is part of acceptance evidence.

## 23. Acceptance evidence classes

R1-004 acceptance requires all of:

- normal repository CI green on the exact implementation head;
- exact pinned Harness rc5 source typecheck/runtime conformance green on the same
  head;
- clean package build green;
- actual tarball content/manifest audit green;
- package root JS/declaration existence and allowlist check green;
- frozen-lockfile and package-boundary checks green;
- no unauthorized R1-005+/publish/release/merge action.

A package that packs but does not pass pinned Harness conformance is not accepted.
A package whose source tests pass but whose actual tarball is malformed is not
accepted.

## 24. Protocol-first repository delta

Before R1-004 production/package implementation begins, the protocol-first exact
head is restricted to:

```text
specs/0058-r1-adapter-dsh-publishable-package.md
fixtures/adapter-dsh-package/cases.json
docs/handoff/CURRENT.md
```

Not authorized before that exact head is normal-CI + exact-Harness dual-green:

```text
packages/adapter-dsh/package.json
packages/adapter-dsh build config/scripts
pnpm-lock.yaml
root package scripts
production TypeScript
source-conformance implementation
HISTORY
roadmap R1-004 acceptance marker
R1-005+
M5-003+
npm/registry publish
GitHub Release
tag creation
PR #3 merge or Ready transition
```

## 25. Implementation sequence after protocol-first dual-green

After the protocol-first head is dual-green, implementation SHOULD proceed in
this order:

1. establish a real publication build graph for the accepted root;
2. add package metadata/exports/files/engines/repository/description/keywords;
3. remove package-level `private: true` only in the same coherent change set;
4. add minimum exact build-time dependency support if required;
5. add actual tarball inspection and public-root artifact tests;
6. run clean frozen install/build/check/pack;
7. run exact pinned Harness source/runtime conformance;
8. independently review package contents and lockfile delta;
9. record a separate acceptance audit;
10. require the audit/governance exact heads to become dual-green before R1-005.

## 26. Completion / non-completion

Successful R1-004 means:

```text
PACKAGE_ARTIFACT_VALID
PACKAGE_ROOT_BUILT
PACKAGE_METADATA_AUDITED
PACKAGE_CONTENTS_MINIMIZED
R1_005_EXTERNAL_INSTALL_NOT_YET_VERIFIED
REGISTRY_NOT_PUBLISHED
```

It does not mean:

```text
registry namespace reserved
package published
external clean-machine install verified
future Harness versions supported
release pipeline reproducible/provenanced
GitHub Release created
R1 Alpha released
```

Those claims require later R1 Gates and explicit publication authorization.
