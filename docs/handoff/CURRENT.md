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
- R1-001 P0 Alpha readiness reconciliation: **PROTOCOL-FIRST CANDIDATE / EVIDENCE COLLECTION NOT AUTHORIZED UNTIL THIS EXACT HEAD IS DUAL-GREEN**
- R1-002+: **NOT AUTHORIZED by the current Gate**
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

## Protocol-first delta boundary

This candidate is restricted to exactly:

```text
specs/0055-r1-alpha-readiness-reconciliation.md
fixtures/alpha-readiness-reconciliation/cases.json
docs/handoff/CURRENT.md
```

No roadmap/HISTORY, package implementation/test, package metadata, dependency or
lockfile, Schema/Shared TCK, compatibility-baseline, workflow, registry/release,
R1-002+, or M5-003+ change is authorized before this exact protocol-first head
passes normal CI plus exact pinned Harness source/runtime conformance.

After protocol dual-green, only evidence collection and the smallest R1-001
readiness-audit/supporting evidence delta become authorized.

R1-002, package publication, GitHub Release, M5-003+, and PR #3 merge remain
unauthorized.
