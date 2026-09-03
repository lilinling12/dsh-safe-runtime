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
- M4-040: **GOVERNANCE CLOSED**
- M4-041: **GOVERNANCE CLOSED**
- M4-042 native approval routing: **IMPLEMENTATION / CONFORMANCE ACCEPTED**
- M4-042 acceptance audit: **EXACT-HEAD VERIFIED**
- M4-042 final governance: **CANDIDATE / EXACT-HEAD VERIFICATION REQUIRED**
- M4-043+: **NOT AUTHORIZED until the containing governance head is dual-green**
- M4-050+, M5, M6, M10, M13, M15: **NOT AUTHORIZED by the current Gate**
- PR #3 merge: **NOT AUTHORIZED without explicit user authorization**

Live GitHub state overrides this snapshot.

## M4-042 protocol-first closure

Normative authority:

```text
specs/0046-m4-dsh-native-approval-routing.md
profile: M4-042_DSH_NATIVE_APPROVAL_ROUTING_V1
```

Portable/source-conformance corpus:

```text
fixtures/dsh-approval-routing/cases.json
32 cases: DAPR-001 through DAPR-032
```

Protocol-first exact head:

```text
3f4a3b8fe2e22ec287d0be9295406d2bc18be34b
```

Its parent is M4-041 final governance head
`bd4c6719356d2133c42d0e58c9843807ffcedaeb`.

Protocol-first exact-head evidence:

- CI #589 / run `33781086991`: PASS;
- exact pinned Harness rc5 source-conformance #531 / run `33781086966`: PASS;
- Harness step 10: PASS;
- Harness step 11: PASS.

Only after that head became dual-green did M4-042 conformance implementation
begin.

## Accepted architecture

M4-042 reuses the existing M2/M4-040 Adapter binding:

```text
registerToolPolicy(handler)
```

Safe-runtime ASK remains only a projection into Harness pre-execute:

```text
ASK          -> { kind: "ask" }
ASK(reason)  -> { kind: "ask", reason }
```

Pinned rc5 ToolRuntime owns the native approval call:

```text
final tools/pre-execute ASK
-> ToolRuntime.serviceAsk()
-> ctx.approval.request(...)
-> approval outcome
-> monotonic guards
-> dispatch only if still permitted
```

The separate Adapter `requestApproval()` port remains available for independent
explicit callers but is not called again from `registerToolPolicy()` for the same
ToolRuntime ASK.

Therefore M4-042 is accepted as a **proof-of-existing-binding** Gate; no production
Adapter rewrite was required.

## Accepted native routing semantics

Real pinned rc5 conformance proves:

```text
ALLOW -> no approval originated by the safe-runtime listener
DENY  -> no approval; body does not enter
ASK   -> one reached native ApprovalService request
```

For a reached agent-backed ASK, Harness uses the execution's exact:

```text
agent
toolName = exec.name
callId   = exec.callId
reason?  = ASK reason when present
signal   = exec.signal
```

Approval outcomes remain:

```text
allowed-once -> may proceed to monotonic guards
rejected     -> deny before dispatch
cancelled    -> no dispatch
unavailable  -> deny before dispatch
```

`allowed-once` does not bypass M4-041. Real conformance proves a subsequent
monotonic guard denial still prevents body entry.

## Approval-service and audit evidence

Real conformance also proves:

- service absent -> fail closed with no fabricated approval audit pair;
- service present/no answerer -> one asked/decided pair with `unavailable`;
- throwing/rejected/malformed answerer -> contained to `unavailable`;
- policy `never` -> rejected before answerer dispatch;
- agent-less ASK -> fail closed without synthesized agent/session/Subject;
- open-turn precondition failure -> no answerer and no body dispatch;
- one actual ApprovalService request produces one correlated
  `approval/asked` / `approval/decided` pair using Harness-generated identity;
- existing Adapter normalized `approval.decided` evidence correlates to that
  Harness-generated approval id and call id.

Portable `actionRef` is not inferred to equal Harness `callId` or Adapter
`callRef`.

