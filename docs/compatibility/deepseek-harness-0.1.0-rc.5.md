# DeepSeek Harness Compatibility Baseline — 0.1.0-rc.5

Status: TESTED BASELINE CANDIDATE
Harness commit: `47f943859bef60e4160492346772ded9b24f765a`
Adapter milestone: M2

## Authority

This document records adapter assumptions derived from the DeepSeek Harness public product API and official architecture at the pinned commit. It is compatibility evidence, not a replacement for the safe-runtime normative specification.

## Asserted seams

| Capability | rc.5 observation | Adapter consequence |
|---|---|---|
| Cordis composition | model adapter, tools, session log and agent loop are plugins | adapter mounts beside public services; no loop patching |
| Agent API | `dsh-agent` owns the public Agent/event vocabulary; concrete loop is swappable | adapter MUST NOT depend on `dsh-agent-loop` |
| Durable facts | `turn/*`, `step/*`, `user/message`, `assistant/*`, `tool/*` are session facts | evidence references durable facts |
| Tool pre-policy | `tools/pre-execute` provides allow / deny / ask | policy port maps to ALLOW / DENY / ASK |
| Monotonic tool policy | `ctx.tools.guard()` may deny after reorderable pre-policy | hard invariants may use a guard |
| Argument rewrite | pre-tool policy deliberately exposes no argument rewrite | M2 tool policy port exposes no rewrite operation |
| Final tool observation | `tools/result` observes frozen authoritative outcome | normalized `tool.completed` derives from this live boundary |
| Tool visibility | `ctx.tools.restrict()` composes a scoped visible tool set | visibility MUST NOT be treated as authorization |
| Approval | only `allowed-once` grants; rejected/cancelled/unavailable fail closed | adapter approval mapping is fail closed |
| Completion interception | `agent/turn-stopping` runs before turn closure | acceptance engine may steer before completion |
| Session log | model-visible content must be reconstructable from log | adapter evidence keeps durable references |
| Filesystem seam | `ctx.fs` is replaceable and uses provider-owned target identity | transactional runtime must not assume local POSIX paths |
| Subprocess seam | `ctx.subprocess` is replaceable | subprocess effects must use the provider seam |
| Shared execution world | filesystem and subprocess providers are designed to move together | Workspace TX composes both seams |
| Sandbox semantics | process sandbox is not treated by safe-runtime as a universal network authority | network enforcement requires a participating network/provider boundary |

## Explicit non-guarantees

The rc.5 adapter does NOT infer any of the following:

- arbitrary in-process plugin isolation;
- universal network confinement;
- authority from tool visibility restrictions;
- durable persistence of process-local `ToolExecutionToken` values;
- stable third-party custom durable event registration across future Harness releases;
- automatic compatibility with any Harness version other than a tested range.

## Feature-detection rule

Runtime code asks the adapter for capabilities. It MUST NOT select security semantics from a string comparison such as `harnessVersion >= X`.

A missing required feature yields `UNSUPPORTED_ADAPTER_FEATURES` and the requesting guarantee fails closed.

## Upgrade procedure

For each new Harness release candidate:

1. read the release diff for public Agent, Tools, Session, Approval, FS, Subprocess and Sandbox seams;
2. run adapter conformance fixtures against the new release;
3. update the feature matrix only for facts proven by source or tests;
4. add a compatibility note for changed semantics;
5. never weaken the safe-runtime TCK to admit an incompatible release;
6. add the release to the supported range only after acceptance evidence is attached.
