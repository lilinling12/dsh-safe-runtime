# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before changes;
> normative specs/schemas/TCK and accepted exact-head evidence remain authority.

## Snapshot

- Recorded at: `2026-09-09`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `R1 — DeepSeek Harness Plugin Alpha Release`
- Active PR: `#3 — feat(policy): begin M4 capability broker`
- Branch: `feat/m4-capability-broker`
- Base: `main@57430273e065be8d38807d67b175fa154c801d43`
- M4-001..052: **GOVERNANCE CLOSED**
- M5-001 P0 append-only store: **GOVERNANCE CLOSED**
- M5-002 P0 canonical JSON: **GOVERNANCE CLOSED**
- R1-001 P0 Alpha readiness reconciliation: **GOVERNANCE CLOSED**
- R1-002 P0 public DeepSeek Adapter API: **PROTOCOL-FIRST CANDIDATE / IMPLEMENTATION NOT AUTHORIZED UNTIL THIS EXACT HEAD IS DUAL-GREEN**
- R1-003+: **NOT AUTHORIZED by the current Gate**
- M5-003+: **PAUSED until R1 Alpha release governance closes**
- npm/registry publish and GitHub Release: **NOT AUTHORIZED**
- PR #3 merge: **NOT AUTHORIZED without explicit user authorization**

Live GitHub state overrides this snapshot.

## M5-002 closure evidence

Closure-record exact head:

```text
c171e69af7b775d4dccf041df4a15ecf04ffab60
CI #662 / run 34318588853: PASS
Harness #604 / run 34318588833: PASS
Harness job 102360017015 step 10: PASS
Harness job 102360017015 step 11: PASS
```

M5-002 is therefore **GOVERNANCE CLOSED**. The accepted sequencing override makes
R1-001 the only newly authorized engineering Gate; M5-003+ remains paused.

## R1-001 protocol-first authority

Normative candidate:

```text
specs/0055-r1-alpha-readiness-reconciliation.md
```

Portable readiness corpus:

```text
fixtures/alpha-readiness-reconciliation/cases.json
profile: R1-001_ALPHA_READINESS_RECONCILIATION_V1
cases: ARR-001..ARR-034
```

Pinned Harness compatibility baseline remains:

```text
0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a
```

R1-001 is an evidence/readiness Gate, not plugin implementation. It separates:

```text
R1 track-entry readiness
Alpha-release readiness
```

A later-R1 productization gap may block eventual R1-008 release without blocking
entry to R1-002 when the roadmap already assigns that work to R1-002..007.

## Readiness classification model

Every reconciled item must receive exactly one primary classification:

```text
EVIDENCE_SATISFIED
STATUS_DRIFT
R1_TRACK_BLOCKER
ALPHA_RELEASE_BLOCKER
ACCEPTED_DEFERRED
BASELINE_NOT_APPLICABLE
```

`BASELINE_NOT_APPLICABLE` is allowed only for an exact supported Harness baseline
whose public seam is proven absent, whose Adapter contract exposes no equivalent
mutation path, whose limitation is carried into release compatibility/known
limitations, and whose status automatically reopens if a future supported
baseline exposes the seam.

It must never be used to convert an ungoverned host/plugin API into a security
guarantee.

## Required R1-001 evidence after protocol dual-green

R1-001 must prospectively establish, without rewriting historical status:

1. **M0 clean-checkout proof**
   ```text
   pnpm install --frozen-lockfile
   pnpm build
   pnpm check:all
   ```
   on a clean checkout of the R1-001 evidence head. Current ordinary CI proves
   frozen install + check:all but does not explicitly run root `pnpm build`.

2. **M1 current-state Spec Review**
   - reconcile current M1 capability/precedence/schema authority against accepted
     M4 Alpha behavior;
   - verify no material contradiction;
   - do not backdate a historical review that did not occur.

3. **M2/M3 Adapter/TCK reconciliation**
   - exact rc5 baseline/source-conformance;
   - explicit unsupported-feature handling;
   - Shared Adapter TCK and external non-workspace consumer evidence.

4. **M4 DoD reconciliation**
   - default deny;
   - approval unavailable fail-closed;
   - lease expiry/maxUse;
   - child attenuation;
   - action rewrite constraint;
   - Adapter-owned audit redaction;
   - honest non-sandbox boundary.

5. **M20 Alpha roll-up**
   - key M0-M4 P0;
   - Adapter TCK;
   - honest Capability Broker boundary;
   - no silent allow.

6. **Adapter publishability inventory**
   - `packages/adapter-dsh/package.json` is currently `private: true`;
   - public `src/index.ts` does not export the real rc5 binding factory;
   - publishable exports/types/files/build metadata are incomplete;
   - external tarball consumer/smoke is not yet an R1 release gate;
   - release pipeline/provenance is not yet implemented.

Those known productization gaps are expected Alpha-release blockers owned by
R1-002..007; R1-001 must inventory them but must not implement them early.

## Action-rewrite special case

Core/TCK authority requires policy-relevant arguments changed after a decision to
be re-evaluated or rejected. Exact rc5 compatibility evidence states that the
supported `tools/pre-execute` policy seam exposes no argument-rewrite API.

