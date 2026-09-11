# M4-024 — Deterministic Capability Decision Receipt Construction

Status: **DRAFT NORMATIVE SPECIFICATION**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-024 P0 — decision receipt`  
Depends on: Core Capability model, M4-021 policy evaluation, M4-023 approval routing  
Separated from: M4-025 guarantee assignment, M4-030+ Lease lifecycle, M4-040+ PEP/enforcement

## 1. Purpose

M4-024 defines deterministic construction of the durable broker records that
represent the final post-routing authorization fact:

```text
CapabilityDecision
CapabilityReceipt
```

The Gate consumes an already accepted M4-023 approval-routing result and an
explicit record-issuance context. It does not re-run policy evaluation, approval
routing, Lease validity, guarantee determination or action execution.

M4-024 answers one narrow question:

> Given a final M4-023 routing fact and explicit stable record identifiers,
> timestamps and guarantee input, what schema-conforming immutable Decision and
> broker decision Receipt are emitted without fabricating policy, approval,
> Lease, execution or enforcement provenance?

The produced Receipt is the broker's observation of the decision outcome. It is
not proof that the governed action subsequently executed or succeeded.

## 2. Authority reconciliation

### 2.1 Current v1alpha1 wire authority

The repository already publishes matching CapabilityReceipt shapes in:

```text
schemas/v1alpha1/capability-receipt.schema.json
packages/protocol/src/capability.ts
fixtures/receipt/valid/allowed.json
```

Those artifacts use:

```text
effect
argumentDigest
```

and correlate the action indirectly through:

```text
CapabilityReceipt.requestRef
  -> CapabilityRequest.requestId
  -> CapabilityRequest.actionRef
```

Core §13 currently contains an older illustrative example using `actionRef`,
`outcome`, and `argumentsDigest`. M4-024 protocol-first work corrects that example
to the already published v1alpha1 Schema/TypeScript/fixture shape. No schema or
TypeScript wire-model change is introduced by that reconciliation.

### 2.2 Generic protocol shape versus M4-024 profile

The generic `CapabilityDecision` schema permits effects:

```text
allow | deny | ask
```

The generic `CapabilityReceipt` schema permits effects:

```text
allowed | denied | approval-required | error
```

M4-024 is a **post-M4-023 final-routing profile**. Therefore its normal
construction output is intentionally narrower:

```text
Decision.effect: allow | deny
Receipt.effect:  allowed | denied | error
```

M4-024 MUST NOT emit a new `ask` or `approval-required` result. `ask` has already
been resolved by M4-023 or M4-023 has failed closed.

The broader schema values remain valid for other protocol observation points and
are not removed by this Gate.

## 3. Ordering boundary

The accepted M4 sequence is:

```text
M4-021 policy evaluation
  -> M4-022 Lease candidate lookup
  -> M4-023 approval routing
  -> M4-024 Decision/Receipt construction
  -> M4-025 guarantee assignment semantics / trusted source
  -> later Lease lifecycle and PEP work
```

Because M4-025 follows M4-024 in implementation order, M4-024 may validate and
copy a supplied `guaranteeLevel`, but MUST NOT determine why that guarantee is
true. Production composition cannot treat a caller-chosen guarantee as proof;
M4-025 defines the trusted source and admissibility rules for that input.

## 4. Logical input

```text
DecisionReceiptConstructionInput {
  routing: ApprovalRoutingResult
  issuance: DecisionReceiptIssuanceContext
}

