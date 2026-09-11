# R1-005 — External Tarball Consumer + Exact Harness Smoke Contract

Status: **DRAFT NORMATIVE SPECIFICATION**  
Release track: `R1 — DeepSeek Harness Plugin Alpha Release`  
Gate: `R1-005 P0 — external tarball consumer + real Harness smoke gate`  
Conformance profile: `R1-005_EXTERNAL_TARBALL_CONSUMER_V1`  
Pinned Harness compatibility baseline: `0.1.0-rc.5` / `47f943859bef60e4160492346772ded9b24f765a`  
Depends on: R1-002 public Adapter API; R1-003 plugin/bootstrap integration; R1-004 publishable package contract  
Separated from: R1-006 compatibility/install UX; R1-007 release/provenance automation; R1-008 registry/release acceptance; npm publish; GitHub Release; M14 process-isolated Plugin Host

## 1. Purpose

R1-005 proves that the real R1-004 Adapter tarball can be consumed outside the
monorepo and can execute the already accepted rc5 bootstrap semantics against the
exact supported Harness baseline.

The Gate answers one question:

> Can a clean consumer outside the safe-runtime workspace install only real
> package tarballs, resolve the Adapter and exact Harness runtime from its own
> `node_modules`, and reproduce the accepted ALLOW / DENY / ASK / default-deny /
> dispose / unsupported-feature behavior without workspace links, source imports
> or compatibility broadening?

R1-005 is an external-consumer conformance Gate. It is not a registry publish
Gate, not a compatibility-range expansion Gate, and not a process-isolation Gate.

## 2. Entry precondition

R1-004 governance exact head:

```text
2eb227f2fb54f9249ddde9739bb7e2e515d96ba8
```

passed on that same SHA:

```text
CI #694 / run 34650123869: PASS
Harness #636 / run 34650123861: PASS
Harness step 10 pinned-source typecheck: PASS
Harness step 11 real rc5 runtime conformance: PASS
```

Therefore R1-004 is GOVERNANCE CLOSED and R1-005 protocol/design work is
authorized. PR #3 remains Open / Draft / unmerged. R1-006+, M5-003+, registry
publish, GitHub Release/tag creation and PR merge/Ready remain unauthorized.

## 3. Accepted Adapter artifact authority

The consumer MUST use the same package contract accepted by R1-004:

```text
@dsh-safe/adapter-dsh@0.1.0-alpha.0
ESM package
single public package root
built JS + declarations
exact Cordis/Harness peer contract
no install-time scripts
```

The Adapter under test MUST be produced by the accepted R1-004 package build and
real `pnpm pack` path. R1-005 MUST NOT copy `packages/adapter-dsh/src`, import the
workspace package directly, or substitute an ad-hoc test bundle.

The generated Adapter `.tgz` is the unit under external-consumer test.

## 4. External consumer definition

A conforming consumer environment MUST be created in a fresh temporary directory
outside the safe-runtime repository root and outside every pnpm workspace root
participating in the test.

The consumer MUST have its own:

- `package.json`;
- package-manager installation state;
- `node_modules` or equivalent isolated dependency tree;
- test entrypoint(s).

The consumer MUST NOT resolve runtime code through:

```text
workspace: links
link: or file: directories pointing at source workspaces
pnpm workspace symlinks into the safe-runtime repository
NODE_PATH pointing into either source repository
TypeScript source imports from safe-runtime or Harness
undeclared relative paths outside the consumer
pre-existing repository node_modules
```

Tarball files passed as installation inputs are allowed because the Gate is
explicitly a tarball consumer test.

## 5. Exact Harness baseline remains fixed

The supported baseline remains exactly:

```text
0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a
```

R1-005 MUST NOT replace rc5 with rc6, `latest`, `next`, a caret/tilde range, or a
newer commit merely because public registry resolution has moved forward.

A version mismatch is a conformance failure, not a reason to silently widen the
compatibility contract. Compatibility expansion belongs to R1-006 and requires
its own evidence.

## 6. Registry availability is a separate claim

Current public npm availability is not protocol authority. The accepted rc5 source
manifests at the pinned commit identify the intended exact package versions, while
public npm resolution may no longer expose every required exact coordinate.

R1-005 therefore distinguishes two claims:

```text
EXTERNAL_TARBALL_CONSUMER_VERIFIED
PUBLIC_REGISTRY_INSTALL_VERIFIED
```

The first is required by this Gate. The second is optional evidence and MUST NOT
be claimed unless a fresh consumer can install every required exact runtime
package directly from the public registry by its accepted coordinate.