R1-001 therefore must not simply mark the legacy M4 DoD row complete. It must
resolve the row using exact-source evidence. `BASELINE_NOT_APPLICABLE` is allowed
for rc5 only if all Spec 0055 conditions are met and the release compatibility
contract records the limitation and future-reopen rule.

Direct same-process host/plugin APIs remain covered only by the accepted
M4-050/M4-052 ungoverned/non-sandbox boundary.

## R1-001 readiness acceptance evidence

Original protocol-first exact head:

```text
30e897888c1ea28a5082e2bdd9d36d3d2e2530ec
CI #663 / run 34323540954: PASS
Harness #605 / run 34323540944: PASS
```

Clean-checkout evidence, isolated from product history:

```text
evidence run 34328489680 / job 102391245741
checkout: 47738763c9ad321e41d2af77c7c3ca7a923421fd
pnpm install --frozen-lockfile: PASS
pnpm build: PASS
pnpm check:all: PASS
```

Readiness audit:

```text
docs/acceptance/r1-001-alpha-readiness-reconciliation.md
audit exact head: 0f91d7447df6fd141260a8a8bd3d529466a5c503
CI #666 / run 34329061765: PASS
Harness #608 / run 34329061851: PASS
Harness job 102393078775 step 10: PASS
Harness job 102393078775 step 11: PASS
```

ARR-001..034 resolve to 13 `EVIDENCE_SATISFIED`, 13 `STATUS_DRIFT`, zero
`R1_TRACK_BLOCKER`, seven `ALPHA_RELEASE_BLOCKER`, and one bounded rc5-only
`BASELINE_NOT_APPLICABLE`. The track-entry verdict is `R1_002_AUTHORIZED`, while
Alpha release remains `ALPHA_RELEASE_NOT_READY`.

## R1-001 governance verification re-anchor

Governance content commit:

```text
53e864f6478fa11c945eb7a7617a30a642472130
CI #667 / run 34330008706: ACTION_REQUIRED / jobs=[]
Harness #609 / run 34330008770: ACTION_REQUIRED / jobs=[]
```

That commit was created by an evidence-only GitHub Actions workflow using its
`GITHUB_TOKEN`. GitHub created PR workflow-run records but did not schedule jobs;
the runs cannot be retried. This is an automation-trigger provenance condition,
not a CI/test/conformance diagnostic and is not counted as dual-green.

User-authored governance re-anchor:

```text
cc28f849f57abe03d83c33c8d45394f0ad37a271
CI #668 / run 34330231181: PASS
Harness #610 / run 34330231232: PASS
Harness job 102396837524 step 10: PASS
Harness job 102396837524 step 11: PASS
```

The re-anchor changes only CURRENT relative to the governance content commit and
preserves the accepted R1-001 audit, append-only HISTORY record and roadmap marker.
The same exact SHA passed normal CI plus exact pinned Harness source/runtime
conformance. R1-001 governance is therefore closed and R1-002 protocol-first work
is the only newly authorized engineering Gate.

R1-001 closure record:

```text
4bb553651061b66176dfd1babe24c96fdd415995
CI #669 / run 34330477937: PASS
Harness #611 / run 34330477951: PASS
```

That closure exact head is dual-green, so R1-002 protocol-first work is now
legitimately authorized.

## R1-002 protocol-first authority candidate

Normative candidate:

```text
specs/0056-r1-dsh-public-adapter-api.md
```

Public Adapter API contract corpus:

```text
fixtures/dsh-public-adapter-api/cases.json
profile: R1-002_DSH_PUBLIC_ADAPTER_API_V1
cases: DPA-001..DPA-036
```

Pinned compatibility baseline remains exactly:

```text
0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a
```

The candidate freezes a curated package-root `createDshRc5Adapter` API rather than
publishing the broad M2 `HarnessRuntimeAdapter` surface. It requires aggregate,
idempotent Adapter disposal; construction rollback on partial setup failure;
stable `ADAPTER_DISPOSED` and `INVALID_ADAPTER_OPTIONS` errors; explicit ownership
of Adapter-created child resources; and package-root contract tests.

The candidate deliberately keeps the deterministic `now` seam test-only and does
not expose rc5 filesystem/subprocess provider ports through the public Adapter.

R1-002 remains Adapter-specific integration authority. It does not redefine
portable core protocol semantics and does not upgrade same-process Harness/plugin
integration into a process-isolation or arbitrary-plugin sandbox guarantee.

## R1-002 protocol-first delta boundary

Before exact-head dual-green, the repository delta is restricted to exactly:

```text
specs/0056-r1-dsh-public-adapter-api.md
fixtures/dsh-public-adapter-api/cases.json
docs/handoff/CURRENT.md
```

No production/test package change, package metadata, dependency/lockfile, Schema,
Shared TCK, compatibility baseline, workflow, roadmap/HISTORY, R1-003+, M5-003+,
registry publication, GitHub Release or PR merge is authorized in this candidate.

Only after this exact protocol-first head passes normal CI plus exact pinned
Harness source/runtime conformance may the smallest R1-002 implementation and
contract-test delta begin.

R1-003+, R1-004 publishability work, M5-003+, npm/registry publication, GitHub
Release and PR #3 merge remain unauthorized.
