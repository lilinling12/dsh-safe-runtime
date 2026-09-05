# M4-024 Acceptance Audit — Deterministic Decision / Receipt Construction

Status: **ACCEPTED — IMPLEMENTATION REVIEW COMPLETE**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-024 P0 — decision receipt`  
Recorded: `2026-08-31`

> This record accepts the M4-024 reference implementation against Spec 0035.
> Acceptance is not final governance closure. M4-025 and later Gates remain
> unauthorized until the acceptance-record exact head and subsequent final
> governance exact head satisfy the repository evidence requirements.

## 1. Authority and scope

Normative specification:

```text
specs/0035-m4-decision-receipt-construction.md
```

Portable corpus:

```text
fixtures/decision-receipt/cases.json
```

Portable cases: `27`.

M4-024 constructs the immutable post-M4-023 broker record pair:

```text
CapabilityDecision
CapabilityReceipt
```

It does not determine guarantee truth, validate/consume Lease lifecycle,
register/enforce a PEP, execute an action or implement audit persistence.

## 2. Protocol-first Gate

M4-023 final-governance base:

```text
be6b5c3ea88d469a1f94cc17a00b965352a877b1
```

M4-024 protocol-first exact head:

```text
04cd977078478d414af8daee06e24dc21754618e
```

The exact protocol-first delta was limited to:

```text
docs/handoff/CURRENT.md
fixtures/decision-receipt/cases.json
specs/0001-safe-runtime-core.md
specs/0035-m4-decision-receipt-construction.md
```

The Core change was restricted to reconciling the stale §13 Receipt example with
the already published v1alpha1 Schema/TypeScript/fixture wire shape. It did not
change Lease, guarantee, PEP, transaction or execution semantics.

Exact-head evidence:

- normal CI #484 / run `33379337103`: **PASS**;
- exact Harness rc5 source-conformance #426 / run `33379337065`: **PASS**.

No production M4-024 code, dependency/lockfile change, Adapter/Harness change,
Shared TCK weakening, M4-025 guarantee assignment, M4-030+ Lease lifecycle,
M4-040+ PEP or M6 work was present in the protocol-first delta.

## 3. Accepted implementation head

Accepted implementation exact head:

```text
8c12354c8e4902945c352b74536d3ea47615e14a
```

Exact-head evidence:

- normal CI #491 / run `33381979888`: **PASS**;
- exact Harness rc5 source-conformance #433 / run `33381979902`: **PASS**.

Harness #433 completed successfully through:

- exact pinned Harness source checkout;
- pinned public type-surface build;
- reproducible safe-runtime dependency install;
- exact workspace projection;
- projection idempotence verification;
- exact-source TypeScript binding;
- real rc5 runtime conformance.

## 4. Implementation delta audit

The exact implementation delta from protocol-first head `04cd9770...` to
accepted implementation head `8c12354c...` is limited to five Capability Broker
files:

```text
packages/capability-broker/src/decision-receipt-hardening.test.ts
packages/capability-broker/src/decision-receipt-types.ts
packages/capability-broker/src/decision-receipt.test.ts
packages/capability-broker/src/decision-receipt.ts
packages/capability-broker/src/index.ts
```

No implementation-delta changes exist in:

- `packages/adapter-dsh`;
- `packages/protocol` wire types;
- schemas/schema baseline;
- Shared TCK fixtures/contracts;
- package dependency manifests;
- `pnpm-lock.yaml`;
- Harness workflow/baseline;
- M4-025+;
- M4-030+;
- M4-040+;
- M6.

## 5. Code and directory structure acceptance

The new primitive follows the established Capability Broker PDP module shape:

```text
<gate>-types.ts
<gate>.ts
<gate>.test.ts
<gate>-hardening.test.ts
```

A new subdirectory was deliberately not introduced merely for M4-024. Existing
PDP siblings (`lease-lookup`, `approval-routing`) already use the package root;
keeping the same organization avoids two competing module conventions. The
existing `tool-classifier/` subdirectory remains justified as a multi-implementation
family and was not used as a precedent for unrelated restructuring.

The implementation does not refactor governance-closed M4-023 code just to share
small hostile-input helpers. For a security-sensitive staged protocol project,
Gate isolation and reviewable deltas are preferred over cross-Gate churn.

## 6. Public API and authority boundary

The package exports one construction primitive:

```text
constructCapabilityDecisionReceipt(input)
```

The TypeScript caller-facing types reuse protocol-owned CapabilityDecision,
CapabilityReceipt and GuaranteeLevel authority where appropriate, while the
runtime function accepts `unknown` and validates the actual JavaScript boundary.

No concrete DeepSeek Harness or Adapter type crosses into Capability Broker.

## 7. Record construction semantics accepted

Accepted mapping is:

```text
M4-023 ROUTED allow      -> Decision allow + Receipt allowed
M4-023 ROUTED deny       -> Decision deny  + Receipt denied
M4-023 accepted failure  -> Decision deny  + Receipt error
```

A post-routing `ask` or `approval-required` result is invalid M4-024 input.

The Decision reasonCode is copied only from a coherent accepted M4-023 routing
fact. Approval distinctions (`ALLOWED_ONCE`, `REJECTED`, `CANCELLED`,
`UNAVAILABLE`) remain distinguishable without fabricating an approval identifier.

## 8. Failure coherence hardening

Acceptance review found a semantic hardening opportunity after an already-green
implementation head: an initial validator checked M4-023 failure `stage` and
`reasonCode` only as independent valid values. That could have accepted an
impossible pair such as:

```text
stage = POLICY
reasonCode = LEASE_LOOKUP_DUPLICATE_LEASE_REF
```

The accepted implementation validates exact stage/reason ownership:

- `INPUT` -> M4-023 input failure only;
- `POLICY` -> policy-result or accepted policy-evaluation failures;
- `LEASE_LOOKUP` -> lease-result or accepted Lease lookup failures;
- `APPROVAL_REQUEST` -> approval-request failure only;
- `APPROVAL_SERVICE` -> service/outcome failures only.

A regression test proves impossible cross-stage failure tuples fail closed before
record construction. This correction did not change the normative output domain
or weaken any gate.

## 9. Stable identity boundary accepted

`requestRef`, `decisionRef` and `receiptRef` are explicit inputs using the
existing `defs.ref` domain:

```text
1..512 Unicode code points
```

Values are preserved exactly; no trim, case fold, normalization, parsing,
prefixing, hash or host-generated identifier is used.

Implementation tests explicitly prove the JavaScript-sensitive astral boundary:

```text
512 x 😀 -> accepted
513 x 😀 -> rejected
```

so UTF-16 `.length` cannot accidentally define the protocol limit.

Cross-record identity is deterministic:

```text
decision.requestId  == requestRef
receipt.requestRef  == requestRef
decision.decisionId == decisionRef
receipt.decisionRef == decisionRef
receipt.receiptRef  == receiptRef
```

## 10. Timestamp boundary accepted

M4-024 reads no host clock and does not call `Date.now()` or synthesize time from
identifiers.

The implementation uses a repository-owned deterministic RFC 3339 lexical and
calendar validator rather than locale-sensitive `Date.parse()`. It checks month,
day, leap-year, clock and offset ranges and preserves accepted timestamp strings
exactly rather than normalizing them through a host timezone.

Tests include malformed calendar dates, leap-year behavior, numeric offsets,
fractional seconds and lowercase RFC 3339 `t`/`z` forms.

No `observedAt >= decidedAt` rule is invented because the existing protocol does
not define that comparison.

## 11. Guarantee boundary accepted

M4-024 accepts exactly the four existing protocol values:

```text
advisory
tool-enforced
provider-enforced
process-isolated
```

It copies the supplied value identically to Decision and Receipt and never
infers, upgrades or downgrades it from tool type, provider presence, approval
outcome or Harness feature flags.

This does **not** establish that a supplied guarantee is truthful. M4-025 remains
the sole next Gate for trusted guarantee determination/admissibility.

## 12. Provenance and privacy boundary accepted

M4-024 deliberately omits Decision fields whose authoritative provenance does
not yet exist at this Gate:

```text
policyRef
matchedRuleRefs
reason
```

It deliberately omits Receipt fields that would claim later Lease/execution or
canonical-digest evidence:

```text
leaseRef
resourceDigest
argumentDigest
resultDigest
```

It does not fabricate `approvalRef`, AuthorizationRef, stable policy/rule refs or
execution-success evidence.

Failure output contains only stable M4-024 stage/reason values and does not echo
attacker-controlled refs, timestamps, coercion results or exception text.

## 13. Hostile-runtime acceptance

Authorization-relevant input is inspected through exact own-property descriptors.
The accepted tests cover:

- outer/routing/issuance accessors without getter execution;
- revoked outer/routing/issuance Proxies;
- unexpected string and symbol fields;
- inherited-only identity;
- attacker `Symbol.toPrimitive` / `toString` hooks with zero coercion calls;
- issuance inspection only after routing coherence is established;
- exact field-specific issuance failures;
- impossible M4-023 failure stage/reason combinations;
- detached/frozen outer result, Decision and Receipt;
- failure redaction.

The implementation performs no generic spread/stringify/coercion over untrusted
security-relevant input.

## 14. CI quality evidence

At the accepted implementation line, normal CI confirms:

- frozen install: PASS;
- supply-chain lockfile policy: PASS (124 entries);
- architecture boundaries: PASS;
- schema shape: PASS (16 schemas);
- schema compatibility baseline: PASS;
- strict workspace TypeScript: PASS;
- repository tests: PASS;
- packed Shared TCK + external non-workspace consumer: PASS.

The repository continues to report the same two pre-existing oxlint warnings
already present before M4-024 implementation. M4-024 introduces no lint-warning
regression; unrelated historical cleanup was not folded into this Gate.

## 15. Explicit non-acceptance of later authority

This acceptance does **not** authorize or accept:

- trusted guarantee-level determination/admissibility — M4-025;
- Lease TTL validity — M4-030;
- Lease usage validity/decrement — M4-031;
- atomic Lease consume — M4-032;
- revoke — M4-033;
- attenuation — M4-034;
- PEP registration/enforcement — M4-040+;
- action execution evidence/digest semantics;
- audit persistence/retention;
- M6.

A constructed allow/allowed pair is not proof that a PEP enforced or executed the
action.

## 16. Acceptance decision

**M4-024 reference implementation is ACCEPTED at exact head
`8c12354c8e4902945c352b74536d3ea47615e14a`.**

The next required transition is an acceptance-record exact head containing this
audit and package-stage bookkeeping, followed by normal CI plus exact pinned
Harness rc5 source-conformance on that same SHA.

Only after that acceptance-record head is dual-green may final M4-024 governance
bookkeeping occur. M4-025 remains unauthorized until M4-024 final governance is
closed. PR #3 remains Draft and no merge is authorized by this record.
