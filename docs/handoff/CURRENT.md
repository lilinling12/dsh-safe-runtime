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
- R1-004 P0 publishable Adapter package: **PROTOCOL-FIRST DUAL-GREEN / IMPLEMENTATION AUTHORIZED BUT BLOCKED ON PINNED SOURCE ↔ REGISTRY COORDINATE RESOLUTION**
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

The exact governance delta from accepted audit head
`fea37f8574585813f6c6c264a9d2c548286a6a41` was one direct-child commit and
exactly three governance files:

```text
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md   # +74/-0 append-only
docs/roadmap.md           # R1-003 marker +1/-1 only
```

Therefore R1-003 is **GOVERNANCE CLOSED** and R1-004 is the sole newly authorized
engineering Gate.

PR #3 remained Open / Draft / unmerged at closure.

## R1-004 recovered package facts

Current Adapter manifest:

```text
name: @dsh-safe/adapter-dsh
version: 0.1.0-alpha.0
private: true
type: module
license: MIT
```

Current exact peers:

```text
@deepseek-ai/cordis             4.0.1
@deepseek-ai/dsh-agent          0.1.0-rc.5
@deepseek-ai/dsh-llm            0.1.0-rc.5
@deepseek-ai/dsh-session        0.1.0-rc.5
@deepseek-ai/dsh-tools          0.1.0-rc.5
@deepseek-ai/dsh-user-approval  0.1.0-rc.5
```

Source dependency:

```text
@dsh-safe/protocol: workspace:*
```

`@dsh-safe/protocol` already has a built ESM root, declaration export, `files:
["dist"]` and a real build script. R1-004 does not redesign that package.

## Publication-build blocker discovered before implementation

`packages/adapter-dsh/tsconfig.json` currently excludes:

```text
src/binding.ts
src/public-api.ts
src/plugin.ts
src/index.ts
```

That exclusion is deliberate for ordinary monorepo typecheck because those files
belong to the exact pinned Harness compile topology.

Consequently, simply removing `private: true` and adding an `exports` entry to
`dist/index.js` would produce a false publishability claim: the ordinary Adapter
compile path does not currently emit the package-root runtime/declarations.

R1-004 MUST establish a separate truthful publication build graph for the
accepted public root. It MUST NOT publish TS source, point metadata at missing
files, use ambient Harness shims, or depend on source-conformance projection at
consumer runtime.

## R1-004 normative candidate

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
implementation is authorized in principle. The blocker below was discovered while
recovering the clean publication-build dependency graph before any package,
lockfile, build-script or production change was made.

## Pinned-source versus registry-coordinate blocker

The exact pinned upstream commit
`47f943859bef60e4160492346772ded9b24f765a` declares `0.1.0-rc.5` in the
package manifests used by the Adapter compile graph, including at least:

```text
@deepseek-ai/dsh-agent          0.1.0-rc.5
@deepseek-ai/dsh-llm            0.1.0-rc.5
@deepseek-ai/dsh-session        0.1.0-rc.5
@deepseek-ai/dsh-tools          0.1.0-rc.5
@deepseek-ai/dsh-user-approval  0.1.0-rc.5
```

However, current upstream release evidence does not establish those same
`0.1.0-rc.5` coordinates as registry-published packages:

- the upstream Git tag set contains no `dsh-v0.1.0-rc.5` tag and starts the
  visible `0.1.0` release-tag line at later RCs;
- current npm version histories inspected for the Harness family show the early
  RC line using `0.0.1-rc.5`, followed by `0.1.0-rc.2`, `0.1.0-rc.3` and later
  `0.1.0-rc.6`, rather than proving a published `0.1.0-rc.5` coordinate;
- repository search found no trustworthy exact `0.1.0-rc.5` registry lock/tarball
  evidence that could be used as the publication build's dependency authority.

This matters because `pnpm-workspace.yaml` has `autoInstallPeers: false`, while
the publication graph imports the pinned Harness/Cordis packages directly.
Simply copying the current exact peers into `devDependencies` would therefore
claim a registry resolution that has not been proven to exist. Substituting
`0.0.1-rc.5`, broadening to a range, or silently switching to `0.1.0-rc.6` would
change the accepted compatibility authority and is not authorized by Spec 0058.

Until the authority is resolved, do NOT modify:

```text
packages/adapter-dsh/package.json
packages/adapter-dsh publication build config/scripts
pnpm-lock.yaml
Harness compatibility baseline
peer dependency versions
R1-004 corpus expectations
R1-005+
```

A valid resolution must explicitly choose one of these authority models before
implementation continues:

1. preserve the pinned source commit as compatibility authority and normatively
   define a reproducible source-backed publication compile input that does not
   pretend unavailable registry coordinates exist; or
2. authorize a registry-backed Harness baseline/version and re-run the required
   protocol/compatibility evidence before changing peer/build coordinates.

Do not infer that option 2 is allowed merely because a newer Harness release is
available. Do not weaken the exact pinned-source conformance requirement to make
R1-004 packable.

## Candidate package contract

R1-004 defines publishability as a real artifact property, not a manifest flag.
The implementation must eventually prove all of the following on one exact head:

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

The likely ESM root shape is:

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

but implementation may use an equivalent single-root shape only if the generated
artifact proves the same semantics.

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

## Package security / release non-claims

R1-004 MUST NOT:

- publish to npm/registry;
- create a GitHub Release or release tag;
- add registry credentials;
- claim the registry scope is already reserved;
- broaden rc5 peer ranges to untested Harness versions;
- add install-time scripts merely to make the package work;
- expose binding/provider/source-conformance/internal subpaths;
- claim arbitrary in-process plugin sandboxing or process isolation;
- claim complete host filesystem/process/network/secret mediation;
- resume M5-003+;
- implement R1-005+;
- merge or mark PR #3 Ready.

## Protocol-first delta boundary

The protocol-first prerequisite has already passed exact-head normal CI plus
exact pinned Harness conformance at `3ce15c7796bd32ecebcb220207fad3ccd03b7834`.
The original pre-verification boundary was restricted to exactly:

```text
specs/0058-r1-adapter-dsh-publishable-package.md
fixtures/adapter-dsh-package/cases.json
docs/handoff/CURRENT.md
```

No package/build implementation has been committed after that verification. The
newly discovered source/registry authority conflict must be resolved before the
implementation permissions unlocked by the dual-green prerequisite are exercised.

Still not authorized:

```text
R1-005+
M5-003+
registry publish / GitHub Release / release tag
PR #3 merge or Ready transition
```

## Next allowed action

Resolve the pinned-source versus registry-coordinate authority conflict above
without changing production/package behavior first. Only after the resolution is
normatively explicit may the smallest R1-004 publication build/package delta
begin and obtain exact-head normal CI plus exact pinned Harness verification.

Until then:

```text
R1-004 PROTOCOL-FIRST: DUAL-GREEN
R1-004 IMPLEMENTATION: AUTHORIZED IN PRINCIPLE / BLOCKED ON AUTHORITY RESOLUTION
R1-005+ NOT AUTHORIZED
M5-003+ PAUSED
REGISTRY PUBLISH NOT AUTHORIZED
PR #3 REMAINS OPEN / DRAFT / UNMERGED
```
