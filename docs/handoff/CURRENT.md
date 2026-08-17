# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK remain semantic authority.

## Snapshot

- Recorded at: `2026-08-17T19:10:00+08:00`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M2 — DeepSeek Harness Adapter Baseline`
- Pull request: `#1 — feat(adapter-dsh): establish M2 Harness adapter baseline`
- PR state: `OPEN / DRAFT`
- Branch: `feat/m2-harness-adapter`
- Last verified head before this handoff maintenance commit:
  `39eaaada8186ad7555456d76aeed647d1a3d7e5f`
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

At `39eaaada8186ad7555456d76aeed647d1a3d7e5f`:

| Gate | State | Evidence |
| --- | --- | --- |
| Normal CI | **PASS** | `32022994277` (#41) |
| Exact Harness source conformance | **PASS** | `32022994262` (#23) |
| Source-conformance job | **PASS** | `95366391189` |
| Pinned upstream build | **PASS** | step 6 |
| Frozen safe-runtime install | **PASS** | step 7 |
| Exact package projection | **PASS** | step 8 |
| Projection idempotence | **PASS** | step 9 |
| Exact-source TypeScript/provider contract | **PASS** | step 10 |
| Real rc5 runtime conformance | **PASS** | step 11 |

## Closed gate: Filesystem / Subprocess Provider Probe

The portable rc5 provider probe is complete and recorded in:

`docs/compatibility/deepseek-harness-0.1.0-rc.5-provider-probe.md`

`packages/adapter-dsh/source-conformance/provider-seams.contract.ts` pins the
public FS/Subprocess/Sandbox method and closed-vocabulary shapes in exact-source
TypeScript CI.

Important conclusions that future work MUST preserve:

- `FsTargetKey` / `FsVersion` are opaque provider tokens;
- `processPath()` is a security-sensitive process-path bridge;
- bare local FS `cwd` is not containment;
- `fs-sandbox` fences writes/edits, not reads, and is not a kernel boundary;
- local subprocess file effects are not mediated by `ctx.fs`;
- process lifecycle ownership is not filesystem/network confinement;
- sandbox policy scope is file effects only;
- sandbox `full`/`partial` is provider-reported scope completeness, not a
  universal guarantee; configured runners can assert `full` without built-in
  functional probing;
- nothing in the current local rc5 probe proves universal network confinement or
  general `process-isolated` semantics.

## Active gate

**M2 Acceptance Audit**

Do not start M3 shared TCK or M4 Capability Broker implementation yet.

The audit must reconcile, in authority order:

1. `specs/0003-deepseek-harness-adapter-contract.md`;
2. accepted compatibility/source evidence;
3. `docs/tck-security-acceptance.md` expectations relevant to M2;
4. `docs/roadmap.md` tracking items;
5. current implementation/tests/CI.

The roadmap is a planning/tracking artifact and is currently stale in several M2
checkboxes. Do not bulk-mark it complete. Update only items with direct evidence
and explicitly classify deferred/P1 or M3-owned work.

## Known audit questions

- Are all normative Spec 0003 acceptance criteria directly evidenced?
- Does `UNSUPPORTED_ADAPTER_FEATURES` have sufficient negative test evidence, or
  only an implementation path?
- Are current `FilesystemPort` / `SubprocessPort` guarantee-only abstractions
  sufficient for roadmap M2-023/M2-024, or does the roadmap require operational
  provider methods?
- Is `M2-017` subagent lineage intentionally P1/deferred?
- How should the first accepted Harness baseline interpret the roadmap DoD
  phrase “current + previous supported version adapter tests green”?
- The roadmap requires “Event order TCK green”, while M3 explicitly owns the
  language-neutral shared TCK foundation. The audit must reconcile this rather
  than fabricating a completed M3 TCK inside M2.

If any P0/normative gap remains, keep PR #1 Draft and fix that gap before M2
acceptance.

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
**M2 Acceptance Audit** unless newer live evidence and an updated handoff prove
the gate changed.
