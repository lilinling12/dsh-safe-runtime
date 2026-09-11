# M4-041 — DeepSeek Harness Monotonic Tool Guard Contract

Status: **DRAFT NORMATIVE SPECIFICATION**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-041 P0 — use ctx.tools.guard() for hard invariant where required`  
Conformance profile: `M4-041_DSH_MONOTONIC_TOOL_GUARD_V1`  
Pinned Harness compatibility baseline: `0.1.0-rc.5` / `47f943859bef60e4160492346772ded9b24f765a`  
Depends on: Spec 0003 DeepSeek Harness Adapter Contract and accepted M4-040 pre-execute registration contract  
Separated from: M4-042 approval routing, M4-043 authoritative result observation, M4-044 approval-subsystem uniqueness, M4-045 audit redaction

## 1. Purpose

M4-041 defines the narrow hard-deny registration contract by which safe-runtime
uses DeepSeek Harness's monotonic `ctx.tools.guard()` seam when a tool-dispatch
invariant must not be reopened by reorderable `tools/pre-execute` listeners.

This Gate does **not** define the complete Capability Broker PEP composition. It
proves only that an already-determined runtime-independent hard-invariant decision
can be projected through the existing Adapter guard port to a synchronous,
pre-dispatch, monotonic Harness denial boundary.

M4-041 MUST NOT make DeepSeek Harness the authority for portable Capability,
Resource, Subject, Lease, approval, policy-precedence, Receipt or GuaranteeLevel
semantics.

## 2. Existing authority reused unchanged

Spec 0003 already permits a monotonic hard-deny installation through
`ctx.tools.guard()` when policy must not be reopened by later reorderable
listeners.

The accepted runtime-independent Adapter surface is:

```text
HarnessRuntimeAdapter.registerMonotonicToolGuard?(handler)

ToolGuardDecision =
  ALLOW
  | DENY(reason)

ToolGuardHandler = synchronous ToolPolicyRequest -> ToolGuardDecision
```

The request shape is the same accepted M2/M4-040 shape:

```text
callRef
rootCallRef
toolName
arguments
scope = agent(sessionRef, agentRef) | host
```

M4-041 MUST reuse this port. It MUST NOT create a second direct Harness guard
binding from `capability-broker`, `policy-engine` or protocol packages.

## 3. Pinned Harness source facts

At the pinned rc5 baseline, exact official source/documentation establishes:

1. tool execution order is `tools/pre-execute` -> monotonic registered guards ->
   `tools/execute` -> `tools/post-execute` -> finalization -> `tools/result`;
2. `ctx.tools.guard(guard)` is synchronous;
3. `ToolGuard` returns `string | undefined`;
4. a returned string is a monotonic denial reason;
5. `undefined` abstains and leaves the call unchanged at that guard;
6. a later/prepended `tools/pre-execute` listener cannot reopen a guard denial;
7. guard execution receives the already-materialized/frozen `ToolExecution`;
8. a plain-context guard applies globally;
9. an `agent.ctx` guard applies only to that agent's calls;
10. guard registration returns the exact disposer and is disposed with its calling
    fiber;
11. multiple guards compose monotonically: an abstaining guard does not erase a
    denial produced by another guard;
12. duplicate registrations are independently disposable.

Pinned upstream also exposes live-registration iteration details. Those mutation
quirks are compatibility facts, not portable M4-041 semantics; safe-runtime MUST
NOT require registering, replacing or disposing guards from inside a guard handler
for correctness.

## 4. Hard-invariant boundary

M4-041 is only for non-reopenable **deny invariants**.

A caller may supply an already-determined hard-invariant handler whose output is:

```text
ALLOW
DENY(reason)
```

`ALLOW` at this port means only:

> this hard-invariant guard has no veto for this call.

It is better described as **abstain** at the Harness guard seam. It MUST NOT be
reported as a final CapabilityDecision allow, approval, Lease grant or proof that
the complete action is authorized.

`DENY(reason)` means:

> this hard invariant vetoes dispatch and later reorderable pre-execute listeners
> cannot turn that veto back into permission.

M4-041 MUST NOT use the guard to encode `ASK`. Approval is not a monotonic hard
deny decision and remains M4-042/M4-044 territory.

## 5. Exact request projection

M4-041 MUST reuse the exact M4-040 request projection without widening it:

```text
callRef     = String(exec.callId)
rootCallRef = String(exec.rootCallId)
toolName    = exec.name
arguments   = exact already-materialized exec.arguments reference
```

Scope remains:

```text
exec.agent present
  -> { kind: "agent", sessionRef: String(agent.session.id), agentRef: String(agent.id) }

exec.agent absent
  -> { kind: "host" }