Failure of public registry lookup MUST NOT be hidden by installing rc6 or a range.

## 7. Exact-source peer tarball bridge

When any required exact rc5 runtime package cannot be resolved from the public
registry, R1-005 MAY construct a deterministic **exact-source peer tarball bridge**
from the pinned upstream commit.

The bridge MUST:

1. fetch exactly commit `47f943859bef60e4160492346772ded9b24f765a`;
2. verify the checked-out SHA before build;
3. install upstream dependencies reproducibly using the upstream frozen lockfile
   and repository-pinned package-manager policy used by the existing Harness
   source-conformance path;
4. build the required public runtime package outputs;
5. determine the complete runtime workspace-package closure needed by the
   Adapter's exact Cordis/Harness peer set, including transitive upstream
   workspace dependencies;
6. `pack` every required upstream workspace package as a real npm-compatible
   `.tgz` after build;
7. verify each packed manifest name/version corresponds to the package manifest
   at the exact pinned commit and contains no surviving `workspace:` locator;
8. install those tarballs into the external consumer as package artifacts, not as
   source directories or workspace links.

The bridge is an installation fixture for exact-baseline conformance. It MUST NOT
be described as a substitute public registry or as evidence that those versions
remain publicly installable.

## 8. Runtime package-closure completeness

The bridge MUST be closure-complete rather than hand-picking only the six direct
Adapter peer names.

If an exact Harness/Cordis package's packed runtime manifest depends on another
upstream workspace package, that dependency MUST either:

- resolve at the exact version from the public registry; or
- be included as another exact-source tarball in the bridge.

The consumer installation MUST fail rather than silently fall back to an
unverified version when closure cannot be satisfied exactly.

Closure calculation MUST be deterministic and auditable by package name/version.

## 9. Tarball identity and provenance evidence

For every locally constructed tarball used by the consumer, the Gate MUST record
at least:

```text
package name
package version
source authority (safe-runtime exact head or pinned Harness commit)
archive filename
archive SHA-256
packed manifest dependency/peer summary
```

The Adapter tarball provenance MUST identify the current R1-005 implementation
head that produced it. Harness bridge tarballs MUST identify exact upstream commit
`47f943...`.

This evidence is test provenance only. Full release SBOM, registry provenance,
signed release policy and publication integrity remain R1-007/R1-008.

## 10. Consumer install must be real

The external consumer MUST invoke a real package-manager installation using the
Adapter tarball and exact runtime package inputs.

After installation, the Gate MUST prove the resolved Adapter package root and the
resolved Harness/Cordis packages originate under the consumer installation tree,
not either source repository.

At minimum, resolution evidence MUST reject paths under:

```text
safe-runtime repository root
pinned Harness source checkout
```

The Gate MUST NOT pass merely because a test process can import the tarball by
absolute archive/extraction path without installing it.

## 11. Public package-root only

The smoke harness MUST import the Adapter through the installed public package
root:

```text
@dsh-safe/adapter-dsh
```

It MUST NOT deep-import `binding`, `plugin`, `ports`, `source-conformance`, `src`,
or another package-private file.

Only the accepted R1-002/R1-003 package-root API may be used to construct the
Adapter/plugin smoke.

## 12. Real Harness/Cordis runtime requirement

The external smoke MUST execute against actual installed exact rc5 Cordis/Harness
runtime packages. A local fake that merely satisfies TypeScript structural types
is insufficient.

The test MAY use minimal test-owned Cordis services/agents/tools necessary to
exercise the accepted plugin seam, but the policy/guard/approval/tool pipeline
being asserted MUST be the real rc5 runtime path already established by R1-003.

## 13. ALLOW smoke

A HANDLER policy returning `ALLOW` MUST prove:

1. the installed plugin activates successfully;
2. one real test-owned tool request reaches the accepted ToolRuntime path;
3. the policy handler is invoked exactly once for that request;
4. the tool body enters and returns the expected fixed benign result;
5. no approval request is created by ALLOW;
6. the final runtime result is the real ToolRuntime result.

This does not claim host-effect mediation outside ToolRuntime.

## 14. DENY smoke

A HANDLER policy returning `DENY` MUST prove:

- the policy handler is reached exactly once;
- the test-owned tool body is not entered;
- no approval request is created;
- execution fails closed through the accepted Adapter/ToolRuntime path.

The smoke MUST NOT substitute a test harness that simply skips calling the body.

