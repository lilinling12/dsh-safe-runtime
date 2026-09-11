# M4-042 — DeepSeek Harness Native Approval Routing Contract

Status: **DRAFT NORMATIVE SPECIFICATION**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-042 P0 — route ask to ctx.approval`  
Conformance profile: `M4-042_DSH_NATIVE_APPROVAL_ROUTING_V1`  
Pinned Harness compatibility baseline: `0.1.0-rc.5` / `47f943859bef60e4160492346772ded9b24f765a`  
Depends on: Spec 0003 DeepSeek Harness Adapter Contract, accepted M4-023 approval routing, accepted M4-040 pre-execute registration, accepted M4-041 monotonic hard guard  
Separated from: M4-043 authoritative `tools/result`, M4-044 approval-subsystem uniqueness audit, M4-045 audit redaction

## 1. Purpose

M4-042 defines the narrow Adapter contract by which an already-determined
safe-runtime `ASK` tool-policy decision is projected into DeepSeek Harness's
native ToolRuntime approval path.

The Gate exists to prove that safe-runtime uses the Harness approval seam already
owned by ToolRuntime instead of creating a second approval orchestration path.
It does not redefine portable approval policy, CapabilityPolicy precedence,
Lease semantics, durable CapabilityDecision construction or audit persistence.

DeepSeek Harness remains Adapter compatibility evidence only. Portable approval
routing authority remains the accepted M4-023 contract.

## 2. Existing portable authority reused unchanged

M4-023 already defines the portable broker routing rule:

```text
policy deny  -> deny; approval MUST NOT override
policy allow -> allow without approval
policy ask   -> approval path
```

The accepted portable approval outcome domain is:

```text
ALLOWED_ONCE
REJECTED
CANCELLED
UNAVAILABLE
```

Only `ALLOWED_ONCE` is a grant. The other three outcomes deny. Provider failure
or malformed provider output fails closed.

M4-042 does not create another approval outcome vocabulary and does not add
`ALLOWED_ALWAYS` or remembered approval.

## 3. Existing Adapter surfaces

The accepted runtime-independent Adapter already exposes two distinct surfaces:

```text
registerToolPolicy(handler)
requestApproval(request)
```

`registerToolPolicy()` accepts:

```text
ToolPolicyDecision =
  ALLOW
  | DENY(reason)
  | ASK(reason?)
```

`requestApproval()` is a standalone runtime-independent port for callers that
explicitly need the approval service. It is **not** an instruction for the
`registerToolPolicy()` ASK path to call approval itself.

M4-042 MUST preserve this distinction.

## 4. Pinned Harness source facts

At the exact pinned rc5 baseline, official ToolRuntime source establishes:

1. `tools/pre-execute` is a waterfall and returns `allow`, `deny`, or `ask`;
2. after the waterfall resolves, ToolRuntime calls its internal `serviceAsk()`
   exactly when the final gate decision is `ask`;
3. `serviceAsk()` obtains the optional service with `ctx.get('approval')`;
4. if the service is present and the call has an agent, ToolRuntime invokes
   `approval.request()` with the exact execution agent, tool name, call id,
   optional ask reason and execution signal;
5. approval is resolved before monotonic guards and before tool dispatch;
6. `allowed-once` maps to allow;
7. `rejected`, `cancelled`, and `unavailable` map to denial;
8. an absent approval service fails closed without invoking a tool body;
9. an agent-less ask fails closed because no session/UI owner exists;
10. a thrown approval request escapes `serviceAsk()` into ToolRuntime's outer
    pre-dispatch catch and becomes a failed final tool result; the body is not
    entered.

The exact pinned `ApprovalService` additionally establishes:

1. every actual `ApprovalService.request()` requires an open turn;
2. one service request appends one `approval/asked` event before deciding;
3. after an outcome is known, it appends one correlated `approval/decided` with
   the same service-generated `ApprovalRequestId`;
4. `allowed-once`, `rejected`, `cancelled`, and `unavailable` are the complete
   public outcome set;
5. the default `ask` policy delegates to composed answerers;
6. no answerer falls through to `unavailable`;
7. answerer throw/rejection or a non-vocabulary return is contained and normalized
   to `unavailable`;
8. session policy `never` resolves `rejected` before answerer dispatch;
9. cancellation resolves `cancelled`, and a later answer is discarded;
10. failure to commit either required audit event rejects rather than returning
    an unlogged approval decision.

These are pinned Adapter compatibility facts. They do not become portable
protocol wire semantics merely because Harness implements them.

## 5. Single native approval path

For M4-042 the conforming path is exactly:

```text
safe-runtime ToolPolicyHandler
  -> ASK(reason?)
  -> Adapter tools/pre-execute projection
  -> Harness final PreToolDecision { kind: "ask", reason? }
  -> ToolRuntime.serviceAsk()
  -> ctx.approval.request(...)
  -> approval outcome
  -> allow or deny before dispatch
