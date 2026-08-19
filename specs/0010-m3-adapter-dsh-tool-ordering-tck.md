# Spec 0010: M3 Adapter DSH Tool Ordering Shared TCK

Status: DRAFT  
Milestone: M3-011  
Profile: `ADAPTER_DSH`

## 1. Purpose

M3-011 defines the language-independent Shared TCK contract for the DeepSeek
Harness adapter's **tool request/completion ordering evidence**.

The profile verifies the ordering relationship already established by Spec 0003:

```text
durable tool/call -> tool.requested
live tools/result -> tool.completed
```

A `tool/call` proves request intent only. It does not prove that a tool body was
entered, that policy allowed execution, or that execution succeeded. A
`tools/result` observation is the accepted final-outcome source boundary for the
adapter, but M3-011 compares only ordering/correlation fields; M3-013 remains the
gate for final-result mapping semantics.

DeepSeek Harness remains an adapter target and compatibility baseline. Harness
names may appear in this `ADAPTER_DSH` stimulus because they identify the
source seam under test; they do not become generic safe-runtime protocol names.

## 2. Authorities

The authorities for this gate are:

1. Spec 0003 for normalized `tool.requested` / `tool.completed` semantics and
   the intent-versus-final-outcome boundary;
2. Spec 0004 for the Shared TCK envelope and runner status model;
3. the accepted exact Harness `0.1.0-rc.5` source baseline only for
   adapter-specific compatibility evidence.

No concrete `@deepseek-ai/*` package path, TypeScript type name, private Harness
module path, or agent-loop implementation detail is part of this portable
fixture contract.

## 3. Accepted rc5 ordering evidence

The accepted pinned rc5 source baseline establishes these compatibility facts:

1. the durable `tool/call` session event is appended before execution begins;
2. tool dispatch/body execution may overlap for parallel calls;
3. completed results are finalized and committed in model order;
4. `tools/result` is emitted synchronously after final content normalization and
   before the durable model-facing `tool/result` session event is appended;
5. `tools/result` is therefore a live observation seam while `tool/call` is a
   durable `session/event` seam.

M3-011 preserves this split. It MUST NOT remodel `tools/result` as a durable
session event merely to make the fixture shape uniform.

## 4. Operation

M3-011 defines one profile operation:

```text
tool-ordering
```

A fixture using another operation is not an M3-011 fixture and MUST fail
profile-semantic validation before the implementation under test is invoked.

## 5. Stimulus

The profile stimulus is:

```json
{
  "operation": "tool-ordering",
  "sessionRef": "session:tck",
  "sourceObservations": []
}
```

`sessionRef` is a non-empty opaque string.

`sourceObservations` is the authoritative observation order. The runner MUST NOT
reorder the array using durable sequence numbers, timestamps, live observation
times, completion duration, scheduler behavior, or expected output.

M3-011 accepts exactly two source-observation forms.

### 5.1 Durable tool request evidence

```json
{
  "source": "session/event",
  "type": "tool/call",
  "seq": 20,
  "time": 1770000000000,
  "data": {
    "turn": 4,
    "step": 1,
    "callId": "call-a",
    "name": "read",
    "arguments": "{\"path\":\"a.txt\"}"
  }
}
```

Requirements:

- `seq`, `time`, `turn`, and `step` are non-negative safe JSON integers;
- `callId`, `name`, and `arguments` are strings;
- `callId` and `name` are non-empty;
- `arguments` is the raw Harness durable string and is not parsed by this
  profile;
- durable `tool/call` `seq` values are strictly increasing in their observed
  order, but gaps are allowed because unrelated durable events may exist;
- each `callId` occurs exactly once as a request in one fixture.

The raw `arguments` string is preserved only so an Adapter DSH implementation
can exercise the existing production normalization path. M3-011 does not compare
its digest and does not define argument canonicalization semantics.

### 5.2 Live final-result evidence

