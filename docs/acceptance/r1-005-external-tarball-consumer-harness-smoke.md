# R1-005 External Tarball Consumer + Exact Harness Smoke Acceptance Audit

Status: **IMPLEMENTATION ACCEPTANCE CANDIDATE — GOVERNANCE CLOSURE NOT YET ESTABLISHED**  
Milestone: `R1 — DeepSeek Harness Plugin Alpha Release`  
Gate: `R1-005 P0 — external tarball consumer + real Harness smoke gate`  
Profile: `R1-005_EXTERNAL_TARBALL_CONSUMER_V1`  
Pinned Harness: `0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a`

## 1. Scope and authority

This audit applies Spec 0059 and portable cases ATCON-001..ATCON-040 to the
reviewed R1-005 external-consumer implementation.

R1-005 accepts only the following bounded properties:

```text
R1_005_EXTERNAL_TARBALL_CONSUMER_ACCEPTED
EXTERNAL_TARBALL_CONSUMER_VERIFIED
EXACT_RC5_RUNTIME_SMOKE_VERIFIED
```

The Gate proves that a clean consumer outside both source repositories can install
the real R1-004 Adapter artifact plus the exact runtime tarball closure derived
from the pinned Harness source authority, resolve runtime code from its own
`node_modules`, and execute the already accepted rc5 plugin semantics.

It does **not** establish:

