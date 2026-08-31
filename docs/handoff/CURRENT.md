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
- M4-020 through M4-023: **GOVERNANCE CLOSED**
- M4-024 decision receipt: **AUTHORIZED / PROTOCOL-FIRST**
- M4-024 production implementation: **NOT AUTHORIZED until the protocol-first exact head is dual-green**
- M4-025+, M4-030+, M4-040+ and M6: **NOT AUTHORIZED**

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

Harness behavior MUST NOT define Core decision/receipt identity, guarantee
semantics, approval provenance, Lease lifecycle, digest canonicalization or PEP
behavior.

## M4-023 final closure

M4-023 final-governance exact head:

```text
be6b5c3ea88d469a1f94cc17a00b965352a877b1
```

Exact-head evidence:

- normal CI #480 / run `33378220417`: PASS;
- exact Harness rc5 source-conformance #422 / run `33378220400`: PASS.

The final governance delta from acceptance-record head
`4ca482371dde4d865fdc1aa090d0c44b35c952e9` was exactly:

```text
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md   # +71 / -0, append-only
docs/roadmap.md           # only M4-023 acceptance marker
```

A prior HISTORY attempt had modified two old M3 lines (`+73/-2`). That state was
rejected and repaired before closure. The accepted final head restores the old
history verbatim and appends only the M4-023 record.

Therefore:

```text
M4-023: GOVERNANCE CLOSED
M4-024: P0 decision receipt — AUTHORIZED / PROTOCOL-FIRST
```

PR #3 remains Open, Draft and mergeable; no review or review-thread blocker was
present at closure. No merge is authorized.

## M4-024 protocol-first authority

Normative draft:

```text
specs/0035-m4-decision-receipt-construction.md
```

Portable corpus:

```text
fixtures/decision-receipt/cases.json
```

Portable cases: `27`.

M4-024 defines deterministic construction of a post-routing immutable pair:

```text
CapabilityDecision
CapabilityReceipt
```

It consumes an accepted M4-023 routing fact plus explicit issuance context. It
does not re-run policy, approval or Lease logic and does not execute an action.

## Core ↔ wire-shape reconciliation

M4-024 research found a pre-existing Core §13 illustrative Receipt mismatch.
Core used:

```text
actionRef
outcome
argumentsDigest
```

while all current v1alpha1 wire authorities already agree on:

```text
schemas/v1alpha1/capability-receipt.schema.json
packages/protocol/src/capability.ts
fixtures/receipt/valid/allowed.json
```

with:

```text
effect
argumentDigest
```

and no duplicate Receipt-level `actionRef`.

Protocol-first work therefore changes only the stale Core §13 example/wording to
match the already published v1alpha1 wire shape. Action identity remains linked
through:

```text
CapabilityReceipt.requestRef
  -> CapabilityRequest.requestId
  -> CapabilityRequest.actionRef
```

This reconciliation is not a schema change and must not be used to alter Lease,
guarantee, PEP, transaction or execution semantics.

## M4-024 record-construction boundary

### Explicit identities and time

M4-024 does not generate identity or time from host state. The caller supplies:

```text
requestRef
decisionRef
receiptRef
decidedAt
observedAt
```

The three refs reuse the existing opaque `defs.ref` domain and are preserved
exactly. No trim/case-fold/Unicode normalization/prefix synthesis is allowed.

The timestamps are explicit protocol inputs. M4-024 must not call host time or
create hidden counters/random IDs.

Successful cross-record coherence is:

```text
decision.requestId  == requestRef
receipt.requestRef  == requestRef
decision.decisionId == decisionRef
receipt.decisionRef == decisionRef
receipt.receiptRef  == receiptRef
```

## Guarantee boundary

Both existing Decision and Receipt schemas require `guaranteeLevel`, but
**M4-025 owns guarantee determination**.

M4-024 therefore accepts an explicit guarantee input, validates that it is one
of the four existing values and copies the exact same value into both records:

```text
advisory
tool-enforced
provider-enforced
process-isolated
```

M4-024 MUST NOT infer, upgrade or downgrade that value from tool type, provider
presence, approval result, Harness feature flags or process requests.

Until M4-025 is accepted, the supplied value is record-construction input, not
proof that production composition is entitled to claim that guarantee.

## Routing → record mapping

M4-024 is post-M4-023. Its normal profile is narrower than the generic schemas:

```text
M4-023 routed allow
  -> CapabilityDecision.effect = allow
  -> CapabilityReceipt.effect  = allowed

M4-023 routed deny
  -> CapabilityDecision.effect = deny
  -> CapabilityReceipt.effect  = denied

M4-023 FAIL_CLOSED
  -> CapabilityDecision.effect = deny
  -> CapabilityReceipt.effect  = error
```

