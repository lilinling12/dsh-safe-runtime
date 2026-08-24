# Spec 0009: M3 Adapter DSH Turn Lifecycle Shared TCK

Status: DRAFT  
Milestone: M3-010  
Profile: `ADAPTER_DSH`

## 1. Purpose

M3-010 defines the language-independent Shared TCK contract for the DeepSeek
Harness adapter's **turn lifecycle projection**.

The TCK verifies that supported DeepSeek Harness durable lifecycle evidence is
projected into the normalized safe-runtime lifecycle already authorized by Spec
0003. DeepSeek Harness remains an adapter target and compatibility baseline; it
does not define portable safe-runtime protocol semantics.

This specification deliberately does not add any normalized runtime event. In
particular, the M2 minimum vocabulary contains `step.started` but does **not**
contain `step.ended`.

## 2. Authority split

The authorities for this gate are:

1. Spec 0003 for the normalized safe-runtime lifecycle vocabulary and adapter
   boundary;
2. Spec 0004 for the Shared TCK envelope and runner lifecycle;
3. the exact accepted Harness rc5 source baseline only for adapter-specific
   source evidence.

Harness event names may therefore appear in `stimulus` because this profile is
explicitly adapter-specific. They MUST NOT be promoted into generic protocol
vocabulary merely because Harness emits them.

No `@deepseek-ai/*` package path, TypeScript type name, or private Harness module
path is part of the fixture contract.

## 3. Operation

M3-010 defines one profile operation:

```text
turn-lifecycle
```

A fixture using any other operation is not an M3-010 fixture and MUST fail
profile-semantic validation before invoking the implementation under test.

## 4. Stimulus

The profile-owned stimulus shape is:

```json
{
  "operation": "turn-lifecycle",
  "sessionRef": "session:tck",
  "sourceEvents": []
}
```

`sessionRef` is a non-empty opaque string. The TCK does not interpret its
spelling.

`sourceEvents` is an ordered array of adapter-specific durable event snapshots.
For M3-010, the only accepted source event types are:

```text
turn/start
step/start
step/end
turn/end
```

Each source event has exactly:

```text
type
seq
time
data
```

`seq` and `time` are non-negative safe JSON integers. Sequence numbers MUST be
strictly increasing. Array order is the authoritative source-evidence order;
the runner MUST NOT reorder events using timestamps, scheduler behavior, or host
wall clock.

### 4.1 `turn/start`

```json
{
  "type": "turn/start",
  "seq": 10,
  "time": 1770000000000,
  "data": { "turn": 3 }
}
```

`turn` is a non-negative safe integer.

### 4.2 `step/start` and `step/end`

```json
{
  "type": "step/start",
  "seq": 11,
  "time": 1770000000010,
  "data": { "turn": 3, "step": 0 }
}
```

```json
{
  "type": "step/end",
  "seq": 12,
  "time": 1770000000020,
  "data": { "turn": 3, "step": 0 }
}
```

`turn` and `step` are non-negative safe integers.

A Shared TCK turn-lifecycle stimulus consists of one `turn/start`, followed by
zero or more complete `step/start` / `step/end` pairs, followed by one
`turn/end`. Every event in the case MUST refer to the same turn, and each
`step/end` MUST pair with the immediately preceding `step/start` for the same
step.

This grammar constrains the **test case input**, not the full Harness state
machine.

### 4.3 `turn/end`

```json
{
  "type": "turn/end",
  "seq": 13,
  "time": 1770000000030,
  "data": {
    "turn": 3,
    "reason": { "kind": "completed" }
  }
}
```

`reason` is adapter-source JSON owned by Harness. For M3-010 the TCK requires
only that it is an ordinary JSON object containing a non-empty string `kind`.
Other reason fields are preserved as source evidence and are not interpreted by
this profile.

## 5. Normalized lifecycle observables

M3-010 compares only these portable lifecycle observables:

```text
turn.started
step.started
turn.ended
```

The observable shapes are exactly:

```json
{ "type": "turn.started", "turnRef": "session:tck/turn:3" }
```

```json
{
  "type": "step.started",
  "turnRef": "session:tck/turn:3",
  "stepRef": "session:tck/turn:3/step:0"
}
```

```json
{
  "type": "turn.ended",
  "turnRef": "session:tck/turn:3",
  "status": "completed"
}
```

The terminal status vocabulary is exactly:

```text
completed
failed
blocked
cancelled
```

M3-010 intentionally does not compare `eventRef`, `sessionRef`, or `observedAt`.
Those fields may exist in an implementation's normalized event object, but they
are not necessary to prove the turn-lifecycle semantics of this gate and MUST
NOT become accidental cross-language requirements here.

## 6. Source-to-normalized projection

The required projection for M3-010 is:

```text
turn/start -> turn.started
step/start -> step.started
step/end   -> NO_EVENT
turn/end   -> turn.ended, or an explicit adapter error for unsupported reason
```

`step/end -> NO_EVENT` is normative for this TCK gate because Spec 0003 does not
define `step.ended`. A conforming adapter MUST NOT invent that normalized event
from the Harness source event.

`NO_EVENT` means only that the source event has no normalized lifecycle event in
the current safe-runtime vocabulary. It does not mean the source evidence is
invalid or unimportant to Harness replay.