DecisionReceiptIssuanceContext {
  requestRef: ref
  decisionRef: ref
  receiptRef: ref
  guaranteeLevel: GuaranteeLevel
  decidedAt: timestamp
  observedAt: timestamp
}
```

The portable v0.1 M4-024 profile has no optional issuance fields.

This narrow input is deliberate. M4-024 does not receive raw CapabilityRequest
constraints, Resource locators, policy documents, Lease snapshots, approval
provider objects, tool arguments or execution results merely to construct the
record pair.

## 5. Stable identity

### 5.1 Explicit IDs only

M4-024 MUST NOT generate IDs from host randomness, wall-clock time, process IDs,
counters hidden inside the primitive, object identity or attacker-controlled
string concatenation.

The caller supplies three opaque refs:

```text
requestRef
decisionRef
receiptRef
```

Each reuses `defs.ref`:

```text
string
1..512 Unicode code points
```

M4-024 preserves each value exactly. It MUST NOT trim, case-fold,
Unicode-normalize, parse, prefix, hash, or rewrite a ref.

### 5.2 Cross-record coherence

A successful pair MUST satisfy:

```text
decision.requestId  == issuance.requestRef
receipt.requestRef  == issuance.requestRef
receipt.decisionRef == issuance.decisionRef
decision.decisionId == issuance.decisionRef
receipt.receiptRef  == issuance.receiptRef
```

M4-024 does not prove that `issuance.requestRef` belongs to the original M4-023
invocation because M4-023 deliberately returns no attacker-reflecting correlation
field. The orchestration layer MUST pass the original request identity from the
same authorization transaction. Later PEP integration MUST reject cross-request
mixing rather than infer identity from string resemblance.

## 6. Timestamp boundary

`decidedAt` and `observedAt` are explicit caller-supplied protocol timestamps.
M4-024 MUST NOT call `Date.now()`, read host time, use filesystem timestamps or
synthesize time from IDs.

Both values MUST conform to the existing v1alpha1 `defs.timestamp` / JSON Schema
`date-time` contract. A reference implementation MUST use deterministic lexical
and calendar validation compatible with the published schema and MUST NOT rely on
locale-sensitive parsing.

M4-024 does not invent an ordering rule such as `observedAt >= decidedAt`; the
existing protocol/schema does not define such a comparison. It preserves the two
accepted timestamps exactly.

## 7. Guarantee boundary

`guaranteeLevel` is required by both existing CapabilityDecision and
CapabilityReceipt schemas:

```text
advisory
tool-enforced
provider-enforced
process-isolated
```

M4-024 MUST validate that the supplied value is exactly one of those four values
and copy the same value into both records.

M4-024 MUST NOT:

- choose `tool-enforced` because an action is a tool;
- choose `provider-enforced` because a provider exists;
- choose `process-isolated` because a process was requested;
- upgrade/downgrade based on approval outcome;
- inspect Adapter/Harness feature flags to determine a guarantee;
- treat a caller-supplied enum value as proof of enforcement.

M4-025 owns guarantee determination and trusted evidence. Until M4-025 is
accepted, M4-024 construction is a record primitive, not end-to-end proof that a
specific guarantee is justified.

## 8. Routing-result input validation

M4-024 consumes the accepted M4-023 result domain and MUST defensively validate
runtime values that bypass static typing.

Accepted routed results are exact coherent tuples:

```text
ROUTED allow POLICY   APPROVAL_NOT_REQUIRED_POLICY_ALLOW
ROUTED deny  POLICY   APPROVAL_NOT_REQUIRED_POLICY_DENY

