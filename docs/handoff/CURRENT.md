# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK remain semantic authority.

## Snapshot

- Recorded at: `2026-08-17T20:49:00+08:00`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M2 — DeepSeek Harness Adapter Baseline`
- Pull request: `#1 — feat(adapter-dsh): establish M2 Harness adapter baseline`
- PR state: `OPEN / DRAFT`
- Branch: `feat/m2-harness-adapter`
- Last fully verified implementation head before this handoff maintenance commit:
  `e53d13ba4531c9e315a0fd2e3f999cbf463d595c`
- Base: `main` / `f88b8783623c8cd15be42329077953044b9fdd3d`

The handoff commit advances the branch. A resumed session MUST query the live PR
head and current Actions rather than treating the SHA above as the branch tip.

## Exact Harness baseline

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

Do not substitute rc6/newer registry artifacts for the exact source baseline to
make resolution or tests pass.

## Last verified quality evidence

At `e53d13ba4531c9e315a0fd2e3f999cbf463d595c`:

| Gate | State | Evidence |
| --- | --- | --- |
| Normal CI | **PASS** | run `32031495534` (#54), job `95392301947` |
| Frozen safe-runtime install | **PASS** | normal CI step 5 |
| `pnpm check:all` | **PASS** | normal CI step 6 |
| Exact Harness source conformance | **PASS** | run `32031495546` (#36), job `95392301956` |
| Pinned upstream build | **PASS** | source-conformance step 6 |
| Frozen safe-runtime install in source gate | **PASS** | step 7 |
| Exact package projection | **PASS** | step 8 |
| Projection idempotence | **PASS** | step 9 |
| Exact-source TypeScript/provider contract | **PASS** | step 10 |
| Real rc5 runtime conformance | **PASS** | step 11 |

## M2 Acceptance Audit status

The initial acceptance record is:

`docs/acceptance/m2-acceptance-audit.md`

Its verdict remains **M2 NOT ACCEPTED / PR #1 KEEP DRAFT**. The audit identified
four P0 remediation items. Two are now closed by code plus dual-green evidence:

### Closed P0-B1 — Completion steering budget

- `CompletionSteerRequest` carries the caller-defined `maxRetries` budget.
- `createDshRc5Adapter().steerCompletion()` validates the budget before touching
  Harness steering.
- malformed ordinals/budgets fail explicitly.
- `retryOrdinal > maxRetries` fails with
  `COMPLETION_STEER_BUDGET_EXHAUSTED` before `agent.steer()`.
- exact rc5 runtime conformance proves the boundary and over-budget fail-closed
  behavior.

This implements the existing Spec 0003 completion-budget requirement; it does
not derive new protocol semantics from Harness.

### Closed P0-B2 — Sidecar correlation boundary

- `SidecarEvidenceRecord` and `SidecarEvidenceSink` define the narrow M2
  persistence seam.
- records are keyed by durable Harness event ref/sequence and preserve evidence
  ref/digest.
- `createSidecarEvidenceRecord()` accepts only durable correlation and validates
  evidence/event anchoring.
- projection is allow-listed and deliberately excludes `processLocalTokenRef`.
- storage durability, retention, hash chaining, replay indexes, and the full
  audit ledger remain later-milestone responsibilities.

A real CI failure occurred while introducing this boundary: head
`fd4e7c03ffe526cca10440933a9188d536b1454e` failed `pnpm check:all` because
`sidecar.ts` imported `@dsh-safe/protocol` in a typecheck topology where that
workspace package was not resolvable. Frozen install still passed. The fix kept
the sidecar boundary package-local and runtime-independent instead of weakening
TypeScript or CI; the final head above is dual-green.

## Active blocker / current gate

**P0-B3 — Complete the minimal operational Filesystem / Subprocess adapter ports.**

Do not start M3 shared TCK or M4 Capability Broker implementation yet.

The current `FilesystemPort` / `SubprocessPort` guarantee-only markers are not
sufficient for roadmap M2-023/M2-024. The next implementation must use the
exact pinned rc5 public source contracts and preserve these boundaries:

- `FsTargetKey` / `FsVersion` are opaque provider tokens and MUST NOT be parsed;
- `processPath()` is a security-sensitive process-path bridge;
- FS and Subprocess share one execution world, but this MUST NOT be promoted to
  a process-isolation claim;
- bare local FS `cwd` is not containment;
- `fs-sandbox` fences mutations, not reads, and is not a kernel boundary;
- local subprocess filesystem effects do not traverse `ctx.fs`;
- sandbox scope is file effects only; no universal network/general process
  confinement has been proven;
- operational ports must remain runtime-independent and must not copy Harness
  concrete payload types into protocol/core packages;
- do not implement M6 workspace transactions early merely to make the M2 ports
  look complete.

After B3 is implemented and dual-green, continue **P0-B4**: exact-source
subagent/workflow reconnaissance and explicit supported/non-supported seam
documentation. M2-017 subagent lineage implementation remains P1/deferred unless
a higher-authority artifact changes that requirement.

## Acceptance-order reminders

The audit authority order remains:

1. `specs/0003-deepseek-harness-adapter-contract.md`;
2. accepted compatibility/source evidence;
3. `docs/tck-security-acceptance.md` expectations relevant to M2;
4. `docs/roadmap.md` tracking items;
5. current implementation/tests/CI.

The roadmap is a planning/tracking artifact and is stale in several M2
checkboxes. Do not bulk-mark it complete. In particular, do not invent
`step.ended` protocol vocabulary from roadmap wording when Spec 0003 defines
only the current M2 normalized vocabulary.

The roadmap phrase “Event order TCK green” must not be used to fabricate the M3
language-neutral shared TCK inside M2. M2 may rely on its own adapter/source
conformance evidence; the shared language-independent TCK remains M3-owned.

## Non-negotiable invariants

- Harness is an adapter, never protocol authority.
- Protocol/core packages do not import Harness concrete payload types.
- `tool/call` is intent; live `tools/result` is the authoritative final outcome.
- Unknown/future security semantics fail closed.
- Tool/provider mediation is not process isolation.
- Do not weaken schemas, validators, TypeScript, tests, frozen installs, TCK, or
  security claims for CI.
- Transaction v1 remains workspace-filesystem-effects only.
- M2 -> M3 shared/language-neutral TCK -> M4 Capability Broker remains the
  intended roadmap boundary unless governance explicitly changes it.

## Resume instruction

Read `docs/handoff/README.md`, this file, and live GitHub state. Continue from
**P0-B3 — operational Filesystem / Subprocess adapter ports** unless newer live
evidence and an updated handoff prove the gate changed.