```text
PUBLIC_REGISTRY_INSTALL_VERIFIED
FUTURE_HARNESS_COMPATIBILITY_VERIFIED
RELEASE_REPRODUCIBILITY_VERIFIED
REGISTRY_PROVENANCE_VERIFIED
PROCESS_ISOLATION_VERIFIED
COMPLETE_HOST_EFFECT_MEDIATION_VERIFIED
npm publication
Git tag / GitHub Release readiness
R1-006+
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

## 2. Predecessor and protocol-first authority

R1-004 final governance predecessor:

```text
2eb227f2fb54f9249ddde9739bb7e2e515d96ba8
CI #694 / run 34650123869: PASS
Harness #636 / run 34650123861: PASS
Harness step 10 pinned-source typecheck: PASS
Harness step 11 real rc5 runtime conformance: PASS
```

R1-005 protocol-first work was corrected before implementation. The final
protocol-first exact head is:

```text
045c9b4ecadd2be88a43053976e8507f80d6b7eb
CI #696: PASS
Harness #638: PASS
```

That authority froze:

```text
specs/0059-r1-external-tarball-consumer-harness-smoke.md
fixtures/adapter-dsh-external-consumer/cases.json
profile: R1-005_EXTERNAL_TARBALL_CONSUMER_V1
cases: ATCON-001..ATCON-040
```

No executable R1-005 consumer implementation preceded the accepted protocol-first
boundary.

## 3. Reviewed implementation delta

Git compare from protocol-first exact head
`045c9b4ecadd2be88a43053976e8507f80d6b7eb` to final reviewed implementation head
`257f3bab44fa3e788135d5b5edff4e96ce3df62a` is exactly two commits ahead and
changes exactly four paths:

```text
docs/handoff/CURRENT.md
package.json
scripts/check-adapter-dsh-external-consumer.mjs
scripts/r1-005-external-consumer-smoke.mjs
```

Notably absent from the implementation delta:

```text
production TypeScript
pnpm-lock.yaml
Spec 0059
R1-005 corpus
protocol schemas / validators
Shared TCK
Harness source-conformance workflow / pinned baseline
HISTORY.md
roadmap acceptance markers
R1-006+
M5-003+
registry/release/tag configuration
PR merge/readiness state
```

The implementation is therefore test/build infrastructure only and does not
redesign accepted Adapter runtime semantics.

## 4. Exact artifact and baseline acquisition

The checker builds and packs the real accepted safe-runtime artifacts:

```text
@dsh-safe/protocol@0.1.0-alpha.0
@dsh-safe/adapter-dsh@0.1.0-alpha.0
```

The Adapter is produced through the accepted R1-004 publication build followed by
a real `pnpm pack`. Its packed manifest is audited for the exact Adapter identity,
protocol dependency, exact direct Harness/Cordis peer map and absence of Adapter
`preinstall`, `install` or `postinstall` scripts.

The Harness acquisition path is fixed to:

```text
repository: https://github.com/deepseek-ai/deepseek-harness.git
commit:     47f943859bef60e4160492346772ded9b24f765a
version:    0.1.0-rc.5
pnpm:       11.7.0
```

The temporary upstream checkout verifies `git rev-parse HEAD` before build,
performs the upstream frozen install and release verification/build, then uses the
official DSH/vendor pack paths plus the required Landlock entry pack.

No rc6/latest/next/range substitution is accepted.

## 5. Packed-artifact audit and deterministic runtime closure

Every locally built upstream tarball is opened and audited before consumer setup.
The checker records package identity, version, source authority, archive filename,
SHA-256 and packed dependency/optional-dependency/peer summary, rejects surviving
`workspace:` locators, and rejects conflicting duplicate package identities with
different version or bytes.

The external consumer does **not** promote every upstream release-family artifact
to a top-level dependency. That would make unrelated family/test-support packages
participate in the consumer's npm peer graph and would exceed the Spec 0059
runtime-closure boundary.

Instead, the implementation deterministically computes the local runtime closure
rooted at:

```text
@dsh-safe/adapter-dsh
@dsh-safe/protocol
@deepseek-ai/cordis
@deepseek-ai/dsh-agent
@deepseek-ai/dsh-llm
@deepseek-ai/dsh-session
@deepseek-ai/dsh-tools
@deepseek-ai/dsh-user-approval
```

For every selected packed artifact, the closure follows:

```text
dependencies
optionalDependencies
non-optional peerDependencies
```

when the referenced package exists in the exact local artifact set. Missing
required local roots fail setup rather than being silently replaced with another
Harness version.

All packed artifacts remain audited for provenance; only the runtime closure
required by the Adapter contract is installed into the external consumer.

## 6. Real external consumer and install semantics

The checker creates the consumer with `mkdtemp()` under the operating-system temp
root and explicitly rejects a consumer path inside either:

```text
safe-runtime repository
pinned Harness source checkout
```

The consumer receives its own:

```text
package.json
node_modules
consumer-smoke.mjs
DSH_HOME
DSH_AGENTS_HOME
```

Consumer dependencies are real `file:` URL references to `.tgz` package artifacts,
not source directories or workspace links.

Installation is a normal package-manager operation:

```text
npm install --no-audit --no-fund --package-lock=false
```

R1-005 does not use `--legacy-peer-deps`, `--force`, `--omit=optional`, `--ignore-scripts`
or a custom install shim. Upstream lifecycle behavior and optional runtime
dependencies therefore retain their packed-manifest semantics.

`NODE_PATH`, `NODE_OPTIONS` and inherited npm user-agent overrides are removed from
the smoke environment so repository/source resolution cannot be injected through
those channels.

## 7. Installed path, package-root and version isolation

Before behavioral smoke, the installed consumer asserts runtime resolution for:

```text
@dsh-safe/adapter-dsh
@dsh-safe/protocol
all six Adapter-declared direct Harness/Cordis peers
```

Every resolved entry must:

```text
be under the external consumer root
contain /node_modules/
not resolve under the safe-runtime source root
not resolve under the Harness source root
not resolve through a /src/ path
```

The installed Adapter manifest is checked for:

```text
name:    @dsh-safe/adapter-dsh
version: 0.1.0-alpha.0
private: absent
@dsh-safe/protocol: 0.1.0-alpha.0
exact direct peer contract
```

Each direct peer's installed package manifest must exactly match the accepted
version before runtime assertions execute.

The smoke imports the Adapter only as:

```text
@dsh-safe/adapter-dsh
```

and verifies the installed runtime value surface remains exactly:

```text
DshAdapterError
createDshRc5Adapter
createDshRc5Plugin
```

No Adapter deep import is used.

## 8. Real rc5 behavioral smoke

The consumer imports real installed rc5 Cordis/Harness packages and exercises the
actual ToolRuntime/approval pipeline with minimal test-owned tools and caller-owned
Cordis scopes.

The external suite directly proves:

```text
HANDLER ALLOW
  policy exactly once
  no approval request
  tool body exactly once
  non-error ToolRuntime result