ROUTED allow APPROVAL APPROVAL_ALLOWED_ONCE ALLOWED_ONCE
ROUTED deny  APPROVAL APPROVAL_REJECTED     REJECTED
ROUTED deny  APPROVAL APPROVAL_CANCELLED    CANCELLED
ROUTED deny  APPROVAL APPROVAL_UNAVAILABLE  UNAVAILABLE
```

For `routeSource: POLICY`, `approvalOutcome` MUST be absent.

For `routeSource: APPROVAL`, `approvalOutcome` MUST be present and coherent with
the effect/reasonCode tuple above.

Accepted M4-023 `FAIL_CLOSED` results have:

```text
status: FAIL_CLOSED
effect: deny
stage: accepted M4-023 stage
reasonCode: stable accepted upstream/M4-023 reason
```

A malformed or incoherent routing tuple is an M4-024 input failure; it MUST NOT
be coerced into a normal deny record merely because some field is truthy or
stringifiable.

## 9. Routing to durable record mapping

### 9.1 Routed allow

Any accepted M4-023 routed allow constructs:

```text
CapabilityDecision.effect = allow
CapabilityReceipt.effect  = allowed
```

The Decision `reasonCode` is copied from the accepted routing reasonCode.

For approval-backed allow this preserves `APPROVAL_ALLOWED_ONCE` as the durable
reason code without fabricating an approval identifier.

### 9.2 Routed deny

Any accepted M4-023 routed deny constructs:

```text
CapabilityDecision.effect = deny
CapabilityReceipt.effect  = denied
```

The Decision `reasonCode` is copied from the accepted routing reasonCode, thereby
preserving distinctions such as policy deny, rejection, cancellation and
unavailability.

### 9.3 Routing fail closed

An accepted M4-023 `FAIL_CLOSED` fact is itself a valid auditable authorization
outcome. M4-024 constructs:

```text
CapabilityDecision.effect = deny
CapabilityReceipt.effect  = error
```

and copies the stable routing `reasonCode` into the Decision.

`error` is used here to distinguish failure of the authorization path from an
explicit policy/approval denial. It never means allow.

### 9.4 No ask/approval-required emission

M4-024 MUST NOT map any post-routing result to:

```text
CapabilityDecision.effect = ask
CapabilityReceipt.effect  = approval-required
```

If an `ask`-like routing value reaches M4-024, it is malformed input and fails
closed without constructing a pair.

## 10. Decision fields emitted by M4-024

The successful Decision is exactly:

```text
{
  apiVersion: "safe-runtime.dev/v1alpha1",
  kind: "CapabilityDecision",
  decisionId: issuance.decisionRef,
  requestId: issuance.requestRef,
  effect: mapped allow | deny,
  guaranteeLevel: issuance.guaranteeLevel,
  reasonCode: routing.reasonCode,
  decidedAt: issuance.decidedAt
}
```

M4-024 v0.1 deliberately omits optional:

```text
policyRef
matchedRuleRefs
reason
```

### 10.1 Why policyRef is omitted

The existing policy evaluation path does not publish a normative stable
`policyRef` construction grammar. M4-024 MUST NOT synthesize one from
`metadata.name`, file path, policy epoch, object identity, Harness identity or
arbitrary prefixes.

### 10.2 Why matchedRuleRefs is omitted

M4-021 exposes portable rule IDs for deterministic evaluation/explanation, but
Spec 0032 explicitly states those lists are not yet protocol
`CapabilityDecision.matchedRuleRefs`. M4-024 MUST NOT silently turn a rule ID
into a stable rule ref by adding prefixes such as `rule:`.

A future provenance profile may bind authoritative stable policy/rule refs. Their
absence in M4-024 is preferable to fabricated provenance.

### 10.3 Why reason is omitted

The stable `reasonCode` is sufficient for this construction profile. M4-024 does
not copy user-supplied free-text reasons, policy source, exception text, approval
UI text or tool arguments into the durable Decision. This reduces accidental
secret/sensitive-data persistence.

## 11. Receipt fields emitted by M4-024

The successful broker decision Receipt is exactly:

```text
{
  apiVersion: "safe-runtime.dev/v1alpha1",
  kind: "CapabilityReceipt",
  receiptRef: issuance.receiptRef,
  requestRef: issuance.requestRef,
  decisionRef: issuance.decisionRef,
  effect: mapped allowed | denied | error,
  guaranteeLevel: issuance.guaranteeLevel,
  observedAt: issuance.observedAt
}
```

M4-024 v0.1 deliberately omits:

```text
leaseRef
resourceDigest
argumentDigest
resultDigest
```

### 11.1 No leaseRef yet

M4-022 discovers candidates only. M4-030 through M4-034 still own Lease validity,
usage, consume, revoke and attenuation. M4-024 MUST NOT claim a Lease was used by
copying a candidate ref into the Receipt.

### 11.2 No resource/argument digest semantics invented

The protocol exposes optional digest fields but does not yet define an M4-024
canonical byte serialization for Resource or arguments. M4-024 MUST NOT invent
JSON stringify order, locale behavior, shell rendering or provider serialization
and call the result authoritative.

### 11.3 No resultDigest before execution

M4-024 runs before M4-040+ PEP/execution integration. It has no authoritative
result and MUST NOT emit `resultDigest` or claim execution success.

A later execution/audit observation may emit another protocol Receipt or extend
the audit pipeline according to its own normative Gate. M4-024's broker decision
Receipt is not proof of action completion.

## 12. Approval provenance boundary

Core §10 requires approval authorization provenance. M4-023 already established
that the synchronous normalized approval outcome does not itself carry the
Harness-generated durable `approvalRef`.

M4-024 therefore MUST NOT fabricate:

```text
approvalRef
AuthorizationRef(kind=approval)
policyRef
matchedRuleRefs
```

The durable Decision remains correlated to the original CapabilityRequest by
`requestId`; the Receipt remains correlated to that Decision by `decisionRef`.
Authoritative approval event identity remains external correlated audit evidence
until a later provenance/composition profile binds it normatively.

M4-024 does not claim that the Decision/Receipt pair alone is self-contained
proof of the human approval event.

## 13. Immutability and detachment

A successful result contains a detached pair:

```text
{
  status: "CONSTRUCTED",
  decision: CapabilityDecision,
  receipt: CapabilityReceipt
}
```

The outer result and both nested records MUST be immutable. A TypeScript
reference implementation MUST freeze them.

No output object may retain a caller-owned mutable object or array.

## 14. Construction failure contract

M4-024-owned failures are:

```text
DECISION_RECEIPT_INPUT_INVALID
DECISION_RECEIPT_ROUTING_INVALID
DECISION_RECEIPT_ISSUANCE_INVALID
DECISION_RECEIPT_REQUEST_REF_INVALID
DECISION_RECEIPT_DECISION_REF_INVALID
DECISION_RECEIPT_RECEIPT_REF_INVALID
DECISION_RECEIPT_GUARANTEE_INVALID
DECISION_RECEIPT_DECIDED_AT_INVALID
DECISION_RECEIPT_OBSERVED_AT_INVALID
```

Failure shape:

```text
{
  status: "FAIL_CLOSED",
  stage: "INPUT" | "ROUTING" | "ISSUANCE",
  reasonCode: <stable M4-024 reason>
}
```

A construction failure does not fabricate a partial CapabilityDecision or
CapabilityReceipt because an invalid identity/time/guarantee input cannot safely
be persisted as authoritative protocol state.

Failure output MUST NOT echo refs, timestamps, routing reason strings, approval
outcomes, exception messages, stacks or other attacker-controlled values.

## 15. Runtime hostile-object boundary

Portable fixtures are ordinary JSON. Host-language implementations may receive
accessors, Proxies, inherited values, symbols and coercion hooks.

The TypeScript reference implementation MUST read every consumed field through
own data-property descriptors and MUST NOT execute getters or value-coercion
hooks to decide whether construction succeeds.

Inspection order is:

```text
1. outer input exact-key domain
2. routing.status
3. routing fields required by that status
4. issuance exact-key domain
5. requestRef
6. decisionRef
7. receiptRef
8. guaranteeLevel
9. decidedAt
10. observedAt
11. construct detached/frozen records
```

Unexpected own string fields or symbol fields in the narrow outer/issuance
projection fail closed.

The implementation MUST use exact scalar comparisons. It MUST NOT call
`String(value)`, implicit template coercion, locale conversion or generic JSON
serialization on untrusted discriminants/refs/timestamps.

Revoked Proxies, descriptor traps and unreadable own-key enumeration fail closed.

## 16. No persistence implementation yet

Core says Receipts must be persisted after redaction. M4-024 defines the record
construction boundary only. It does not choose a database, append log, event
store, retention policy, encryption scheme or retry protocol.

A caller that persists the constructed pair MUST preserve immutability and apply
the repository's later audit/evidence/retention rules. Green M4-024 construction
must not be described as durable storage already being implemented.

## 17. No action execution authority

A constructed `CapabilityDecision(effect=allow)` plus
`CapabilityReceipt(effect=allowed)` is still not proof that a PEP has enforced
the action or that the action executed.

Before M4-040+ a caller MUST NOT interpret M4-024 as permission to bypass the
required PEP. M4-025 must also establish the actual guarantee semantics used by
production composition.

## 18. Explicit non-goals

M4-024 MUST NOT:

- re-run M4-021 policy evaluation;
- invoke approval or reinterpret M4-023 outcomes;
- generate stable IDs or timestamps from host state;
- determine guarantee level (M4-025);
- synthesize stable policy/rule refs;
- fabricate approval provenance;
- select/validate/consume/revoke/attenuate a Lease (M4-030+);
- assign `leaseRef` from an M4-022 candidate;
- invent Resource/argument digest canonicalization;
- emit `resultDigest` before execution;
- register or enforce a PEP (M4-040+);
- execute a tool/provider operation;
- claim action success;
- implement audit persistence/retention;
- implement M6.

## 19. Portable fixture requirements

Before production implementation is authorized, a language-independent corpus
MUST cover at least:

### Routing mapping

1. policy routed allow -> Decision allow + Receipt allowed;
2. policy routed deny -> Decision deny + Receipt denied;
3. approval ALLOWED_ONCE -> allow/allowed;
4. approval REJECTED -> deny/denied;
5. approval CANCELLED -> deny/denied while reasonCode preserved;
6. approval UNAVAILABLE -> deny/denied while reasonCode preserved;
7. accepted routing fail-closed -> Decision deny + Receipt error;
8. malformed routed ask-like tuple -> construction fail closed;
9. incoherent approval outcome/effect/reason tuple -> construction fail closed.

### Identity/coherence

10. exact requestRef copied to Decision.requestId and Receipt.requestRef;
11. exact decisionRef copied to Decision.decisionId and Receipt.decisionRef;
12. exact receiptRef copied to Receipt.receiptRef;
13. leading/trailing whitespace in schema-valid refs is preserved, not trimmed;
14. empty requestRef fails;
15. overlong decisionRef fails;
16. non-string receiptRef fails.

### Guarantee boundary

17. each of the four existing GuaranteeLevel values is copied identically to both
    records;
18. unknown guarantee fails closed;
19. routing source/outcome never upgrades/downgrades the supplied guarantee.

### Time boundary

20. valid explicit decidedAt/observedAt preserved exactly;
21. malformed decidedAt fails closed;
22. malformed observedAt fails closed;
23. no portable case depends on host current time.

### Output/privacy boundary

24. output omits policyRef/matchedRuleRefs/reason;
25. output Receipt omits leaseRef and all digest fields;
26. routed failure does not echo attacker-controlled issuance values;
27. Decision and Receipt cross-references are internally coherent.

Portable fixtures MUST NOT depend on JavaScript prototypes, accessors, Proxies,
Date objects, host clocks, random UUIDs, Harness types or filesystem state.
Hostile-runtime cases belong to the TypeScript implementation suite after the
protocol-first exact head is dual-green.

## 20. Reference implementation placement

The reference construction primitive SHOULD live in
`packages/capability-broker`, adjacent to M4-023 routing.

It MAY reuse exported M4-023 result types and protocol `GuaranteeLevel`/
CapabilityDecision/CapabilityReceipt structural types, but MUST NOT import
concrete Adapter or Harness types.

No new runtime dependency should be required merely for deterministic record
construction. If timestamp validation needs a helper, prefer a repository-owned
bounded validator over a broad date/time dependency unless a dependency is
proven necessary and exact-pinned under existing supply-chain policy.

## 21. Protocol-first file scope

Relative to M4-023 final-governance head
`be6b5c3ea88d469a1f94cc17a00b965352a877b1`, the M4-024 protocol-first transition
is limited to:

```text
specs/0035-m4-decision-receipt-construction.md
fixtures/decision-receipt/cases.json
specs/0001-safe-runtime-core.md      # receipt-example wire-shape reconciliation only
docs/handoff/CURRENT.md
```

The Core change MUST only reconcile the stale §13 example/wording with the
already published CapabilityReceipt schema/TypeScript/fixture shape. It MUST NOT
change Lease, guarantee, PEP, transaction or execution semantics.

## 22. Protocol-first acceptance gate

Production M4-024 implementation is NOT AUTHORIZED until one exact repository
head contains the protocol-first files above and reaches both:

1. normal CI PASS;
2. exact pinned Harness rc5 source-conformance PASS.

The protocol-first delta MUST NOT contain:

- M4-024 production TypeScript implementation;
- M4-025 guarantee assignment logic;
- schema weakening or unreviewed schema change;
- Shared TCK weakening;
- Adapter/Harness implementation changes;
- dependency or lockfile changes;
- M4-030+ Lease lifecycle behavior;
- M4-040+ PEP behavior;
- M6 work.

Only after same-head dual-green may production M4-024 implementation begin.
M4-025+, M4-030+, M4-040+ and M6 remain unauthorized by this specification.
