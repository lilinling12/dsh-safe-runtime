# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before changes;
> normative specs/schemas/TCK and accepted exact-head evidence remain authority.

## Snapshot

- Recorded at: `2026-09-11`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `R1 — DeepSeek Harness Plugin Alpha Release`
- Active PR: `#3 — feat(policy): begin M4 capability broker`
- Branch: `feat/m4-capability-broker`
- Base: `main@57430273e065be8d38807d67b175fa154c801d43`
- R1-001 P0 Alpha readiness reconciliation: **GOVERNANCE CLOSED**
- R1-002 P0 public DeepSeek Adapter API: **GOVERNANCE CLOSED**
- R1-003 P0 DeepSeek plugin/bootstrap integration: **GOVERNANCE CLOSED**
- R1-004 P0 publishable Adapter package: **PROTOCOL-FIRST CANDIDATE / IMPLEMENTATION NOT AUTHORIZED UNTIL THIS EXACT HEAD IS DUAL-GREEN**
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

Before exact-head dual-green, the repository delta is restricted to exactly:

```text
specs/0058-r1-adapter-dsh-publishable-package.md
fixtures/adapter-dsh-package/cases.json
docs/handoff/CURRENT.md
```

Not authorized in this candidate:

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
registry publish / GitHub Release / release tag
PR #3 merge or Ready transition
```

## Next allowed action

Verify this exact R1-004 protocol-first head through both normal CI and exact
pinned Harness rc5 source-conformance, including step 10 pinned-source TypeScript
and step 11 real runtime conformance.

Only if the same exact SHA is dual-green may the smallest R1-004 package/build
implementation begin. Until then:

```text
R1-004 IMPLEMENTATION NOT AUTHORIZED
R1-005+ NOT AUTHORIZED
M5-003+ PAUSED
REGISTRY PUBLISH NOT AUTHORIZED
PR #3 REMAINS OPEN / DRAFT / UNMERGED
```
