# Spec 0011: M3 Adapter DSH Denied Body-Entry Shared TCK

Status: DRAFT  
Milestone: M3-012  
Profile: `ADAPTER_DSH`  
Scope: language-independent evidence that an explicitly denied tool call does not enter the registered tool body

## 1. Purpose

M3-012 verifies one narrow safety property:

> when Adapter DSH explicitly denies a tool call before execution, the
> registered tool body MUST NOT be entered for that call.

The property is intentionally separate from request ordering and final-result
mapping. M3-011 already verifies request/completion ordering. M3-013 owns final
result content, digest, and broader outcome-authority semantics.

M3-012 does not add a normalized `body.entered` runtime event. Body entry is
TCK-side execution evidence only.

## 2. Authority boundary

The semantic authorities for this gate are:

1. Spec 0003 for the existing distinction between `tool.requested` intent and
   `tool.completed` final observation;
2. Spec 0006 for the language-independent test distinction between `REQUESTED`,
   `BODY_ENTERED`, and `OUTCOME`, including the rule that `DENIED` does not enter
   the fake body;
3. the accepted Adapter DSH policy ports and runtime-event vocabulary already
   implemented during M2;
4. the exact pinned Harness `0.1.0-rc.5` source baseline only as
   adapter-compatibility evidence.

No concrete Harness package path, TypeScript type, private agent-loop path, or
scheduler implementation detail is part of the portable fixture contract.

## 3. What counts as proof

Absence alone is insufficient denial evidence. A conforming M3-012 execution
must establish both:

1. an explicit denial fact for the correlated tool call; and
2. explicit test-side body-entry instrumentation showing that the denied call did
   not enter the registered body.

A missing `tool.completed`, timeout, thrown runner exception, missing callback,
or lack of body evidence MUST NOT be silently reinterpreted as a successful
M3-012 denial proof.

The portable projection therefore contains both `decision: "DENIED"` and
`bodyEntered: false`.

## 4. Fixture operation

M3-012 uses exactly:

```text
profile = ADAPTER_DSH
stimulus.operation = "denied-body-entry"
```

Unknown operations fail before the implementation under test is invoked.

## 5. Portable stimulus

The stimulus is ordinary JSON:

```json
{
  "operation": "denied-body-entry",
  "call": {
    "callRef": "deny-1",
    "toolName": "mutate",
    "arguments": {
      "value": 1
    }
  },
  "policy": {
    "decision": "DENY"
  }
}
```

Rules:

- `callRef` and `toolName` MUST be non-empty strings;
- `arguments` MUST be portable JSON;
- `policy.decision` is exactly `DENY` in M3-012;
- unknown fields are rejected;
- the policy object is TCK setup data. It does not define Capability Broker,
  leases, approval precedence, or generic authorization semantics.

M3-012 does not standardize denial reason text or error codes because they are
not needed to prove the body-entry invariant.

## 6. Portable observable

A conforming implementation projects exactly:

```json
{
  "kind": "DENIAL_BODY_ENTRY",
  "callRef": "deny-1",
  "toolName": "mutate",
  "decision": "DENIED",
  "bodyEntered": false
}
```

Meaning:

- `callRef` and `toolName` correlate the evidence to the requested call;
- `decision: "DENIED"` is an explicit denial fact, not an inference from missing
  execution evidence;
- `bodyEntered: false` is produced from explicit test-side body instrumentation;
- no result content, result digest, error payload, approval outcome, timestamps,
  event refs, turn refs, step refs, or scheduling fields are portable M3-012
  observables.

A projection with a different decision, missing/extra fields, empty correlation
fields, or a non-boolean `bodyEntered` is malformed implementation output and
must produce runner `ERROR`, not `PASS`.

## 7. Expectation

The expectation shape is exactly:

```json
{
  "kind": "DENIAL_BODY_ENTRY",
  "callRef": "deny-1",
  "toolName": "mutate",
  "decision": "DENIED",
  "bodyEntered": false
}
```

Comparison is exact over these five fields.

For an M3-012 fixture, `expect.bodyEntered` MUST be `false` and
`expect.decision` MUST be `DENIED`. A fixture that asks M3-012 to prove an
allowed call or successful body entry is malformed profile input rather than a
negative conformance case.

## 8. Runner classification

The profile runner follows Spec 0004 result semantics:

- `PASS`: a valid implementation projection exactly matches the fixture oracle;
- `FAIL`: the implementation completed with a valid M3-012 projection that
  contradicts the oracle, including `bodyEntered: true` for the denied call;
- `ERROR`: the implementation throws, cannot complete, or returns malformed
  projection data;
- invalid fixture/profile data fails before implementation invocation.

`ERROR` MUST NOT be converted to `PASS` merely because no body entry was
observed.

## 9. Adapter DSH projection rule

Adapter DSH conformance must use existing production policy/binding behavior. It
must not add a second denial mechanism solely for the TCK.

The Adapter DSH projection must establish the denial fact from an explicit
adapter/runtime decision seam and establish body entry from a dedicated
instrumented registered tool body. It must not use "no completion event" as the
body-entry oracle.

The portable projection intentionally drops final-result content/digest and
other M3-013-owned fields.

## 10. Exact pinned rc5 conformance

Exact-source conformance must execute the public pinned rc5 ToolRuntime seam with
an actually registered tool body.

At minimum it must:

1. register one real tool whose body records the correlated call entry;
2. prove the instrumentation is live with an ordinary non-denied control call or
   an equivalently explicit positive body-entry control;
3. register Adapter DSH policy returning `DENY` for the target call;
4. execute the denied call through real ToolRuntime;
5. observe an explicit denial/error result from the runtime path;
6. prove the denied call did not add a body-entry record;
7. avoid private agent-loop imports.

The positive instrumentation control is test validity evidence. It does not
expand the portable M3-012 fixture vocabulary to `ALLOW`.

## 11. Fail-closed requirements

A conforming M3-012 implementation must reject or error rather than repair:

- unknown fixture fields;
- non-portable JSON arguments;
- unsupported policy decision values;
- call/tool-name correlation mismatch;
- malformed implementation projection;
- implementation exceptions;
- attempts to substitute missing evidence for an explicit denial fact.

No wall clock, scheduler timing, ambient randomness, or fixture expectation may
be used to synthesize denial or body-entry facts.

## 12. Out of scope

M3-012 does not define or complete:

- M3-013 final result content/digest/general outcome authority;
- M3-014 approval unavailable behavior;
- M3-015 cancellation;
- M3-016 disposal semantics;
- M3-017 replay reconciliation;
- Capability Broker policy semantics, leases, delegation, or default-deny rules;
- filesystem/subprocess isolation;
- Workspace Transaction;
- new normalized runtime event types.

## 13. Acceptance criteria

M3-012 is complete only when:

- this language-independent contract exists before its TypeScript projection;
- at least one portable `ADAPTER_DSH` denied-body fixture is registered in the
  shared fixture manifest;
- the generic testkit validates fixture and projection boundaries fail-closed;
- the expected oracle is independent from the implementation projection;
- Adapter DSH conformance uses existing production behavior rather than a
  TCK-only denial path;
- exact pinned rc5 conformance proves real denied execution does not enter the
  registered body and includes a positive instrumentation control;
- no production event vocabulary or M3-013 final-result contract is expanded;
- frozen install, architecture/schema/type checks, all tests, and lint remain
  clean.