```

The Adapter MUST NOT call its standalone `requestApproval()` from inside
`registerToolPolicy()` for the same ASK.

The Capability Broker MUST NOT separately call `ctx.approval` for a ToolRuntime
ASK already delegated to Harness.

One policy ASK must have one native approval owner, not two stacked approval
subsystems.

## 6. ALLOW mapping

A safe-runtime decision:

```text
{ kind: "ALLOW" }
```

continues the pre-execute waterfall and does not itself request approval.

A later/downstream listener may still return ASK or DENY. M4-042 MUST NOT claim
that safe-runtime ALLOW is final authorization.

## 7. DENY mapping

A safe-runtime decision:

```text
{ kind: "DENY", reason }
```

maps to Harness pre-execute deny and does not request approval.

Human approval MUST NOT be invoked to override this deny. This preserves the
accepted M4-023 invariant that approval cannot override policy deny.

## 8. ASK mapping

A safe-runtime decision:

```text
{ kind: "ASK" }
```

maps to:

```text
{ kind: "ask" }
```

A decision:

```text
{ kind: "ASK", reason }
```

maps to:

```text
{ kind: "ask", reason }
```

The reason is forwarded as the Harness ask explanation and MUST NOT be treated as
an authorization token, approval identity, CapabilityDecision reason or audit
secret-classification result.

## 9. Final-waterfall boundary

`tools/pre-execute` is reorderable waterfall behavior. Therefore M4-042 can only
claim approval routing when an ASK is the **final decision delivered to
ToolRuntime**.

A listener earlier in the waterfall may terminate without calling `next()`. A
listener surrounding `next()` may also replace a downstream decision before the
final result reaches ToolRuntime. M4-042 MUST NOT claim:

> every ASK ever returned by the safe-runtime listener necessarily reaches
> `ctx.approval`.

That would overstate the M4-040 reorderable seam.

If an upstream boundary transforms or suppresses a downstream ASK, that is a
pre-execute composition fact, not evidence that Harness duplicated or bypassed
its native approval service.

## 10. Exactly-one service request for a reached ASK

For one ToolRuntime execution whose final pre-execute decision is ASK, pinned rc5
contains exactly one `serviceAsk()` call and that method makes at most one
`approval.request()` invocation.

Real source-conformance MUST prove that the safe-runtime path does not add a
second call through Adapter `requestApproval()`.

This Gate's exactly-one claim is scoped to the native ToolRuntime routing of one
reached ASK. It is not a claim that arbitrary third-party plugins cannot make
independent approval requests for unrelated purposes.

Formal repository-wide duplicate-subsystem audit remains M4-044.

## 11. Approval request correlation

For an agent-backed ToolRuntime ASK, pinned Harness passes:

```text
agent    = exec.agent
toolName = exec.name
callId   = exec.callId
reason   = ask.reason when present
signal   = exec.signal
```

The Adapter MUST NOT generate a new call id or reinterpret protocol `actionRef` as
Harness `callId`.

M4-023 already states that portable `actionRef` and Harness `callRef` are not
implicitly the same identity. M4-042 preserves that boundary.

The Harness-generated `ApprovalRequestId` belongs to Harness approval/audit
correlation and MUST NOT be fabricated by safe-runtime.

## 12. ALLOWED_ONCE behavior

For a reached ASK with a real ApprovalService outcome `allowed-once`:

```text
ASK -> approval.request -> allowed-once -> ToolRuntime allow
```

Only then may execution continue to the monotonic guard stage and, if no later
hard denial/cancellation exists, into dispatch.

M4-042 MUST prove that `allowed-once` does not skip M4-041 monotonic guards. A
hard guard denial after approval still prevents body entry.

`allowed-once` is scoped to that request. M4-042 MUST NOT cache or convert it into
an enduring grant or Lease.

## 13. REJECTED behavior

A real `rejected` outcome maps to ToolRuntime denial before dispatch.

The tool body MUST NOT be entered. The Adapter MUST NOT retry approval or fall
through to ALLOW.

## 14. UNAVAILABLE behavior

Three relevant unavailable forms are distinct compatibility facts:

1. **Approval service absent**: ToolRuntime fails the ASK closed directly; no
   `ApprovalService.request()` occurs and no approval audit pair is fabricated.
2. **Approval service present, no answerer**: `ApprovalService.request()` records
   one asked/decided pair whose outcome is `unavailable`; ToolRuntime denies.
3. **Answerer throw/rejection/malformed return**: ApprovalService contains it to
   `unavailable`, records the pair, and ToolRuntime denies.

In every form, the tool body MUST NOT be entered.

M4-042 MUST NOT silently reinterpret unavailable as allowed-once.

## 15. CANCELLED behavior

When the approval request resolves `cancelled`, ToolRuntime does not dispatch the
tool body.

Pinned ApprovalService races the answerer against the provided signal and discards
a late answer after cancellation wins.

M4-042 does not redefine the repository's normalized cancellation event or final
result semantics; those remain the accepted Adapter cancellation contract and
M4-043 final-result Gate.

## 16. Agent-less ASK

Pinned ToolRuntime cannot route an ASK without an agent and fails closed before
calling ApprovalService.

M4-042 MUST preserve host/agent scope honestly. It MUST NOT synthesize an agent,
session, Subject or approval owner for a host-scoped execution.

No approval audit pair is fabricated for a request that never entered
`ApprovalService.request()`.

## 17. Open-turn and audit-pair boundary

A real ApprovalService request requires an open turn because the durable
`approval/asked` + `approval/decided` pair must be turn-enclosed.

For an actual service request that successfully returns an outcome, exact pinned
source requires:

```text
approval/asked(id, toolName, callId?, reason?)
approval/decided(id, outcome)
```

with one shared service-generated id.

M4-042 real-source conformance SHOULD prove the pair for the ToolRuntime ASK path,
not only for the Adapter's standalone `requestApproval()` port.

M4-042 MUST NOT invent another durable approval event family.

## 18. Audit append failure

If a required ApprovalService audit append fails before its commit point, the
service rejects rather than returning an unlogged decision.

ToolRuntime's pre-dispatch outer catch converts such a thrown failure into a tool
failure and does not dispatch the body.

M4-042 does not specify persistence backend recovery, audit-ledger durability or
redaction. Those belong to later audit Gates.

## 19. Interaction with monotonic guard

The pinned order for a reached ASK is:

```text
final tools/pre-execute ASK
-> native approval resolution
-> monotonic guards
-> dispatch
```

Therefore approval is not a bypass around M4-041.

An `allowed-once` approval permits progress only to the next enforcement stage. A
monotonic guard may still deny. M4-042 MUST include real-source evidence for this
composition.

## 20. No direct `requestApproval()` duplication

The existing Adapter `requestApproval()` port remains valid for independent
runtime callers that explicitly request approval.

However, `registerToolPolicy()` ASK is already consumed natively by Harness
ToolRuntime. The Adapter MUST NOT implement:

```text
ASK
-> adapter.requestApproval()
-> return allow/deny to tools/pre-execute
-> ToolRuntime approval again
```

nor any equivalent double-prompt path.

M4-042 protocol-first review therefore expects the current production binding to
remain unchanged unless real conformance finds a concrete defect.

## 21. Approval events and normalized evidence

The existing Adapter observes Harness `approval/asked` only to correlate the
Harness-generated id/call id, then emits normalized evidence from
`approval/decided`.

M4-042 may prove that native ToolRuntime ASK generates the same existing event
pair and normalized evidence. It MUST NOT define new protocol events or fabricate
an approval id.

M4-043 remains the owner of authoritative final `tools/result` observation;
M4-045 remains the owner of audit redaction requirements.

## 22. No portable Harness reason strings

Pinned ToolRuntime currently renders distinct denial messages for rejected,
cancelled, unavailable, absent-service and agent-less cases.

Those human-readable strings are Harness compatibility details. M4-042 MUST NOT
promote their exact English wording into portable Capability Broker reason codes.

Conformance may assert stable semantic outcome/body-entry behavior while treating
full text as source evidence only unless an Adapter contract explicitly requires
that text.

## 23. No full PEP composition in this Gate

M4-042 does not define:

```text
classifier requirement aggregation
provider/execution-root resolution
full policy evaluation
Lease candidate selection or consumption
Decision/Receipt construction
GuaranteeLevel assignment
final result ownership
redaction or audit-ledger persistence
```

It only proves the Adapter's ASK projection reaches the one native approval path
at the supported Harness baseline.

## 24. DeepSeek Harness authority boundary

Pinned Harness source is authoritative only for the supported Adapter binding:
waterfall behavior, ToolRuntime ask routing, approval request shape, service
outcomes, audit events, ordering and body-entry behavior.

It MUST NOT define portable policy precedence, approval business policy,
CapabilityDecision shape, Subject semantics, Lease semantics or audit-retention
policy.

## 25. Conformance corpus

Portable/source-conformance corpus:

```text
fixtures/dsh-approval-routing/cases.json
```

Profile:

```text
M4-042_DSH_NATIVE_APPROVAL_ROUTING_V1
```

The corpus covers at least:

- exact feature/baseline requirement;
- ALLOW does not originate approval;
- DENY does not originate approval;
- ASK reason omitted/present projection;
- one reached ASK -> one native ApprovalService request;
- exact agent/tool/call/reason/signal projection;
- allowed-once permits progress;
- rejected denies and body does not enter;
- unavailable/no-answer denies and body does not enter;
- answerer throw/malformed return -> unavailable deny;
- cancellation denies/body does not enter;
- approval service absent -> fail closed without fabricated audit;
- agent-less ASK -> fail closed without fabricated approval owner;
- one asked/decided durable pair with shared Harness-generated id;
- `never` policy rejects without answerer dispatch;
- allowed-once still reaches monotonic guards;
- monotonic guard denial after approval prevents body entry;
- no second Adapter `requestApproval()` call for ToolRuntime ASK;
- pre-execute waterfall can prevent/replace a downstream ASK, so no false
  guarantee that every intermediate ASK reaches approval;
- no actionRef/callRef identity fabrication;
- no full-PDP, final-result, audit-redaction or system-wide enforcement overclaim.

Real source-conformance against the exact pinned rc5 commit MUST exercise the
native ToolRuntime and ApprovalService, not only mocks or the standalone Adapter
approval port.

## 26. Implementation expectation

The existing production `registerToolPolicy()` already maps safe-runtime ASK to
Harness `{ kind: "ask", reason? }`, and pinned ToolRuntime already owns the
native approval call.

Therefore M4-042 MUST begin as a proof-of-existing-binding Gate.

Production code may change only if exact-source conformance demonstrates a real
non-conformance. Passing this Gate by adding a second approval call is forbidden.

## 27. Explicit non-goals

M4-042 does not:

- create a second approval service;
- call approval from the M4-041 monotonic guard;
- invent approval caching or `ALLOWED_ALWAYS`;
- map protocol actionRef to Harness callId without explicit correlation evidence;
- define final ToolRuntime result authority (M4-043);
- complete the repository-wide no-duplicate-approval audit (M4-044);
- define raw-secret audit redaction (M4-045);
- claim every host effect traverses ToolRuntime;
- merge PR #3.

## 28. Acceptance condition

M4-042 is accepted only after:

1. this protocol-first profile/corpus is exact-head dual-green;
2. source-conformance proves the native ToolRuntime ASK -> ApprovalService route
   against the exact pinned rc5 source;
3. the test proves one reached ASK creates no duplicate Adapter approval call;
4. allowed-once/rejected/cancelled/unavailable and absent-service behavior is
   fail-closed and body-entry-correct;
5. approval audit correlation is proven on the native ASK path;
6. the pre-execute reorderability limitation is retained without overclaim;
7. any implementation change is justified by a concrete failing conformance case;
8. the accepted implementation/audit/governance exact heads each pass normal CI
   and exact pinned Harness source-conformance before M4-043 is authorized.
