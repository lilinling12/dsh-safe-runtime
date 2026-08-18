# M2 Acceptance Audit — DeepSeek Harness Adapter Baseline

Status: **ACCEPTED — M2 P0 COMPLETE**  
Milestone: `M2 — DeepSeek Harness Adapter Baseline`  
Audit refreshed: `2026-08-18`  
PR: `#1 — feat(adapter-dsh): establish M2 Harness adapter baseline`  
Exact Harness baseline: `0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a`

This document is an acceptance record, not a normative specification. DeepSeek
Harness remains an adapter compatibility target and never becomes safe-runtime
protocol authority. Where planning text disagrees with normative artifacts, the
repository governance order applies.

## 1. Authority and acceptance method

The audit reconciles, in descending authority:

1. `specs/0003-deepseek-harness-adapter-contract.md`;
2. exact-source compatibility evidence for the pinned Harness baseline;
3. `docs/tck-security-acceptance.md` expectations relevant to M2;
4. `docs/roadmap.md` M2 tracking items;
5. implementation, tests, and GitHub Actions evidence.

Green CI alone is not acceptance. A requirement is accepted only when its
behavior or boundary has direct evidence at the correct layer. Conversely, the
audit does not pull M3 language-neutral shared-TCK work or later runtime work
back into M2 merely to satisfy stale roadmap wording.

## 2. Validation evidence

The M2 implementation and remediation sequence reached dual-green exact-source
evidence before this audit refresh:

- normal CI passed frozen `pnpm install --frozen-lockfile` and
  `pnpm check:all`;
- exact Harness source-conformance checked out only commit
  `47f943859bef60e4160492346772ded9b24f765a`;
- the pinned upstream public type surface built successfully;
- safe-runtime dependencies installed reproducibly;
- exact workspace projection and projection idempotence passed;
- exact-source TypeScript/provider binding passed;
- real rc5 runtime conformance passed.

The final documentation-only reconnaissance head must retain the same two green
workflow gates. A documentation edit is not allowed to bypass the exact-head
CI requirement; handoff state records the current live head and workflow result.

## 3. Spec 0003 acceptance criteria

| Criterion | Result | Evidence / finding |
| --- | --- | --- |
| Tested Harness baseline is pinned | **PASS** | `DSH_TESTED_BASELINE`, compatibility note, and source-conformance pin rc5 / `47f943...`. |
| Feature matrix is machine-readable | **PASS** | `packages/adapter-dsh/src/feature-matrix.ts`. |
| Normalized runtime events compile without Harness imports | **PASS** | runtime-independent event contract under normal CI. |
| Adapter ports compile without Harness concrete payload leakage | **PASS** | runtime-independent policy, approval, completion, sidecar, filesystem and subprocess ports; exact rc5 structural bindings remain adapter-side. |
| Positive and negative conformance fixtures exist | **PASS** | normalization, policy, approval, disposal, turn-stopping, final-result, provider-seam and feature-gate coverage. |
| Unsupported features are explicit, never silent success | **PASS** | missing prerequisites and unknown/future semantics fail explicitly. |
| Compatibility note documents every asserted Harness seam | **PASS** | exact-source core/provider plus subagent/workflow reconnaissance is recorded with explicit non-guarantees. |

## 4. P0 remediation closure

### P0-B1 — Completion steering budget

**PASS.** The runtime-independent completion steering request carries the
caller-defined `maxRetries`. Invalid and exhausted budgets fail before Harness
steering. Boundary and negative behavior are covered by exact rc5 runtime
conformance.

This implements an existing safe-runtime normative requirement; Harness does
not define the budget semantics.

### P0-B2 — Sidecar correlation boundary

**PASS.** M2 exposes a minimal runtime-independent
`SidecarEvidenceRecord` / `SidecarEvidenceSink` boundary keyed to durable Harness
event references and evidence digests. Projection is allow-listed and excludes
process-local execution-token references.

M2 deliberately does not implement the later audit-storage engine, hash chain,
retention policy, or replay index.

### P0-B3 — Operational Filesystem / Subprocess ports

**PASS.** The former guarantee-only markers were replaced by deliberately
minimal operational ports.

Filesystem preserves provider-owned opaque target identity and exposes the M2
resolve/stat/contains/readText/processPath seam. Guessed target identities fail
explicitly. `processPath()` remains a security-sensitive bridge into the
execution world and is not treated as containment.

Subprocess exposes executable resolution plus bounded collected-output spawn
semantics. Missing requested collectors fail closed. Raw Node streams, shell
implicit behavior, PTY semantics, workspace transactions and stronger sandbox
claims are intentionally outside M2.

Exact pinned rc5 source-conformance proves official `FileSystem` and
`SubprocessRuntime` public types bind to these adapter structures without
promoting concrete Harness types into protocol/core.

### P0-B4 — Exact-source subagent/workflow reconnaissance

**PASS.** The compatibility baseline now records the exact rc5 public seams and
the limits of the evidence.

Exact-source findings include:

- `packages/README.md` classifies both `subagent/` and `workflow/` as Product
  stable API families;
- `ctx.subagents` is the public `SubagentRuntime` service with named providers,
  one-shot and continuable child operations and public `subagent/start` /
  `subagent/end` lifecycle events;