## 15. ASK smoke

A HANDLER policy returning `ASK` MUST use the real native approval path accepted by
R1-003/M4-042.

At minimum the external smoke MUST prove:

```text
ASK + ALLOWED_ONCE -> approval exactly once -> body may enter
ASK + REJECTED     -> body does not enter
```

The implementation SHOULD additionally cover CANCELLED and UNAVAILABLE in the
same external suite. Agent-less ASK remains fail closed if exercised.

The Adapter/plugin MUST NOT create a second approval subsystem or call an
independent approval path for the same reached ASK.

## 16. Default-deny smoke

Installing `createDshRc5Plugin()` with omitted `policy` MUST exercise the accepted
DENY_ALL default:

```text
one pre-execute DENY
+
one monotonic guard DENY
```

A real test-owned tool body MUST not enter.

The smoke MUST prove this from the installed tarball's public plugin API, not by
calling an internal deny helper.

## 17. Unsupported-feature fail-closed smoke

The external suite MUST include at least one activation attempt whose declared
runtime feature set lacks a feature required by the selected plugin mode.

The attempt MUST:

- fail activation explicitly through the accepted unsupported-feature boundary;
- leave no usable partially active plugin;
- clean up Adapter-owned registrations created by the failed attempt;
- never degrade silently to a weaker path while reporting success.

For DENY_ALL, missing `toolsPreExecute` or `toolsMonotonicGuard` is sufficient.

## 18. Disposal smoke

After successful plugin activation and at least one proven runtime interaction:

```text
await fiber.dispose()
```

MUST settle only after Adapter-owned registrations are disposed.

A later test-owned request in the same caller-owned Context MUST not be handled by
stale plugin registrations from the disposed Fiber. The root Context and
caller-owned independent services remain caller-owned.

Disposal MUST be tested through the installed public bootstrap, not by directly
calling package-private teardown helpers.

## 19. Clean-room environment constraints

The external smoke MUST be reproducible from a clean checkout and MUST not depend
on:

- developer-global npm/pnpm packages;
- a previously built Adapter `dist`;
- existing repository `node_modules` for consumer runtime resolution;
- unpublished local registry state;
- secret credentials;
- a warm package-manager cache for correctness.

Network access MAY be used only for public dependencies explicitly required by the
test. If exact Harness peers use the source-tarball bridge, their correctness MUST
not depend on public registry availability for the missing exact coordinates.

## 20. Install scripts and security

R1-005 MUST NOT add Adapter `preinstall`, `install` or `postinstall` scripts to
make the external consumer pass.

Bridge tarballs are built from the pinned upstream source authority; any upstream
install-script behavior encountered MUST be treated as upstream package behavior
and must not be silently rewritten by safe-runtime. If such behavior creates a
new security requirement, the Gate must stop for review.

No registry tokens or publish credentials are required or permitted.

## 21. No source-path cheating

The external suite MUST fail its own setup if runtime resolution points into a
source checkout or workspace.

Forbidden examples include:

```text
../../packages/adapter-dsh/src/index.ts
../../packages/adapter-dsh/dist/index.js without package installation
<safe-runtime>/node_modules/@deepseek-ai/*
<harness-source>/packages/.../src
pnpm link --global
npm link
```

A source checkout MAY exist only as an input for producing exact tarballs, after
which the consumer must execute exclusively from installed package artifacts.

## 22. Version and package-set assertions

Before runtime smoke, the consumer MUST assert the installed package versions for
all Adapter-declared direct Harness/Cordis peers exactly match the R1-004 peer
contract.

The Gate MUST also verify that every source-bridge tarball records its exact packed
version and source commit. Duplicate package identities with conflicting versions
in the consumer dependency graph are a failure when they can affect the tested
runtime path.

## 23. Failure classification

The R1-005 test harness SHOULD distinguish at least:

```text
ARTIFACT_BUILD_FAILED
EXACT_BASELINE_UNAVAILABLE
PEER_CLOSURE_INVALID
CONSUMER_INSTALL_FAILED
SOURCE_LEAK_DETECTED
VERSION_MISMATCH
PUBLIC_ROOT_RESOLUTION_FAILED
ACTIVATION_FAILED
SMOKE_ASSERTION_FAILED
DISPOSAL_FAILED
```

Failure diagnostics MUST avoid leaking arbitrary environment variables, registry
tokens, package-manager auth configuration or test secrets.

## 24. Claim vocabulary

R1-005 acceptance MAY establish:

