# DeepSeek Harness Compatibility Baseline — 0.1.0-rc.5

Status: SOURCE-PINNED BASELINE CANDIDATE  
Harness source commit: `47f943859bef60e4160492346772ded9b24f765a`  
Adapter milestone: M2

## Authority

This document records adapter assumptions derived from the DeepSeek Harness public product API and official architecture at the pinned commit. It is compatibility evidence, not a replacement for the safe-runtime normative specification.

The source commit, not an unverified npm tag, is the authority for M2 rc5 semantics.

Detailed filesystem/subprocess/sandbox evidence is maintained in
[`deepseek-harness-0.1.0-rc.5-provider-probe.md`](deepseek-harness-0.1.0-rc.5-provider-probe.md).

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
| FS process bridge | `processPath()` exposes the canonical execution-world path for an opaque target | crossing into a process capability is security-sensitive and not equivalent to provider interception |
| Local FS cwd | `fs-local` cwd is a relative-path base, not a containment root | cwd MUST NOT be treated as resource isolation |
| FS sandbox | `fs-sandbox` fences mutation calls; reads pass through | maximum claim is provider-enforced mutation confinement, not kernel/process isolation |
| Subprocess seam | `ctx.subprocess` is replaceable | subprocess effects must use the provider seam where the consumer participates |
| Local subprocess FS access | local subprocess uses OS paths directly rather than routing process IO through `ctx.fs` | replacing/intercepting `ctx.fs` does not contain subprocess file effects |
| Shared execution world | filesystem and subprocess providers are designed to move together | Workspace TX must preserve execution-world coherence across both seams |
| Sandbox semantics | sandbox policy vocabulary covers file effects and may report `full` or `partial` | do not infer network authority or general process isolation from sandbox presence |
| Subagent seam | `dsh-subagent` is a Product-stable optional capability at `ctx.subagents`; named providers support one-shot delegation, durable continuable children, child/descendant discovery, follow-up and interruption | M2 records the seam but does not make subagent support part of the core Agent loop or infer a safe-runtime lineage model from Harness |
| Subagent lifecycle | public `subagent/start` and `subagent/end` events are paired by `runId`; payloads expose provider, child `SessionId`, locality and terminal outcome, while scoped dispatch is carried by the delegating parent | future lineage mapping can use an explicit public seam, but M2-017 remains P1 and is not silently implemented as part of reconnaissance |
| Durable child lineage | `SessionHeader.parentSession`, `origin: 'subagent'`, and `delegationDepth` are persisted session metadata; local `SubagentRun.id` equals the child session id and its `parentSession` records the parent session | parent/child identity is durable in rc5, but Harness metadata is compatibility evidence rather than protocol authority |
| Workflow seam | `dsh-workflow` is a Product-stable optional capability at `ctx.workflowEngine`; `WorkflowEngine.start()` owns a live run and publishes observe-only lifecycle events | adapter may observe this seam only through its public contract; worker implementation details do not define safe-runtime semantics |
| Workflow child lifecycle | `workflow/agent-start` and `workflow/agent-end` pair one orchestration `agent()` call by `seq` and expose the child `SessionId`; `workflow/start|phase|log|end` expose run lifecycle/progress | rc5 provides explicit orchestration evidence, but M2 does not normalize these events or treat phase/log metadata as execution authority |
| Workflow worker isolation | official workflow documentation states worker threads isolate execution from the host event loop but are not a security boundary | no sandbox/process-isolation guarantee may be inferred from workflow worker-thread execution |

## Subagent / workflow reconnaissance

Roadmap item `M2-002 P0` requires the current Harness reconnaissance to include
subagent/workflow seams. The exact rc5 source does expose both as public Product
capability families; they are not hidden details of `dsh-agent-loop`.

Exact source inspected for this record:

- `packages/README.md` — classifies both `subagent/` and `workflow/` as Product
  stable API families;
- `packages/subagent/README.md` and `docs/subsystems/subagent.md` — describe
  `ctx.subagents`, named providers, one-shot and continuable children, direct
  parent authorization, durable child discovery and lifecycle ownership;
