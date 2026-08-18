# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK remain semantic authority.

## Snapshot

- Recorded at: `2026-08-18`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M2 — DeepSeek Harness Adapter Baseline`
- M2 acceptance: **ACCEPTED**
- Pull request: `#1 — feat(adapter-dsh): establish M2 Harness adapter baseline`
- PR state: `OPEN / DRAFT`
- Branch: `feat/m2-harness-adapter`
- Base: `main` / `f88b8783623c8cd15be42329077953044b9fdd3d`

This handoff commit advances the branch. A resumed session MUST query the live PR
head and Actions for that exact head before starting M3. If the final M2
handoff/documentation head is not dual-green, M3 is not authorized until the
real current-head failure is diagnosed and corrected without weakening any gate.

## Exact Harness baseline

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

Do not substitute rc6/newer registry artifacts for the exact source baseline to
make resolution or tests pass.

## M2 acceptance result

`docs/acceptance/m2-acceptance-audit.md` is the current acceptance record.

All four P0 remediation blockers are closed:

- **P0-B1 PASS — completion steering budget**
  - caller-defined `maxRetries` is explicit at the runtime-independent port;
  - malformed and exhausted budgets fail before Harness steering;
  - exact rc5 runtime conformance covers the boundary.

- **P0-B2 PASS — sidecar correlation boundary**
  - minimal `SidecarEvidenceRecord` / `SidecarEvidenceSink` boundary exists;
  - durable Harness event ref/sequence and evidence ref/digest are preserved;
  - process-local execution tokens are excluded;
  - later audit storage/hash chaining/replay work remains out of M2.

- **P0-B3 PASS — operational Filesystem / Subprocess ports**
  - opaque provider target identity is preserved;
  - FS resolve/stat/contains/readText/processPath is operational;
  - subprocess executable resolution and bounded collected-output spawn are
    operational;
  - missing requested collectors fail closed;
  - mediation is not represented as process/kernel isolation;
  - exact rc5 public `FileSystem` / `SubprocessRuntime` types bind at the
    adapter-side source-conformance boundary.

- **P0-B4 PASS — exact-source subagent/workflow reconnaissance**
  - official pinned source proves Product-stable public `ctx.subagents` and
    `ctx.workflowEngine` seams;
  - public subagent lifecycle pairs by `runId` and carries child `SessionId`;
  - session-backed child lineage metadata is durable in Harness session headers;
  - workflow child lifecycle pairs by per-call `seq` and carries child
    `SessionId`;
  - worker threads are explicitly not a security boundary;
  - compatibility docs record non-guarantees and do not promote Harness ids,
    phases, providers or metadata into portable protocol semantics;
  - roadmap `M2-017 P1` subagent lineage normalization remains deferred.

A source-review wording defect was corrected: `WorkflowEngine.start()` returns a
**holder-owned** live run; it was incorrect to say the engine itself owns that
run. No runtime behavior or normative semantics changed.

## Final M2 quality gate

Before beginning M3, verify the exact live branch head has both:

| Gate | Required state |
| --- | --- |
| Normal CI | **PASS** |
| Frozen safe-runtime install | **PASS** |
| `pnpm check:all` | **PASS** |
| Exact Harness source conformance | **PASS** |
| Pinned upstream build | **PASS** |
| Frozen safe-runtime install in source gate | **PASS** |
| Exact package projection | **PASS** |
| Projection idempotence | **PASS** |
| Exact-source TypeScript/provider contract | **PASS** |
| Real rc5 runtime conformance | **PASS** |

Do not infer these results from a prior head. Query the final live head.

## Next allowed gate

If and only if the final M2 handoff/documentation head is dual-green, the next
engineering gate is:

**M3 — Shared TCK Foundation**

Start with M3's protocol-/fixture-first foundation rather than runtime features:

1. reconcile the stale M2 roadmap checkboxes/DoD wording as planning maintenance
   without changing normative protocol vocabulary;
2. define the language-independent fixture envelope (`M3-001`) from existing
   normative semantics;
3. define the test runner contract (`M3-002`) independently of TypeScript and
   DeepSeek Harness concrete package paths;
4. define deterministic seed/time semantics (`M3-003`) before fake runtimes;
5. only then add fake approval/tool/fs/subprocess and fault-injection seams;
6. do not implement M4 Capability Broker or M6 workspace transactions early.

M3 shared TCK must remain independently implementable by a non-TypeScript dummy
implementation. Existing M2 adapter conformance tests are evidence inputs, not
the language-neutral TCK itself.

PR #1 remaining Draft is a separate review/merge decision. M2 acceptance does
not authorize automatic merge or removal of Draft status.

## Security / architecture boundaries carried forward

- Harness is an adapter, never protocol authority.
- Protocol/core packages do not import Harness concrete payload types.
- `tool/call` is intent; live `tools/result` is the authoritative final outcome.
- Unknown/future security semantics fail closed.
- Tool/provider mediation is not process isolation.
- `FsTargetKey` / `FsVersion` are opaque provider tokens and MUST NOT be parsed.
- bare local FS `cwd` is not containment.
- `fs-sandbox` mutation fencing is not a kernel boundary and does not fence
  reads.
- local subprocess filesystem effects do not traverse `ctx.fs`.
- sandbox/file-effect scope is not universal network/general process
  confinement.
- workflow worker threads are not a security boundary.
- Harness subagent/workflow ids and metadata are compatibility evidence, not
  portable safe-runtime protocol identifiers.
- do not weaken schemas, validators, TypeScript, tests, frozen installs, TCK, or
  security claims for CI.
- do not implement M6 workspace transactions early.

## Acceptance-order reminders

1. normative spec/RFC/ADR authority;
2. accepted schemas and compatibility rules;
3. language-independent TCK once M3 defines it;
4. exact-source adapter compatibility evidence;
5. implementation/tests/current-head CI;
6. roadmap tracking.

The roadmap is planning state and remains stale in several M2 checkboxes. Do not
invent protocol vocabulary such as normalized `step.ended` merely because a
roadmap line says `step/start/end mapping` when Spec 0003's M2 minimum vocabulary
only defines `step.started`.

## Resume instruction

Read `docs/handoff/README.md`, this file, and live GitHub state. Verify the exact
live head is dual-green. If it is, M2 is closed and the next real task is **M3
Shared TCK Foundation**, beginning with the language-independent fixture and
runner contracts. If it is not, remain at the M2 final verification gate and fix
the real current-head failure without weakening any requirement.
