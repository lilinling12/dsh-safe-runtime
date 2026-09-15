# M4-023 — Deterministic Approval Routing

Status: **DRAFT NORMATIVE SPECIFICATION**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-023 P0 — approval routing`  
Depends on: M1 Capability model, M2 Approval Port, M3 deterministic approval semantics/TCK, M4-021 policy evaluation, M4-022 CapabilityLease candidate lookup

## 1. Purpose

M4-023 defines the portable approval-routing boundary that resolves an already
computed M4-021 policy effect through an external approval authority when, and
only when, that effect is `ask`.

This Gate deliberately does **not** construct the final protocol
`CapabilityDecision`, persist a receipt, assign a guarantee level, issue or
consume a Lease, or enforce an action. It answers the narrower question:

> Given an accepted policy-evaluation fact, the preceding Lease-lookup fact, and
> stable correlation for the original requested action, is approval required;
> if so, what exact normalized approval outcome was returned and what temporary
> routed effect follows from that outcome?

The output is an **approval-routing fact**, not a durable authorization object.

The roadmap keeps the following responsibilities separate:

- M4-021 — policy evaluation;
- M4-022 — existing Lease candidate lookup;
- M4-023 — approval routing;
- M4-024 — final decision / receipt construction and durable correlation;
- M4-025 — guarantee assignment;
- M4-030 — TTL validity;
- M4-031 — usage validity;
- M4-032 — atomic Lease consume;
- M4-033 — revoke;
- M4-034 — parent-child attenuation;
- M4-040+ — PEP integration and execution-time enforcement.

M4-023 MUST NOT collapse those later Gates into an early authorization object.

## 2. Existing authority and reconciliation

### 2.1 Core approval semantics

Core §10 already requires the following behavior:

1. an `ask` policy outcome routes to the current Runtime Adapter approval
   authority;
2. approval is correlated to the original action;
3. only explicit one-shot approval opens the request;
4. rejection, cancellation, unavailability, timeout and approval failure fail
   closed;
5. approval does not silently expand the requested Resource or constraints;
6. end-to-end approval authorization must have authoritative provenance.

The existing normalized outcome mapping is:

```text
ALLOWED_ONCE -> allow
REJECTED     -> deny
CANCELLED    -> deny
UNAVAILABLE  -> deny
```

There is no portable `ALLOWED_ALWAYS` outcome in v0.1.

### 2.2 M4-021 policy-evaluation fact

M4-021 returns either:

```text
EVALUATED { effect: allow | deny | ask, ... }
```

or a fail-closed result carrying its stable reason.

M4-023 does not re-run policy matching, ordering, effect resolution, default deny
or explanation. It consumes the accepted M4-021 fact and preserves an upstream
fail-closed reason rather than translating it into approval.

In particular:

```text
M4-021 FAIL_CLOSED -> no approval request
M4-021 allow       -> no approval request
M4-021 deny        -> no approval request
M4-021 ask         -> M4-023 approval path
```

### 2.3 M4-022 Lease lookup is not an approval bypass

M4-022 returns `CANDIDATES_FOUND`, `NO_CANDIDATE`, or `FAIL_CLOSED`.

A `CANDIDATES_FOUND` result proves only exact Subject/capability/Resource
candidate identity. It does **not** prove TTL, remaining uses, revocation,
attenuation or atomic consumability. Those semantics remain M4-030 through
M4-034.

Therefore the M4-023 v0.1 routing profile MUST NOT skip approval merely because
M4-022 returned one or more candidates.

For an M4-021 `ask` result:

```text
Lease lookup FAIL_CLOSED     -> fail closed, no approval call
Lease lookup NO_CANDIDATE    -> call approval
Lease lookup CANDIDATES_FOUND -> call approval
```

Candidate refs MUST NOT be forwarded to the approval authority by M4-023 and
MUST NOT change approval outcome precedence.

A later normative Gate may introduce a fully validated/atomically consumable
Lease path before approval. M4-023 does not anticipate that result by treating a
lookup candidate as usable authority today.

### 2.4 M2/M3 approval boundary

The accepted Adapter approval seam normalizes exactly four outcomes:

```text
ALLOWED_ONCE
REJECTED
CANCELLED
UNAVAILABLE
```

M3 fake approval and Adapter TCK evidence preserve the same four-value domain.
`UNAVAILABLE` is a normal explicit fail-closed approval outcome and remains
distinct from an approval-service exception. `CANCELLED` remains a distinct
source fact even though its routed effect is deny.

The deterministic M3 fake is test infrastructure only. It does not become a
production authorization subsystem.

### 2.5 DeepSeek Harness remains compatibility evidence only

Pinned DeepSeek Harness `0.1.0-rc.5` at
`47f943859bef60e4160492346772ded9b24f765a` proves that:

- `allowed-once`, `rejected`, `cancelled`, and `unavailable` are the relevant
  approval outcomes for the accepted Adapter seam;
- an absent approval service maps to `UNAVAILABLE` without fabricating approval
  audit events;
- a real no-answer path may produce `UNAVAILABLE` with a durable correlated
  approval event pair;
- Harness itself generates the durable approval identity used by normalized
  `approval.decided` evidence.

Harness API names, `CallId`, `SessionId`, tool names, approval IDs and service
implementation types are not portable M4-023 protocol authority.

## 3. Portable logical input

The logical routing input is:

```text
ApprovalRoutingInput {
  policyEvaluation: PolicyEvaluationResult
  leaseLookup: LeaseLookupResult
  approvalRequest: ApprovalRoutingRequest
}

