# Spec 0012: M3 Adapter DSH Final Result Mapping Shared TCK

Status: DRAFT  
Milestone: M3-013  
Profile: `ADAPTER_DSH`

## 1. Purpose

M3-013 defines the language-independent Shared TCK contract for the DeepSeek
Harness adapter's **authoritative final tool-result mapping**.

Spec 0003 establishes the boundary:

```text
tool.requested = request intent only
tool.completed = observed final outcome
tools/result   = final authoritative live tool outcome for Adapter DSH
```

M3-011 proved request/completion ordering without comparing final outcome fields.
M3-012 proved denied/body-entry behavior without turning body entry into a
normalized runtime event. M3-013 verifies that the accepted final-result source
fact is mapped to the normalized `tool.completed` fields describing that fact.

A tool body's direct return value is not authoritative. Post-execute/finalization
may replace or transform it before final materialization. The Adapter DSH
authority boundary remains the materialized live `tools/result` observation.

DeepSeek Harness remains an adapter target and compatibility baseline, never
portable protocol authority.

## 2. Authorities

This gate is governed by:

1. Spec 0003 for `tool.completed` and `tools/result` authority;
2. Spec 0004 for the Shared TCK envelope and runner verdict model;
3. Spec 0010 only for the accepted `tools/result -> tool.completed`
   correlation/ordering boundary;
4. Spec 0011 only for the separation of request intent, body entry, and final
   outcome;
5. exact Harness `0.1.0-rc.5` only as Adapter DSH compatibility evidence.

No concrete Harness package path, TypeScript type, private module, or agent-loop
implementation detail is portable contract surface.

## 3. Accepted rc5 final-result evidence

The pinned rc5 evidence establishes that:

1. a registered body may return an intermediate value;
2. `tools/post-execute` may replace the model-facing result;
3. ToolRuntime materializes the result after post-execute processing;
4. live `tools/result` observes that materialized result;
5. production Adapter DSH digests that observed result and passes it to
   `normalizeFinalToolResult()`;
6. the later durable model-facing `tool/result` is not projected as a second
   normalized `tool.completed` event.

M3-013 MUST NOT derive final-result fields from durable `tool/call`, body entry,
the body's direct return, expected fixture output, or absence of an earlier
error.

## 4. Operation

M3-013 defines exactly one operation:

```text
final-result-mapping
```

Any other operation MUST fail profile validation before implementation
invocation.

## 5. Stimulus

The profile stimulus is:

```json
{
  "operation": "final-result-mapping",
  "sessionRef": "session:tck",
  "sourceObservation": {
    "source": "tools/result",
    "observedAt": "2026-08-19T02:00:01.000Z",
    "execution": {
      "callId": "call-a",
      "name": "read",
      "arguments": { "path": "a.txt" }
    },
    "result": {
      "isError": false,
      "content": [{ "type": "text", "text": "final-value" }]
    },
    "resultDigest": "sha256:final-result-a"
  }
}
```

`sessionRef`, `observedAt`, `execution.callId`, `execution.name`, and
`resultDigest` are non-empty strings. `execution.arguments` is any portable JSON
value. `callId` maps to `callRef`; `name` maps to `toolName`.

M3-013 accepts exactly one `source: "tools/result"` observation. It does not
re-test batch ordering or replay.

`result` is a portable JSON object containing `isError`. The full object denotes
the materialized final result seen at the authority seam. `resultDigest` is the
digest value supplied with that authoritative source fact.

The Shared TCK does not standardize or recompute a digest algorithm; it verifies
that the source digest is preserved by mapping.

## 6. In-scope result classes

M3-013 defines only:

```text
SUCCESS
GENERIC_ERROR
```

Policy denial, approval unavailable, and cancellation classification are outside
this gate.

### 6.1 SUCCESS

A success result has `isError: false` and MUST NOT contain `error`.
Additional fields may be portable JSON values.

Required mapping:

```text
outcome      = success
resultDigest = source resultDigest
errorCode    = absent
```

Success MUST be based on the final `tools/result` fact, never body entry or
absence of an earlier failure.

### 6.2 GENERIC_ERROR

A generic error has `isError: true`.

`error`, when present, is an object. `error.info`, when present, is an object.
`error.info.code`, when present, is a non-empty string.

The cancellation codes below are forbidden in M3-013 fixtures because their
classification belongs to M3-015:

```text
ABORTED
ABORTED_BEFORE_DISPATCH
```

Required mapping:

```text
outcome      = error
resultDigest = source resultDigest
errorCode    = result.error.info.code when present, otherwise absent
```

An arbitrary non-cancellation error code does not create another portable outcome
class.

## 7. Portable observable

M3-013 compares exactly one observable:

```json
{
  "type": "tool.completed",
  "callRef": "call-a",
  "toolName": "read",
  "outcome": "success",
  "resultDigest": "sha256:final-result-a"
}
```

A generic error may additionally contain:

```json
{
  "errorCode": "TOOL_FAILED"
}
```

The portable observable contains exactly:

```text
type
callRef
toolName
outcome
resultDigest
errorCode?
```

`sessionRef`, `eventRef`, `observedAt`, turn/step refs, argument digests, and root
call lineage remain production fields or other-gate concerns and are excluded
from M3-013 comparison.