The accepted stable routing `reasonCode` is copied into the Decision.

M4-024 does **not** emit a new:

```text
CapabilityDecision.effect = ask
CapabilityReceipt.effect  = approval-required
```

An ask-like/incoherent post-routing tuple is malformed input and fails closed
without constructing partial records.

## Deliberately omitted provenance/data

M4-024 v0.1 does not fabricate optional Decision fields:

```text
policyRef
matchedRuleRefs
reason
```

Reasons:

- no normative stable policyRef-generation grammar currently exists;
- M4-021 explicitly did not promote evaluator rule IDs to
  `CapabilityDecision.matchedRuleRefs`;
- free-text reason persistence would expand the sensitive-data surface.

It also omits Receipt:

```text
leaseRef
resourceDigest
argumentDigest
resultDigest
```

because:

- M4-022 candidates are not valid/consumed Lease authority;
- M4-030+ owns Lease lifecycle/consume;
- no M4-024 canonical byte serialization for Resource/arguments exists;
- no action has executed yet, so resultDigest would be fabricated.

## Approval provenance boundary

M4-023 established that the synchronous normalized approval result does not
carry the Harness-generated durable `approvalRef`.

M4-024 therefore MUST NOT fabricate:

```text
approvalRef
AuthorizationRef(kind=approval)
policyRef
matchedRuleRefs
```

The Decision/Receipt pair correlates request and decision identity but is not a
self-contained proof of the human approval event. Authoritative approval event
identity remains external correlated evidence until a later provenance/profile
Gate binds it normatively.

## Receipt meaning

The M4-024 Receipt is a **broker decision observation**. It is not proof that the
governed action executed or succeeded.

Although Core requires durable Receipt persistence after redaction, M4-024 only
constructs the protocol records. It does not choose or implement AuditLedger
storage, retries, retention, encryption or redaction infrastructure.

## Hostile-runtime requirements

The TypeScript implementation, once authorized, must:

- use own data-property descriptors for every consumed security field;
- reject accessors without executing getters;
- reject unexpected/symbol fields in the narrow input/issuance projections;
- fail closed on revoked Proxies and descriptor/ownKeys traps;
- use exact scalar comparisons, never `String(value)` or implicit coercion;
- not use host clock/randomness for IDs or timestamps;
- return detached/frozen Decision, Receipt and outer result;
- never return partial records on construction failure;
- never echo attacker-controlled refs/timestamps/errors in failure output.

## Protocol-first exact file scope

Relative to M4-023 final-governance head
`be6b5c3ea88d469a1f94cc17a00b965352a877b1`, this Gate may contain exactly:

```text
specs/0035-m4-decision-receipt-construction.md
fixtures/decision-receipt/cases.json
specs/0001-safe-runtime-core.md   # §13 wire-shape reconciliation only
docs/handoff/CURRENT.md
```

It MUST NOT contain production M4-024 TypeScript, M4-025 guarantee assignment,
schema/TCK weakening, Adapter/Harness implementation, dependency/lockfile
changes, M4-030+, M4-040+ or M6 work.

## Protocol-first Gate

Production M4-024 implementation remains **NOT AUTHORIZED** until one exact head
containing the four-file protocol-first transition above reaches:

1. normal CI PASS;
2. exact pinned Harness rc5 source-conformance PASS.

Before claiming that Gate complete, re-audit the portable corpus mechanically,
including the explicit >512-code-point ref boundary, rather than accepting a
manually repeated string by visual inspection.

Only after same-head dual-green may M4-024 production implementation begin.
M4-025+, M4-030+, M4-040+ and M6 remain unauthorized.

## Boundaries that remain enforced

- Specs/schemas/TCK remain semantic authority.
- Harness remains compatibility evidence only.
- Never weaken schema validation, TCK, strict TypeScript, frozen installs,
  supply-chain policy, architecture boundaries, source-conformance or fail-closed
  behavior for CI.
- M4-024 records are not PEP execution authority.
- M4-024 does not determine guarantee truth.
- M4-024 does not claim Lease use or action execution.
- No merge of PR #3 without explicit user authorization.

## Resume instruction

1. refresh PR #3 exact head/base/reviews/threads;
2. audit the M4-024 protocol-first delta from `be6b5c3e...` and require exactly
   Spec 0035, the decision-receipt corpus, Core §13 reconciliation and CURRENT;
3. mechanically verify corpus boundary cases, especially >512-code-point refs;
4. require protocol-first exact-head normal CI + pinned Harness dual-green;
5. only then authorize M4-024 production implementation;
6. keep M4-025+, M4-030+, M4-040+ and M6 unauthorized;
7. keep PR #3 Draft and do not merge without explicit authorization.
