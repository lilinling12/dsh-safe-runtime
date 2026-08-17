# M2 Acceptance Audit — DeepSeek Harness Adapter Baseline

Status: **NOT ACCEPTED — P0 REMEDIATION REQUIRED**  
Milestone: `M2 — DeepSeek Harness Adapter Baseline`  
Audit snapshot: `2026-08-17T20:30:00+08:00`  
PR: `#1 — feat(adapter-dsh): establish M2 Harness adapter baseline`  
Audited safe-runtime head: `46eb4cca33f3accd4c240aae50834dffcf0f50bb`  
Base: `main@f88b8783623c8cd15be42329077953044b9fdd3d`  
Exact Harness baseline: `0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a`

This document is an acceptance record, not a normative specification. It does
not grant authority to DeepSeek Harness implementation details. Where planning
artifacts disagree with normative artifacts, the repository governance order
applies.

## 1. Authority and audit method

The audit reconciles, in descending authority:

1. `specs/0003-deepseek-harness-adapter-contract.md`;
2. exact-source compatibility evidence for the pinned Harness baseline;
3. `docs/tck-security-acceptance.md` expectations relevant to M2;
4. `docs/roadmap.md` M2 tracking items;
5. implementation, tests, and GitHub Actions evidence at the audited head.

No item is accepted because CI is merely green. A requirement is accepted only
when the required behavior or boundary has direct evidence at the correct
layer.

## 2. Live validation evidence

At `46eb4cca33f3accd4c240aae50834dffcf0f50bb`:

