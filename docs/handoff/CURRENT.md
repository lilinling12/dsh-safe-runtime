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
- R1-001 P0 Alpha readiness reconciliation: **GOVERNANCE CLOSED**
- R1-002 P0 public DeepSeek Adapter API: **GOVERNANCE CLOSED**
- R1-003 P0 DeepSeek plugin/bootstrap integration: **GOVERNANCE CLOSED**
- R1-004 P0 publishable Adapter package: **PROTOCOL-FIRST DUAL-GREEN / IMPLEMENTATION AUTHORIZED**
- R1-005+: **NOT AUTHORIZED by the current Gate**
- M5-003+: **PAUSED until R1 Alpha release governance closes**
- npm/registry publish and GitHub Release: **NOT AUTHORIZED**
- PR #3 merge / Ready-for-review transition: **NOT AUTHORIZED without explicit user authorization**

Live GitHub state overrides this snapshot.

## R1-003 closure authority

R1-003 final governance exact head:

```text
463cc6d8b8811245cfb8f44eaebb16cba502d974
CI #684 / run 34574349469: PASS
Harness #626 / run 34574349464: PASS
Harness step 10 pinned-source typecheck: PASS
Harness step 11 real rc5 runtime conformance: PASS
```

R1-003 is **GOVERNANCE CLOSED** and R1-004 is the sole active engineering Gate.
PR #3 remains Open / Draft / unmerged.

## R1-004 normative authority

Normative candidate:

```text
specs/0058-r1-adapter-dsh-publishable-package.md
```

Contract corpus:

```text
fixtures/adapter-dsh-package/cases.json
profile: R1-004_ADAPTER_DSH_PACKAGE_V1
cases: ADPKG-001..ADPKG-036
```

Pinned compatibility baseline remains exactly:

```text
0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a
```

DeepSeek Harness/Cordis remains compatibility evidence only. Packaging does not
redefine portable Subject/Capability/Resource/policy/Lease/approval/guarantee or
M4 security semantics.

## R1-004 protocol-first exact-head verification

The protocol-first exact head is:

```text
3ce15c7796bd32ecebcb220207fad3ccd03b7834
CI #685 / run 34574938355: PASS
Harness #627 / run 34574938359: PASS
Harness step 10 pinned-source typecheck: PASS
Harness step 11 real rc5 runtime conformance: PASS
```

Therefore the protocol-first prerequisite is satisfied and R1-004 package/build
implementation is authorized.

## Corrected upstream release evidence

A transient handoff-only head `158dd5df41ae56c8dd038d14db70f1573f3ca9ba`
recorded a suspected source-versus-registry coordinate blocker after public npm
searches failed to surface an exact `0.1.0-rc.5` lock/tarball record. Further
upstream authority review disproved that inference before package implementation
began.

The exact pinned upstream commit itself is:

```text
47f943859bef60e4160492346772ded9b24f765a
Merge pull request #2519 from deepseek-harness/feat/npm-public
release: dsh@0.1.0-rc.5 & publish the dsh family publicly
```

The same upstream history contains the direct release commit:

```text
abe560f81edebe5f6a5b62706ff502daa0dccd40
release(dsh): 0.1.0-rc.5
```

and the pinned package manifests declare `0.1.0-rc.5` for the exact Adapter
compile authority, including:

```text
@deepseek-ai/dsh-agent          0.1.0-rc.5
@deepseek-ai/dsh-llm            0.1.0-rc.5
@deepseek-ai/dsh-session        0.1.0-rc.5
@deepseek-ai/dsh-tools          0.1.0-rc.5
@deepseek-ai/dsh-user-approval  0.1.0-rc.5
```

Therefore absence of a convenient Git tag or third-party lockfile is **not** a
valid basis for changing the accepted rc5 authority. The earlier suspected
blocker is cleared. No Spec, corpus, peer version, compatibility baseline,
package manifest, lockfile or production code was changed while investigating it.

## Recovered package/build facts

Current Adapter manifest remains:

```text
name: @dsh-safe/adapter-dsh
version: 0.1.0-alpha.0
private: true
type: module
license: MIT
```

Current exact runtime peers remain:

