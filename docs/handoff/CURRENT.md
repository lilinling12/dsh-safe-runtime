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
- R1-004: **GOVERNANCE CLOSED**
- R1-005: **IMPLEMENTATION CANDIDATE / EXACT-HEAD VERIFICATION REQUIRED**
- R1-006+: **NOT AUTHORIZED**
- M5-003+: **PAUSED until R1 Alpha release governance closes**
- npm/registry publish, release tag and GitHub Release: **NOT AUTHORIZED**
- PR #3 merge / Ready transition: **NOT AUTHORIZED without explicit user authorization**

Live GitHub state overrides this snapshot.

## R1-004 governance closure authority

R1-004 final governance exact head:

```text
2eb227f2fb54f9249ddde9739bb7e2e515d96ba8
CI #694 / run 34650123869: PASS
Harness #636 / run 34650123861: PASS
Harness job 103430059925 step 10 pinned-source typecheck: PASS
Harness job 103430059925 step 11 real rc5 runtime conformance: PASS
```

Therefore:

```text
R1-004 GOVERNANCE CLOSED
R1-005 P0 PROTOCOL/DESIGN-FIRST WORK AUTHORIZED
```

## R1-005 normative authority

Roadmap Gate:

```text
R1-005 P0 — external tarball consumer + real Harness smoke gate
```

Normative contract:

```text
specs/0059-r1-external-tarball-consumer-harness-smoke.md
fixtures/adapter-dsh-external-consumer/cases.json
profile: R1-005_EXTERNAL_TARBALL_CONSUMER_V1
cases: ATCON-001..ATCON-040
```

Pinned compatibility/runtime authority remains exactly:

```text
0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a
```

R1-005 inherits the accepted R1-004 Adapter artifact contract:

```text
@dsh-safe/adapter-dsh@0.1.0-alpha.0
single public ESM package root
built JS + declarations
exact Cordis/Harness peer versions
real pnpm-pack tarball
no Adapter install-time scripts
```

## Protocol-first exact-head authorization

Initial protocol-first head `0591e7af8f6b7f2f258d86cfff6fe973a516f699`
was dual-green, then source review corrected the rc5 feature-smoke boundary without
adding implementation.

Corrected protocol-first exact head:

```text
045c9b4ecadd2be88a43053976e8507f80d6b7eb
CI #696: PASS
Harness #638: PASS
```

The corrected contract requires the installed exact rc5 Adapter to report its real
required public features as present. It forbids manufacturing an unsupported rc5
runtime merely to exercise a negative branch that belongs to a future separately
accepted compatibility baseline.

Because that exact corrected protocol-first SHA is normal-CI + exact-Harness
dual-green, R1-005 executable implementation is authorized.

## External-consumer implementation boundary

The implementation creates a clean temporary consumer outside both the
safe-runtime repository and the pinned Harness source checkout. It uses only real
packed package artifacts as consumer dependency inputs.

The implementation:

1. builds and packs `@dsh-safe/protocol@0.1.0-alpha.0`;
2. reuses the accepted R1-004 Adapter publication build and real `pnpm pack`;
3. checks out and verifies exactly Harness commit `47f943...`;
4. performs the upstream frozen install and official release verification/build;
5. uses official upstream DSH/vendor pack paths plus the required Landlock entry pack;
6. audits every local tarball name/version, SHA-256, dependency/peer summary and
   rejects surviving `workspace:` locators;
7. rejects conflicting duplicate package identities;
8. installs the resulting local tarball closure into a fresh external consumer
   with a normal `npm install`;
9. does not suppress upstream lifecycle scripts or optional runtime dependencies;
10. proves runtime resolution occurs under the consumer `node_modules`, never
    from either source checkout;
11. asserts all Adapter-declared direct Cordis/Harness peer versions exactly;
12. imports only the installed public `@dsh-safe/adapter-dsh` package root;
13. executes real rc5 ALLOW, DENY, ASK allowed-once/rejected/cancelled/unavailable,
    omitted-policy default deny, required-feature and disposal/no-stale-registration
    smokes.