- the lifecycle pair shares `runId` and carries child `SessionId`, provider,
  locality and terminal outcome;
- `SessionHeader.parentSession`, `origin: 'subagent'` and
  `delegationDepth` are durable session metadata for session-backed children;
- `ctx.workflowEngine` is the public workflow service; `WorkflowEngine.start()`
  returns a holder-owned live run;
- workflow lifecycle includes run-level events and paired
  `workflow/agent-start` / `workflow/agent-end` events correlated by per-call
  `seq`, carrying child `SessionId`;
- official workflow documentation explicitly states worker threads isolate
  execution from the host event loop but are **not** a security boundary.

The compatibility note also records the negative boundary: Harness run ids,
workflow sequence numbers, provider names, phases, activation state and Harness
session metadata are not promoted into portable safe-runtime protocol
identifiers. Remote providers are not assumed equivalent to local providers.
Live parent attribution is not by itself a future authorization proof.

Roadmap `M2-017 P1` subagent lineage mapping therefore remains **DEFERRED**. The
P0 reconnaissance requirement is closed without silently implementing P1 work.

## 5. Roadmap reconciliation

The roadmap remains a planning/tracking artifact and has stale unchecked M2
boxes. Acceptance follows evidence rather than mechanically editing checkboxes
that would misstate milestone ownership.

| Item | Acceptance classification |
| --- | --- |
| M2-001 | **DONE by evidence** — exact tested source baseline pinned. |
| M2-002 | **DONE by evidence** — turn/tool/approval/provider/sandbox plus subagent/workflow reconnaissance complete. |
| M2-003 | **DONE by evidence** — machine-readable feature matrix. |
| M2-010 | **DONE by evidence** — `turn/start -> turn.started`. |
| M2-011 | **PARTIAL WORDING / NO BLOCKER** — roadmap says start/end mapping while Spec 0003 minimum vocabulary defines `step.started`; do not invent `step.ended`. |
| M2-012 | **DONE by evidence** — durable `tool/call` maps to intent only. |
| M2-013 | **DONE by evidence** — final live `tools/result` is authoritative outcome. |
| M2-014 | **DONE by evidence** — approval fail-closed mapping. |
| M2-015 | **DONE by evidence** — model request failure mapping. |
| M2-016 | **DONE by evidence** — completion-request interception with caller budget enforcement. |
| M2-017 P1 | **DEFERRED** — lineage normalization is not an M2 P0 requirement. |
| M2-020 | **DONE by evidence** — tool policy registration port. |
| M2-021 | **DONE by evidence** — approval port. |
| M2-022 | **DONE by evidence** — completion steering port with budget cap. |
| M2-023 | **DONE by evidence** — operational FS port. |
| M2-024 | **DONE by evidence** — operational subprocess port. |
| M2-025 P1 | **DEFERRED/PARTIAL** — provider facts exist; no stronger sandbox guarantee is inferred. |
| M2-030 | **DONE by evidence** — no dependence on external custom durable SessionEvent registration. |
| M2-031 | **DONE by evidence** — sidecar correlation boundary. |
| M2-032 | **DONE by evidence** — durable event ref/digest evidence record. |
| M2-033 P1 | **DEFERRED** — replay reconciliation remains later work. |

## 6. Definition-of-Done reconciliation

### Current + previous supported Harness baseline

rc5 is the first accepted candidate baseline. There is no previously accepted
supported baseline to test. The first-baseline condition is therefore satisfied
by a green exact rc5 source gate. Once another baseline is accepted, both the
current and previous supported baselines must pass before release.

This empty-set rule cannot be used later to silently drop an existing previous
supported baseline.

### Feature missing can fail explicitly

**PASS.** Direct negative tests prove missing prerequisites do not silently
succeed.

### Core does not import Harness concrete events

**PASS.** Harness binding remains within `packages/adapter-dsh`; protocol/core
contracts stay runtime-independent.

### Event order TCK

The roadmap M2 DoD wording conflicts with the ownership immediately assigned to
M3: M3 creates the language-independent shared TCK foundation and Adapter DSH
TCK. M2 has implementation/source-conformance ordering evidence, which is
sufficient for this adapter-baseline milestone, but that evidence is not
relabeled as the M3 shared TCK.

The roadmap should be reconciled in governance/planning maintenance rather than
fabricating an M3 deliverable inside M2.

## 7. Acceptance verdict

```text
M2: ACCEPTED
P0-B1: PASS
P0-B2: PASS
P0-B3: PASS
P0-B4: PASS
M2-017 P1: DEFERRED
M3: AUTHORIZED AFTER FINAL EXACT-HEAD DUAL-GREEN HANDOFF
M4: NOT AUTHORIZED TO START
```

Acceptance means the M2 adapter baseline has met its P0 semantic and evidence
boundary. It does **not** mean the PR should be merged automatically, that the
Harness npm rc5 package family is distributable, that subagent lineage has been
normalized, or that shared language-neutral TCK work is already complete.

The next engineering boundary is M3 Shared TCK Foundation, but work must begin
only after the final M2 documentation/handoff head is verified by both normal CI
and exact rc5 source-conformance and `docs/handoff/CURRENT.md` records that live
fact.