```

M4-041 MUST NOT infer Subject lineage, tenant, role, turnRef, capability,
canonical Resource, provider identity, cwd, Lease, approval, Receipt or
GuaranteeLevel from these Adapter facts.

## 6. `ALLOW` mapping

A conforming Adapter maps the validated safe-runtime decision:

```text
{ kind: "ALLOW" }
```

to Harness guard abstention:

```text
undefined
```

It MUST NOT return an allow token, call a pre-execute waterfall continuation,
invoke approval or bypass another registered guard.

Another guard may still deny the same call.

## 7. `DENY` mapping

A conforming Adapter maps:

```text
{ kind: "DENY", reason: <string> }
```

to the exact Harness guard reason string.

The Adapter MUST NOT call a waterfall continuation. The guard executes before tool
dispatch, so a conforming real-source test for a guard denial MUST prove the tool
body is not entered.

For agent-scoped calls the existing Adapter may retain process-local correlation
needed to classify a later authoritative result as policy denied. M4-043 remains
the owner of final `tools/result` observation/composition and M4-041 MUST NOT
claim execution success or durable audit completion from the guard decision.

## 8. Handler failure and malformed runtime output are fail closed

`ToolGuardHandler` is statically typed, but the Adapter is a security boundary and
MUST remain safe when JavaScript callers bypass static typing.

If the handler throws, or if its runtime return cannot be safely materialized as
one of the two accepted decisions, the Adapter MUST deny with the stable existing
fallback reason:

```text
safe-runtime monotonic guard failed closed
```

At minimum, fail-closed runtime validation MUST cover:

```text
non-object/null return
Promise/thenable return
missing kind
unknown kind
accessor-backed/unreadable kind
revoked/unreadable Proxy decision
DENY with missing or non-string reason
accessor-backed/unreadable DENY reason
```

Validation MUST NOT execute decision getters or caller-controlled coercion hooks.
A malformed decision MUST NOT silently become Harness `undefined`, because that
would convert a hard-invariant evaluation failure into abstention.

For a valid `DENY`, the reason string is preserved exactly; M4-041 defines no
trimming, normalization or free-text rewriting.

## 9. Synchronous-only contract

The monotonic guard port is synchronous by design.

M4-041 MUST NOT await policy backends, approval providers, Lease stores, network
calls or other asynchronous work from inside the Harness guard callback.

A Promise/thenable returned through a type escape is invalid runtime output and
fails closed as defined above. M4-041 MUST NOT treat it as a deferred decision.

Asynchronous policy/approval composition belongs outside this guard registration
primitive and must resolve before a hard-invariant fact can be represented here.

## 10. Ordering relative to M4-040

The pinned ordering is:

```text
tools/pre-execute waterfall
-> monotonic guards
-> dispatch
```

Therefore:

- a pre-execute `ALLOW` cannot bypass a later guard `DENY`;
- a prepended/later-registered pre-execute listener cannot reopen a guard `DENY`;
- M4-040's reorderable waterfall and M4-041's monotonic guard are deliberately
  different control surfaces;
- M4-041 MUST NOT move hard-deny authority back into listener ordering.

An earlier pre-execute decision may terminate the call before the guard stage. That
is not a bypass of a guard denial: the call does not dispatch. M4-041 does not
require its handler to observe calls already terminated by a stricter earlier
boundary.

## 11. Multiple guards

Multiple Harness guards may exist.

A safe-runtime `ALLOW`/abstain MUST NOT erase another guard's denial. A denial from
any reached guard remains terminal for dispatch according to the pinned monotonic
contract.

M4-041 does not define cross-plugin priority, reason-merging or a portable
first/last-wins vocabulary. It MUST NOT use registration order as policy
precedence.

## 12. Scope boundary

M4-041 preserves Harness scope behavior only as Adapter compatibility evidence:

```text
plain Context registration -> global guard
agent.ctx registration      -> that agent scope
```

The `ToolPolicyRequest.scope` projection remains the portable Adapter fact. Harness
scope identity MUST NOT be promoted into safe-runtime Subject authority without the
accepted Subject-resolution/composition contracts.

A host-scoped request MUST NOT be silently synthesized into an agent Subject.

## 13. Feature detection

A deployment using M4-041 MUST require:

```text
toolsMonotonicGuard = true
```

and the Adapter method:

```text
registerMonotonicToolGuard
```

must actually be present.

Missing feature or missing registration method MUST fail explicitly as unsupported.
It MUST NOT silently fall back to M4-040 `tools/pre-execute` and then claim the
same hard-enforcement property.

## 14. Disposal and ownership

Registration returns an exact disposable ownership handle.

After that registration is disposed, later calls MUST NOT invoke that handler.
Independent duplicate registrations remain independently owned; disposing one MUST
NOT implicitly remove another.

M4-041 does not depend on mutating guard registration from inside a running guard.
Such live-iteration behavior remains a pinned Harness implementation fact only.

## 15. Guarantee boundary

M4-041 can provide evidence for a **tool-dispatch hard-deny invariant** only when:

1. the pinned/supported Adapter feature is present;
2. the guard is actually installed for the relevant execution scope;
3. the call enters the Harness ToolRuntime pipeline and reaches the guard stage;
4. the hard-invariant handler returns a validated `DENY` or fails closed;
5. real-source conformance proves the tool body is not entered after that denial.

This evidence means the denial cannot be reopened by reorderable pre-execute
listeners at this seam.

It does **not** by itself prove complete Capability Broker `tool-enforced` coverage.
In particular M4-041 does not prove that every host effect traverses ToolRuntime,
does not cover direct Node filesystem access, does not cover subprocess effects
outside the governed seam, and does not solve later M4-050 negative boundaries.

Any GuaranteeLevel assignment must continue to use the accepted M4-025 evidence
rules and MUST describe only the action/boundary actually enforced.

## 16. No approval duplication

M4-041 contains no `ASK` decision and MUST NOT call `requestApproval()`.

It MUST NOT duplicate M4-040's ask mapping or preempt M4-042/M4-044 approval
composition. A hard guard is a deny-only safety backstop, not an approval router.

## 17. No complete PEP composition in this Gate

M4-041 MUST NOT invent or duplicate:

```text
classifier requirement aggregation
execution-root/provider resolution
Subject resolution beyond the accepted request facts
policy snapshot selection/evaluation
Lease candidate selection/TTL/usage/revoke/attenuation composition
Lease consumption timing
approval routing
Decision/Receipt identity or persistence
final GuaranteeLevel assignment
final tools/result ownership
audit redaction/persistence
```

Existing accepted primitives remain authoritative for their individual domains. A
later composition Gate must define how those facts produce the hard-invariant
handler input.

## 18. DeepSeek Harness authority boundary

Pinned Harness source is evidence for ordering, registration, scope, disposal and
the concrete string-or-undefined guard seam only.

It MUST NOT define portable Capability names, Resource semantics, Subject lineage,
policy precedence, Lease semantics, approval semantics, Receipt shape or audit
semantics.

## 19. Conformance corpus

Portable/source-conformance corpus:

```text
fixtures/dsh-monotonic-tool-guard/cases.json
```

Profile:

```text
M4-041_DSH_MONOTONIC_TOOL_GUARD_V1
```

The corpus covers at least:

- explicit feature requirement;
- exact host and agent request projection;
- nested/root call identity preservation;
- exact frozen argument reference preservation;
- ALLOW -> Harness abstention;
- DENY -> exact reason;
- handler throw -> stable fail-closed denial;
- malformed/async decision -> stable fail-closed denial;
- accessor/Proxy hostile decision -> stable fail-closed denial without getter use;
- pre-execute ALLOW cannot reopen guard DENY;
- prepended pre-execute ALLOW cannot bypass guard DENY;
- guard DENY prevents tool body entry;
- multiple guards remain monotonic;
- scoped guard isolation;
- independent duplicate disposal;
- complete disposal;
- no ASK / no approval call;
- no full-PDP or final-result claim;
- no full-system `tool-enforced` overclaim.

Real source-conformance against the exact pinned rc5 commit MUST prove the concrete
ordering and body-non-entry behavior rather than replacing it with a fake-only
assumption.

## 20. Implementation expectation

The repository already contains the M2 production
`registerMonotonicToolGuard()` binding.

M4-041 production work MUST begin by testing that implementation against this
specification.

A production change is justified only for a concrete non-conformance. In
particular, runtime-shape hardening is expected if conformance demonstrates that a
malformed JavaScript handler result can currently escape or silently become guard
abstention.

The implementation MUST NOT weaken the conformance corpus to preserve existing
code.

## 21. Explicit non-goals

M4-041 does not:

- replace M4-040 `tools/pre-execute` ALLOW/DENY/ASK registration;
- route approval;
- expose ASK through a hard guard;
- define complete Capability Broker PEP aggregation;
- decide which policy/Lease facts constitute a hard invariant;
- select or consume Leases;
- observe final result as this Gate's authority;
- implement audit redaction;
- claim direct Node fs/process/network effects are governed;
- change public protocol schemas/types;
- update the pinned Harness baseline;
- authorize M4-042+ or M4-050+;
- authorize M5, M6, M10, M13 or M15;
- authorize PR #3 merge.

## 22. Protocol-first Gate boundary

The M4-041 protocol-first delta MUST be limited to exactly:

```text
specs/0045-m4-dsh-monotonic-tool-guard.md
fixtures/dsh-monotonic-tool-guard/cases.json
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
roadmap M4-041 acceptance marker
Harness baseline/workflow changes
M4-042+
M4-050+
M5
M6
M10
M13
M15
PR #3 merge
```

Production/conformance work may begin only after the exact M4-041 protocol-first
head reaches normal repository CI + exact pinned Harness rc5 source-conformance
dual-green with PR #3 still Open/Draft/mergeable and no review/thread blocker.