```json
{
  "source": "tools/result",
  "observedAt": "2026-08-19T02:00:01.000Z",
  "execution": {
    "callId": "call-a",
    "name": "read",
    "arguments": { "path": "a.txt" }
  },
  "result": {
    "isError": false
  },
  "resultDigest": "sha256:fixture-result-a"
}
```

Requirements:

- `observedAt`, `execution.callId`, `execution.name`, and `resultDigest` are
  non-empty strings;
- `execution.arguments` is any portable JSON value;
- for M3-011, `result` contains exactly `isError: false`;
- every `tools/result` must correlate to an earlier `tool/call` with the same
  `callId` and `name`;
- each requested call has exactly one `tools/result` in an M3-011 fixture.

The successful result restriction is deliberate profile scoping, not a claim
that Harness tools cannot fail. Error/denial/cancellation classification is not
needed to prove ordering and remains outside this gate.

`observedAt` and `resultDigest` are source snapshot inputs needed by the current
Adapter DSH final-result normalizer. M3-011 MUST NOT use either value to decide
ordering and MUST NOT compare them as portable output.

## 6. Fixture grammar

One M3-011 fixture represents one completed tool batch inside one Harness step.
All durable `tool/call` observations in the fixture MUST therefore reference the
same `turn` and `step`.

The grammar permits both normal rc5 scheduling forms:

### 6.1 Barrier / sequential form

```text
call(A) -> result(A) -> call(B) -> result(B)
```

### 6.2 Parallel-dispatch, model-order-commit form

```text
call(A) -> call(B) -> result(A) -> result(B)
```

More calls may be present, and the two forms may compose as long as the
following invariant holds:

> A result MUST complete the earliest requested call that has not yet produced a
> result.

Consequently these are profile-semantic errors:

```text
result(A) before call(A)
call(A) twice
result(A) twice
call(A), call(B), result(B), result(A)
call(A) with result(A) carrying a different tool name
end of fixture while a requested call has no result
```

Profile-semantic rejection of an incomplete fixture is a TCK input rule. It does
not claim that every possible Harness history is complete. The pinned rc5
scheduler documents a terminal internal scheduler failure that may preserve
already-recorded `tool/call` facts without fabricating results; recovery/replay
adjudication for such histories remains outside M3-011.

Malformed or reordered fixture evidence MUST be rejected explicitly before
invoking the implementation. The runner MUST NOT repair it by sorting,
synthesizing a missing result, dropping a duplicate, or consulting expected
output.

## 7. Portable ordering observables

M3-011 compares only:

```json
{
  "type": "tool.requested",
  "callRef": "call-a",
  "toolName": "read"
}
```

and:

```json
{
  "type": "tool.completed",
  "callRef": "call-a",
  "toolName": "read"
}
```

Array order is significant.

The following existing normalized fields are intentionally excluded from the
M3-011 portable observable:

```text
sessionRef
eventRef
observedAt
turnRef
stepRef
argumentsDigest
outcome
resultDigest
errorCode
rootCallRef
```

Their exclusion does not remove them from production runtime events. It prevents
this ordering gate from accidentally becoming an argument-digest, outcome, final
result, or lineage contract.

## 8. Source-to-normalized projection

The required M3-011 projection is:

```text
session/event: tool/call -> EVENT(tool.requested)
tools/result             -> EVENT(tool.completed)
```

Every accepted source observation therefore produces exactly one ordering
observable. M3-011 has no `NO_EVENT` source form.

The implementation may produce richer normalized runtime events internally, but
the Shared TCK projection MUST reduce them to the portable observable shape in
Section 7 before comparison.

## 9. Expectation

The only M3-011 expectation form is:

```json
{
  "kind": "EVENTS",
  "events": [
    { "type": "tool.requested", "callRef": "call-a", "toolName": "read" },
    { "type": "tool.completed", "callRef": "call-a", "toolName": "read" }
  ]
}
```

Comparison is exact and order-sensitive over the Section 7 shapes.

If an implementation:

