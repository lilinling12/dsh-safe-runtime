# M4-042 Acceptance Audit — DeepSeek Harness Native Approval Routing

Status: **IMPLEMENTATION / CONFORMANCE ACCEPTED — AUDIT EXACT-HEAD VERIFICATION PENDING**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-042 P0 — route ask to ctx.approval`

## 1. Gate authority

Normative specification:

```text
specs/0046-m4-dsh-native-approval-routing.md
```

Portable/source-conformance corpus:

```text
fixtures/dsh-approval-routing/cases.json
```

Conformance profile:

```text
M4-042_DSH_NATIVE_APPROVAL_ROUTING_V1
```

Pinned DeepSeek Harness compatibility baseline:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
```

M4-042 is intentionally an Adapter/source-conformance Gate. It proves that an
already-determined safe-runtime `ASK` reaches the single native Harness approval
path when that ASK is the final `tools/pre-execute` decision. It does not redefine
portable approval policy or construct a complete Capability Broker PEP.

## 2. Predecessor governance

M4-041 final governance exact head:

```text
bd4c6719356d2133c42d0e58c9843807ffcedaeb
```

Exact-head evidence:

```text
CI #588: PASS
Harness #530: PASS
Harness step 10: PASS
Harness step 11: PASS
```

M4-042 protocol-first work began only after that governance head became dual-green.

## 3. Protocol-first accepted head

M4-042 protocol-first exact head:

```text
3f4a3b8fe2e22ec287d0be9295406d2bc18be34b
```

Its exact delta from M4-041 governance changed only:

```text
specs/0046-m4-dsh-native-approval-routing.md
fixtures/dsh-approval-routing/cases.json
docs/handoff/CURRENT.md
```

No production TypeScript, package dependency, package manifest, frozen lockfile,
Harness workflow, public protocol/schema, HISTORY, roadmap M4-042 marker, M4-043+,
M4-050+, M5, M6, M10, M13 or M15 change entered the protocol-first commit.

Protocol-first exact-head evidence:

```text
CI #589 / run 33781086991: PASS
Harness #531 / run 33781086966: PASS
Harness step 10: PASS
Harness step 11: PASS
```

Production/conformance work was authorized only after this exact head became
dual-green.

## 4. Existing portable approval authority reused

M4-042 does not create new portable approval semantics.

Accepted M4-023 remains authority for the portable routing rule:

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

Only `ALLOWED_ONCE` is a grant. No `ALLOWED_ALWAYS`, remembered approval or
implicit truthy approval was introduced by M4-042.

## 5. Existing Adapter surfaces remain distinct

The existing Adapter already exposes:

```text
registerToolPolicy(handler)
requestApproval(request)
```

These remain intentionally distinct.

`registerToolPolicy()` maps safe-runtime `ASK` to Harness pre-execute `ask`.
`requestApproval()` remains a standalone port for callers that explicitly invoke
approval.

M4-042 does **not** make `registerToolPolicy()` call `requestApproval()` for the
same tool ASK.

## 6. Exact pinned native approval chain

Pinned rc5 ToolRuntime source proves the native chain is:

```text
safe-runtime ToolPolicyHandler
-> ASK(reason?)
-> Adapter tools/pre-execute projection
-> final Harness PreToolDecision ask
-> ToolRuntime.serviceAsk()
-> ctx.approval.request(...)
-> approval outcome
-> monotonic guards
-> dispatch when still permitted
```

This source fact is the key M4-042 architecture boundary. The Adapter must project
ASK into the Harness decision vocabulary and then allow ToolRuntime to own the
approval call.

Creating an additional safe-runtime approval orchestration step would duplicate
the approval path and is explicitly rejected by Spec 0046.

## 7. Production-code review result

The existing production binding in:

```text
packages/adapter-dsh/src/binding.ts
```

already conforms to the M4-042 projection:

```text
ASK without reason -> { kind: "ask" }
ASK with reason    -> { kind: "ask", reason }
```

The binding does not call `requestApproval()` inside `registerToolPolicy()`.

Accordingly M4-042 is accepted as a **proof-of-existing-binding** Gate. No
production rewrite is justified.

## 8. Exact implementation / conformance delta

Comparing protocol-first head:

```text
3f4a3b8fe2e22ec287d0be9295406d2bc18be34b
```

to final reviewed conformance head:

```text
72f88c3c4720a3a4a1deff88d07086047a996b31
```

shows exactly one commit and exactly two added files:

```text
packages/adapter-dsh/source-conformance/m4-042-native-approval-routing.conformance.ts
packages/adapter-dsh/source-conformance/m4-042-corpus-coverage.conformance.ts
```

Diff statistics:

```text
m4-042-native-approval-routing.conformance.ts  +566 / -0
m4-042-corpus-coverage.conformance.ts          +105 / -0
```

There is no production-code delta between protocol-first and final conformance.

In particular M4-042 changes no:

```text
packages/adapter-dsh/src/binding.ts
packages/adapter-dsh/src/ports.ts
packages/adapter-dsh/src/feature-matrix.ts
package manifest or dependency
pnpm-lock.yaml
public protocol/schema
policy-engine
capability-broker production implementation
Shared TCK registration
Harness pin/workflow
M4-043+
M4-050+
M5
M6
M10
M13
M15
```

## 9. ALLOW and DENY do not originate approval

Real pinned rc5 execution proves:

```text
safe-runtime ALLOW -> no approval request originated by this listener
safe-runtime DENY  -> no approval request; body does not enter
```

This preserves M4-023's invariant that approval is not invoked to override policy
deny and preserves M4-040's definition of ALLOW as waterfall delegation rather
than final authorization.

## 10. ASK projection and native request correlation

Real pinned rc5 execution proves one reached safe-runtime ASK is routed through the
native ApprovalService path with the concrete request facts:

```text
agent    = exact exec.agent
toolName = exec.name
callId   = exec.callId
reason   = ASK reason when present
signal   = exec.signal
```

ASK without a reason preserves reason omission. ASK with a reason preserves the
exact reason string.

Safe-runtime does not generate a replacement call id and does not fabricate the
Harness ApprovalRequestId.

Portable `actionRef` is not inferred to equal Harness `callId`/`callRef`.

## 11. Exactly-one native approval request

Real source-conformance proves a single reached ToolRuntime ASK invokes the native
approval request exactly once.

The conformance path observes one `approval/request` answerer dispatch and one
service-owned durable audit pair. There is no second Adapter `requestApproval()`
call for the same ASK.

This exactly-one claim is deliberately scoped to one reached ToolRuntime ASK. It
does not claim unrelated third-party code can never request approval independently;
formal repository-wide duplicate-subsystem audit remains M4-044.

## 12. `ALLOWED_ONCE` behavior

Real pinned runtime evidence proves:

```text
ASK
-> native approval
-> allowed-once
-> progress to later enforcement stages
```

When no later denial exists, the tool body executes through ordinary ToolRuntime
dispatch.

`allowed-once` is not cached, persisted as a Lease, or promoted into an enduring
grant by M4-042.

## 13. Approval does not bypass the M4-041 hard guard

Real pinned rc5 composition proves:

```text
ASK
-> allowed-once
-> monotonic guard DENY
-> body does not enter
```

Therefore native approval is not a bypass around the accepted M4-041 hard-deny
seam.

An approval grant only permits progress to the next enforcement stage.

## 14. REJECTED behavior

Real pinned execution proves `rejected` remains pre-dispatch denial and the tool
body does not enter.

There is no retry, fallback ALLOW or policy-deny override.

## 15. UNAVAILABLE behavior

M4-042 distinguishes three pinned compatibility cases:

### 15.1 Approval service absent

A reached agent-backed ASK fails closed before dispatch. No ApprovalService request
occurs and no `approval/asked` / `approval/decided` pair is fabricated.

### 15.2 Approval service present, no answerer

The real ApprovalService resolves `unavailable`, records one native asked/decided
pair and ToolRuntime prevents body entry.

### 15.3 Answerer failure or malformed return

A throwing/rejected answerer and a non-vocabulary answerer return are contained by
the real ApprovalService to `unavailable`. The body does not enter.

M4-042 does not reinterpret unavailable as permission.

## 16. Cancellation behavior

Real pinned runtime conformance proves approval cancellation remains terminal for
dispatch. A late `allowed-once` answer after cancellation wins does not reopen the
cancelled approval and the tool body does not enter.

M4-042 does not redefine final normalized cancellation semantics; authoritative
final-result composition remains M4-043.

## 17. Agent-less ASK is fail closed

Pinned ToolRuntime cannot route native approval for an agent-less ASK.

Real conformance proves:

```text
agent-less ASK
-> no ApprovalService invocation
-> no fabricated agent/session/Subject
-> body does not enter
```

This preserves the Adapter's existing honest host/agent scope boundary.

## 18. Native approval audit pair

For an actual native ApprovalService request, real source-conformance proves one
service-owned durable pair:

```text
approval/asked
approval/decided
```

with the same Harness-generated ApprovalRequestId.

The asked record contains the concrete ToolRuntime tool name, call id when
present, and ASK reason when present. Safe-runtime does not fabricate approval
identity.

The existing Adapter observation path also emits its already-defined normalized
`approval.decided` evidence correlated to the Harness-generated approval id and
call id.

No new protocol event family was added.

## 19. `never` policy remains service-owned

Real pinned execution proves ApprovalService policy `never` rejects before
answerer dispatch while still recording its service-owned asked/decided pair.

M4-042 does not move deployment/session approval policy into safe-runtime Adapter
logic.

## 20. Open-turn precondition remains fail closed

The real ApprovalService requires an open turn for its durable audit pair.

Real conformance proves a native ASK without that precondition does not dispatch
the tool body and does not run the answerer.

M4-042 does not bypass or weaken the pinned service's durable-audit precondition.

## 21. Audit append failure source boundary

Pinned ApprovalService source defines failure to commit required audit state as a
request failure rather than an unlogged approval grant.