```text
EXTERNAL_TARBALL_CONSUMER_VERIFIED
EXACT_RC5_RUNTIME_SMOKE_VERIFIED
```

It MUST NOT automatically establish:

```text
PUBLIC_REGISTRY_INSTALL_VERIFIED
FUTURE_HARNESS_COMPATIBILITY_VERIFIED
RELEASE_REPRODUCIBILITY_VERIFIED
REGISTRY_PROVENANCE_VERIFIED
PROCESS_ISOLATION_VERIFIED
COMPLETE_HOST_EFFECT_MEDIATION_VERIFIED
```

Those stronger claims require their own later evidence.

## 25. No compatibility broadening

R1-005 MUST preserve the exact rc5 peer versions accepted by R1-004.

If exact-source tarballs are needed because registry availability differs, that is
an acquisition bridge, not a semver compatibility decision. R1-006 remains owner
of the installation/compatibility matrix and any future baseline expansion.

## 26. No release action

R1-005 MUST NOT:

- publish `@dsh-safe/adapter-dsh`;
- publish an upstream Harness package;
- create or mutate registry tags;
- create a Git tag or GitHub Release;
- configure publish credentials;
- mark PR #3 Ready;
- merge PR #3.

Tarballs created for conformance remain disposable evidence artifacts unless a
later release Gate explicitly owns them.

## 27. No new runtime semantics

R1-005 SHOULD be external-consumer test/build infrastructure only.

It MUST NOT redesign Adapter policy, approval, lifecycle, feature detection,
Capability Broker semantics, Harness event mapping, provider/resource authority or
security guarantees merely to make the smoke pass.

Any real production defect exposed by external installation must be fixed through
the smallest reviewed change that preserves prior accepted contracts and then
obtain same-SHA normal CI + Harness evidence.

## 28. Required acceptance evidence

R1-005 implementation acceptance requires the same exact safe-runtime SHA to have:

1. normal repository CI PASS;
2. exact pinned Harness source typecheck/runtime conformance PASS;
3. Adapter real `.tgz` build PASS;
4. exact peer acquisition/closure audit PASS;
5. external clean consumer install PASS;
6. consumer path-isolation/source-leak audit PASS;
7. exact direct peer version audit PASS;
8. ALLOW smoke PASS;
9. DENY body-non-entry smoke PASS;
10. ASK native approval smoke PASS;
11. omitted-policy default-deny smoke PASS;
12. unsupported-feature fail-closed smoke PASS;
13. disposal/no-stale-registration smoke PASS.

A source-conformance-only success is insufficient. A consumer that resolves any
runtime package from a source workspace is insufficient.

## 29. Protocol-first repository delta

Before R1-005 production/test implementation begins, the protocol-first exact head
is restricted to:

```text
specs/0059-r1-external-tarball-consumer-harness-smoke.md
fixtures/adapter-dsh-external-consumer/cases.json
docs/handoff/CURRENT.md
```

Not authorized before that exact head is normal-CI + exact-Harness dual-green:

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
PR #3 merge or Ready transition
```

## 30. Implementation sequence after protocol-first dual-green

After protocol-first dual-green, implementation SHOULD proceed in this order:

1. add deterministic Adapter tarball production reuse;
2. add exact peer acquisition audit;
3. implement closure-complete exact-source peer tarball bridge only where
   required by real registry availability;
4. create a fresh external consumer outside both workspaces;
5. perform real package-manager installation from tarball inputs;
6. prove runtime resolution paths live under the consumer installation;
7. assert exact direct peer versions;
8. execute ALLOW / DENY / ASK / default-deny / unsupported-feature / disposal
   smokes through the installed package root;
9. record archive hashes and package provenance evidence;
10. run full normal CI and pinned Harness source/runtime conformance on the same
    implementation SHA;
11. perform independent acceptance review before any governance marker changes.

## 31. Acceptance boundary

R1-005 is accepted only when evidence supports exactly:

```text
R1_005_EXTERNAL_TARBALL_CONSUMER_ACCEPTED
EXTERNAL_TARBALL_CONSUMER_VERIFIED
EXACT_RC5_RUNTIME_SMOKE_VERIFIED
```

`PUBLIC_REGISTRY_INSTALL_VERIFIED` is a separate optional fact and may remain
false/unproven without invalidating exact-source tarball consumer acceptance,
provided every acquisition path is explicit and no version/source cheating
occurs.

Acceptance does not authorize R1-006 implementation until R1-005 governance
closure exact head is dual-green.
