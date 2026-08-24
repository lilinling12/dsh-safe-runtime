# Spec 0014: M3 Adapter DSH Cancellation Shared TCK

Status: DRAFT  
Milestone: M3-015  
Profile: `ADAPTER_DSH`

## 1. Purpose

M3-015 defines a language-independent Shared TCK contract for cancellation facts
that the DeepSeek Harness adapter already exposes through two different public
seams:

1. an approval request may resolve to the explicit approval decision
   `CANCELLED`;
2. an authoritative final tool result may carry one of the exact accepted
   cancellation error codes `ABORTED` or `ABORTED_BEFORE_DISPATCH`.

The profile exists to prove that these source facts remain explicit, correlated,
and fail closed. It does not make DeepSeek Harness semantics protocol authority.

## 2. Authority boundary

The portable contract MUST preserve the following separation:

- approval cancellation authority comes from an explicit approval decision;
- final tool cancellation authority comes from the authoritative final-result
  seam established by Spec 0003 and M3-013;
- request intent and body-entry evidence are not final-result authority;
- an AbortSignal is an Adapter/runtime mechanism used to produce exact
  compatibility evidence, not a portable JSON protocol object;
- missing output, elapsed time, exception prose, human-readable denial text, or
  an arbitrary error code MUST NOT be promoted to cancellation evidence.

DeepSeek Harness remains compatibility evidence only. Portable fixtures MUST NOT
contain concrete Harness package paths, classes, symbols, or private runtime
objects.

## 3. Operation

The M3-015 operation is:

```text
cancellation
```

Every fixture uses profile `ADAPTER_DSH` and exactly one cancellation source
fact.

## 4. Cancellation source facts

M3-015 recognizes exactly two source-fact families.

### 4.1 Approval decision cancellation

Portable source form:

```json
{
  "kind": "APPROVAL_DECISION",
  "decision": "CANCELLED",
  "audit": "DURABLE_PAIR"
}
```

The source fact means an approval service produced the explicit decision
`CANCELLED` for the fixture request and the decision is represented by one
correlated durable approval ask/decision pair.

Required semantics:

- `CANCELLED` is distinct from `REJECTED` and `UNAVAILABLE`;
- only `ALLOWED_ONCE` authorizes execution;
- a cancelled approval remains fail closed;
- the portable profile does not infer cancellation from the mere presence of a
  cancellation-capable signal;
- Adapter-specific conformance SHOULD use an explicit public cancellation
  mechanism, such as an AbortSignal, to prove how the real runtime reaches this
  source fact.

Portable observable:

```json
{
  "kind": "APPROVAL_CANCELLATION",
  "decision": "CANCELLED",
  "audit": "DURABLE_PAIR"
}
```

Harness-generated approval identifiers remain Adapter evidence and are not
promoted into the portable expectation.

### 4.2 Authoritative final tool-result cancellation

Portable source form:

```json
{
  "kind": "FINAL_TOOL_RESULT",
  "source": "tools/result",
  "observedAt": "2026-08-20T00:00:00.000Z",
  "execution": {
    "callId": "cancel-1",
    "name": "mutate",
    "arguments": {}
  },
  "result": {
    "isError": true,
    "error": {
      "info": {
        "code": "ABORTED"
      }
    }
  },
  "resultDigest": "digest:cancelled-result"
}
```

The only accepted final-result cancellation codes in M3-015 are:

```text
ABORTED
ABORTED_BEFORE_DISPATCH
```

A conforming projection maps either exact code to one normalized final event:

```json
{
  "kind": "TOOL_CANCELLATION",
  "callRef": "cancel-1",
  "toolName": "mutate",
  "outcome": "cancelled",
  "resultDigest": "digest:cancelled-result",
  "errorCode": "ABORTED"
}
```

The final result MUST have `isError: true`. A successful result carrying a
cancellation code is contradictory evidence and MUST fail fixture validation.
The exact source error code and supplied authoritative result digest are
preserved in the observable.

M3-015 does not standardize a digest algorithm, canonicalization format, or
version. As in M3-013, `resultDigest` is explicit authoritative fixture data.

## 5. Relationship between the two source families

Approval cancellation and final tool-result cancellation are related but are not
aliases.

A real runtime may use the same cancellation signal while an approval request is
pending and later materialize a final tool result. Exact Adapter conformance MAY
therefore demonstrate both source families in one real execution, provided that:

1. the approval decision is independently proven as `CANCELLED`;
2. the final tool result is independently proven by the authoritative
   `tools/result` source and an accepted exact cancellation code when that code
   is the classification authority;
3. neither source is manufactured from the other fixture's expected value.

The production Adapter also supports an explicit approval-correlation path for a
final error result. When a durable `approval/decided(CANCELLED)` fact is
correlated to the same call that later emits an authoritative error
`tools/result`, that approval decision is the cancellation classification fact
for the final normalized `tool.completed` outcome even if the Harness error
result itself carries no accepted cancellation code. This does not broaden the
final-result code set: without the correlated approval-cancelled fact, an
unrecognized or missing error code remains a generic error.

A conforming Adapter proof of this correlation MUST show all of the following:

- the approval ask/decision pair refers to the same call as the final result;
- the approval decision is exactly `CANCELLED`;
- the final `tools/result` still exists and is authoritative for final result
  materialization/digest;
- the Adapter does not infer cancellation from denial text or a missing code;
- a mismatched call correlation cannot classify another tool result as
  cancelled.

The portable contract does not create a third synthetic "combined cancellation"
event. Approval cancellation remains the source authority; final-result
materialization remains the M3-013 authority for the completed tool evidence.

## 6. Exact code boundary

Cancellation classification is closed over the two accepted final-result codes
when no independently correlated approval-cancelled fact exists. For example:

```text
ABORTED                  -> cancellation
ABORTED_BEFORE_DISPATCH  -> cancellation
TOOL_FAILED              -> not cancellation by code
TOOL_DENIED              -> not cancellation by code
"request aborted" text  -> not cancellation authority
missing result           -> not cancellation authority
```

An implementation MUST NOT use substring, prefix, exception-name, message-text,
or timing heuristics to broaden this set.

M3-013 generic-error behavior remains authoritative for non-cancellation tool
errors.

## 7. Relationship to body entry and denial

M3-015 does not reopen the M3-012 body-entry contract and does not add a
normalized `body.entered` event.

Exact pinned-runtime tests SHOULD prove the real source semantics behind the two
accepted tool cancellation codes, including that a pre-dispatch cancellation
can occur before a registered body is invoked and that an after-entry
cancellation can materialize after the body has started. Those are compatibility
proofs for the source facts, not new portable body-entry events.

Policy denial remains a distinct final outcome. A denial fact MUST NOT be
reclassified as cancellation merely because execution did not enter the body.
An approval-cancelled correlation is not ordinary policy denial: it must be
backed by the explicit approval decision and matching call correlation defined in
section 5.

## 8. Fixture shape

The portable stimulus contains:

```text
operation
request
sourceFact
```

`request` contains:

```text
sessionRef
toolName
callRef?   // optional for approval-only cases; required for final tool-result cases
reason?
```

For `APPROVAL_DECISION`, `sourceFact` is the closed approval cancellation form
from section 4.1.

For `FINAL_TOOL_RESULT`, `sourceFact` is the authoritative final-result form from
section 4.2 and its `execution.callId` / `execution.name` MUST correlate with the
fixture request `callRef` / `toolName`.

Unknown fields and unknown source kinds fail fixture validation.

## 9. Runner semantics

The generic Shared TCK runner preserves the foundation statuses:

```text
PASS
FAIL
ERROR
```

For M3-015:

- malformed or contradictory portable fixture data -> fixture validation error;
- implementation throws -> `ERROR`;
- implementation returns a malformed projection -> `ERROR`;
- valid projection differs from the expected observable -> `FAIL`;
- exact match -> `PASS`.

Expectation data is comparison-only. The runner MUST NOT use `expect` to infer
which cancellation source fact occurred.

## 10. Required portable cases

At minimum, M3-015 MUST register portable fixtures for:

1. explicit approval decision `CANCELLED` with `DURABLE_PAIR` audit;
2. authoritative final tool result with `ABORTED_BEFORE_DISPATCH`;
3. authoritative final tool result with `ABORTED`.

Negative/boundary tests MUST additionally prove that:

- approval `REJECTED`, `UNAVAILABLE`, and `ALLOWED_ONCE` cannot masquerade as
  cancellation;
- arbitrary final-result error codes cannot masquerade as cancellation;
- `isError: false` cannot carry an accepted cancellation classification;
- missing or malformed correlation fails closed;
- non-portable values, decorated/sparse arrays, exotic objects, and cycles fail
  validation;
- implementation exceptions and malformed projections produce runner `ERROR`;
- expected data cannot manufacture cancellation output.

The production Adapter bridge/exact evidence MUST additionally cover the
approval-cancelled final-result correlation defined in section 5. A separate
portable source kind is not required because the classification authority is the
already-defined approval decision.

## 11. Exact pinned rc5 conformance

Exact source-conformance against the accepted Harness baseline
`0.1.0-rc.5` / `47f943859bef60e4160492346772ded9b24f765a`
MUST use public seams only.

The exact proof MUST cover:

1. approval cancellation through the real ApprovalService and an explicit
   AbortSignal/public cancellation mechanism, with durable
   `approval/asked + approval/decided(cancelled)` correlation;
2. a real ToolRuntime execution cancelled before body dispatch, materializing
   `isError: true` and exact code `ABORTED_BEFORE_DISPATCH`;
3. a real ToolRuntime execution whose body has started and cooperatively settles
   after caller cancellation, materializing `isError: true` and exact code
   `ABORTED`;
4. production Adapter observation mapping those final results to
   `tool.completed/outcome=cancelled` while preserving the exact error code and
   final-result digest;
5. production Adapter approval-cancelled correlation: a real
   `approval/decided(cancelled)` for a call plus that call's authoritative final
   error result maps the same call to `tool.completed/outcome=cancelled` without
   relying on denial/error prose or broad error-code inference;
6. no result sorting, synthesis, private-field access, or exception-text
   inference.

If a real ASK/cancellation execution is used as a combined proof, approval and
final-result assertions MUST remain separately observable and correlated.

## 12. Deferred behavior

M3-015 deliberately does not define:

- subscription/policy/guard disposal semantics (M3-016);
- replay/live reconciliation or crash-tail recovery (M3-017);
- Capability Broker semantics (M4);
- Workspace Transaction semantics (M6);
- hard process cancellation or kernel-enforced interruption guarantees;
- a new normalized cancellation event beyond the already accepted approval and
  tool-completion vocabularies.

## 13. Acceptance criteria

M3-015 is complete only when:

- this language-independent contract exists before TypeScript implementation;
- the required portable fixtures are registered;
- `@dsh-safe/testkit` provides strict parse/run projection without Harness imports;
- boundary tests prove exact source-family and exact-code discrimination;
- production Adapter normalization and approval-cancelled correlation are
  exercised directly where applicable;
- exact pinned rc5 source-conformance proves real approval and ToolRuntime
  cancellation through public seams;
- normal CI and exact pinned rc5 source-conformance are green on the exact
  implementation head;
- TypeScript strictness, schemas, validators, compatibility baseline, frozen
  lockfile, architecture/security gates, and security claims remain unchanged or
  stronger.
