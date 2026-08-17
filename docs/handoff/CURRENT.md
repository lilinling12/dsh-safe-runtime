# Current Engineering Handoff

> Operational snapshot only. This document is non-normative and MUST be
> reconciled with live GitHub state before code changes.

## Snapshot

- Recorded at: `2026-08-17T17:43:00+08:00`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M2 — DeepSeek Harness Adapter Baseline`
- Pull request: `#1 — feat(adapter-dsh): establish M2 Harness adapter baseline`
- PR state at snapshot: `OPEN / DRAFT`
- Branch: `feat/m2-harness-adapter`
- Last verified implementation head before this handoff maintenance commit:
  `7c4354e369aaf7097d7a5b25ed47ba452df5fc9b`
- Base branch: `main`
- M0/M1 base commit: `f88b8783623c8cd15be42329077953044b9fdd3d`

The handoff commit itself advances the branch head. A resumed session MUST query
GitHub for the actual current head rather than treating the SHA above as the
latest branch SHA.

## Exact upstream compatibility baseline

DeepSeek Harness source contract baseline:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
```

This source pin is authoritative for the current M2 conformance work. Do not
silently replace it with an npm `rc.6` package or another upstream commit merely
to make installation/tests pass. If the baseline changes, treat that as an
explicit compatibility decision and update the compatibility record.

## Current quality-gate snapshot

At implementation head `7c4354e369aaf7097d7a5b25ed47ba452df5fc9b`:

| Gate | State | Evidence |
| --- | --- | --- |
| Normal repository CI | PASS | GitHub Actions run `32015622320` |
| Build pinned Harness public type surface | PASS | source-conformance job `95344343363`, step 6 |
| Frozen safe-runtime dependency install | PASS | step 7 |
| Exact pinned workspace projection | PASS | step 8 |
| Projection idempotence | PASS | step 9 |
| Exact rc5 binding/source-conformance TypeScript check | **FAIL** | step 10 |
| Real rc5 runtime conformance | NOT RUN | step 11 skipped because step 10 failed |

The previous lifecycle failure involving a nonexistent `ctx.dispose()` has
already been addressed by introducing a real Cordis child-plugin `Fiber`
ownership fixture. The current red gate is now earlier and stricter: the
source-conformance TypeScript check includes the conformance tests and fails at
step 10.

## Active blocker

**Do not guess the TypeScript error.**

The next session must obtain the current failing compiler diagnostic for the
latest PR head. GitHub job metadata identifies step 10 as the failure boundary,
but the connector snapshot did not expose the log body containing the compiler
message.

Required sequence:

1. fetch PR #1 and obtain the current head SHA;
2. fetch workflow runs for that exact SHA;
3. if `Harness rc5 source conformance` is still red, inspect its current job;
4. confirm the failing step;
5. obtain the first useful TypeScript diagnostic from the Actions log;
6. fix the actual API/type mismatch against pinned Harness source;
7. rerun and require both normal CI and source-conformance to pass.

Do not edit code from an old failure description if a newer head/run exists.

## M2 work already established

The current branch already contains, among other M2 work:

- Harness adapter contract and feature matrix;
- runtime-independent adapter ports/events;
- fail-closed unsupported-feature handling;
- requested-vs-observed tool normalization;
- explicit exact outcome classification rather than substring security guesses;
- ordered asynchronous observer dispatch;
- public-service-based rc5 binding without coupling protocol semantics to
  `dsh-agent-loop`;
- reproducible `pnpm-lock.yaml` and frozen install gate;
- strict pnpm lifecycle build allowlist rather than global build-script enable;
- strict JSON Schema fixes without weakening AJV strictness;
- deterministic exact-source Harness workspace projection with conflict and
  duplicate detection;
- ToolRuntime / Approval / turn-stopping / disposal source-conformance suites;
- Cordis child `Fiber` lifecycle fixture for real ownership/disposal semantics;
- source-conformance TypeScript checking against the exact upstream source pin.

## Current gate

M2 MUST remain `IN PROGRESS` and PR #1 MUST remain Draft until both of these are
true on the same relevant head:

```text
Normal CI                         = PASS
Harness exact-source conformance = PASS
```

Do not mark M2 complete merely because normal CI is green.

## Next allowed work after dual green

Only after the two gates above are green, proceed to:

**M2 — Filesystem / Subprocess Provider Probe**

The probe should establish source-backed facts for the pinned Harness baseline,
including:

- filesystem provider public package/API;
- `FsTarget` opaque identity semantics;
- `processPath()`;
- `fileUrl()`;
- `contains()`;
- `FsVersion` freshness/CAS semantics;
- subprocess provider public package/API;
- whether filesystem and subprocess share an execution world;
- sandbox file-effect modes;
- where enforcement may be partial rather than complete.

This phase is a provider-seam/feature probe. Do **not** implement the workspace
transaction runtime merely because the provider seams have been located.

## Roadmap boundary after M2

Do not jump directly from partial M2 work to Capability Broker implementation.
The intended sequence remains:

```text
M2 Harness Adapter Baseline
  -> M3 Shared / language-neutral TCK
  -> M4 Capability Broker
```

## Protocol and security invariants to preserve

- Protocol namespace: `safe-runtime.dev/v1alpha1`.
- DeepSeek Harness is an adapter, not the protocol domain model.
- Reference implementation does not reverse-define normative semantics.
- Transaction v1 scope is `workspace-filesystem-effects` only.
- Commit means crash-recoverable, conflict-checked multi-file commit; it does
  not claim a globally atomic transaction.
- Capability is action/capability + resource, not merely a tool name.
- Default deny and fail-closed approval.
- Delegation must attenuate authority.
- Acceptance and Evidence/AVP remain separate concerns.
- Assistant text claiming success is a Claim, not Evidence.
- Unknown/future Harness semantics must fail explicitly rather than silently map
  to success.
- Do not weaken Schema, TCK, validators, TypeScript checks, conformance tests,
  frozen lockfile behavior, or security guarantees to make CI pass.

## Resume instruction

A new session should begin by reading this file and
`docs/handoff/README.md`, then query live GitHub state. Continue from the
**Active blocker** unless live evidence proves that the gate has changed.