The upstream `release:verify-packed-install` helper is deliberately not part of
this Gate. Disposable investigation proved that helper can fail after successful
exact-source build/pack because it performs a fresh mutable-registry resolution
for unrelated public dependencies. R1-005 instead validates the Spec 0059-owned
external consumer using the exact local tarball closure while preserving upstream
packed-manifest install semantics.

## Hardened disposable evidence

Before formalizing the implementation, a disposable evidence branch validated the
strict install semantics without changing PR #3.

```text
evidence head: 97c8e23b29d2093e6e2953022c512ca9971b02a3
workflow run: 34656668759
job: 103450484256
Install safe-runtime dependencies reproducibly: PASS
Execute R1-005 external tarball consumer candidate: PASS
```

The hardened evidence uses ordinary `npm install --no-audit --no-fund
--package-lock=false`; it does not use `--omit=optional` and does not disable
install scripts. The disposable workflow itself is evidence-only and MUST NOT
enter the product branch.

## Claim boundary

R1-005 implementation acceptance may establish only:

```text
R1_005_EXTERNAL_TARBALL_CONSUMER_ACCEPTED
EXTERNAL_TARBALL_CONSUMER_VERIFIED
EXACT_RC5_RUNTIME_SMOKE_VERIFIED
```

The implementation records:

```text
publicRegistryInstallVerified: false
```

and therefore does not claim:

```text
PUBLIC_REGISTRY_INSTALL_VERIFIED
FUTURE_HARNESS_COMPATIBILITY_VERIFIED
RELEASE_REPRODUCIBILITY_VERIFIED
REGISTRY_PROVENANCE_VERIFIED
PROCESS_ISOLATION_VERIFIED
COMPLETE_HOST_EFFECT_MEDIATION_VERIFIED
```

R1-006 owns compatibility/install UX. R1-007/R1-008 own release/provenance and
actual publication. M14 remains the future process-isolated Plugin Host.

## Formal implementation candidate delta

This candidate is intentionally test/build infrastructure only:

```text
scripts/check-adapter-dsh-external-consumer.mjs
scripts/r1-005-external-consumer-smoke.mjs
package.json
docs/handoff/CURRENT.md
```

`package.json` only adds the R1-005 checker command and appends it to the existing
`check:all` chain. The existing CI workflow already executes `pnpm check:all`, so
no disposable evidence workflow enters product history.

This candidate changes no production TypeScript, pnpm lockfile, Spec/corpus,
Schema/validator, Shared TCK, Harness baseline/source-conformance workflow,
HISTORY, roadmap acceptance marker, R1-006+, M5-003+, registry/release/tag or PR
merge/readiness state.

## Required implementation exact-head verification

The formal implementation exact head must itself pass on the same SHA:

```text
normal CI
  including R1-005 real external tarball consumer gate
+
exact pinned Harness rc5 source-conformance
  step 10 pinned-source TypeScript
  step 11 real rc5 runtime
```

Until that exact formal implementation SHA is dual-green, this remains only an
implementation candidate and no R1-005 acceptance/governance claim is established.

After dual-green, perform independent R1-005 acceptance review before any HISTORY
or roadmap governance marker change.

## Current authorization

```text
R1-004 GOVERNANCE CLOSED
R1-005 PROTOCOL-FIRST: ACCEPTED / DUAL-GREEN
R1-005 IMPLEMENTATION: CANDIDATE / EXACT-HEAD VERIFICATION REQUIRED
R1-005 ACCEPTANCE / GOVERNANCE: NOT YET ESTABLISHED
R1-006+ NOT AUTHORIZED
M5-003+ PAUSED
REGISTRY PUBLISH / GITHUB RELEASE / TAG NOT AUTHORIZED
PR #3 REMAINS OPEN / DRAFT / UNMERGED
```