- `packages/subagent/subagent/src/index.ts` — public service and
  `subagent/start` / `subagent/end` event vocabulary;
- `packages/subagent/subagent/src/types.ts` — public run/request/result types and
  the child `SessionId` contract;
- `packages/core/session/src/types.ts` — durable `SessionHeader.parentSession`,
  `origin: 'subagent'`, and `delegationDepth` metadata;
- `packages/workflow/README.md` and `packages/workflow/workflow/src/index.ts` —
  `ctx.workflowEngine` and observe-only `workflow/*` lifecycle events;
- `packages/workflow/workflow/src/types.ts` — workflow run identity plus
  `WorkflowAgentInfo.childId: SessionId` and per-call `seq` correlation.

### What rc5 proves

- Subagent delegation is an optional capability seam separate from the Agent
  loop, with multiple named providers behind `ctx.subagents`.
- A session-backed child has explicit durable parent/delegation metadata.
- Public subagent lifecycle events identify the child and pair start/end by a
  stable run id.
- Continuable children have durable child session identity; process-local
  activations are not the durable identity.
- Workflow orchestration is an optional public capability seam at
  `ctx.workflowEngine`.
- Public workflow lifecycle events include workflow-run lifecycle and paired
  child-agent lifecycle; workflow child identity is the subagent child
  `SessionId`.

### What rc5 does not authorize M2 to claim

This reconnaissance does **not** make DeepSeek Harness the authority for a
safe-runtime subagent/workflow protocol. In particular, M2 does not claim that:

- every safe-runtime Agent implementation must expose Harness's one-shot versus
  continuable distinction;
- `SubagentRunId`, workflow `seq`, activation state, provider names, workflow
  phases, or Harness session metadata are portable protocol identifiers;
- workflow worker threads provide a security boundary;
- remote subagent providers have the same local process/session guarantees as
  in-process providers;
- parent attribution in a live event alone is sufficient authorization for a
  future safe-runtime capability;
- subagent/workflow lifecycle is already normalized by the M2 adapter.

Roadmap `M2-017 P1` (subagent lineage mapping) therefore remains explicitly
**deferred**. Closing `M2-002 P0` means the seam has been source-pinned and its
limits documented; it does not upgrade that P1 mapping into a P0 implementation
requirement. A later mapping must start from safe-runtime normative semantics and
use these Harness facts only as adapter evidence.

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
- containment from an `fs-local` cwd;
- read confinement from `fs-sandbox`;
- confinement of local subprocess filesystem effects merely because `ctx.fs` is replaced;
- general process isolation from the same-world sandbox seam;
- workflow worker-thread execution as a security boundary;
- authority from tool visibility restrictions;
- durable persistence of process-local `ToolExecutionToken` values;
- portable safe-runtime lineage semantics merely from Harness subagent/session metadata;
- normalized safe-runtime workflow semantics merely from Harness `workflow/*` events;
- stable third-party custom durable event registration across future Harness releases;
- automatic compatibility with any Harness version other than a separately tested baseline;
- npm installability of the complete rc5 package family until distribution evidence proves it.

## Feature-detection rule

Runtime code asks the adapter for capabilities. It MUST NOT select security semantics from a string comparison such as `harnessVersion >= X`.

A missing required feature yields `UNSUPPORTED_ADAPTER_FEATURES` and the requesting guarantee fails closed.

Provider/security compatibility facts that are not optional adapter capabilities
are recorded separately in `DSH_RC5_PROVIDER_FACTS`; they must not be converted
into `requireAdapterFeatures()` checks that falsely imply a deployment has
loaded or enforced a particular provider.

## Upgrade procedure

For each new Harness release candidate:

1. identify an exact upstream source commit;
2. read the release diff for public Agent, Tools, Session, Approval, FS, Subprocess, Sandbox, Subagent and Workflow seams;
3. run source-pinned adapter conformance against that commit;
4. separately verify the npm/distribution package family if package installation is claimed;
5. update the feature matrix and provider facts only for facts proven by source or tests;
6. add a compatibility note for changed semantics;
7. never weaken the safe-runtime TCK to admit an incompatible release;
8. add the release to the supported range only after acceptance evidence is attached.
