# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK and accepted exact-head evidence
> remain semantic authority.

## Snapshot

- Recorded at: `2026-08-31`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M4 — Capability Broker v0.1`
- Active pull request: `#3 — feat(policy): begin M4 capability broker`
- Branch: `feat/m4-capability-broker`
- Base: `main@57430273e065be8d38807d67b175fa154c801d43`
- M4-001 through M4-014: **GOVERNANCE CLOSED**
- M4-020 Subject resolution: **GOVERNANCE CLOSED**
- M4-021 policy evaluation: **GOVERNANCE CLOSED**
- M4-022 lease lookup: **GOVERNANCE CLOSED**
- M4-023 approval routing: **AUTHORIZED / PROTOCOL-FIRST IN PROGRESS**
- M4-024+, M4-030+, M4-040+ and M6: **NOT AUTHORIZED**

Live GitHub state overrides this file.

## Live ancestry note

The long-running PR retains known ancestry-only drift relative to `main`. The
reconciled merge-base `65870612d039ce026a6952c16d5e069b11bd24a7` and
`main@57430273e065be8d38807d67b175fa154c801d43` point to the same source tree
`ed0c142bf6bbd00f607cc169222f0bf67057fca5`.

Do not rebase, force-update, squash, or rewrite accepted ancestry merely to
change GitHub compare counters.

## Compatibility baseline

DeepSeek Harness remains Adapter compatibility evidence only:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

Harness behavior MUST NOT define Core approval semantics, action identity,
CapabilityDecision identity/provenance, Lease lifecycle, guarantees, plugin
trust, or PEP behavior.

## M4-022 final closure

M4-022 final-governance exact head:

```text
2c22f385b3e68d6c208f30d8527e2fce5abbc016
```

Exact-head evidence:

- CI #464: PASS;
- Harness rc5 source-conformance #406: PASS.

The final-governance delta from acceptance-record head `778c9ff6...` was exactly:

```text
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md
docs/roadmap.md
```

with HISTORY `+65/-0` and roadmap `+1/-1`. No production code, normative Spec,
Schema, TCK, dependency, lockfile or Harness baseline changed in that governance
transition.

Therefore **M4-022 governance is CLOSED**.

## Current Gate — M4-023 P0 deterministic approval routing

Normative draft:

```text
specs/0034-m4-approval-routing.md
```

Portable corpus:

```text
fixtures/approval-routing/cases.json
```

Portable cases: `25`.

M4-023 is deliberately an **approval-routing fact**, not a durable authorization
object. It consumes the accepted M4-021 policy-evaluation result and, only on an
`ask` effect, the accepted M4-022 Lease-lookup result plus minimal original-action
correlation.

### Policy short-circuit

```text
M4-021 FAIL_CLOSED -> preserve failure; no approval
M4-021 allow       -> routed allow from POLICY; no approval
M4-021 deny        -> routed deny from POLICY; no approval
M4-021 ask         -> enter Lease-result/approval path
```

Human approval cannot override a policy deny. Policy allow/deny/failure paths do
not inspect irrelevant Lease or approval-request values.

### Lease boundary

M4-022 returns candidates, not usable Lease authority. M4-023 therefore does not
skip approval merely because candidates exist:

```text
ask + Lease FAIL_CLOSED      -> preserve failure; no approval
ask + NO_CANDIDATE           -> approval exactly once
ask + CANDIDATES_FOUND       -> approval exactly once
```

Candidate Lease refs are not forwarded to approval and do not participate in
routing precedence. TTL, remaining-use validity, atomic consume, revoke and
attenuation remain M4-030 through M4-034.

### Approval outcome boundary

The portable approval result domain remains exactly the already accepted four
values:

```text
ALLOWED_ONCE -> routed allow
REJECTED     -> routed deny
CANCELLED    -> routed deny with distinct outcome
UNAVAILABLE  -> routed deny with distinct outcome
```

Only `ALLOWED_ONCE` produces an M4-023 routed allow fact. No `ALLOWED_ALWAYS`,
truthy alias, remembered approval or implicit approval is accepted. Provider
throw/rejection or malformed outcome fails closed with a stable sanitized reason.

### Correlation boundary

The portable approval request is intentionally minimal:

