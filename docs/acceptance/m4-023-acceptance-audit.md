# M4-023 Acceptance Audit — Deterministic Approval Routing

Status: **ACCEPTED AT IMPLEMENTATION BOUNDARY**  
Date: `2026-08-31`  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-023 P0 — approval routing`

## 1. Scope and authority

This audit evaluates the M4-023 implementation against the protocol-first
contract in `specs/0034-m4-approval-routing.md`, its 25-case portable corpus in
`fixtures/approval-routing/cases.json`, existing Core approval semantics, M2
Adapter approval-port evidence, M3 deterministic approval/TCK behavior, accepted
M4-021 policy evaluation, accepted M4-022 Lease candidate lookup, repository
architecture rules, and the pinned DeepSeek Harness compatibility baseline.

DeepSeek Harness `0.1.0-rc.5` at
`47f943859bef60e4160492346772ded9b24f765a` remains compatibility evidence only.
It does not define portable M4-023 identity, policy, Lease, decision, guarantee
or PEP semantics.

M4-023 is accepted only as a deterministic **approval-routing fact**. This audit
does not accept or authorize M4-024 decision/receipt construction, M4-025
guarantee assignment, M4-030+ Lease lifecycle/consume/revocation/attenuation,
M4-040+ PEP integration, or M6.

## 2. Protocol-first gate

Protocol-first exact head:

```text
85b8f5dd6e171beeccab96554f748191a200449e
```

The exact delta from M4-022 final-governance head
`2c22f385b3e68d6c208f30d8527e2fce5abbc016` was audited and contained exactly:

```text
specs/0034-m4-approval-routing.md
fixtures/approval-routing/cases.json
docs/handoff/CURRENT.md
```

It contained no production Capability Broker implementation, Adapter change,
Schema/TCK weakening, dependency/lockfile change, Harness-baseline change, or
later-Gate implementation.

Exact-head evidence:

- normal CI #467 / run `33375423438`: **PASS**;
- pinned Harness rc5 source-conformance #409 / run `33375423440`: **PASS**.

Production implementation therefore began only after the protocol-first Gate was
dual-green.

## 3. Accepted implementation head

Accepted implementation exact head:

```text
98bb59e7dbd74b0522be5c4e028b72f3dc074e8b
```

Exact-head evidence:

- normal CI #474 / run `33376276973`: **PASS**;
- pinned Harness rc5 source-conformance #416 / run `33376276981`: **PASS**;
- frozen install and 124-entry supply-chain lockfile policy: **PASS**;
- architecture boundaries: **PASS**;
- schema shape: **PASS** (`16` schemas);
- schema compatibility baseline: **PASS**;
- strict workspace TypeScript: **PASS**;
- repository tests: **47 files / 893 tests PASS**;
- M4-023 primary approval-routing suite: **38 tests PASS**;
- M4-023 post-green coercion hardening suite: **2 tests PASS**;
- packed Shared TCK + external non-workspace consumer: **44 assets PASS**.

The repository-wide oxlint run reports the same two pre-existing warnings that
were already present on the protocol-first head before M4-023 implementation:

```text
Do not use `new Array(singleArgument)`.
Do not add `then` to an object.
```

M4-023 introduces **no lint-warning regression**. This audit does not widen the
current Gate to modify unrelated historical warning sites, and it does not
misstate the repository baseline as 0/0.

## 4. Implementation delta audit

The exact implementation delta from protocol-first head
`85b8f5dd6e171beeccab96554f748191a200449e` to accepted implementation head
`98bb59e7dbd74b0522be5c4e028b72f3dc074e8b` is limited to exactly five
Capability Broker files:

```text
packages/capability-broker/src/approval-routing-types.ts
packages/capability-broker/src/approval-routing.ts
packages/capability-broker/src/approval-routing.test.ts
packages/capability-broker/src/approval-routing-hardening.test.ts
packages/capability-broker/src/index.ts
```

There are no changes in:

- `package.json` or `pnpm-lock.yaml`;
- `packages/adapter-dsh`;
- protocol types or JSON Schemas;
- Shared TCK/fixture manifest;
- Spec 0034 or its portable corpus after the protocol-first Gate;
- Harness compatibility baseline;
- M4-024+, M4-030+, M4-040+, or M6 implementation.

This preserves the protocol-first review line and repository dependency
architecture.

## 5. Runtime-independent approval boundary

The reference implementation is owned by `packages/capability-broker` and
exports a minimal runtime-independent `ApprovalInvocationPort`.

It does **not** import concrete `@dsh-safe/adapter-dsh` or `@deepseek-ai/*`
types. The established architecture rule that Core/Capability Broker must not
depend on concrete Harness Adapter types remains intact.

Runtime-specific mapping of protocol `actionRef` to a Harness `callRef`, session,
tool name or cancellation signal remains a composition/PEP responsibility. The
implementation does not infer or cast those identities from string resemblance.

## 6. Policy routing correctness

The accepted implementation consumes the accepted M4-021 result instead of
re-running policy semantics.

Verified behavior:

```text
M4-021 FAIL_CLOSED -> preserve stable upstream reason; no approval call
M4-021 allow       -> policy-routed allow; no approval call
M4-021 deny        -> policy-routed deny; no approval call
M4-021 ask         -> continue to Lease-result integrity and approval
```

A policy deny cannot be overridden by human approval. Approval therefore cannot
become a privilege-escalation path above the accepted policy precedence.

The implementation validates coherent M4-021 success triples
(effect/basis/reasonCode) and whitelists accepted upstream failure stages/reasons
when runtime callers bypass static typing.

## 7. Lease boundary correctness

For an accepted M4-021 `ask`, M4-023 consumes only the accepted M4-022 result
boundary:

```text
Lease FAIL_CLOSED      -> preserve failure; do not call approval
NO_CANDIDATE           -> call approval exactly once
CANDIDATES_FOUND       -> call approval exactly once
```

Candidate presence never bypasses approval. M4-023 deliberately does not inspect
candidate authorization, TTL, remaining uses, revocation, parent depth or
consumability and does not select or consume a Lease.

The implementation validates the Lease-result discriminant/key domain but does
not traverse `candidateLeaseRefs`, preserving both M4-022 authority ownership and
the hostile-input short-circuit requirement.

## 8. Approval outcome correctness

The accepted outcome domain is exactly:

```text
ALLOWED_ONCE -> routed allow
REJECTED     -> routed deny
CANCELLED    -> routed deny, distinct outcome preserved
UNAVAILABLE  -> routed deny, distinct outcome preserved
```

Unsupported strings such as `ALLOWED_ALWAYS`, booleans, numeric statuses,
objects, null or other host values fail closed as
`APPROVAL_ROUTING_OUTCOME_INVALID`.

Synchronous provider throws and asynchronous provider rejections fail closed as
`APPROVAL_ROUTING_SERVICE_ERROR`. Host error messages/stacks are not copied into
portable output.

There is no implicit retry, catch-and-allow behavior or remembered/permanent
approval.

## 9. Correlation and least-disclosure boundary

The portable approval request contains only:

```text
requestRef
actionRef
reason?  # caller-supplied only
```

Refs use the existing protocol `defs.ref` 1..512 Unicode-code-point domain and
remain opaque. They are not trimmed, normalized, parsed or converted into Harness
identities. `reason` preserves the existing optional 0..4096-code-point
CapabilityRequest surface, including distinct omitted and empty-string states.

The implementation does not automatically disclose:

- capability or Resource;
- Subject/session/parent data;
- raw arguments or constraints;
- Lease refs/records;
- policy or rule IDs;
- provider identities/tokens;
- secrets/environment;
- exception details.

The object handed to the approval provider is a detached frozen projection, not
the caller-owned request object.

## 10. Hostile-runtime and side-effect ordering

The accepted implementation uses exact own-data-property descriptor reads for
security-relevant values and fails closed on accessors, unexpected/symbol fields,
unreadable descriptors and revoked Proxies.

Security-relevant inspection order is observable and intentional:

1. validate outer routing-input key domain;
2. inspect policy result;
3. stop on policy failure/allow/deny;
4. only for ask, inspect Lease result;
5. stop on Lease failure;
6. only then materialize approval request;
7. invoke provider exactly once;
8. normalize the exact outcome;
9. return a frozen detached routing result.

Regression tests prove that:

- policy allow does not execute hostile Lease/request getters;
- policy failure/deny does not invoke the provider;
- Lease failure does not inspect approval-request getters;
- policy rule-ID payloads are not traversed by M4-023;
- candidate Lease refs are not traversed;
- approval request accessors do not execute;
- revoked policy/Lease/request proxies fail closed;
- unexpected and symbol approval-request fields fail closed;
- failure output does not echo attacker-controlled refs.

## 11. Green-after-review coercion defect and remediation

The first fully green implementation head still used `String(effect)` while
validating the M4-021 success effect/basis/reason tuple. A runtime caller that
bypassed static typing could supply an object with hostile `Symbol.toPrimitive`
or `toString`, causing authorization-boundary code to execute attacker-controlled
coercion hooks.

This was treated as a security defect despite green CI.

The accepted head replaces coercive tuple construction with direct exact scalar
comparisons. Dedicated hardening tests prove that malformed effect coercion hooks
and policy basis/reason accessors do not execute and that approval is not invoked
on those malformed paths.

This remediation strengthened the fail-closed boundary without weakening TypeScript,
fixtures, architecture checks or any existing gate.

## 12. Initial CI failure and correction

An earlier implementation head failed normal CI only because strict TypeScript
reported an unused imported type:

```text
TS6196: 'PolicyEvaluationReasonCode' is declared but never used
```

Frozen install, architecture, schema shape and schema baseline had already
passed. The correction removed only the unused import. No compiler option,
lint rule, test, schema, dependency or security requirement was weakened.

## 13. Durable provenance boundary

M4-023 deliberately does not fabricate durable approval provenance.

The accepted synchronous M2 approval port returns only the normalized outcome;
the pinned Harness runtime owns the durable approval identity that later appears
in normalized approval evidence. Therefore M4-023 creates none of:

```text
approvalRef
AuthorizationRef { kind: "approval", ref: ... }
CapabilityDecision.decisionId
CapabilityReceipt
receiptRef
```

`ALLOWED_ONCE` at this Gate is a transient routed fact for the exact original
action. M4-024 and runtime evidence/correlation remain responsible for any
durable decision/receipt provenance before execution can claim the Core
end-to-end authorization contract.

## 14. Deferred semantics remain deferred

M4-023 does not:

- issue a Lease from approval;
- validate TTL or expiration;
- validate/decrement remaining uses;
- atomically consume a Lease;
- revoke a Lease;
- follow parent Lease links or prove attenuation;
- construct the final CapabilityDecision;
- assign guarantee level;
- register a PEP or call `ctx.tools.guard()`;
- execute a tool/filesystem/subprocess action;
- claim rewritten action arguments remain covered by the earlier decision.

Those responsibilities remain M4-024+, M4-030+, M4-040+ and later milestones.

## 15. Acceptance result

**M4-023 is ACCEPTED AT THE IMPLEMENTATION BOUNDARY** on exact head
`98bb59e7dbd74b0522be5c4e028b72f3dc074e8b`.

Acceptance means the deterministic approval-routing primitive, its portable
contract, hostile-runtime behavior and architecture boundary are accepted.

Acceptance does **not** mean final governance closure and does not yet authorize
M4-024. The acceptance-record head and final-governance head must each reach
normal CI + exact pinned Harness rc5 source-conformance dual-green before M4-023
is governance-closed.

Until then:

```text
M4-023: IMPLEMENTATION ACCEPTED / GOVERNANCE OPEN
M4-024+: NOT AUTHORIZED
M4-030+: NOT AUTHORIZED
M4-040+: NOT AUTHORIZED
M6:      NOT AUTHORIZED
PR #3:   OPEN / DRAFT / DO NOT MERGE WITHOUT EXPLICIT USER AUTHORIZATION
```
