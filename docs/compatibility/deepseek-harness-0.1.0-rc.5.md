# DeepSeek Harness Compatibility Baseline — 0.1.0-rc.5

Status: SOURCE-PINNED BASELINE CANDIDATE  
Harness source commit: `47f943859bef60e4160492346772ded9b24f765a`  
Adapter milestone: M2

## Authority

This document records adapter assumptions derived from the DeepSeek Harness public product API and official architecture at the pinned commit. It is compatibility evidence, not a replacement for the safe-runtime normative specification.

The source commit, not an unverified npm tag, is the authority for M2 rc5 semantics.

## Asserted seams

| Capability | rc.5 observation | Adapter consequence |
|---|---|---|
| Cordis composition | model adapter, tools, session log and agent loop are plugins | adapter mounts beside public services; no loop patching |
| Agent API | `dsh-agent` owns the public Agent/event vocabulary; concrete loop is swappable | adapter MUST NOT depend on `dsh-agent-loop` |
| Durable facts | `turn/*`, `step/*`, `user/message`, `assistant/*`, `tool/*` are session facts | evidence references durable facts |
| Tool pre-policy | `tools/pre-execute` provides allow / deny / ask | policy port maps to ALLOW / DENY / ASK |
| Monotonic tool policy | `ctx.tools.guard()` is synchronous and may only deny/abstain after reorderable pre-policy | hard invariants use synchronous ALLOW/DENY semantics |
| Argument rewrite | pre-tool policy deliberately exposes no argument rewrite | M2 tool policy port exposes no rewrite operation |
| Final tool observation | `tools/result` observes the frozen authoritative outcome | normalized `tool.completed` derives from this live boundary |
| Tool visibility | `ctx.tools.restrict()` composes a scoped visible tool set | visibility MUST NOT be treated as authorization |
| Approval | only `allowed-once` grants; rejected/cancelled/unavailable fail closed | adapter approval mapping is fail closed and uses Harness-generated audit identity |
| Completion interception | `agent/turn-stopping` is an awaited serial boundary before turn closure | acceptance work that must finish before closure attaches here |
| Session log | model-visible content must be reconstructable from log | adapter evidence keeps durable references |
| Filesystem seam | `ctx.fs` is replaceable and uses provider-owned target identity | transactional runtime must not assume local POSIX paths |
| Subprocess seam | `ctx.subprocess` is replaceable | subprocess effects must use the provider seam |
| Shared execution world | filesystem and subprocess providers are designed to move together | Workspace TX composes both seams |
| Sandbox semantics | process sandbox is not treated by safe-runtime as a universal network authority | network enforcement requires a participating network/provider boundary |

## Requested versus observed tool semantics

The adapter intentionally separates intent from authoritative outcome:

```text
durable tool/call
  -> requested action only

live tools/result
  -> authoritative final execution outcome

durable tool/result
  -> replay/model-visible evidence anchor
```

A denial is not inferred from arbitrary error text or a substring in an error code. It is classified as `denied` only when the adapter correlates the result with a policy, guard, or approval path that actually prevented dispatch. Exact Harness cancellation codes are mapped explicitly; unknown errors remain `error`.

## Source baseline versus npm distribution

The pinned official source declares the relevant DSH packages as `0.1.0-rc.5`. During M2 validation, the public npm registry did not expose a matching `@deepseek-ai/dsh-session@0.1.0-rc.5` artifact while advertising a newer `next` version.

Therefore:

- M2 MUST NOT combine the rc5 source contract with a newer npm package family merely to satisfy installation;
- ordinary safe-runtime CI keeps Harness peers non-auto-installed;
- the rc5 binding is validated in a separate source-conformance job that checks out this exact upstream commit, installs the upstream frozen lockfile, builds the public type surface, and typechecks the binding against those source-owned packages;
- npm distribution support remains a separate compatibility gate.

## Explicit non-guarantees

The rc.5 adapter does NOT infer any of the following:

- arbitrary in-process plugin isolation;
- universal network confinement;
- authority from tool visibility restrictions;
- durable persistence of process-local `ToolExecutionToken` values;
- stable third-party custom durable event registration across future Harness releases;
- automatic compatibility with any Harness version other than a separately tested baseline;
- npm installability of the complete rc5 package family until distribution evidence proves it.

## Feature-detection rule

Runtime code asks the adapter for capabilities. It MUST NOT select security semantics from a string comparison such as `harnessVersion >= X`.

A missing required feature yields `UNSUPPORTED_ADAPTER_FEATURES` and the requesting guarantee fails closed.

## Upgrade procedure

For each new Harness release candidate:

1. identify an exact upstream source commit;
2. read the release diff for public Agent, Tools, Session, Approval, FS, Subprocess and Sandbox seams;
3. run source-pinned adapter conformance against that commit;
4. separately verify the npm/distribution package family if package installation is claimed;
5. update the feature matrix only for facts proven by source or tests;
6. add a compatibility note for changed semantics;
7. never weaken the safe-runtime TCK to admit an incompatible release;
8. add the release to the supported range only after acceptance evidence is attached.
