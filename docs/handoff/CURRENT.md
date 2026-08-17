# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK remain semantic authority.

## Snapshot

- Recorded at: `2026-08-17T20:55:14+08:00`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M2 — DeepSeek Harness Adapter Baseline`
- Pull request: `#1 — feat(adapter-dsh): establish M2 Harness adapter baseline`
- PR state: `OPEN / DRAFT`
- Branch: `feat/m2-harness-adapter`
- Last fully verified implementation head before this handoff maintenance commit:
  `c5d42ac67cff40102de5b5e6a3aea459e646d7ba`
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

At `c5d42ac67cff40102de5b5e6a3aea459e646d7ba`:

| Gate | State | Evidence |
| --- | --- | --- |
| Normal CI | **PASS** | run `32032290309`, job `95394774984` |
| Frozen safe-runtime install | **PASS** | normal CI |
| `pnpm check:all` | **PASS** | normal CI |
| Exact Harness source conformance | **PASS** | run `32032290352`, job `95394780881` |
| Pinned upstream build | **PASS** | source-conformance step 6 |
| Frozen safe-runtime install in source gate | **PASS** | step 7 |
| Exact package projection | **PASS** | step 8 |
| Projection idempotence | **PASS** | step 9 |
| Exact-source TypeScript/provider contract | **PASS** | step 10 |
| Real rc5 runtime conformance | **PASS** | step 11 |

## M2 Acceptance Audit status

`docs/acceptance/m2-acceptance-audit.md` still governs the current acceptance
review. M2 remains **NOT ACCEPTED / PR #1 KEEP DRAFT** until the final P0
reconnaissance blocker is closed and the audit is refreshed.

### Closed P0-B1 — Completion steering budget

- caller-defined `maxRetries` is explicit at the runtime-independent port;
- malformed and over-budget requests fail before Harness steering;
- exact rc5 runtime conformance proves boundary and fail-closed behavior.

### Closed P0-B2 — Sidecar correlation boundary

- minimal `SidecarEvidenceRecord` / `SidecarEvidenceSink` boundary exists;
- durable Harness event ref/sequence and evidence ref/digest are preserved;
- process-local execution tokens are excluded by allow-list projection;
- full ledger persistence/hash-chain/replay remains later-milestone work.

### Closed P0-B3 — Operational Filesystem / Subprocess ports

The former guarantee-only markers were replaced with deliberately minimal,
runtime-independent operational ports and exact-source binding proof.

Filesystem:

- provider-owned target identity remains opaque;
- caller-manufactured/guessed target identities are rejected;
- resolve/stat/contains/readText/processPath are operational;
- `processPath()` remains an explicit security-sensitive execution-world bridge;
- mediation is declared as provider-service and isolation remains
  `not-asserted`.

Subprocess:

- executable resolution is operational;
- spawn requires explicit argv/cwd/grace/output bounds and exposes bounded
  collected stdout/stderr only;
- raw Node streams, shell defaults, PTY policy and broader command semantics are
  not promoted into the M2 port;
- missing requested provider output collectors fail closed;
- execution world is recorded as shared with filesystem, while isolation remains
  `not-asserted`.

Exact pinned rc5 source-conformance step 10 proves official `FileSystem` and
`SubprocessRuntime` public types bind directly to the structural provider
adapters. This evidence does not grant Harness semantic authority.

A real intermediate CI failure on head
`04ab5764d127be6979976c96998de0a40e36ead2` was limited to strict TypeScript
`TS7006` implicit-any diagnostics in new callback parameters. Frozen install
passed. The fix added explicit types only; strictness and all gates remained
unchanged. Final implementation head `c5d42ac...` is dual-green.

## Active blocker / current gate

**P0-B4 — Exact-source subagent/workflow reconnaissance and explicit seam documentation.**

This is a reconnaissance/documentation gate, not authorization to implement
subagent lineage.

Required next work:

1. inspect only official source at exact pinned Harness commit
   `47f943859bef60e4160492346772ded9b24f765a`;
2. identify any public subagent, child-agent, workflow/orchestration, delegation,
   or nested-session seams relevant to roadmap M2-002;
3. record what the pinned baseline actually exposes and what it does not prove;
4. update `docs/compatibility/deepseek-harness-0.1.0-rc.5.md` with explicit
   supported/non-supported claims;
5. do not implement roadmap M2-017 subagent lineage mapping, which remains P1,
   unless a higher-authority artifact changes that requirement;
6. rerun normal CI and exact rc5 source-conformance on the resulting head;
7. refresh the M2 Acceptance Audit and decide whether M2 is accepted.

Do not start M3 shared TCK or M4 Capability Broker implementation while B4 or the
final M2 acceptance decision remains open.

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
- do not weaken schemas, validators, TypeScript, tests, frozen installs, TCK, or
  security claims for CI.
- do not implement M6 workspace transactions early.
- M2 -> M3 shared/language-neutral TCK -> M4 Capability Broker remains the
  intended roadmap boundary unless governance explicitly changes it.

## Acceptance-order reminders

1. `specs/0003-deepseek-harness-adapter-contract.md`;
2. accepted exact-source compatibility evidence;
3. `docs/tck-security-acceptance.md` expectations relevant to M2;
4. `docs/roadmap.md` tracking items;
5. current implementation/tests/CI.

The roadmap is a planning artifact and remains stale in several M2 checkboxes.
Do not invent protocol vocabulary such as `step.ended` from roadmap wording when
the normative M2 spec does not define it. Likewise, do not relabel M2 adapter
conformance as the M3 language-neutral shared TCK.

## Resume instruction

Read `docs/handoff/README.md`, this file, and live GitHub state. Continue from
**P0-B4 — exact-source subagent/workflow reconnaissance** unless newer live
evidence and an updated handoff prove the gate changed.
