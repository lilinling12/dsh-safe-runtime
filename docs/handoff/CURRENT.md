# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before changes;
> normative specs/schemas/TCK and accepted exact-head evidence remain authority.

## Snapshot

- Recorded at: `2026-09-04`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M4 — Capability Broker v0.1`
- Active PR: `#3 — feat(policy): begin M4 capability broker`
- Branch: `feat/m4-capability-broker`
- Base: `main@57430273e065be8d38807d67b175fa154c801d43`
- M4-001..014: **GOVERNANCE CLOSED**
- M4-020..025: **GOVERNANCE CLOSED**
- M4-030..036: **GOVERNANCE CLOSED**
- M4-040 P0 `tools/pre-execute`: **GOVERNANCE CLOSED**
- M4-041 P0 `ctx.tools.guard()`: **GOVERNANCE CLOSED**
- M4-042 P0 route ask to `ctx.approval`: **AUTHORIZED / PROTOCOL-FIRST IN PROGRESS**
- M4-042 production/source-conformance implementation: **NOT AUTHORIZED before protocol-first exact-head dual-green**
- M4-043+, M4-050+, M5, M6, M10, M13, M15: **NOT AUTHORIZED by the current Gate**
- PR #3 merge: **NOT AUTHORIZED without explicit user authorization**

Live GitHub state overrides this snapshot.

## M4-041 final governance closure

Final M4-041 governance exact head:

```text
bd4c6719356d2133c42d0e58c9843807ffcedaeb
```

Its exact governance delta from audit head
`bbf3983f62504599b96416b4feb75a5e2319cf1d` was limited to:

```text
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md
docs/roadmap.md
```

Pre-push compare proved:

```text
CURRENT: modified
HISTORY: +68 / -0 (append-only)
roadmap: +1 / -1 (only M4-041 acceptance line)
```

Exact-head evidence:

- normal CI #588 / run `33779559614`: PASS;
- exact pinned Harness rc5 source-conformance #530 / run `33779559586`: PASS;
- Harness step 10 exact rc5 binding/source-conformance typecheck: PASS;
- Harness step 11 real rc5 runtime conformance: PASS;
- PR #3 remained Open, Draft and mergeable;
- PR #3 was not merged.

Therefore M4-041 governance is CLOSED and M4-042 is the sole newly authorized
engineering Gate.

## M4-042 roadmap authority

Roadmap Gate:

```text
M4-042 P0 — route ask to ctx.approval
```

M4-042 is not a new portable approval policy. It is the DeepSeek Harness Adapter
binding Gate for an already-determined safe-runtime `ASK` decision.

Portable approval routing authority remains accepted M4-023. Harness source is
used only to prove the supported runtime binding.

## Existing portable approval authority

Accepted M4-023 already defines:

```text
policy deny  -> deny; approval cannot override
policy allow -> allow without approval
policy ask   -> approval path
```

Accepted portable approval outcomes remain exactly:

```text
ALLOWED_ONCE
REJECTED
CANCELLED
UNAVAILABLE
```

Only `ALLOWED_ONCE` grants one request. The other three deny. Provider
throw/rejection/malformed output fails closed.

M4-042 MUST NOT create `ALLOWED_ALWAYS`, remembered approval, approval caching or
another approval business-policy vocabulary.

## Existing Adapter surfaces

The current runtime-independent Adapter already exposes:

```text
registerToolPolicy(handler)
requestApproval(request)
```

Current `registerToolPolicy()` maps:

```text
ALLOW        -> next()
DENY(reason) -> { kind: "deny", reason }
ASK          -> { kind: "ask" }
ASK(reason)  -> { kind: "ask", reason }
```

The standalone `requestApproval()` port separately projects an explicit Adapter
approval request to `ctx.approval.request()`.

These are distinct seams. M4-042 MUST NOT make `registerToolPolicy()` call the
standalone `requestApproval()` for the same ASK unless exact-source conformance
proves the current native route is non-conforming.

## Pinned Harness approval-routing facts

Pinned compatibility baseline remains:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
```

Exact pinned ToolRuntime source proves:

```text
final tools/pre-execute decision
  -> if ASK: ToolRuntime.serviceAsk()
  -> ctx.get("approval")
  -> approval.request({
       agent: exec.agent,
       toolName: exec.name,
       callId: exec.callId,
       reason?: ask.reason,
       signal: exec.signal
     })
  -> approval outcome
  -> monotonic guards
  -> dispatch only if still allowed