## Reorderable-waterfall limitation

M4-042 preserves the M4-040 limitation that `tools/pre-execute` is a reorderable
waterfall.

Therefore the accepted claim is only:

```text
when ASK is the final decision delivered to ToolRuntime,
Harness owns one native approval resolution path
```

It is not claimed that every intermediate ASK ever returned by safe-runtime must
reach approval. Real conformance proves both an earlier terminating listener and
an outer listener that replaces a downstream ASK before ToolRuntime sees it.

## Final reviewed conformance evidence

Final reviewed conformance exact head:

```text
72f88c3c4720a3a4a1deff88d07086047a996b31
```

Its exact delta from protocol-first head contains only:

```text
packages/adapter-dsh/source-conformance/m4-042-native-approval-routing.conformance.ts
packages/adapter-dsh/source-conformance/m4-042-corpus-coverage.conformance.ts
```

No production code changed.

Exact-head evidence:

- CI #590 / run `33782296648`: PASS;
- exact pinned Harness rc5 source-conformance #532 / run `33782296682`: PASS;
- Harness step 10 exact rc5 binding/source-conformance typecheck: PASS;
- Harness step 11 real rc5 runtime conformance: PASS.

## Acceptance audit evidence

Acceptance audit:

```text
docs/acceptance/m4-042-acceptance-audit.md
```

Audit-only exact head:

```text
baba4c82e1c5105af3e7d477941289bdee17254b
```

Exact-head evidence:

- CI #591 / run `33783637088`: PASS;
- exact pinned Harness rc5 source-conformance #533 / run `33783637242`: PASS;
- Harness step 10: PASS;
- Harness step 11: PASS;
- PR #3 remained Open, Draft and mergeable;
- reviews: none;
- review threads: none.

## Security / ownership boundaries

M4-042 does not:

```text
create a second approval subsystem
let approval override policy DENY
cache/remember allowed-once
infer actionRef == callRef
fabricate approval identity
own authoritative tools/result composition
complete the M4-044 repository-wide duplicate-approval audit
implement M4-045 audit redaction
aggregate full classifier/PDP requirements
resolve provider/execution-root operands
select/consume Leases
construct complete Decision/Receipt state
assign final GuaranteeLevel
claim every host effect traverses ToolRuntime
claim complete system-wide tool-enforced coverage
```

M4-043 separately owns authoritative `tools/result` observation. M4-044 owns the
repository-wide duplicate approval-subsystem audit. M4-045 owns raw-secret audit
redaction.

## Final governance candidate boundary

This final-governance transition is authorized to change only:

```text
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md
docs/roadmap.md
```

HISTORY must be append-only. Roadmap must mark only M4-042 accepted; M4-043 stays
unchecked.

The transition must not change production TypeScript, Spec 0046, the DAPR corpus,
source-conformance tests, public protocol/schema, Shared TCK, dependencies,
`pnpm-lock.yaml`, Harness baseline/workflow or later-Gate implementation.

## Resume instruction

1. refresh PR #3 live state and require the final-governance candidate to be based
   directly on audit head `baba4c82e1c5105af3e7d477941289bdee17254b`;
2. verify candidate diff contains exactly CURRENT, append-only HISTORY and the
   single M4-042 roadmap marker/details;
3. require HISTORY deletions = 0 and roadmap only M4-042 changed;
4. require exact-head normal CI + exact pinned Harness rc5 source-conformance
   green, including Harness steps 10 and 11;
5. only after that exact governance head is dual-green declare M4-042 governance
   CLOSED and authorize M4-043 P0 as the sole next protocol-first Gate;
6. M4-043 must begin by reconciling existing Adapter `tools/result` observation,
   M3-013 final-result mapping and exact pinned ToolRuntime finalization/order;
7. do not pull M4-044 approval-subsystem uniqueness or M4-045 redaction forward;
8. keep M4-050+, M5, M6, M10, M13, M15 and PR #3 merge unauthorized.
