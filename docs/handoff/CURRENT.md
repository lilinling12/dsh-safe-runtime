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
- M4-023 approval routing: **IMPLEMENTATION ACCEPTED / FINAL GOVERNANCE VERIFICATION**
- M4-024+, M4-030+, M4-040+ and M6: **NOT AUTHORIZED until M4-023 final-governance exact head is dual-green**

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

## M4-023 accepted implementation

Normative specification:

```text
specs/0034-m4-approval-routing.md
```

Portable corpus:

```text
fixtures/approval-routing/cases.json
```

Portable cases: `25`.

Protocol-first exact head:

```text
85b8f5dd6e171beeccab96554f748191a200449e
```

Exact-head evidence:

- CI #467 / run `33375423438`: PASS;
- Harness rc5 source-conformance #409 / run `33375423440`: PASS.

Accepted implementation exact head:

```text
98bb59e7dbd74b0522be5c4e028b72f3dc074e8b
```

Exact-head evidence:

- CI #474 / run `33376276973`: PASS;
- Harness rc5 source-conformance #416 / run `33376276981`: PASS;
- 47 test files / 893 tests PASS;
- M4-023 primary suite: 38 tests PASS;
- post-green coercion hardening: 2 tests PASS.

Acceptance audit:

```text
docs/acceptance/m4-023-acceptance-audit.md
```

Acceptance-record exact head:

```text
4ca482371dde4d865fdc1aa090d0c44b35c952e9
```

Exact-head evidence:

- CI #476 / run `33376643531`: PASS;
- Harness rc5 source-conformance #418 / run `33376643536`: PASS.

The implementation delta from protocol-first to accepted implementation was
audited and limited to exactly five `packages/capability-broker/src` files:

```text
approval-routing-types.ts
approval-routing.ts
approval-routing.test.ts
approval-routing-hardening.test.ts
index.ts
```

No Adapter, protocol/schema/TCK, dependency, lockfile, Harness baseline or later
Gate file changed in the implementation delta.

## M4-023 semantic boundary

M4-023 produces a deterministic **approval-routing fact**, not a durable
CapabilityDecision and not execution authority.

### Policy short-circuit

```text
M4-021 FAIL_CLOSED -> preserve failure; no approval
M4-021 allow       -> routed allow from POLICY; no approval
M4-021 deny        -> routed deny from POLICY; no approval
M4-021 ask         -> enter Lease-result/approval path
```

A human approval path cannot override policy deny.

### Lease boundary

M4-022 `CANDIDATES_FOUND` remains candidate identity only and cannot bypass
approval before Lease lifecycle/validity/consume semantics exist:

```text
ask + Lease FAIL_CLOSED      -> preserve failure; no approval
ask + NO_CANDIDATE           -> approval exactly once
ask + CANDIDATES_FOUND       -> approval exactly once
```

Candidate refs are not traversed or forwarded by M4-023.

### Approval outcome boundary

The accepted portable outcomes remain exactly:

```text
ALLOWED_ONCE -> routed allow
REJECTED     -> routed deny
CANCELLED    -> routed deny, distinct outcome preserved
UNAVAILABLE  -> routed deny, distinct outcome preserved
```

No `ALLOWED_ALWAYS`, truthy alias, remembered approval or implicit success is
accepted. Provider throw/rejection and malformed outcomes fail closed with
sanitized stable reason codes.

### Correlation and provenance boundary

The portable request contains only:

```text
requestRef
actionRef
reason?
```

Protocol `actionRef` is not guessed/cast into a Harness `callRef` or `CallId`.
The synchronous M2 approval port returns only the normalized outcome; durable
Harness `approvalRef` evidence is separate. M4-023 therefore does not fabricate
approvalRef, AuthorizationRef, CapabilityDecision identity or receipt identity.

### Hostile-runtime hardening

Security-relevant consumed fields are read through own data-property
descriptors. Earlier authoritative results stop later hostile-value inspection.
Tests cover accessors, revoked Proxies, unexpected/symbol fields, non-traversal
of policy rule-ID arrays and candidate Lease refs, sync throws, async rejects,
malformed provider outcomes, exact-once invocation, detached/frozen requests and
outputs, and failure redaction.

Acceptance review found a security issue after an already green implementation:
`String(effect)` could execute attacker-controlled coercion hooks when static
typing was bypassed. The accepted head replaced coercion with exact scalar
comparisons and added dedicated `Symbol.toPrimitive`/accessor regressions.

## Quality note

The repository-wide oxlint run reports two warnings that already existed on the
M4-023 protocol-first head before production implementation:

```text
Do not use `new Array(singleArgument)`.
Do not add `then` to an object.
```

M4-023 introduces no lint-warning regression. These unrelated historical
warning sites were not folded into this security-sensitive Gate merely to make a
cosmetic claim of 0/0.

## Later Gates remain separate

M4-023 does not:

- construct/persist final CapabilityDecision or CapabilityReceipt — M4-024;
- assign guarantee level — M4-025;
- validate Lease TTL — M4-030;
- validate/decrement maxUses/remainingUses — M4-031;
- atomically consume a Lease — M4-032;
- revoke — M4-033;
- prove parent-child attenuation — M4-034;
- register/enforce a PEP — M4-040+;
- implement M6.

An M4-023 routed allow remains an intermediate fact and cannot independently
authorize execution.

## Final governance condition

The M4-023 implementation and acceptance-record heads are dual-green. Final
governance is now limited to exactly:

```text
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md   # append-only
docs/roadmap.md           # only M4-023 marker
```

The resulting final-governance exact head MUST itself reach:

1. normal CI PASS;
2. exact pinned Harness rc5 source-conformance PASS.

Before that exact-head evidence exists, M4-023 MUST NOT be declared governance
closed and M4-024 MUST NOT start.

After exact-head dual-green verification:

```text
M4-023: GOVERNANCE CLOSED
M4-024: P0 decision receipt — AUTHORIZED / PROTOCOL-FIRST
```

M4-025+, M4-030+, M4-040+ and M6 remain unauthorized by that transition.

## Boundaries that remain enforced

- Specs/schemas/TCK remain semantic authority.
- Harness remains compatibility evidence only.
- Never weaken schema validation, TCK, strict TypeScript, frozen installs,
  supply-chain policy, architecture boundaries, source-conformance or fail-closed
  behavior for CI.
- Approval cannot override policy deny or expand the original request.
- Lease candidates are not usable Lease authority.
- No fabricated approval provenance or actionRef-to-callRef identity.
- No merge of PR #3 without explicit user authorization.

## Resume instruction

1. refresh PR #3 exact head/base/reviews/threads and exact-head workflows;
2. audit M4-023 final-governance delta from acceptance-record head
   `4ca48237...` and require only CURRENT, append-only HISTORY and only the
   M4-023 roadmap marker;
3. explicitly require HISTORY deletions = `0`;
4. require final-governance exact-head normal CI + pinned Harness dual-green;
5. only then declare **M4-023 GOVERNANCE CLOSED** and authorize **M4-024 P0
   decision receipt protocol-first**;
6. keep M4-025+, M4-030+, M4-040+ and M6 unauthorized;
7. keep PR #3 Draft and do not merge without explicit authorization.