```

Therefore the current safe-runtime ASK projection already enters Harness's native
approval owner. A second Adapter-side approval call would duplicate approval and
is forbidden unless a concrete failing conformance case proves otherwise.

Pinned ToolRuntime outcome mapping is:

```text
allowed-once -> allow
rejected     -> deny
cancelled    -> deny / cancellation-aware no-dispatch path
unavailable  -> deny
```

Approval resolution occurs before monotonic guards and before the tool body.
`allowed-once` therefore does not bypass M4-041: a later monotonic guard may still
deny and prevent body entry.

## Pinned ApprovalService facts

Exact pinned `ApprovalService.request()` requires an open turn and owns the
native durable audit pair:

```text
approval/asked(id, toolName, callId?, reason?)
approval/decided(id, outcome)
```

The same service-generated `ApprovalRequestId` correlates the pair.

The exact public outcome set is:

```text
allowed-once
rejected
cancelled
unavailable
```

Additional pinned facts:

- default `ask` policy delegates to answerers;
- no answerer -> `unavailable`;
- answerer throw/rejection -> `unavailable`;
- non-vocabulary answerer output -> `unavailable`;
- session policy `never` -> deterministic `rejected` before answerer dispatch;
- cancellation wins the request race and late answer is discarded;
- failure to commit a required approval audit event rejects rather than returning
  an unlogged decision.

These are Adapter compatibility facts, not new portable protocol wire semantics.

## Critical waterfall boundary

`tools/pre-execute` remains a reorderable waterfall from M4-040.

M4-042 can only guarantee native approval when ASK is the **final pre-execute
decision delivered to ToolRuntime**.

An earlier listener may terminate without calling `next()`. An outer listener may
also call `next()` and replace a downstream ASK before the final result returns to
ToolRuntime.

Therefore M4-042 MUST NOT claim:

```text
every ASK ever returned by the safe-runtime listener necessarily reaches approval
```

That would overclaim the M4-040 seam.

This Gate proves the native route for a **reached/final ASK**, not a monotonic ASK
invariant.

## Agent/correlation boundary

For a reached agent-backed ASK, Harness uses the execution's own:

```text
agent
name -> toolName
callId
signal
```

and optional ASK reason.

M4-042 MUST NOT fabricate a new call id, agent, session or approval id.

Accepted M4-023 also forbids guessing that portable `actionRef` equals Harness
`callId`/Adapter `callRef`. That identity boundary remains unchanged.

An agent-less ASK fails closed in ToolRuntime and MUST NOT synthesize an agent or
Subject merely to obtain approval.

## Missing-service / unavailable distinction

M4-042 must distinguish:

```text
approval service absent
  -> ToolRuntime fail-closed deny
  -> no ApprovalService request
  -> no fabricated approval audit pair

approval service present, no answerer
  -> one ApprovalService request
  -> asked/decided pair
  -> unavailable
  -> deny

answerer throws/rejects/malformed output
  -> ApprovalService contains to unavailable
  -> asked/decided pair
  -> deny
```

All deny before tool-body entry.

## Protocol-first authority

Normative draft:

```text
specs/0046-m4-dsh-native-approval-routing.md
profile: M4-042_DSH_NATIVE_APPROVAL_ROUTING_V1
```

Portable/source-conformance corpus:

```text
fixtures/dsh-approval-routing/cases.json
32 cases: DAPR-001 through DAPR-032
```

The protocol-first corpus explicitly covers:

- ALLOW/DENY not originating approval;
- ASK reason projection;
- final ASK -> exactly one native ApprovalService request;
- exact agent/tool/call/reason/signal projection;
- all four approval outcomes;
- no-answer/throw/malformed answerer fail closed;
- absent approval service;
- agent-less ASK;
- open-turn/audit-pair requirements;
- Harness-generated approval identity correlation;
- `never` policy;
- allowed-once followed by monotonic guard denial;
- no duplicate Adapter `requestApproval()` call;
- reorderable-waterfall negative boundary;
- no actionRef/callRef fabrication;
- no M4-043/044/045 or system-wide enforcement overclaim.

## Expected implementation result

Current source review indicates production `binding.ts` may already conform:
`registerToolPolicy()` returns Harness ASK and ToolRuntime owns the approval call.

Therefore M4-042 production work MUST start by testing the existing binding.

No production rewrite is authorized before this protocol-first head is exact-head
dual-green. After that Gate, production code may change only if real pinned-source
conformance identifies a concrete defect.

Adding a second approval call merely to make the Gate appear implemented is
forbidden.

## Authorized protocol-first delta

Exactly:

```text
specs/0046-m4-dsh-native-approval-routing.md
fixtures/dsh-approval-routing/cases.json
docs/handoff/CURRENT.md
```

Not authorized in this protocol-first commit:

```text
production TypeScript
Adapter public port changes
capability-broker/policy-engine implementation changes
schema/protocol wire changes
Shared TCK registration
package manifests/dependencies
pnpm-lock.yaml
Harness baseline/workflow changes
HISTORY
roadmap M4-042 acceptance marker
M4-043+
M4-050+
M5
M6
M10
M13
M15
PR #3 merge
```

## Resume instruction

1. refresh PR #3 live head/base/Open/Draft/mergeability/reviews/threads;
2. verify parent `bd4c6719...` -> M4-042 protocol-first candidate changes exactly
   the three authorized files;
3. require exact-head normal CI + pinned Harness rc5 source-conformance green;
4. only after dual-green begin M4-042 source-conformance implementation;
5. reuse the existing real ToolRuntime/ApprovalService fixture infrastructure;
6. prove the existing `registerToolPolicy()` ASK path, not only standalone
   `requestApproval()`;
7. prove one reached ASK creates one native service request and no second Adapter
   approval call;
8. prove body entry/no-entry for allowed-once/rejected/cancelled/unavailable,
   missing service, agent-less ASK and monotonic guard-after-approval;
9. preserve the pre-execute reorderability limitation without overclaim;
10. change production code only for a concrete exact-source non-conformance;
11. keep M4-043+, M4-050+, M5, M6, M10, M13, M15 and PR #3 merge unauthorized.
