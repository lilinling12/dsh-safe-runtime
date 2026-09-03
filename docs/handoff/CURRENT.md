# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before changes;
> normative specs/schemas/TCK and accepted exact-head evidence remain authority.

## Snapshot

- Recorded at: `2026-09-03`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M4 — Capability Broker v0.1`
- Active PR: `#3 — feat(policy): begin M4 capability broker`
- Branch: `feat/m4-capability-broker`
- Base: `main@57430273e065be8d38807d67b175fa154c801d43`
- Parent governance-closed head: `93d0879c9d7960524aafb0d60906ed37b21c835e` (M4-036)
- M4-001..014: **GOVERNANCE CLOSED**
- M4-020..025: **GOVERNANCE CLOSED**
- M4-030..036: **GOVERNANCE CLOSED**
- M4-040 P0 `tools/pre-execute`: **AUTHORIZED / PROTOCOL-FIRST IN PROGRESS**
- M4-040 production/conformance implementation: **NOT AUTHORIZED before protocol-first exact-head dual-green**
- M4-041+, M4-050+, M5, M6, M10, M13, M15: **NOT AUTHORIZED by the current Gate**
- PR #3 merge: **NOT AUTHORIZED without explicit user authorization**

Live GitHub state overrides this snapshot.

## M4-036 final closure

Final governance exact head:

```text
93d0879c9d7960524aafb0d60906ed37b21c835e
```

Exact-head evidence:

- normal CI #577 / run `33740352276`: PASS;
- exact pinned Harness rc5 source-conformance #519 / run `33740352269`: PASS;
- PR #3 remained Open, Draft and mergeable;
- base remained `main@57430273e065be8d38807d67b175fa154c801d43`;
- reviews: none;
- review threads: none.

Therefore M4-036 governance is CLOSED and M4-040 is the sole newly authorized Gate.

## M4-040 authority recovery

Roadmap Gate:

```text
M4-040 P0 — register tools/pre-execute
```

Existing runtime-independent Adapter authority from Spec 0003 / M2:

```text
HarnessRuntimeAdapter.registerToolPolicy(handler)

ToolPolicyRequest {
  callRef
  rootCallRef
  toolName
  arguments
  scope
}

ToolPolicyDecision = ALLOW | DENY(reason) | ASK(reason?)
```

The current production DSH rc5 Adapter already binds this port to the exact Harness
`tools/pre-execute` event. M4-040 MUST test/reconcile that accepted seam rather than
create a second direct Harness dependency from capability-broker or policy-engine.

## Pinned Harness source facts

Pinned compatibility baseline remains:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
```

Exact pinned source confirms:

- `tools/pre-execute` is an async waterfall;
- default `next()` resolves to `{ kind: "allow" }`;
- `PreToolDecision` is `allow | deny(reason) | ask(reason?)`;
- tool arguments are materialized before policy and are deep-frozen;
- argument rewrite is unavailable at this seam;
- Harness resolves returned `ask` through its optional approval service;
- only `allowed-once` proceeds from ask; non-grant/missing approval denies;
- `ctx.tools.guard()` monotonic hard-deny checks occur after the waterfall;
- `tools/result` occurs later and remains M4-043 territory.

Harness remains Adapter evidence only, not protocol authority.

## Protocol-first authority

Normative draft:

```text
specs/0044-m4-dsh-pre-execute-registration.md
profile: M4-040_DSH_PRE_EXECUTE_REGISTRATION_V1
```

Portable/source-conformance corpus:

```text
fixtures/dsh-pre-execute-registration/cases.json
24 cases: DPER-001 through DPER-024
```

## Critical semantic boundary

M4-040 is a registration/handoff Gate, not complete Capability Broker PEP
composition.

Safe-runtime `ALLOW` at this seam means only:

```text
call waterfall next()
```

It is not a final authorization verdict. A later listener may still deny/ask.

Likewise an earlier waterfall listener may short-circuit before safe-runtime runs.
Therefore installing only the M4-040 listener MUST NOT by itself be reported as
`tool-enforced`.

M4-041 separately owns the pinned Harness monotonic `ctx.tools.guard()` hard-deny
invariant for guarantees that must not be reopened by reorderable listeners.

## Exact request projection

The Adapter preserves:

```text
callRef     = String(exec.callId)
rootCallRef = String(exec.rootCallId)
toolName    = exec.name
arguments   = already-materialized exec.arguments
```

and scope:

```text
agent -> sessionRef + agentRef
host  -> host
```

M4-040 MUST NOT infer Subject lineage, turnRef, capability, Resource, provider
identity, cwd, Lease, approval, or GuaranteeLevel from these request facts.

## Why full PDP composition is deferred

Accepted classifiers may produce multiple capability requirements for one tool call,
for example stat+read or create+write. Some accepted operands deliberately remain
unresolved, including `EXECUTION_ROOT`.

Current M4-021 policy evaluation is a capability/resource evaluation primitive; no
accepted Gate yet defines multi-requirement aggregation/provider-resolution into one
pre-execute decision.

M4-040 therefore MUST NOT invent:

```text
requirement aggregation
execution-root/provider resolution
Lease selection/consume composition
final guarantee assignment
complete Decision/Receipt persistence
```

A later composition Gate must define deterministic precedence/failure semantics
before implementing those operations.

## Decision mapping

Existing Adapter mapping remains:

```text
ALLOW -> next()
DENY(reason) -> Harness { kind: "deny", reason }
ASK -> Harness { kind: "ask" }
ASK(reason) -> Harness { kind: "ask", reason }
handler throw/reject -> deny("safe-runtime policy evaluation failed closed")
```

Handler failure must not call `next()`, leak backend exception text, or retry.

## Approval/result boundaries

M4-040 MUST NOT directly call Adapter `requestApproval()` for the same action after
returning `ASK`; doing both would introduce duplicate approval. M4-042/M4-044 own
approval authority/uniqueness reconciliation.

M4-040 also MUST NOT infer execution success from registration, tool/call, ALLOW, or
ASK. M4-043 remains owner of authoritative final `tools/result` observation.

## Feature/lifecycle boundary

A conforming integration requires:

```text
toolsPreExecute = true
```

Missing support must fail explicitly rather than silently no-op.

Registration returns an exact disposable. After disposal, later calls must not invoke
that registered handler.

M4-040 does not require `toolsMonotonicGuard`; that is M4-041.

## Authorized protocol-first delta

Exactly:

```text
specs/0044-m4-dsh-pre-execute-registration.md
fixtures/dsh-pre-execute-registration/cases.json
docs/handoff/CURRENT.md
```

Not authorized in this protocol-first commit:

```text
production TypeScript
adapter-dsh dependency/package changes
pnpm-lock.yaml
schema/protocol wire changes
Shared TCK registration
HISTORY
roadmap acceptance marker
Harness baseline/workflow changes
M4-041+
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
2. verify parent `93d0879c...` -> M4-040 protocol-first candidate is exactly the
   three authorized files;
3. require exact-head normal CI + pinned Harness rc5 source-conformance green;
4. only after dual-green begin M4-040 production/conformance work;
5. first test the already-existing M2 `registerToolPolicy` binding against Spec 0044;
   do not rewrite production code unless a concrete non-conformance is found;
6. do not claim `tool-enforced` from the reorderable waterfall alone;
7. keep M4-041+, M4-050+, M5, M6, M10, M13, M15 and PR #3 merge unauthorized.
