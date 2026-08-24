# Spec 0006: M3 Fake Tool Runtime Test Service

Status: DRAFT  
Milestone: M3-005  
Scope: language-independent deterministic fake tool execution semantics for Shared TCK tests

## 1. Purpose

The M3 fake tool runtime is deterministic test infrastructure. It lets Shared
TCK scenarios distinguish a tool request from body entry and from the final
observable outcome without invoking a real tool host, DeepSeek Harness,
filesystem, subprocess, network service, or reference runtime.

This specification does **not** define production tool dispatch, capability
policy, authorization, or Harness event semantics. It defines only the minimum
portable fake behavior needed by later TCK scenarios.

## 2. Authority boundary

The fake MUST NOT:

- treat a request as proof that a tool body executed or succeeded;
- define capability policy, lease, approval, or authorization precedence;
- import DeepSeek Harness package names or concrete event types into the shared
  contract;
- execute fixture strings as commands, paths, module names, URLs, or code;
- use host time, randomness, locale, scheduling, filesystem, subprocess, network,
  or environment state to decide an outcome;
- silently continue when its script is malformed or exhausted.

The fake is a test service. A later TCK consumer decides how its portable
observations relate to higher-authority protocol behavior.

## 3. Portable request

A request is ordinary JSON data:

```json
{
  "callRef": "call-1",
  "toolName": "demo.echo",
  "arguments": {
    "value": 1
  }
}
```

`callRef` and `toolName` MUST be non-empty strings. `arguments` MUST be a JSON
value. Unknown request fields are rejected by a conforming profile projection
rather than becoming hidden semantics.

A request only establishes intent. It never establishes body entry, completion,
or success.

## 4. Scripted outcomes

A fake instance receives one ordered script before the first request. Every
successfully accepted request consumes exactly one entry from the head of the
remaining script.

The portable entry vocabulary is exactly:

### `RESULT`

```json
{
  "kind": "RESULT",
  "result": {
    "content": "ok"
  }
}
```

`result` is the final fake-runtime result and MUST be a JSON value.

### `ERROR`

```json
{
  "kind": "ERROR",
  "errorCode": "SCRIPTED_TOOL_FAILURE"
}
```

`ERROR` simulates a tool body that was entered and then produced a deliberate
portable failure outcome. `errorCode` MUST be a non-empty string. The fake does
not assign production meaning to caller-selected error codes.

### `DENIED`

```json
{
  "kind": "DENIED",
  "errorCode": "SCRIPTED_TOOL_DENIAL"
}
```

`DENIED` simulates rejection before body entry. `errorCode` MUST be a non-empty
string.

Unknown kinds and unknown fields are rejected before they can produce an
outcome.

## 5. Execution model

For one request with one available script entry:

1. validate and defensively copy the request;
2. obtain the next scripted entry;
3. append a `REQUESTED` trace entry;
4. if the scripted kind is `RESULT` or `ERROR`, append `BODY_ENTERED`;
5. append an `OUTCOME` trace entry containing the exact scripted outcome;
6. return the outcome unchanged in meaning.

For `DENIED`, step 4 MUST NOT occur.

A deliberate scripted `ERROR` is a tool outcome. It MUST NOT be confused with a
fake-runtime infrastructure error.

## 6. Portable trace

The fake trace is ordered test evidence and is not the safe-runtime normalized
event vocabulary.

Each trace entry contains a one-based global `sequence` and one-based
`callOrdinal`.

The only phases are:

```text
REQUESTED
BODY_ENTERED
OUTCOME
```

Shapes:

```json
{
  "sequence": 1,
  "callOrdinal": 1,
  "phase": "REQUESTED",
  "request": {
    "callRef": "call-1",
    "toolName": "demo.echo",
    "arguments": { "value": 1 }
  }
}
```

```json
{
  "sequence": 2,
  "callOrdinal": 1,
  "phase": "BODY_ENTERED",
  "callRef": "call-1"
}
```

```json
{
  "sequence": 3,
  "callOrdinal": 1,
  "phase": "OUTCOME",
  "callRef": "call-1",
  "outcome": {
    "kind": "RESULT",
    "result": { "content": "ok" }
  }
}
```

A denied request produces `REQUESTED` followed directly by `OUTCOME` with
`kind: "DENIED"`. The absence of `BODY_ENTERED` is the portable observation that
the body was not entered.

Trace reads MUST NOT expose mutable internal state that can alter later fake
behavior.

## 7. Exhaustion and malformed input

Script exhaustion is a fake-runtime infrastructure error, not a tool outcome.
The stable machine-readable code is:

```text
FAKE_TOOL_SCRIPT_EXHAUSTED
```

An exhausted request MUST NOT append fake execution trace entries, because no
scripted tool behavior was available to execute.

Malformed scripts fail closed before the first request with:

```text
FAKE_TOOL_INVALID_SCRIPT
```

Malformed requests fail before trace mutation with:

```text
FAKE_TOOL_INVALID_REQUEST
```

Implementation exception class names and stack traces are non-portable.

## 8. Shared TCK fixture projection

M3-005 fixtures use the `FULL` profile with:

```text
stimulus.operation = "tool.sequence"
```

This usage selects the generic shared-runtime TCK namespace for the fake tool
service. It does not claim that a fixture exercises an end-to-end production
runtime.

`stimulus.script` contains the ordered entries from section 4.
`stimulus.requests` contains the ordered requests from section 3.

`expect` compares only the outcomes, trace, and stable infrastructure error code
declared by the fixture.

## 9. Determinism

Given the same validated script and request sequence, the fake MUST produce the
same returned outcomes and trace independent of host state.

The M3-003 seed and logical clock remain available to the surrounding runner,
but M3-005 fake tool execution consumes neither.

## 10. Deferred behavior

M3-005 deliberately does not define:

- Capability Broker or production policy evaluation;
- approval composition;
- real tool registration callbacks or plugin loading;
- filesystem or subprocess behavior;
- shell interpretation;
- network or secret access;
- cancellation scheduling;
- fault injection;
- DeepSeek Harness binding details;
- adapter lifecycle/event normalization.

Those belong to later M3 gates or later runtime milestones.

## 11. Acceptance criteria

M3-005 is complete only when:

- this language-independent contract exists before implementation;
- portable JSON fixtures cover `RESULT`/`ERROR`, denial-before-body, and explicit
  script exhaustion;
- `@dsh-safe/testkit` provides one deterministic TypeScript projection without
  importing `@deepseek-ai/*` or adapter concrete types;
- conformance proves request-vs-body-vs-outcome distinction, exact final result
  preservation, denied calls never enter the body, defensive trace exposure,
  fail-closed invalid input, and explicit script exhaustion;
- frozen install and repository `pnpm check:all` remain green.
