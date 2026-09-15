# M4-040 — DeepSeek Harness `tools/pre-execute` Registration Contract

Status: **DRAFT NORMATIVE SPECIFICATION**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-040 P0 — register tools/pre-execute`  
Conformance profile: `M4-040_DSH_PRE_EXECUTE_REGISTRATION_V1`  
Pinned Harness compatibility baseline: `0.1.0-rc.5` / `47f943859bef60e4160492346772ded9b24f765a`  
Depends on: Spec 0003 DeepSeek Harness Adapter Contract and accepted M4 classifier/PDP/Lease primitives  
Separated from: M4-041 monotonic hard guard, M4-042 approval routing, M4-043 authoritative result observation, M4-044 approval-subsystem uniqueness, M4-045 audit redaction

## 1. Purpose

M4-040 defines the exact registration and handoff contract by which safe-runtime
participates in DeepSeek Harness's pre-dispatch tool-policy waterfall.

This Gate intentionally does **not** define complete Capability Broker PEP
composition. It proves that one safe-runtime pre-execute policy listener can be
registered through the existing runtime-independent Adapter seam, receives the
accepted tool-call facts, delegates/denies/asks deterministically, fails closed on
handler failure, and can be disposed without importing Harness concrete types into
core packages.

The distinction matters because accepted M4 classifiers can emit multiple
capability/resource requirements and some operands remain intentionally unresolved
(e.g. `EXECUTION_ROOT`). M4-040 MUST NOT invent requirement aggregation, provider
resolution, Lease selection/consumption, or end-to-end authorization semantics
merely to make registration look complete.

## 2. Existing authority reused unchanged

M4-040 reuses the accepted M2 runtime-independent Adapter port:

```text
HarnessRuntimeAdapter.registerToolPolicy(handler)
```

with request facts:

```text
callRef
rootCallRef
toolName
arguments
scope = agent(sessionRef, agentRef) | host
```

and decision vocabulary:

```text
ALLOW
DENY(reason)
ASK(reason?)
```

M4-040 MUST NOT create a second `tools/pre-execute` abstraction in
`policy-engine` or `capability-broker` and MUST NOT make either core package depend
on `@dsh-safe/adapter-dsh` or `@deepseek-ai/*`.

The existing concrete Adapter binding remains the only place that knows the pinned
Harness event payload.

## 3. Pinned Harness source facts

At the pinned baseline, exact upstream source establishes:

1. `tools/pre-execute` is an async Cordis waterfall;
2. its default terminal continuation is `{ kind: 'allow' }`;
3. `PreToolDecision` is exactly `allow | deny(reason) | ask(reason?)`;
4. parsed tool arguments are materialized before policy and are deep-frozen;
5. argument rewrite is not part of `tools/pre-execute`;
6. an `ask` is resolved by Harness through its optional approval service;
7. only `allowed-once` proceeds after ask; missing/non-grant approval denies;
8. monotonic `ctx.tools.guard()` checks run **after** the pre-execute waterfall;
9. around-dispatch wrappers may change only signal, not call identity/arguments;
10. `tools/result` occurs later and is outside M4-040.

These are Adapter compatibility facts, not portable SRP semantics.

## 4. Registration surface

A conforming M4-040 integration MUST register safe-runtime policy through the
Adapter's existing `registerToolPolicy()` port.

It MUST NOT bypass that port by importing Harness `Context` into core packages or
registering an additional direct Harness listener from `capability-broker`.

A registration returns a disposable ownership handle. Disposing the registration
MUST remove that exact safe-runtime policy listener from future tool calls.

M4-040 does not define process-wide singleton policy. A host may intentionally have
multiple policy listeners; their ordering and waterfall behavior remain Harness
composition facts. A safe-runtime deployment claiming a stronger invariant must use
the later M4-041 hard-guard contract.

## 5. Exact request projection

For a pinned Harness `ToolExecution`, the Adapter projection MUST preserve:

```text
callRef     = exact String(exec.callId)
rootCallRef = exact String(exec.rootCallId)
toolName    = exact exec.name
arguments   = exact already-materialized exec.arguments reference
```

Scope projection is:

```text
exec.agent present
  -> { kind: "agent", sessionRef: String(agent.session.id), agentRef: String(agent.id) }

exec.agent absent
  -> { kind: "host" }
```

M4-040 MUST NOT infer Subject lineage, tenant, role, parent Subject, turnRef,
Resource, capability, provider identity, cwd, Lease, approval, or guarantee level
from these fields.

## 6. `ALLOW` means delegation, not final authorization

The safe-runtime Adapter mapping for:

```text
{ kind: "ALLOW" }
```

MUST call the waterfall `next()` continuation.

Therefore M4-040 `ALLOW` means only:

> this safe-runtime pre-execute listener does not block at this point.

It MUST NOT be described as a final CapabilityDecision allow, final tool dispatch
permission, or proof that no later listener can deny/ask.

A downstream listener may still deny or ask.

## 7. `DENY` mapping

The safe-runtime Adapter mapping for:

```text
{ kind: "DENY", reason }
```

MUST return the Harness pre-tool decision:

```text
{ kind: "deny", reason }
```

without calling `next()`.

The reason is trusted internal safe-runtime text supplied by the registered handler;
M4-040 does not define user/model-controlled free-text propagation.

For agent-scoped calls the existing Adapter may retain process-local correlation
needed to classify the later final tool result as policy-denied. M4-043 remains the
Gate that governs authoritative `tools/result` observation/composition.

## 8. `ASK` mapping

The safe-runtime Adapter mapping for:

```text
{ kind: "ASK" }
{ kind: "ASK", reason }
```

MUST return respectively:

```text
{ kind: "ask" }
{ kind: "ask", reason }
```

without calling `next()`.

M4-040 does not directly call `ctx.approval` and does not define approval-result
mapping. The pinned Harness currently resolves the returned `ask`; M4-042 is the
separate Gate that reconciles safe-runtime's approval authority and prevents
integration from depending on accidental duplicate routing.

## 9. Handler failure is fail closed

If the registered runtime-independent policy handler throws or rejects, the Adapter
MUST convert that failure into a stable deny rather than:

- allowing by exception fallthrough;
- calling `next()`;
- exposing exception text or stack traces;
- retrying automatically.

The accepted M2 Adapter stable fallback reason is:

```text
safe-runtime policy evaluation failed closed
```

M4-040 reuses that behavior unchanged.

## 10. Waterfall reorderability is an explicit limitation

`tools/pre-execute` is a reorderable waterfall.

A safe-runtime listener can be prevented from running if an earlier listener
short-circuits the waterfall with its own decision. Conversely, safe-runtime
`ALLOW` delegates and a later listener may still deny/ask.

Accordingly M4-040 **alone MUST NOT claim `tool-enforced`** solely from installing
this listener.

Until M4-041's monotonic hard-deny invariant is accepted and composed, the
safe-runtime policy registration is an interception/control seam whose strongest
portable guarantee is bounded by deployment composition; when no independently
proven hard PEP exists, it MUST be reported as `advisory` or fail closed according
to Core §12.

M4-040 MUST NOT fake hard enforcement by assuming listener registration order.

## 11. No argument rewrite / action mutation

The pinned baseline exposes no argument rewriting at `tools/pre-execute` and the
Adapter feature matrix records:

```text
toolsArgumentRewrite = false
```

M4-040 therefore consumes already-materialized tool name/arguments as observation
facts only.

It MUST NOT add an argument-rewrite API, mutate the arguments object, normalize tool
arguments in place, or silently replace a tool call after policy evaluation.

Core §8.3's “rewrite after decision -> re-evaluate or reject” remains an invariant;
M4-040 does not implement a rewrite path that would trigger it.

## 12. No complete classifier/PDP aggregation in this Gate

M4-040 MUST NOT define how multiple classifier requirements combine into one final
Tool decision.

Examples already accepted elsewhere include filesystem calls that can require more
than one capability (e.g. stat+read or create+write). Some requirements also retain
unresolved operands such as execution root.

The following remain outside M4-040:

```text
classifier selection/aggregation across requirement sets
provider resolution of unresolved operands
CapabilityRequest ID generation
full Subject resolution
policy snapshot selection
multi-requirement effect combination
Lease candidate validity/selection/consumption
GuaranteeLevel final assignment
Decision/Receipt persistence
```

Any later composition MUST reuse the accepted M4 primitives and define deterministic
failure/effect precedence before implementation.

## 13. Feature detection

A deployment claiming M4-040 compatibility MUST require:

```text
toolsPreExecute = true
```

from the Adapter feature matrix.

If the feature is unavailable, registration MUST fail explicitly. It MUST NOT report
success while silently installing no policy listener.

M4-040 does not require `toolsMonotonicGuard`; that belongs to M4-041.

## 14. Scope boundary

Agent-scoped and host-scoped executions are both representable by the existing
Adapter port.

M4-040 MUST preserve the scope fact and MUST NOT silently convert host execution into
an agent Subject or vice versa.

Whether a production safe-runtime policy chooses to deny all host-scoped calls is a
later PEP composition decision, not a registration semantic defined here.

## 15. Disposal and lifecycle

The registration handle owns exactly the installed safe-runtime listener.

After disposal, later tool executions MUST NOT call that handler.

M4-040 does not define:

- automatic re-registration;
- hot-reload ordering between multiple listeners;
- process supervision;
- plugin crash restart;
- global singleton ownership.

Those are deployment/plugin-lifecycle concerns unless separately specified.

## 16. No approval duplication

M4-040 only returns `ASK` through the existing policy listener mapping.

It MUST NOT both return Harness `ask` **and** call the Adapter `requestApproval()`
port for the same tool execution. Doing both would create duplicate approval
attempts.

M4-044 remains the dedicated no-duplicate-approval Gate; this section only forbids
M4-040 from introducing the duplication early.

## 17. No audit/result overreach

M4-040 does not observe or persist the authoritative final result.

It MUST NOT claim successful execution from:

```text
tool/call
pre-execute ALLOW
approval request
listener registration
```

M4-043 later owns authoritative `tools/result` observation. M4-045 later owns audit
redaction rules.

## 18. DeepSeek Harness authority boundary

Pinned Harness source is used only to prove the Adapter integration seam.

It MUST NOT define portable:

- Capability names;
- Resource semantics;
- policy precedence;
- Lease semantics;
- GuaranteeLevel semantics;
- Subject lineage;
- audit record shape.

Those remain safe-runtime protocol authority.

## 19. Conformance corpus

Portable/source-conformance corpus:

```text
fixtures/dsh-pre-execute-registration/cases.json
```

Profile:

```text
M4-040_DSH_PRE_EXECUTE_REGISTRATION_V1
```

The corpus covers at least:

- exact agent request projection;
- exact host request projection;
- nested/root callRef preservation;
- exact opaque tool name/arguments preservation;
- ALLOW delegates to downstream listener;
- downstream DENY after safe-runtime ALLOW;
- downstream ASK after safe-runtime ALLOW;
- safe-runtime DENY short-circuits downstream;
- safe-runtime ASK short-circuits downstream;
- ASK reason omission/preservation;
- handler throw/rejection -> stable fail-closed deny;
- no exception text leakage;
- registration disposal;
- unsupported `toolsPreExecute` -> explicit unsupported result in the integration layer;
- no argument rewrite;
- earlier waterfall short-circuit can bypass the safe-runtime listener;
- M4-040 therefore does not claim hard `tool-enforced`;
- no direct approval call from M4-040;
- no final-result observation claim;
- no classifier/PDP requirement aggregation claim.

Source-conformance tests against pinned rc5 MUST prove the concrete Harness event and
`PreToolDecision` mappings rather than replacing them with a fake-only assumption.

## 20. Implementation expectation

The repository already contains the M2 production Adapter binding for
`registerToolPolicy()`.

Therefore M4-040 production work MUST begin by testing that existing implementation
against this specification. If the existing code already conforms, the Gate SHOULD
close with conformance/hardening evidence and **no gratuitous production rewrite**.

A production change is justified only for a concrete Spec 0044 non-conformance or
missing lifecycle/feature-detection boundary.

## 21. Explicit non-goals

M4-040 does not:

- implement M4-041 `ctx.tools.guard()` hard invariant;
- claim listener order as a security boundary;
- implement M4-042 approval routing;
- observe M4-043 authoritative final results;
- implement M4-044 approval-subsystem uniqueness beyond avoiding new duplication;
- implement M4-045 audit redaction;
- aggregate multi-capability classifier requirements;
- resolve filesystem execution-root/provider operands;
- select or consume Leases;
- construct complete CapabilityDecision/Receipt records;
- create a new DSH plugin package;
- modify public protocol schemas/types;
- update the pinned Harness baseline;
- authorize M4-041+ or M4-050+;
- authorize PR #3 merge.

## 22. Protocol-first Gate boundary

The M4-040 protocol-first delta MUST be limited to exactly:

```text
specs/0044-m4-dsh-pre-execute-registration.md
fixtures/dsh-pre-execute-registration/cases.json
docs/handoff/CURRENT.md
```

Not authorized in this protocol-first commit:

```text
production TypeScript
adapter-dsh package dependencies
package.json changes
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

Production/conformance work may begin only after the exact protocol-first head
reaches normal repository CI + exact pinned Harness rc5 source-conformance
dual-green with PR #3 still Open/Draft/mergeable and no review/thread blocker.