- omits an expected request/completion;
- emits an extra ordering observable;
- reverses request/completion order;
- completes calls in a different correlation order; or
- changes `callRef` / `toolName` correlation,

then the fixture verdict is `FAIL`.

An implementation exception is runner `ERROR`; it MUST NOT be translated into
PASS or silently ignored.

## 10. Determinism

Given the same fixture and implementation/configuration, the verdict MUST be
independent of:

- host wall clock;
- timezone or locale;
- asynchronous sink latency;
- event-loop/thread scheduling;
- tool execution duration;
- ambient randomness;
- filesystem, process, network, or environment state.

`sourceObservations` array order is authoritative. In particular, an M3-011
fixture MAY intentionally contain live `observedAt` values that are not
monotonic. A conforming runner still preserves source observation order.

## 11. TypeScript projection boundary

A TypeScript testkit implementation may expose a per-observation projection API,
but that API is not normative. A non-TypeScript runner may use any implementation
shape that preserves the same fixture validation, projection, and exact ordered
comparison semantics.

Direct TypeScript callers can construct values that JSON cannot represent.
Therefore the reference testkit projection MUST reject non-portable input such
as cyclic values, sparse arrays, named/symbol array properties, exotic objects,
and non-finite numbers before interpreting profile semantics.

## 12. Out of scope

M3-011 does not implement or verify:

- whether a denied call enters a tool body (`M3-012`);
- whether a final result digest/content reflects post-execute/finalize authority
  (`M3-013`);
- approval-unavailable behavior (`M3-014`);
- cancellation behavior (`M3-015`);
- observation disposal (`M3-016`);
- replay reconciliation or incomplete-history recovery (`M3-017`);
- tool argument canonicalization;
- tool policy or approval classification;
- tool dispatch concurrency limits;
- performance/timing of tool execution;
- durable `tool/result` projection as a second `tool.completed` event;
- M4 Capability Broker or M6 Workspace Transaction semantics.

M3-011 MUST NOT use request evidence as body-entry or success evidence.

## 13. Exact Harness source-conformance requirement

The reference Adapter DSH implementation MUST remain green against the accepted
exact rc5 source baseline.

The source-conformance layer for this gate MUST exercise real public rc5 seams and
prove at least one correlated call where:

1. a real `Session.append("tool/call", ...)` produces the adapter's
   `tool.requested` observation;
2. real `ToolRuntime.execute()` later emits `tools/result` and produces
   `tool.completed` for the same call;
3. the adapter sink observes `tool.requested` before `tool.completed` even when
   sink acceptance is asynchronous;
4. the correlation uses the same call id and tool name;
5. no concrete agent-loop implementation is imported into the adapter or
   portable TCK merely to manufacture ordering evidence.

The pinned rc5 source itself remains the compatibility authority for the broader
scheduler fact that parallel dispatch still commits results in model order. The
portable multi-call fixtures encode that accepted fact without turning the
private scheduler implementation into a protocol dependency.

## 14. Acceptance criteria

M3-011 is complete only when:

- this language-independent contract exists before the TypeScript/Adapter DSH
  runner projection;
- portable fixtures cover a single correlated call, model-order completion of a
  multi-call batch, and barrier/sequential ordering;
- profile validation rejects result-before-request, duplicate, missing,
  mismatched, and reordered evidence before invoking the implementation;
- non-monotonic live observation timestamps cannot change source order;
- the TypeScript testkit imports no Adapter DSH or Harness concrete type;
- Adapter DSH conformance uses the existing production normalization paths;
- exact pinned rc5 runtime conformance proves the real public cross-seam
  `tool/call -> tools/result` ordering for a correlated call;
- request intent is never treated as body-entry or success evidence;
- portable comparison does not assert final result content/digest/outcome;
- no M3-012..017, M4, or M6 semantics are pulled into this gate;
- frozen install, normal CI, exact rc5 source-conformance, tests, type checks,
  architecture checks, and lint remain green without weakening any existing
  gate.