```text
ApprovalRoutingRequest {
  requestRef: original CapabilityRequest.requestId
  actionRef:  original CapabilityRequest.actionRef
  reason?:    original caller-supplied reason
}
```

`requestRef` and `actionRef` reuse the existing opaque `defs.ref` domain and are
preserved exactly. M4-023 MUST NOT assume that protocol `actionRef` equals a
DeepSeek Harness `callRef` or `CallId` merely because a string resembles one.
Runtime call/session/tool correlation belongs to the Adapter/PEP composition
layer and must be supplied from authoritative runtime context.

### Provenance boundary

The accepted M2 synchronous approval port returns only the normalized decision.
Pinned Harness generates its durable `approvalRef` separately in approval event
evidence. M4-023 therefore MUST NOT fabricate:

```text
approvalRef
AuthorizationRef(kind=approval)
CapabilityDecision.decisionId
receiptRef
```

Authoritative approval provenance must be correlated later before durable
Decision/Receipt construction. M4-023 itself performs no execution.

### Architecture boundary

The eventual reference implementation belongs under `packages/capability-broker`
and should define a minimal runtime-independent `ApprovalInvocationPort`.
Capability Broker MUST NOT import concrete `@dsh-safe/adapter-dsh` or
`@deepseek-ai/*` types. A later composition layer may structurally adapt this
port to the active Runtime Adapter without redefining portable semantics.

### Privacy / least disclosure

M4-023 does not automatically forward Subject/session data, capability, Resource,
constraints/raw arguments, policy/rule IDs, candidate Lease refs, provider
identity/tokens, secrets or host exception text. Only requestRef, actionRef and an
explicit caller-supplied reason are in the portable approval request.

## Explicit non-goals

M4-023 does not:

- create/persist protocol `CapabilityDecision` — M4-024;
- create/persist `CapabilityReceipt` — M4-024 and later provenance work;
- assign guarantee level — M4-025;
- validate Lease TTL — M4-030;
- validate/decrement maxUses/remainingUses — M4-031;
- atomically consume a Lease — M4-032;
- revoke a Lease — M4-033;
- prove parent-child attenuation — M4-034;
- register/enforce a PEP — M4-040+;
- implement M6.

An M4-023 `ROUTED allow` remains an intermediate fact and is not permission to
execute outside later final-decision/provenance/PEP requirements.

## Protocol-first Gate condition

**Production M4-023 implementation has NOT STARTED and is NOT AUTHORIZED yet.**

Before production implementation, one exact protocol-first head MUST contain,
relative to M4-022 final-governance head `2c22f385...`, exactly:

```text
specs/0034-m4-approval-routing.md
fixtures/approval-routing/cases.json
docs/handoff/CURRENT.md
```

It MUST NOT contain production M4-023 code, Adapter changes, protocol/schema/TCK
weakening, dependency/lockfile changes, Harness baseline changes, M4-024+,
M4-030+, M4-040+ or M6 implementation.

That exact protocol-first head MUST reach both:

1. normal CI PASS;
2. exact pinned Harness rc5 source-conformance PASS.

Only after exact-head dual-green may M4-023 production implementation begin.

## Boundaries that remain enforced

- Specs/schemas/TCK remain semantic authority.
- Harness remains compatibility evidence only.
- Never weaken schema validation, TCK, strict TypeScript, frozen installs,
  supply-chain policy, architecture boundaries, source-conformance or fail-closed
  behavior for CI.
- Approval cannot override policy deny or broaden the original request.
- Lease candidates remain non-authoritative until later lifecycle/consume Gates.
- No fabricated approval provenance.
- No merge of PR #3 without explicit user authorization.

## Resume instruction

1. refresh PR #3 exact head/base/reviews/threads and exact-head workflows;
2. audit the M4-023 protocol-first delta from `2c22f385...` and require exactly
   Spec 0034, the 25-case corpus and CURRENT;
3. require normal CI plus exact pinned Harness rc5 source-conformance dual-green;
4. only then authorize M4-023 TypeScript production implementation;
5. keep M4-024+, M4-030+, M4-040+ and M6 unauthorized;
6. keep PR #3 Draft and do not merge without explicit authorization.