## 7. Turn-end reason mapping

The accepted M2 mapping is preserved exactly:

| Harness source `reason.kind` | normalized `turn.ended.status` |
| --- | --- |
| `completed` | `completed` |
| `aborted` | `cancelled` |
| `blocked` | `blocked` |
| `error` | `failed` |
| `max-tokens` | `failed` |
| `interrupted` | `failed` |

Any other reason kind MUST fail explicitly with the stable adapter error code:

```text
UNSUPPORTED_HARNESS_TURN_END_REASON
```

The adapter MUST NOT guess a status from human-readable text, timestamps, or
similarity to a known reason.

## 8. Expectation forms

An M3-010 fixture expectation is exactly one of the following forms.

### 8.1 Normalized events

```json
{
  "kind": "EVENTS",
  "events": [
    { "type": "turn.started", "turnRef": "session:tck/turn:3" },
    {
      "type": "step.started",
      "turnRef": "session:tck/turn:3",
      "stepRef": "session:tck/turn:3/step:0"
    },
    {
      "type": "turn.ended",
      "turnRef": "session:tck/turn:3",
      "status": "completed"
    }
  ]
}
```

Array order is significant and comparison is exact over the M3-010 observable
shapes above.

### 8.2 Expected adapter error

```json
{
  "kind": "ERROR",
  "code": "UNSUPPORTED_HARNESS_TURN_END_REASON",
  "atOrdinal": 2
}
```

`atOrdinal` is the one-based source-event ordinal at which the adapter must
report the error. Earlier or later failure with the same code is not equivalent.

For M3-010, `ERROR` expectations are used only for an unsupported `turn/end`
reason. Malformed fixture structure is a TCK input error and MUST be rejected
before invoking the implementation rather than encoded as an expected adapter
failure.

## 9. TypeScript projection boundary

A TypeScript Shared TCK implementation may model one source-event projection as:

```text
EVENT(normalized lifecycle observable)
NO_EVENT
ERROR(stable adapter code)
```

That is an implementation API only. A non-TypeScript runner may use any API that
preserves the same fixture semantics.

An implementation exception that is not deliberately translated into the
profile's stable `ERROR(code)` result is a runner `ERROR`; it MUST NOT become
PASS or be confused with the expected adapter error above.

## 10. Determinism and ordering

Given the same fixture and implementation/configuration, M3-010 MUST produce the
same verdict independent of:

- host wall clock;
- timezone or locale;
- event-loop/thread scheduling;
- ambient randomness;
- filesystem, process, network, or environment state.

The source array determines observation order. `seq` is validated as strictly
increasing evidence; `time` is retained as adapter input but is not used to sort
or infer missing lifecycle facts.

Missing, extra, reordered, or differently normalized lifecycle evidence is a
TCK failure. The runner MUST NOT synthesize a missing start/end event from time,
sequence gaps, or expected output.

## 11. Out of scope

M3-010 does not implement or verify:

- tool request/result ordering (`M3-011`);
- denied-call body entry (`M3-012`);
- final tool result authority (`M3-013`);
- approval unavailable behavior (`M3-014`);
- cancellation mechanics beyond the already-authorized `aborted -> cancelled`
  turn-end mapping (`M3-015` remains separate);
- observation/disposable teardown (`M3-016`);
- replay reconciliation (`M3-017`);
- a normalized `step.ended` event;
- mandatory `turn.completion_requested` evidence for every turn;
- M4 capability policy;
- M6 workspace transactions;
- subagent/workflow lineage.

`turn.completion_requested` remains a valid normalized event from the separate
live `agent/turn-stopping` seam, but it is not a mandatory durable lifecycle
fact and is therefore not inserted into this operation's expected sequence.

## 12. Exact Harness source-conformance requirement

The reference Adapter DSH implementation MUST additionally remain green against
the accepted exact Harness rc5 source baseline.

The source-conformance test for this gate MUST exercise actual rc5 session event
publication and prove at least:

- `turn/start` is observed as `turn.started`;
- `step/start` is observed as `step.started`;
- real `step/end` source evidence does not create `step.ended` or another
  fabricated normalized event;
- `turn/end` is observed as `turn.ended` with the accepted terminal mapping;
- event delivery preserves the source publication order relevant to these
  normalized observables.

This exact-source evidence is adapter compatibility proof. It does not become
portable protocol authority.

## 13. Acceptance criteria

M3-010 is complete only when:

- this language-independent profile contract exists before the adapter runner
  projection;
- portable JSON fixtures cover a completed turn with step boundaries, cancelled,
  blocked, failed, and unsupported terminal reason behavior;
- the TypeScript testkit validates profile semantics before invoking an
  implementation and does not import Adapter DSH or Harness concrete types;
- an Adapter DSH conformance test runs the same fixtures against the existing
  normalized mapping;
- exact rc5 source-conformance proves the real session lifecycle seam and the
  intentional `step/end -> NO_EVENT` boundary;
- unknown terminal semantics fail closed with the stable adapter code;
- missing/reordered/fabricated normalized lifecycle evidence cannot pass;
- no M3-011..017, M4, or M6 semantics are pulled into this gate;
- frozen install, normal CI, exact rc5 source-conformance, tests, type checks,
  architecture checks, and lint remain green without weakening any existing
  gate.