```text
@deepseek-ai/cordis             4.0.1
@deepseek-ai/dsh-agent          0.1.0-rc.5
@deepseek-ai/dsh-llm            0.1.0-rc.5
@deepseek-ai/dsh-session        0.1.0-rc.5
@deepseek-ai/dsh-tools          0.1.0-rc.5
@deepseek-ai/dsh-user-approval  0.1.0-rc.5
```

Source dependency remains:

```text
@dsh-safe/protocol: workspace:*
```

`packages/adapter-dsh/tsconfig.json` intentionally excludes:

```text
src/binding.ts
src/public-api.ts
src/plugin.ts
src/index.ts
```

because ordinary monorepo typecheck is narrower than the exact pinned Harness
compile topology. R1-004 therefore needs a separate truthful publication build
graph that emits the accepted package root and all reachable runtime/declaration
modules.

`pnpm-workspace.yaml` has `autoInstallPeers: false`. A clean publication compile
must therefore make the exact pinned Harness/Cordis build-time type inputs
available reproducibly rather than relying on the source-conformance workflow's
temporary workspace projection. Runtime ownership remains peer-based; build-time
copies must not broaden or replace those peers.

## Candidate package contract

R1-004 implementation must prove all of the following on one exact implementation
head:

```text
clean deterministic publication build
built ESM package root exists
matching .d.ts root exists
single curated root export
explicit files allowlist
actual .tgz generated and inspected
no workspace:* survives packed manifest
exact rc5/Cordis peers preserved
explicit supported Node engine
license/repository/description/keywords coherent
no internal source/test/workflow/secret content in tarball
normal CI green
exact pinned Harness source/runtime conformance green
```

Expected single-root export shape is:

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

An equivalent root-only shape is acceptable only if the generated artifact proves
the same semantics.

R1-004 MAY add the minimum exact development-time Harness packages required for
clean publication compilation, with a reviewed frozen-lockfile delta and no
unrelated version/integrity churn. It MUST keep Harness/Cordis runtime ownership
in exact peerDependencies.

## Lockfile-generation rule

Do not hand-author pnpm registry resolution/integrity data. Generate the R1-004
manifest/lock candidate with the repository-pinned package manager in an isolated
branch or equivalent disposable environment, inspect the exact delta, and only
then apply the verified package/build/check delta to the product branch.

The isolation branch/workflow is evidence tooling only. It must not become part of
PR #3 product history and must not publish packages, use registry credentials,
create release tags or create a GitHub Release.

## R1-004 versus R1-005

R1-004 MAY generate and inspect a real tarball and MAY perform repository-local
built-root smoke. It does **not** establish external-consumer acceptance.

R1-005 separately owns:

```text
consumer outside monorepo/workspace
install same tarball
install exact supported Harness
ALLOW / DENY / ASK smoke
default deny
unsupported-feature fail closed
dispose/lifecycle smoke
no workspace-link/source-path cheating
```

Therefore R1-004 acceptance may claim `PACKAGE_ARTIFACT_VALID`, but not
`EXTERNAL_INSTALL_VERIFIED`.

## Security / release non-claims

R1-004 MUST NOT:

- publish to npm/registry;
- create a GitHub Release or release tag;
- add registry credentials;
- broaden rc5 peer ranges to untested Harness versions;
- add preinstall/install/postinstall scripts merely to make the package work;
- expose binding/provider/source-conformance/internal subpaths;
- claim arbitrary in-process plugin sandboxing or process isolation;
- claim complete host filesystem/process/network/secret mediation;
- resume M5-003+;
- implement R1-005+;
- merge or mark PR #3 Ready.

## Next allowed action

Generate and review the smallest truthful R1-004 publication build/package
candidate using exact rc5/Cordis build-time authority and a real pnpm-generated
lockfile delta. Then apply only the verified product delta to PR #3 and require
that new exact implementation head to pass:

```text
normal CI
+
exact pinned Harness source typecheck/runtime conformance
+
clean publication build
+
actual tarball audit
```

Until an implementation head is accepted:

```text
R1-004 PROTOCOL-FIRST: DUAL-GREEN
R1-004 IMPLEMENTATION: AUTHORIZED / NOT YET ACCEPTED
R1-005+ NOT AUTHORIZED
M5-003+ PAUSED
REGISTRY PUBLISH NOT AUTHORIZED
PR #3 REMAINS OPEN / DRAFT / UNMERGED
```