## 8. Projection

The source projection is exactly:

```text
tools/result(success)       -> EVENT(tool.completed, outcome=success)
tools/result(generic error) -> EVENT(tool.completed, outcome=error)
```

Every accepted source observation produces exactly one portable
`tool.completed`. There is no `NO_EVENT` form and no synthesis or repair rule.

## 9. Expectation

The only expectation form is:

```json
{
  "kind": "EVENT",
  "event": {
    "type": "tool.completed",
    "callRef": "call-a",
    "toolName": "read",
    "outcome": "success",
    "resultDigest": "sha256:final-result-a"
  }
}
```

Comparison is exact over the Section 7 shape. A valid but different projection is
`FAIL`. Implementation exceptions or malformed/non-portable implementation
output are `ERROR`.

Expected output MUST NOT classify or repair stimulus evidence.

## 10. Fail-closed validation

Before implementation invocation, the runner MUST reject at least:

- unknown operation or unknown profile-owned fields;
- empty `sessionRef`, `observedAt`, `callId`, `name`, or `resultDigest`;
- a source other than `tools/result`;
- missing/non-boolean `result.isError`;
- `isError: false` with an `error` field;
- malformed `error`, `info`, or `code` shapes;
- empty explicit error code;
- `ABORTED` or `ABORTED_BEFORE_DISPATCH`;
- explicit policy-denied/policy-cancelled classification input;
- non-portable JSON values from direct language APIs, including cycles, sparse
  or decorated arrays, exotic objects, symbol properties, or non-finite numbers;
- expectation `callRef`/`toolName` that does not correlate to the source;
- structurally invalid expectation field presence for its outcome.

The runner MUST NOT sort, synthesize, drop, reinterpret, or repair malformed
source facts.

## 11. Oracle independence

Stimulus is source evidence; expectation is only the comparison oracle.

Changing expectation while leaving stimulus unchanged MUST NOT change the input
given to the implementation. In particular, expected `callRef`, `toolName`,
`outcome`, `resultDigest`, or `errorCode` MUST NOT be copied into implementation
output.

## 12. Determinism

Verdict MUST be independent of host time, timezone/locale, sink latency,
scheduler timing, execution duration, randomness, filesystem, process, network,
or environment state.

`observedAt` is source metadata and is not compared. `resultDigest` is explicit
source data; the generic runner does not invoke ambient hashing to regenerate it.

## 13. TypeScript boundary

A TypeScript projection API is non-normative. A non-TypeScript runner may use any
shape preserving the same validation, projection, and exact comparison.

Generic testkit code MUST NOT import Adapter DSH or Harness concrete types and
MUST validate portable JSON before profile semantics.

## 14. Out of scope

M3-013 does not define or verify:

- denied-body-entry semantics beyond preserving accepted M3-012;
- policy-denied final classification;
- approval `UNAVAILABLE` mapping (M3-014);
- cancellation classification, including `ABORTED` and
  `ABORTED_BEFORE_DISPATCH` (M3-015);
- observer disposal (M3-016);
- replay/durable `tool/result` reconciliation (M3-017);
- digest algorithm/canonicalization/version selection;
- direct body-return semantics;
- argument canonicalization/digest;
- turn/step/root-call lineage;
- scheduling/concurrency behavior;
- M4 Capability Broker or M6 Workspace Transaction semantics.

## 15. Exact Harness source-conformance

Exact rc5 conformance MUST use public seams and prove at least:

1. a real registered body returns an intermediate value;
2. public post-execute processing replaces that value;
3. real ToolRuntime returns the post-processed materialized result;
4. real `tools/result` observes the same materialized result;
5. production Adapter DSH emits exactly one correlated `tool.completed`;
6. normalized `resultDigest` comes from the materialized result, not body return;
7. normalized success corresponds to the authoritative result;
8. a real generic-error case maps `isError: true` to `outcome: error`, preserving
   a stable explicit non-cancellation error code when public rc5 seams naturally
   provide one;
9. no concrete agent-loop implementation is imported to manufacture evidence.

If public rc5 seams cannot naturally provide a stable generic error code, exact
conformance MAY prove generic error without one while portable fixtures cover
explicit generic-code preservation. Private Harness representations MUST NOT be
fabricated for the test.

## 16. Acceptance criteria

M3-013 is complete only when:

- this language-independent contract precedes TypeScript/Adapter runner changes;
- portable fixtures cover success, generic error without code, and generic error
  with a non-cancellation code;
- validation rejects malformed, contradictory, cancellation, and non-portable
  evidence before implementation invocation;
- oracle-independence regressions prevent expectation-driven output;
- generic testkit imports no Adapter DSH/Harness concrete type;
- Adapter conformance reuses production `normalizeFinalToolResult()` and
  `tools/result` observation rather than redefining semantics;
- exact rc5 runtime conformance proves post-execute materialization authority;
- success/generic error map correctly without pulling M3-014 or M3-015 forward;
- no digest algorithm is accidentally standardized;
- no M3-014..017, M4, or M6 semantics are pulled into this gate;
- frozen install, normal CI, exact source-conformance, tests, type checks,
  architecture checks, and lint remain green without weakening any gate.