| Gate | Result | Evidence |
| --- | --- | --- |
| Normal repository CI | **PASS** | run `32023323093` (#43), job `95367371508` |
| Frozen safe-runtime install | **PASS** | normal CI step 5 |
| `pnpm check:all` | **PASS** | normal CI step 6 |
| Exact Harness source conformance | **PASS** | run `32023323078` (#25), job `95367369087` |
| Pinned upstream build | **PASS** | source-conformance step 6 |
| Frozen safe-runtime install in source gate | **PASS** | step 7 |
| Exact package projection | **PASS** | step 8 |
| Projection idempotence | **PASS** | step 9 |
| Exact-source TypeScript/provider contract | **PASS** | step 10 |
| Real rc5 runtime conformance | **PASS** | step 11 |

The source-conformance workflow checks out the exact upstream commit above. It
does not substitute a newer npm package family for the rc5 source contract.

## 3. Spec 0003 acceptance criteria

| Criterion | Result | Evidence / finding |
| --- | --- | --- |
| Tested Harness baseline is pinned | **PASS** | `DSH_TESTED_BASELINE`, compatibility note, and exact-source workflow all pin rc5 / `47f943...`. |
| Feature matrix is machine-readable | **PASS** | `packages/adapter-dsh/src/feature-matrix.ts`. |
| Normalized runtime event types compile without Harness imports | **PASS** | `runtime-events.ts` is runtime-independent and covered by normal CI. |
| Adapter ports compile without Harness concrete payload leakage | **PASS, STRUCTURAL ONLY** | `ports.ts` contains runtime-independent types. This does **not** prove the FS/Subprocess ports are semantically complete; see P0-B3. |
| Positive and negative conformance fixtures exist | **PASS** | normalization, policy, approval, disposal, turn-stopping, final-result, provider-seam, and feature-gate tests exist. |
| Unsupported features are explicit, never silent success | **PASS** | head `46eb4cca...` adds direct negative evidence for `UNSUPPORTED_ADAPTER_FEATURES`, including multiple missing prerequisites. |
| Compatibility note documents asserted Harness seams | **PASS for asserted seams** | `docs/compatibility/deepseek-harness-0.1.0-rc.5.md` and the provider probe document the seams currently asserted by the adapter. Roadmap recon coverage remains incomplete; see P0-B4. |

The explicit unsupported-feature question recorded in the handoff is therefore
closed at this head: there is now direct negative test evidence, not merely an
implementation branch.

## 4. Normative-clause audit

### 4.1 Confirmed

The current branch directly supports the following Spec 0003 boundaries:

- durable facts and live interception facts remain distinct;
- durable `tool/call` is normalized as intent, not execution success;
- live `tools/result` is the authoritative final tool outcome;
- denial/cancellation is correlated from authoritative control paths rather
  than inferred from arbitrary error text;
- required adapter features fail closed;
- concrete Harness payloads remain inside `packages/adapter-dsh`;
- the adapter binds public Harness services and does not depend on
  `dsh-agent-loop`;
- `ctx.tools.restrict()` is represented as visibility composition, not an
  authorization boundary;
- provider/sandbox evidence does not claim universal network confinement or
  general process isolation;
- Harness process-local execution tokens are not persisted by the current
  process-local correlation registry.

### 4.2 P0-B1 — Completion steering budget is not enforced

**Result: FAIL — normative blocker.**

Spec 0003 requires retry/steering loops to be capped by the caller-defined
acceptance budget.

The current `CompletionSteerRequest` carries `retryOrdinal`, but carries no
budget/limit. `createDshRc5Adapter().steerCompletion()` validates the live turn
and then steers unconditionally. The adapter therefore cannot enforce the
required cap at its port boundary.

Required remediation before M2 acceptance:

1. make the caller-defined retry/steer limit explicit in the runtime-independent
   port contract;
2. reject an ordinal outside that limit before invoking Harness steering;
3. add positive boundary and over-budget negative tests;
4. keep the behavior independent of Harness version branching.

This is implementation of an existing normative requirement, not a new Harness-
derived protocol semantic.

### 4.3 P0-B2 — Sidecar ledger contract is not evidenced

**Result: FAIL — normative blocker.**

Spec 0003 states that safe-runtime domain evidence remains in a sidecar ledger
keyed to Harness durable event references until stable external custom durable
SessionEvent registration is proven.

The branch currently contains `CorrelationRegistry`, an in-process map of
correlation records. It intentionally drops associations on disposal/restart and
has no durable sidecar record/sink contract. No M2 test proves that a safe-runtime
sidecar evidence record can be keyed to a durable Harness event reference and
its digest without persisting process-local execution tokens.

M2 must not implement the future M5 audit storage engine here. The required M2
remediation is narrower:

1. define the runtime-independent sidecar correlation/evidence record and sink
   boundary required by the adapter contract;
2. include durable Harness event reference/sequence and digest fields needed for
   replay correlation;
3. explicitly exclude process-local execution tokens from durable records;
4. add positive/negative tests for record construction and token exclusion;
5. leave storage durability, hash chaining, retention, and full audit-ledger
   implementation to their owning later milestones.

### 4.4 P0-B3 — FS/Subprocess adapter ports are only guarantee markers

**Result: FAIL — M2 roadmap/architecture blocker.**

`FilesystemPort` and `SubprocessPort` currently expose only a `guarantee` field,
and `createDshRc5Adapter()` does not return either optional port. This is not an
operational adapter boundary for the provider seams recorded by M2.

The exact pinned upstream public contracts prove materially richer seams:

- `ctx.fs` owns opaque `FsTarget` identity, `processPath()`, provider containment,
  observations/versions, reads, and atomic mutations;
- `ctx.subprocess` owns execution-world executable resolution and fully specified
  process/terminal spawn operations;
- the two services belong to one execution world, while local subprocess file
  effects do not traverse `ctx.fs`.

M2-023/M2-024 must therefore not be marked done based only on feature flags or a
`guarantee` label. Before acceptance, M2 needs a deliberately minimal,
runtime-independent operational boundary that preserves opaque provider
identity and execution-world coordination without copying Harness concrete types
into protocol/core packages or implementing M6 workspace transactions early.

The remediation must preserve the provider-probe negative facts: mediation is
not containment, and a process path bridge is security-sensitive.

### 4.5 P0-B4 — Harness recon tracking omits subagent/workflow seams

**Result: FAIL — M2 tracking/evidence blocker.**

Roadmap M2-002 is P0 and explicitly includes subagent/workflow seams. The current
rc5 compatibility note and provider probe do not record those seams. M2-017
subagent lineage mapping is P1 and may remain deferred, but the P0 reconnaissance
item still requires source-backed documentation of what the pinned baseline
exposes and, critically, what M2 does **not** claim to support.

This is a documentation/evidence gap. It must not be repaired by adding a
subagent implementation to M2 unless a higher-authority requirement actually
requires one.

## 5. Roadmap reconciliation

The roadmap is a tracking artifact and is stale on the M2 branch. The audit
classifies the items as follows; this table does not itself mutate roadmap
checkboxes.

| Item | Audit classification |
| --- | --- |
| M2-001 | **DONE by evidence** — exact tested source baseline pinned. |
| M2-002 | **BLOCKED/PARTIAL** — core/runtime/provider seams documented; subagent/workflow recon missing (P0-B4). |
| M2-003 | **DONE by evidence** — machine-readable feature matrix. |
| M2-010 | **DONE by evidence** — `turn/start -> turn.started`. |
| M2-011 | **PARTIAL / ROADMAP WORDING STALE** — M2 Spec defines `step.started`, not a normalized `step.ended`; do not invent protocol vocabulary from the roadmap. |
| M2-012 | **DONE by evidence** — `tool/call -> tool.requested` as intent. |
| M2-013 | **DONE by evidence** — authoritative live `tools/result -> tool.completed`. |
| M2-014 | **DONE by evidence** — approval mapping, only `allowed-once` authorizes. |
| M2-015 | **DONE by evidence** — `agent/request-error -> model.request.failed`. |
| M2-016 | **DONE by evidence** — `agent/turn-stopping -> turn.completion_requested`; budget enforcement still blocked separately by P0-B1. |
| M2-017 P1 | **DEFERRED** — subagent lineage mapping is not required to close P0 acceptance unless governance is changed. |
| M2-020 | **DONE by evidence** — tool policy registration port. |
| M2-021 | **DONE by evidence** — approval port. |
| M2-022 | **PARTIAL** — completion steering seam exists; normative budget cap missing (P0-B1). |
| M2-023 | **BLOCKED** — FS port not operational (P0-B3). |
| M2-024 | **BLOCKED** — Subprocess port not operational (P0-B3). |
| M2-025 P1 | **DEFERRED/PARTIAL** — provider facts exist; no need to promote this P1 item into a stronger sandbox guarantee. |
| M2-030 | **DONE by evidence** — adapter does not depend on external custom durable SessionEvent registration. |
| M2-031 | **BLOCKED** — sidecar correlation contract/evidence incomplete (P0-B2). |
| M2-032 | **BLOCKED** — durable event ref/digest sidecar record not evidenced (P0-B2). |
| M2-033 P1 | **DEFERRED** — replay reconciliation remains later work. |

## 6. M2 Definition-of-Done reconciliation

### Current + previous supported Harness baseline

rc5 is the first candidate supported baseline. There is no previously accepted
supported baseline to test. For this first-baseline acceptance, the exact rc5
source gate must be green. Once a second baseline is accepted, both the current
and previous supported baselines must be green before release.

This interpretation does not allow an existing previous supported baseline to be
silently dropped; it only handles the empty-set condition for the first accepted
baseline.

### Feature missing can fail explicitly

**PASS.** Direct negative tests exist at the audited head.

### Core does not import Harness concrete events

**PASS.** The Harness binding remains in `packages/adapter-dsh`; runtime-independent
port/event contracts do not import concrete Harness payloads.

### Event order TCK green

The roadmap wording conflicts with the milestone ownership recorded immediately
below it: M3 owns the language-independent shared TCK foundation and Adapter DSH
TCK, including lifecycle and tool ordering.

M2 currently has implementation/source-conformance order evidence, including an
ordered event dispatcher and real rc5 lifecycle/tool tests. That evidence is
valuable but MUST NOT be relabeled as the M3 language-neutral shared TCK.

M2 acceptance may rely on M2 conformance evidence for the adapter baseline; the
shared, language-neutral Event Order TCK remains an M3 deliverable. The roadmap
should be corrected to state this boundary explicitly rather than fabricating M3
completion inside M2.

## 7. Acceptance verdict

```text
M2: NOT ACCEPTED
PR #1: KEEP DRAFT
M3: NOT AUTHORIZED TO START
M4: NOT AUTHORIZED TO START
```

The branch is technically healthy but semantically incomplete. Green CI proves
the current implementation; it does not erase the four P0 gaps above.

Remediation order:

1. **P0-B1** — enforce caller-defined completion steering budget and test it;
2. **P0-B2** — define/test the M2 sidecar correlation record/sink boundary;
3. **P0-B3** — complete minimal operational FS/Subprocess adapter ports against
   the exact rc5 public services without importing Harness semantics upward;
4. **P0-B4** — finish exact-source subagent/workflow reconnaissance and document
   explicit supported/non-supported seams;
5. rerun normal CI and exact rc5 source-conformance on the final remediation
   head;
6. refresh this audit and only then decide whether M2 can be accepted.

No M3 shared TCK or M4 Capability Broker implementation is authorized while a
P0 item above remains open.