ApprovalRoutingRequest {
  requestRef: ref
  actionRef: ref
  reason?: string <= 4096 code points
}
```

The normal portable domain assumes `policyEvaluation` is the accepted result of
M4-021 and `leaseLookup` is the accepted result of M4-022.

`approvalRequest.requestRef` binds to the original
`CapabilityRequest.requestId`. `approvalRequest.actionRef` binds to the original
`CapabilityRequest.actionRef`.

M4-023 deliberately does not accept the complete CapabilityRequest merely to
send approval. Capability, Resource, constraints, requested-Lease parameters,
Subject details, rule IDs and Lease refs are not part of the portable approval
request surface.

### 3.1 Ref semantics

`requestRef` and `actionRef` reuse the existing `defs.ref` domain:

```text
string
1..512 Unicode code points
```

They are opaque stable refs. M4-023 MUST NOT trim, case-fold, Unicode-normalize,
parse, prefix-match, concatenate, or otherwise rewrite them.

A schema-valid ref containing leading/trailing whitespace remains an opaque ref;
M4-023 does not silently tighten the existing protocol grammar. Any future
lexical restriction belongs to a protocol/schema change, not this routing Gate.

### 3.2 Reason semantics

`reason` reuses the existing CapabilityRequest reason surface: an optional
string with maximum length 4096 code points and no minimum length.

M4-023 MUST preserve an explicitly supplied reason exactly. It MUST NOT derive a
reason by serializing:

- raw tool arguments;
- capability constraints;
- Resource objects or provider identities;
- policy source text;
- rule bodies or rule IDs;
- Lease records or Lease refs;
- secrets or environment values;
- host exception text.

An omitted reason remains omitted and an explicit empty string remains an empty
string.

## 4. Portable approval invocation port

M4-023 depends on a runtime-independent invocation abstraction with this logical
shape:

```text
ApprovalInvocationPort.request(
  ApprovalRoutingRequest
) -> ALLOWED_ONCE | REJECTED | CANCELLED | UNAVAILABLE
```

A host-language implementation may return asynchronously.

The port may fail by throwing/rejecting or may return a malformed value when a
host caller bypasses static typing. M4-023 MUST convert either condition to a
sanitized fail-closed routing failure; host exception messages/stacks MUST NOT
be copied into portable output.

The portable port does not contain Harness `Agent`, `SessionId`, `CallId`, tool
metadata, `AbortSignal`, UI state or concrete Adapter types.

The TypeScript capability-broker implementation MUST NOT import concrete
`@dsh-safe/adapter-dsh` types. A composition/PEP layer may structurally adapt the
portable routing request to the active Runtime Adapter, provided it binds to the
same original action and does not change M4-023 semantics.

## 5. Correlation and identity boundary

Approval MUST correlate to the original CapabilityRequest through both stable
refs supplied by the caller:

```text
requestRef == original CapabilityRequest.requestId
actionRef  == original CapabilityRequest.actionRef
```

M4-023 MUST NOT assume or assert:

```text
actionRef == DeepSeek Harness callRef
actionRef == CallId(actionRef)
requestRef == approvalRef
requestRef == callRef
```

No such identity equivalence exists in the portable protocol today.

An Adapter/PEP integration that needs a Harness `callRef`, session or tool name
must receive that mapping from the runtime action context and prove correlation
there. It MUST NOT synthesize runtime identity from string resemblance inside
M4-023.

## 6. Deterministic routing table

The normative routing table is:

| Policy fact | Lease fact | Approval outcome | Routed effect | Approval call |
|---|---|---|---|---|
| `FAIL_CLOSED` | not inspected | not called | `deny` / fail closed | no |
| `allow` | not inspected | not called | `allow` | no |
| `deny` | not inspected | not called | `deny` | no |
| `ask` | `FAIL_CLOSED` | not called | `deny` / fail closed | no |
| `ask` | `NO_CANDIDATE` | `ALLOWED_ONCE` | `allow` | exactly once |
| `ask` | `CANDIDATES_FOUND` | `ALLOWED_ONCE` | `allow` | exactly once |
| `ask` | lookup success | `REJECTED` | `deny` | exactly once |
| `ask` | lookup success | `CANCELLED` | `deny` | exactly once |
| `ask` | lookup success | `UNAVAILABLE` | `deny` | exactly once |
| `ask` | lookup success | service error/malformed value | `deny` / fail closed | exactly once attempted |

There is no first-candidate, latest-candidate, authorization-kind, remaining-use,
parent-depth or provider-based shortcut around approval.

## 7. Policy pass-through behavior

### 7.1 Policy allow

An accepted M4-021 `EVALUATED allow` yields:

```text
{
  status: "ROUTED",
  effect: "allow",
  routeSource: "POLICY",
  reasonCode: "APPROVAL_NOT_REQUIRED_POLICY_ALLOW"
}
```

M4-023 MUST NOT inspect the Lease result, materialize the approval request, or
invoke the approval port on this path.

This is still not a persisted CapabilityDecision or PEP execution grant.

### 7.2 Policy deny

An accepted M4-021 `EVALUATED deny` yields:

```text
{
  status: "ROUTED",
  effect: "deny",
  routeSource: "POLICY",
  reasonCode: "APPROVAL_NOT_REQUIRED_POLICY_DENY"
}
```

The approval authority MUST NOT be used to override an explicit/default policy
deny. This prevents a human approval path from silently becoming a privilege
escalation mechanism above policy precedence.

### 7.3 Policy fail closed

An M4-021 fail-closed reason is preserved:

```text
{
  status: "FAIL_CLOSED",
  effect: "deny",
  stage: "POLICY",
  reasonCode: <M4-021 reasonCode>
}
```

M4-023 does not convert upstream evaluation failure to `ask` and does not call
approval as a recovery fallback.

## 8. Ask path and Lease-result handling

Only an accepted M4-021 `EVALUATED ask` enters this section.

M4-023 then inspects the M4-022 result discriminant.

### 8.1 Lease lookup failure

An M4-022 fail-closed reason is preserved:

```text
{
  status: "FAIL_CLOSED",
  effect: "deny",
  stage: "LEASE_LOOKUP",
  reasonCode: <M4-022 reasonCode>
}
```

No approval request is sent because the preceding Lease lookup boundary is not
trustworthy enough to continue orchestration.

### 8.2 Successful Lease lookup

Both `NO_CANDIDATE` and `CANDIDATES_FOUND` proceed to approval under M4-023.

M4-023 MUST NOT read candidate Lease records, choose a candidate, inspect
candidate authorization, inspect lifecycle fields, or forward
`candidateLeaseRefs` to approval.

This is deliberate: candidate discovery is not Lease validity.

## 9. Approval outcome mapping

### 9.1 ALLOWED_ONCE

```text
{
  status: "ROUTED",
  effect: "allow",
  routeSource: "APPROVAL",
  approvalOutcome: "ALLOWED_ONCE",
  reasonCode: "APPROVAL_ALLOWED_ONCE"
}
```

`ALLOWED_ONCE` is scoped to the exact original routed action. M4-023 MUST NOT
reinterpret it as reusable, remembered, session-wide, policy-wide, capability-
wide, Resource-wide or permanent approval.

M4-023 does not issue a Lease from `ALLOWED_ONCE`.

### 9.2 REJECTED

```text
{
  status: "ROUTED",
  effect: "deny",
  routeSource: "APPROVAL",
  approvalOutcome: "REJECTED",
  reasonCode: "APPROVAL_REJECTED"
}
```

### 9.3 CANCELLED

```text
{
  status: "ROUTED",
  effect: "deny",
  routeSource: "APPROVAL",
  approvalOutcome: "CANCELLED",
  reasonCode: "APPROVAL_CANCELLED"
}
```

Cancellation remains distinguishable from rejection even though both route to
deny.

### 9.4 UNAVAILABLE

```text
{
  status: "ROUTED",
  effect: "deny",
  routeSource: "APPROVAL",
  approvalOutcome: "UNAVAILABLE",
  reasonCode: "APPROVAL_UNAVAILABLE"
}
```

`UNAVAILABLE` MUST NOT become implicit allow. It is an explicit normalized
fail-closed approval result, distinct from a service exception.

## 10. Approval service failure

If the invocation port throws/rejects:

```text
{
  status: "FAIL_CLOSED",
  effect: "deny",
  stage: "APPROVAL_SERVICE",
  reasonCode: "APPROVAL_ROUTING_SERVICE_ERROR"
}
```

If it resolves to any value outside the exact four-value domain:

```text
{
  status: "FAIL_CLOSED",
  effect: "deny",
  stage: "APPROVAL_SERVICE",
  reasonCode: "APPROVAL_ROUTING_OUTCOME_INVALID"
}
```

There is no compatibility alias for values such as `allowed`, `approved`,
`ALLOWED_ALWAYS`, booleans, truthy values or numeric status codes.

M4-023 starts no host timeout of its own. Runtime-specific timeout/cancellation
mechanics belong to the invocation provider; their accepted portable outcome
must still enter through the four-value domain or the service-failure path.

## 11. Approval provenance boundary

Core requires approval-backed authorization to have authoritative provenance.
M4-023 preserves that requirement without fabricating identity.

The accepted M2 synchronous `requestApproval()` seam returns only the normalized
four-value outcome. In the pinned Harness integration, the durable
`approvalRef` is generated by Harness and appears later in normalized
`approval.decided` evidence; it is not returned by the synchronous call.

Therefore M4-023 MUST NOT invent:

```text
approvalRef
AuthorizationRef { kind: "approval", ref: <fabricated> }
CapabilityDecision.decisionId
receiptRef
```

An `ALLOWED_ONCE` M4-023 result is a transient routing fact proving only the
normalized approval outcome for the original correlated action. M4-024 and the
runtime correlation/evidence path must bind authoritative approval identity
before constructing durable decision/receipt provenance where required.

No execution occurs in M4-023, so this temporary separation does not authorize a
PEP to bypass the end-to-end provenance requirement.

## 12. No request expansion

Approval is not permission to rewrite the action into a stronger request.

M4-023 MUST NOT modify or broaden:

```text
Subject
session context
capability
Resource
provider identity
constraints / arguments
requested Lease bounds
actionRef
requestRef
```

If any policy-relevant action fact is rewritten after M4-021, Core §8.3 and Spec
0032 require rejection or re-evaluation before execution. An approval result
cannot repair a stale policy evaluation.

## 13. Result contract

### 13.1 Routed result

```text
ApprovalRoutingResult {
  status: "ROUTED"
  effect: "allow" | "deny"
  routeSource: "POLICY" | "APPROVAL"
  reasonCode:
    | "APPROVAL_NOT_REQUIRED_POLICY_ALLOW"
    | "APPROVAL_NOT_REQUIRED_POLICY_DENY"
    | "APPROVAL_ALLOWED_ONCE"
    | "APPROVAL_REJECTED"
    | "APPROVAL_CANCELLED"
    | "APPROVAL_UNAVAILABLE"
  approvalOutcome?:
    | "ALLOWED_ONCE"
    | "REJECTED"
    | "CANCELLED"
    | "UNAVAILABLE"
}
```

`approvalOutcome` MUST be present exactly when `routeSource == APPROVAL` and MUST
be absent for policy pass-through.

### 13.2 Fail-closed result

```text
ApprovalRoutingFailure {
  status: "FAIL_CLOSED"
  effect: "deny"
  stage:
    | "INPUT"
    | "POLICY"
    | "LEASE_LOOKUP"
    | "APPROVAL_REQUEST"
    | "APPROVAL_SERVICE"
  reasonCode: <stable portable reason>
}
```

M4-023-owned failure reasons are:

```text
APPROVAL_ROUTING_INPUT_INVALID
APPROVAL_ROUTING_POLICY_RESULT_INVALID
APPROVAL_ROUTING_LEASE_LOOKUP_RESULT_INVALID
APPROVAL_ROUTING_REQUEST_INVALID
APPROVAL_ROUTING_SERVICE_ERROR
APPROVAL_ROUTING_OUTCOME_INVALID
```

When an accepted M4-021 or M4-022 result is itself `FAIL_CLOSED`, its stable
reasonCode is preserved with M4-023 stage `POLICY` or `LEASE_LOOKUP`
respectively.

Failure output MUST NOT contain attacker-controlled refs, reason text, resource
values, Lease refs, policy/rule IDs, exception messages, stacks, tool arguments
or secrets.

## 14. Deterministic inspection and side-effect order

Implementations MUST preserve this observable order:

```text
1. outer routing-input container/key domain
2. policyEvaluation discriminant/effect
3. if policy FAIL_CLOSED: preserve fail-closed reason and stop
4. if policy allow/deny: return policy route and stop
5. only for policy ask: inspect leaseLookup discriminant
6. if Lease lookup FAIL_CLOSED: preserve fail-closed reason and stop
7. require Lease lookup status NO_CANDIDATE or CANDIDATES_FOUND
8. materialize/validate approvalRequest requestRef, actionRef, optional reason
9. invoke approval port exactly once
10. normalize exact approval outcome or service failure
11. return detached immutable routing fact
```

This ordering is security relevant.

A policy allow/deny/failure path MUST NOT execute getters or provider callbacks
reachable only through Lease or approval-request fields. A Lease failure on the
ask path MUST NOT execute approval-request getters or call approval.

## 15. Runtime defensive boundary

Portable JSON fixtures do not model JavaScript accessors, Proxies, inherited
properties or hostile Promise behavior. A TypeScript reference implementation
MUST still fail closed at that boundary.

Security-relevant fields that M4-023 actually consumes MUST be read as own data
properties. Getters MUST NOT execute for:

```text
policyEvaluation.status
policyEvaluation.effect
policy failure stage/reasonCode when needed
leaseLookup.status
lease failure stage/reasonCode when needed
approvalRequest.requestRef
approvalRequest.actionRef
approvalRequest.reason when present
```

Unexpected own fields in the narrow public input/request projection, symbol
fields, unreadable descriptors and revoked Proxies MUST fail closed according to
the relevant stage.

Irrelevant later-stage values MUST not be traversed merely to reject an action
that already has an authoritative earlier result. In particular:

- policy allow/deny/failure does not inspect Lease or approval request bodies;
- Lease failure does not inspect approval request bodies;
- candidate Lease refs are not traversed for approval authorization;
- policy rule-id arrays are not traversed or forwarded by M4-023.

An invocation port that throws synchronously, rejects asynchronously, or returns
a thenable/host value outside the accepted invocation contract MUST never escape
as an implicit allow.

Successful and fail-closed outputs MUST be detached from caller-owned mutable
objects and SHOULD be recursively frozen where the host language supports that
without changing portable semantics.

## 16. Privacy and least disclosure

M4-023 forwards only the minimum portable approval request:

```text
requestRef
actionRef
reason? (caller supplied)
```

It MUST NOT automatically forward:

- Subject object/session/parent details;
- capability or Resource;
- constraints/raw arguments;
- candidate Lease refs or Lease contents;
- policy IDs/rule IDs/source;
- provider tokens;
- secrets/environment;
- host error details.

A provider-specific UI may need additional presentation context, but such
enrichment belongs outside this portable primitive and MUST NOT redefine the
authorization outcome.

## 17. Lease and lifecycle non-goals

M4-023 MUST NOT:

- treat an M4-022 candidate as active/valid;
- read host time;
- validate `issuedAt`/`expiresAt`;
- validate/decrement `remainingUses`;
- atomically consume a Lease;
- infer revocation;
- follow `parentLeaseRef`;
- prove attenuation;
- issue a Lease from `ALLOWED_ONCE`;
- remember approval for later requests.

M4-030 through M4-034 remain authoritative for Lease lifecycle and delegation.

## 18. Decision, receipt, guarantee and PEP non-goals

M4-023 produces no protocol `CapabilityDecision` because that object requires
stable decision identity, guarantee and decision-time/provenance fields owned by
later work.

M4-023 also MUST NOT:

- construct or persist `CapabilityReceipt`;
- synthesize `matchedRuleRefs`;
- assign `advisory`, `tool-enforced`, `provider-enforced` or
  `process-isolated` guarantee;
- register `tools/pre-execute`;
- call `ctx.tools.guard()`;
- execute a tool, filesystem mutation or subprocess;
- claim action argument immutability is already enforced at the PEP.

Those remain M4-024, M4-025 and M4-040+ responsibilities.

## 19. Portable fixture requirements

Before production M4-023 implementation is authorized, a language-independent
fixture corpus MUST cover at least:

### Policy short-circuiting

1. policy allow -> policy-routed allow, no Lease inspection requirement, no
   approval call;
2. policy deny -> policy-routed deny, no approval call;
3. policy fail closed -> preserved failure, no approval call;
4. malformed policy result -> fail closed, no approval call.

### Ask / Lease boundary

5. ask + Lease lookup fail closed -> preserved failure, no approval call;
6. ask + no candidate -> approval called;
7. ask + candidates found -> approval still called;
8. candidate refs are not forwarded to approval;
9. policy rule IDs are not forwarded to approval;
10. malformed Lease-result discriminant on ask -> fail closed.

### Approval outcomes

11. `ALLOWED_ONCE` -> allow;
12. `REJECTED` -> deny;
13. `CANCELLED` -> deny with distinct outcome;
14. `UNAVAILABLE` -> deny with distinct outcome;
15. unsupported `ALLOWED_ALWAYS`-like value -> fail closed;
16. approval provider error -> fail closed;
17. approval called exactly once.

### Correlation / request boundary

18. exact requestRef/actionRef/reason forwarding;
19. omitted reason remains omitted;
20. empty reason remains empty;
21. refs/reason are not trimmed or rewritten;
22. invalid requestRef -> fail closed before provider call;
23. invalid actionRef -> fail closed before provider call;
24. non-string reason -> fail closed before provider call;
25. unexpected approval-request fields -> fail closed.

Portable fixtures MUST NOT depend on JavaScript accessors, Proxies, AbortSignal,
Promise rejection objects, Harness types, UI behavior or host time. Hostile
runtime cases belong to the TypeScript implementation suite after the
protocol-first head is dual-green.

## 20. Reference implementation placement

The reference routing primitive SHOULD live under
`packages/capability-broker`, adjacent to M4-022 Lease lookup.

It MAY depend on public M4-021 result types from `@dsh-safe/policy-engine` and
M4-022 package-local/public result types, but MUST NOT import concrete
`@dsh-safe/adapter-dsh` or `@deepseek-ai/*` types.

The production implementation SHOULD expose a minimal runtime-independent
`ApprovalInvocationPort` owned by capability-broker. A later composition layer
may adapt the existing M2 Adapter port structurally.

The implementation MUST keep validation and side-effect boundaries explicit,
use stable reason-code unions, preserve strict TypeScript and avoid generic
`any`, type assertions that bypass runtime validation, hidden host time,
implicit retries, or catch-and-allow behavior.

## 21. Security invariants

A conforming implementation MUST satisfy all of the following:

1. **Only ask invokes approval.** Allow/deny/failure cannot trigger approval.
2. **Policy deny cannot be overridden by human approval.**
3. **Lease candidate is not authority.** Candidate presence never skips approval
   at M4-023.
4. **Only ALLOWED_ONCE grants the routed allow fact.**
5. **Reject/cancel/unavailable deny explicitly.**
6. **Provider error/malformed outcome fails closed.**
7. **No reusable approval.** No ALLOWED_ALWAYS or remembered approval.
8. **Exact original-action correlation.** requestRef/actionRef are preserved.
9. **No actionRef↔callRef guessing.** Adapter identity is not synthesized.
10. **No approvalRef fabrication.** Durable provenance identity remains
    authoritative runtime evidence.
11. **No request expansion.** Approval cannot broaden capability/Resource/
    constraints.
12. **No Lease issuance/lifecycle/consume.**
13. **No final Decision/Receipt/Guarantee.**
14. **No PEP execution.**
15. **No secret/error leakage.** Failures are stable and sanitized.
16. **No irrelevant hostile-value traversal.** Earlier authoritative outcomes
    stop later side effects.

## 22. Protocol-first acceptance gate

M4-023 production implementation is NOT AUTHORIZED until one exact repository
head contains only the protocol-first transition for this Gate:

```text
specs/0034-m4-approval-routing.md
fixtures/approval-routing/cases.json
docs/handoff/CURRENT.md
```

relative to the M4-022 final-governance head
`2c22f385b3e68d6c208f30d8527e2fce5abbc016`.

That exact head MUST reach both:

1. normal CI PASS;
2. exact pinned Harness rc5 source-conformance PASS.

The protocol-first delta MUST NOT contain:

- M4-023 production TypeScript implementation;
- protocol/schema/TCK weakening;
- Adapter implementation changes;
- dependency or lockfile changes;
- Harness baseline changes;
- M4-024+ decision/receipt/guarantee work;
- M4-030+ Lease lifecycle work;
- M4-040+ PEP work;
- M6 work.

Only after exact-head dual-green may M4-023 production implementation begin.
M4-024+, M4-030+, M4-040+ and M6 remain unauthorized by this specification.