HANDLER DENY
  policy exactly once
  no approval request
  tool body never enters
  fail-closed ToolRuntime result

HANDLER ASK + ALLOWED_ONCE
  policy exactly once
  native approval exactly once
  tool body enters

HANDLER ASK + REJECTED
HANDLER ASK + CANCELLED
HANDLER ASK + UNAVAILABLE
  policy exactly once
  native approval exactly once
  tool body never enters
  fail closed

omitted policy / DENY_ALL
  real test-owned tool body never enters while plugin is active
```

One reached ASK is serviced by the native approval waterfall only; no duplicate
Adapter approval subsystem is introduced.

## 9. Feature compatibility and disposal

The installed exact rc5 Adapter is instantiated against the real installed
runtime and must report:

```text
harnessVersion: 0.1.0-rc.5
harnessCommit:  47f943859bef60e4160492346772ded9b24f765a
toolsPreExecute: true
toolsMonotonicGuard: true
```

The suite does not monkey-patch or fabricate a missing-feature baseline.

Disposal is exercised through the installed public plugin:

```text
await fiber.dispose()
fiber.uid === null
```

A later request in the same caller-owned Context must execute normally rather than
being intercepted by stale Adapter registrations. The caller-owned root Context
and independent listener/service ownership remain outside the plugin Fiber.

## 10. Clean-state, security and claim boundaries

Normal CI starts from a clean GitHub Actions checkout and performs the repository
frozen-lockfile install before `pnpm check:all`. The R1-005 checker independently
creates the pinned Harness checkout, packed artifacts and external consumer on
each execution.

The Gate does not require:

```text
registry credentials
publish credentials
secret tokens
an unpublished local registry
pre-existing Adapter dist
consumer resolution from repository node_modules
```

The implementation adds no Adapter install-time script and no production runtime
TypeScript. Therefore R1-005 does not introduce new policy, approval, lifecycle,
Capability, provider/resource or Harness event semantics.

The checker records:

```text
publicRegistryInstallVerified: false
```

so source-backed exact-baseline conformance cannot be mistaken for current public
registry installability.

## 11. Formal CI failure and remediation history

The initial formal implementation head was:

```text
d1b34e0036f8564b6820ce5077a77f5f717aee69
Harness #639 / run 34657533147: PASS
CI #697 / run 34657533141: FAIL
```

The failure was inside the new external consumer's real `npm install`, after
repository and Harness build/setup work had succeeded. The initial checker audited
and then installed the complete upstream DSH/vendor/Landlock release-family
artifact map as consumer top-level dependencies.

That was broader than Spec 0059 requires. Release-family packaging contains
artifacts outside this Adapter's tested runtime closure; making all of them
consumer roots changes the npm peer graph and allowed unrelated package metadata
to participate in dependency resolution.

The repair did **not** change npm version, use peer-resolution bypass flags,
suppress lifecycle scripts, omit optional runtime dependencies, broaden Harness
compatibility or weaken assertions. It changed only the R1-005 checker so that:

```text
all tarballs remain audited
+
consumer installation receives only the deterministic runtime closure rooted at
the Adapter/protocol/direct-peer contract
```

Final repair/head:

```text
257f3bab44fa3e788135d5b5edff4e96ce3df62a
```

## 12. Final reviewed implementation evidence

Final reviewed implementation head:

```text
257f3bab44fa3e788135d5b5edff4e96ce3df62a
```

Live PR state was rechecked at that head:

```text
PR #3: Open
Draft: true
Merged: false
Mergeable: true
Base: main@57430273e065be8d38807d67b175fa154c801d43
Head: feat/m4-capability-broker@257f3bab44fa3e788135d5b5edff4e96ce3df62a
```

Exact-head verification:

```text
CI #698 / run 34994705894: PASS
Harness #640 / run 34994705777: PASS
Harness step 10 pinned-source TypeScript: PASS
Harness step 11 real rc5 runtime conformance: PASS
```

CI's `verify` job passed the frozen repository install and complete
`pnpm check:all` chain. Because the R1-005 checker is appended to that chain, the
same exact head passed the real external tarball build, exact-source closure audit,
normal npm consumer install and installed rc5 runtime smoke.

The Harness workflow independently rebuilt the pinned upstream public type
surface, reinstalled safe-runtime reproducibly, projected the exact workspace,
verified projection idempotence, passed exact-source binding typecheck and passed
real rc5 runtime conformance on the same SHA.

## 13. ATCON-001..ATCON-040 reconciliation

All 40 R1-005 cases are satisfied by the reviewed repository and exact-head
evidence:

| Cases | Result | Reviewed evidence |
| --- | --- | --- |
| ATCON-001..002 | SATISFIED | R1-004 governance predecessor is exact-head dual-green; PR #3 remains Open/Draft/unmerged and R1-006+, M5-003+, publish/release/tag and merge/Ready remain unauthorized. |
| ATCON-003..006 | SATISFIED | Real R1-004 Adapter `.tgz`; fresh external consumer; own manifest/install/runtime entry; no workspace/source links or repository runtime tree reuse. |
| ATCON-007..011 | SATISFIED | Baseline remains exactly rc5@`47f943...`; public-registry claim remains separate/false; exact source checkout is SHA-verified, frozen-installed, built and packed into real tarballs. |
| ATCON-012..014 | SATISFIED | Consumer package set is the deterministic transitive local runtime closure, including dependencies, optional dependencies and non-optional peers; packed manifests are identity/version audited and reject surviving `workspace:` locators. |
| ATCON-015..019 | SATISFIED | Provenance records source/archive/SHA/dependency summary; real npm install executes; Adapter/protocol/direct peers resolve only from consumer `node_modules`; Adapter import is public root only. |
| ATCON-020..026 | SATISFIED | Real installed ToolRuntime/approval pipeline proves ALLOW, DENY, ASK allowed-once/rejected/cancelled/unavailable and exactly one native approval request per reached ASK. |
| ATCON-027..031 | SATISFIED | Omitted policy remains fail-closed; exact rc5 required features report present; `fiber.dispose()` reaches terminal state, removes stale interception and preserves caller-owned root/independent ownership. |
| ATCON-032..036 | SATISFIED | Clean-checkout/frozen-install execution; exact direct-peer versions; conflicting local identities rejected; path/source leak assertions; no Adapter install scripts, publish credentials or registry-token dependency. |
| ATCON-037..038 | SATISFIED | Delta is infrastructure-only; no runtime semantic redesign; acceptance claims only external tarball consumer + exact rc5 runtime smoke and keeps stronger release/registry/isolation claims false. |
| ATCON-039 | SATISFIED | Final implementation SHA `257f3bab...` is same-head CI #698 + Harness #640 dual-green; CI includes the R1-005 external consumer checker and Harness includes pinned-source type/runtime steps 10/11. |
| ATCON-040 | SATISFIED | Accepted protocol-first head `045c9b4e...` was dual-green before executable implementation; final compare shows implementation only in CURRENT, root package script and the two R1-005 scripts. |

No unresolved R1-005 corpus case remains at the reviewed implementation head.

## 14. Acceptance verdict

At final reviewed implementation head:

```text
257f3bab44fa3e788135d5b5edff4e96ce3df62a
```

R1-005 implementation acceptance criteria are satisfied and
ATCON-001..ATCON-040 are fully reconciled.

Verdict:

```text
R1_005_IMPLEMENTATION_ACCEPTED
R1_005_EXTERNAL_TARBALL_CONSUMER_ACCEPTED
EXTERNAL_TARBALL_CONSUMER_VERIFIED
EXACT_RC5_RUNTIME_SMOKE_VERIFIED
PUBLIC_REGISTRY_INSTALL_VERIFIED=false
R1_005_GOVERNANCE_CLOSURE_PENDING
R1_006_NOT_YET_AUTHORIZED
```

This audit is a separate acceptance commit. Its own exact head must obtain normal
CI plus exact pinned Harness rc5 source/runtime conformance before the governance
closure patch may update CURRENT, append-only HISTORY and only the R1-005 roadmap
acceptance marker/details.

Acceptance is not authorization to mark PR #3 Ready, merge it, publish a package,
create or mutate a release tag/GitHub Release, configure registry credentials,
resume M5-003+, or begin R1-006 implementation before R1-005 governance closure
is itself exact-head dual-green.