M4-042 records this as pinned-source evidence. It does not fabricate an unsafe test
hook into Harness persistence merely to claim executable coverage where the public
seam does not provide a clean injection boundary.

Durable audit backend recovery/redaction remains later work.

## 22. Reorderable waterfall limitation

M4-040 established that `tools/pre-execute` is reorderable. M4-042 preserves this
limitation explicitly.

Real pinned tests prove:

1. an earlier listener can terminate before the safe-runtime listener runs;
2. an outer waterfall listener can receive a downstream ASK and replace it before
   the final decision reaches ToolRuntime.

Therefore M4-042 does **not** claim:

```text
every intermediate ASK ever produced by safe-runtime necessarily prompts approval
```

The valid claim is narrower:

```text
when ASK is the final decision delivered to ToolRuntime, the pinned native approval
path owns resolution
```

This avoids overstating a reorderable compatibility seam as a security boundary.

## 23. Corpus evidence classification

The 32-case `DAPR-001` through `DAPR-032` corpus is covered by an explicit evidence
registry rather than pretending every architecture non-claim is executable.

Evidence categories remain separated across:

```text
REAL_RC5_RUNTIME
PINNED_RC5_SOURCE
STATIC_ARCHITECTURE
```

The corpus coverage test asserts exact profile/baseline, exact sequential case IDs,
one evidence record per case and visible separation of architectural non-claims.

## 24. Final exact-head evidence

Final reviewed conformance exact head:

```text
72f88c3c4720a3a4a1deff88d07086047a996b31
```

Normal CI:

```text
CI #590
run: 33782296648
PASS
```

Exact pinned Harness source conformance:

```text
Harness #532
run: 33782296682
job: 100738648961
PASS
```

Harness stages all completed successfully:

```text
checkout safe-runtime: PASS
checkout exact pinned Harness: PASS
setup Node: PASS
enable pinned pnpm: PASS
build pinned Harness public type surface: PASS
safe-runtime frozen install: PASS
exact workspace projection: PASS
projection idempotence: PASS
exact rc5 binding/source-conformance typecheck: PASS
real rc5 runtime conformance: PASS
```

No schema, validator, Shared TCK, TypeScript strictness, frozen-lockfile policy,
supply-chain rule, architecture boundary, compatibility baseline, security
boundary or protocol authority boundary was weakened to obtain green automation.

## 25. Pull request state at acceptance

At the final reviewed conformance head, PR #3 remains:

```text
Open
Draft
mergeable: true
head: 72f88c3c4720a3a4a1deff88d07086047a996b31
base: main@57430273e065be8d38807d67b175fa154c801d43
reviews: none
review threads: none
```

The PR description remains stale historical context and is not treated as current
Gate authority.

PR #3 merge remains unauthorized without explicit user authorization.

## 26. Explicit non-claims

M4-042 does not:

- create a second approval service or duplicate approval orchestration;
- call Adapter `requestApproval()` as a second step for ToolRuntime ASK;
- claim every intermediate pre-execute ASK reaches approval;
- let approval override a policy DENY;
- let `allowed-once` bypass monotonic hard guards;
- remember or persist `allowed-once` as a Lease;
- infer portable `actionRef == callRef`;
- fabricate Harness ApprovalRequestId;
- define authoritative final `tools/result` composition (M4-043);
- complete repository-wide approval-subsystem uniqueness audit (M4-044);
- implement audit redaction (M4-045);
- aggregate full classifier/PDP requirements;
- resolve provider/execution-root operands;
- select or consume Leases;
- construct complete Decision/Receipt state;
- assign final GuaranteeLevel;
- claim every host effect traverses ToolRuntime;
- claim complete system-wide `tool-enforced` coverage;
- authorize M4-043+ before governance closure;
- authorize M4-050+, M5, M6, M10, M13 or M15;
- authorize PR #3 merge.

## 27. Acceptance decision

Decision:

```text
M4-041 governance: CLOSED

M4-042 protocol-first: CLOSED
M4-042 existing production ASK projection: CONFORMING / NO REWRITE REQUIRED
M4-042 native approval source-conformance: ACCEPTED
M4-042 final reviewed conformance head: 72f88c3c4720a3a4a1deff88d07086047a996b31
M4-042 acceptance audit: RECORDED / EXACT-HEAD VERIFICATION PENDING

M4-042 final governance: NOT AUTHORIZED YET
M4-043+: NOT AUTHORIZED YET
M4-050+: NOT AUTHORIZED
M5: NOT AUTHORIZED
M6: NOT AUTHORIZED
M10: NOT AUTHORIZED BY THIS GATE
M13: NOT AUTHORIZED
M15: NOT AUTHORIZED
PR #3 merge: NOT AUTHORIZED
```

The next permitted action is exact-head normal CI + exact pinned Harness rc5
source-conformance verification of this audit commit. Only after that audit head
is dual-green may final governance update CURRENT, append-only HISTORY and the
single M4-042 roadmap marker, after which the governance head must itself become
dual-green before M4-043 begins.
