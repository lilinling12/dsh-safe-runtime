# Spec 0016: M3 Adapter DSH Replay Reconciliation Shared TCK

Status: DRAFT  
Milestone: M3-017  
Profile: `ADAPTER_DSH`

## 1. Purpose

M3-017 defines a language-independent Shared TCK contract for reconciling
safe-runtime sidecar evidence with a DeepSeek Harness durable session log across
replay and live-observation overlap.

The contract exists because a replay boundary has two distinct input channels:

1. a durable session snapshot that may contain facts committed before the
   current observation lifecycle began; and
2. a live durable-event feed that may overlap the tail of that snapshot when a
   consumer establishes live observation before taking the snapshot.

Reconciliation MUST produce one deterministic durable fact sequence without
using timing, object identity, listener registration order, or process-local
execution tokens as identity.

DeepSeek Harness remains compatibility evidence only. Concrete Harness Session,
SessionEvent, listener, persistence, or repair objects are not portable protocol
data.

## 2. Authority boundary

M3-017 reconciles **durable fact identity and evidence anchors**. It does not
redefine the runtime-event authority established by M3-010 through M3-016.

In particular:

- durable `tool/call` remains request intent only;
- live authoritative final tool outcome remains the M3-013 `tools/result` seam;
- approval-unavailable and cancellation semantics remain those of M3-014 and
  M3-015;
- disposal cutoff/completion remains M3-016;
- a durable replay record MUST NOT manufacture a live-only final-result,
  model-request-failure, turn-stopping, or session-start observation;
- a recovery-generated durable tool result whose outcome is explicitly unknown
  MUST NOT be promoted to `tool.completed` success, error, denial, or
  cancellation authority merely because it is durable.

M3-017 therefore proves association and reconciliation, not execution replay.

## 3. Operation

The M3-017 portable operation is:

```text
replay-reconciliation
```

Every fixture uses profile `ADAPTER_DSH` and exactly one session.

## 4. Portable durable fact

A portable durable fact is an opaque immutable fact from one session log:

```json
{
  "sessionRef": "session:example",
  "durableSequence": 12,
  "durableEventRef": "session:example/seq:12",
  "eventDigest": "digest:event:12"
}
```

Rules:

1. `sessionRef`, `durableEventRef`, and `eventDigest` are non-empty strings;
2. `durableSequence` is a non-negative safe integer;
3. `durableEventRef` MUST be exactly
   `<sessionRef>/seq:<durableSequence>` for the ADAPTER_DSH profile;
4. `eventDigest` is opaque comparison data; M3-017 does not define a digest
   algorithm or parse digest contents;
5. the fact does not expose concrete Harness event payloads or package types;
6. a durable fact's identity is the pair `(sessionRef, durableSequence)` with
   `durableEventRef` as the canonical adapter reference; the digest detects
   contradictory content at that identity.

## 5. Snapshot source

Portable snapshot form:

```json
{
  "facts": [
    {
      "sessionRef": "session:example",
      "durableSequence": 0,
      "durableEventRef": "session:example/seq:0",
      "eventDigest": "digest:event:0"
    }
  ]
}
```

The snapshot is a complete durable prefix for the session, not a filtered list
of only safe-runtime-relevant event types.

Snapshot rules:

1. an empty snapshot is allowed;
2. a non-empty snapshot MUST start at sequence `0`;
3. snapshot sequences MUST increase by exactly one;
4. duplicate or missing sequence numbers are not a valid complete prefix;
5. every fact MUST belong to the fixture request's exact `sessionRef`.

Using the complete prefix prevents unrelated durable Harness events from
creating false sequence gaps when safe-runtime evidence is sparse.

## 6. Live durable overlap source

Portable live source form:

```json
{
  "facts": [
    {
      "sessionRef": "session:example",
      "durableSequence": 0,
      "durableEventRef": "session:example/seq:0",
      "eventDigest": "digest:event:0"
    },
    {
      "sessionRef": "session:example",
      "durableSequence": 1,
      "durableEventRef": "session:example/seq:1",
      "eventDigest": "digest:event:1"
    }
  ]
}
```

These facts represent post-commit durable events captured from the live durable
feed while/after the snapshot is established.

Rules:

1. live facts MUST be strictly increasing by durable sequence;
2. the live list MAY begin inside the snapshot prefix, creating intentional
   overlap;
3. an overlapping live fact MUST have the exact same event reference and digest
   as the snapshot fact at that sequence;
4. exact snapshot/live overlap is emitted once, not twice;
5. after the overlap ends, the live tail MUST continue contiguously from the
   snapshot prefix;
6. a gap, regression, duplicate live sequence, or same-sequence digest mismatch
   is a reconciliation conflict;
7. host timestamps or callback-arrival delays MUST NOT repair or reorder a
   sequence conflict.

## 7. Sidecar evidence source

M3-017 reuses the M2 sidecar correlation shape:

```json
{
  "durableEventRef": "session:example/seq:12",
  "durableSequence": 12,
  "sessionRef": "session:example",
  "turnRef": "session:example/turn:2",
  "stepRef": "session:example/turn:2/step:1",
  "callRef": "call-1",
  "evidenceRef": "evidence:tool:1",
  "evidenceDigest": "digest:evidence:1"
}
```

`turnRef`, `stepRef`, and `callRef` remain optional opaque correlation metadata.
They are preserved but are not parsed to manufacture event semantics.

For every sidecar record:

1. `sessionRef` MUST match the reconciliation session;
2. `durableSequence` MUST identify a durable fact present after snapshot/live
   reconciliation;
3. `durableEventRef` MUST equal that fact's canonical event reference;
4. `evidenceRef` and `evidenceDigest` MUST be non-empty strings;
5. a live-only reference without a durable sequence is not a valid M3-017
   sidecar anchor;
6. process-local execution-token references are forbidden;
7. a sidecar record does not authorize or reinterpret the durable fact it
   references.

## 8. Evidence idempotence and contradiction

Sidecar replay may encounter the same append more than once after persistence
retry or adoption restart.

M3-017 therefore defines:

- the same `evidenceRef` with an exactly identical complete sidecar record is
  idempotent and reconciles to one record;
- the same `evidenceRef` with a different `evidenceDigest`, durable event anchor,
  sequence, session, or optional correlation field is an evidence conflict;
- different `evidenceRef` values MAY anchor to the same durable event;
- evidence records are output deterministically by durable sequence, then by
  `evidenceRef` using ascending UTF-8 byte order when multiple evidence records
  share a sequence.

No arrival-time tie breaker is permitted.

## 9. Reconciled observable

Successful portable observable:

```json
{
  "kind": "REPLAY_RECONCILED",
  "sessionRef": "session:example",
  "nextDurableSequence": 2,
  "durableFacts": [
    {
      "sessionRef": "session:example",
      "durableSequence": 0,
      "durableEventRef": "session:example/seq:0",
      "eventDigest": "digest:event:0"
    },
    {
      "sessionRef": "session:example",
      "durableSequence": 1,
      "durableEventRef": "session:example/seq:1",
      "eventDigest": "digest:event:1"
    }
  ],
  "evidence": []
}
```

`nextDurableSequence` is exactly the length of the complete reconciled durable
prefix and therefore the next sequence that may extend it.

The observable MUST NOT contain a fabricated normalized `tool.completed`,
`model.request.failed`, `turn.completion_requested`, or `session.started` merely
because replay data exists.

## 10. Conflict observable

A structurally valid source may still describe an unsafe or impossible
reconciliation. That is a semantic conflict, not malformed fixture syntax.

Portable conflict form:

```json
{
  "kind": "REPLAY_CONFLICT",
  "sessionRef": "session:example",
  "code": "DURABLE_FACT_CONFLICT",
  "durableSequence": 12
}
```

Recognized conflict codes are exactly:

```text
DURABLE_FACT_CONFLICT
DURABLE_SEQUENCE_GAP
SIDECAR_ORPHAN
EVIDENCE_CONFLICT
```

Semantics:

- `DURABLE_FACT_CONFLICT` — snapshot/live claim different content or canonical
  reference for the same durable sequence, or the live durable source regresses
  or duplicates a sequence;
- `DURABLE_SEQUENCE_GAP` — the post-snapshot live tail skips the next required
  sequence;
- `SIDECAR_ORPHAN` — sidecar evidence references no reconciled durable fact;
- `EVIDENCE_CONFLICT` — the same evidenceRef has contradictory sidecar content.

When more than one conflict is present, implementations MUST report the first
conflict in this deterministic precedence order:

```text
DURABLE_FACT_CONFLICT
DURABLE_SEQUENCE_GAP
SIDECAR_ORPHAN
EVIDENCE_CONFLICT
```

Within one conflict class, the lowest durable sequence wins. For an evidence
conflict whose contradictory records share the same durable sequence, the
`evidenceRef` with lowest UTF-8 byte order wins.

A conflict MUST NOT be silently repaired by discarding one side, choosing the
latest timestamp, or trusting expectation data.

## 11. Replay/live barrier algorithm

A conforming implementation may use any internal algorithm, but its observable
behavior MUST be equivalent to this portable model:

1. establish the live durable feed before reading the catch-up snapshot so no
   committed append can fall into an unobserved gap;
2. obtain one immutable complete durable-prefix snapshot;
3. reconcile buffered live durable facts against the snapshot by durable
   sequence and digest;
4. collapse exact overlap;
5. append the contiguous non-overlapping live tail;
6. validate and idempotently adopt sidecar evidence only after its durable anchor
   is present;
7. publish the reconciled state;
8. continue future live observation from `nextDurableSequence`.

The Shared TCK validates the resulting facts and conflicts, not listener
implementation details.

## 12. Harness compatibility facts

Exact pinned rc5 compatibility evidence may use these public facts:

1. a Session is an append-only event-sourced log;
2. accepted event sequences are contiguous from zero;
3. `session.events` is an immutable cached snapshot;
4. constructor seed/replay events do not publish on the live `session/event`
   firehose;
5. `session.firstLiveSeq` exposes the in-process seed/live boundary;
6. the durable `session/end-seed` event is a storage projection of a seed
   boundary, but its literal presence is not portable protocol authority;
7. `session/event` is a post-commit durable append feed;
8. approval asked/decided audit events are durable replayable facts;
9. crash repair may append deterministic synthetic `tool/result` records with
   `TOOL_NOT_STARTED` or `TOOL_OUTCOME_UNKNOWN` and a `turn/end` with
   `interrupted` reason.

M3-017 MUST use only public seams in exact conformance. Concrete Harness event
classes, private log arrays, private listener collections, or concrete
agent-loop implementation imports are forbidden as proof.

## 13. Crash-repair boundary

Crash repair is a particularly important negative boundary.

A repaired durable fact MAY participate in durable identity reconciliation like
any other durable session fact. However:

- `TOOL_NOT_STARTED` means no durable tool-start fact exists for that repaired
  call;
- `TOOL_OUTCOME_UNKNOWN` means a durable tool-start fact exists but no durable
  completed outcome survived;
- neither code authorizes M3-017 to fabricate the lost live final `tools/result`;
- M3-017 does not infer whether an external side effect happened;
- retry/idempotency policy remains outside this Gate.

The repaired `turn/end(interrupted)` remains a durable turn-ending fact. This
does not convert the synthetic tool repair into final tool-outcome authority.

## 14. Runner semantics

The generic Shared TCK runner preserves foundation statuses:

```text
PASS
FAIL
ERROR
```

For M3-017:

- malformed/non-portable fixture data -> fixture validation error;
- implementation throws -> `ERROR`;
- implementation returns malformed projection -> `ERROR`;
- implementation returns a valid reconciliation/conflict different from the
  expected observable -> `FAIL`;
- exact match -> `PASS`.

Expectation data is comparison-only. The implementation callback receives only
the parsed request/source facts and MUST NOT receive `expect`.

## 15. Required portable cases

M3-017 MUST register at least these cases:

1. clean durable snapshot with no live overlap reconciles unchanged;
2. exact snapshot/live overlap is emitted once and a contiguous live tail is
   appended in durable-sequence order;
3. a sidecar evidence record resolves to its exact durable fact;
4. identical repeated sidecar evidence is idempotently collapsed;
5. snapshot/live same-sequence digest contradiction yields
   `DURABLE_FACT_CONFLICT`;
6. a post-snapshot live sequence gap yields `DURABLE_SEQUENCE_GAP`;
7. sidecar evidence without a durable anchor yields `SIDECAR_ORPHAN`;
8. same evidenceRef with different evidence digest or anchor yields
   `EVIDENCE_CONFLICT`.

Boundary tests MUST additionally prove that:

- snapshot prefixes are complete and contiguous from zero;
- wrong-session and non-canonical event references fail closed;
- live facts are strictly increasing;
- unknown conflict codes fail validation;
- optional sidecar correlation fields are preserved exactly but not parsed;
- evidence ordering is deterministic for multiple evidence records on one
  durable event;
- expectation data cannot manufacture a durable fact, anchor, or conflict;
- cyclic/exotic/sparse/decorated/non-finite direct-call inputs fail validation;
- implementation exceptions and malformed projections are runner `ERROR`;
- valid mismatches are runner `FAIL`;
- portable Spec/fixtures/testkit contain no concrete Harness package path.

## 16. Exact pinned rc5 conformance

Exact source-conformance against the accepted Harness baseline
`0.1.0-rc.5` / `47f943859bef60e4160492346772ded9b24f765a`
MUST prove through public seams that:

1. a seeded/replayed Session exposes a contiguous immutable durable log while
   its constructor seed is absent from the live `session/event` firehose;
2. `firstLiveSeq` correctly identifies the in-process replay/live boundary;
3. registering the live durable listener before reading `session.events` can
   intentionally produce snapshot/live overlap without a gap;
4. that exact overlap reconciles once by durable sequence + event digest;
5. a later live append extends the prefix at exactly `nextDurableSequence`;
6. a sidecar record produced from an exact durable event ref resolves after
   replay;
7. a durable approval asked/decided pair remains linkable by its exact durable
   event references after seed/reconstruction;
8. a crash-repair `TOOL_OUTCOME_UNKNOWN` or `TOOL_NOT_STARTED` durable result is
   not promoted into live final-tool-result authority by the reconciliation
   implementation;
9. no sleeps, host wall-clock ordering, object identity, private Session fields,
   private event listener collections, or concrete `dsh-agent-loop` import are
   used as evidence.

## 17. Production-change rule

M3-017 may add a runtime-independent replay-reconciliation port/helper to the
Adapter package if required by the portable contract.

Production Adapter changes are allowed only when the Spec and exact pinned
public-source evidence require them. A conforming change MUST NOT:

- broaden durable facts into live-only authority;
- weaken M3-013 final-result semantics;
- treat missing sidecar evidence as successful execution evidence;
- silently ignore sequence/digest conflicts;
- depend on custom durable Harness SessionEvent registration, which remains
  unsupported in the accepted feature matrix;
- persist process-local execution tokens.

## 18. Deferred behavior

M3-017 deliberately does not define:

- replaying a tool body or external side effect;
- automatic retry after `TOOL_OUTCOME_UNKNOWN`;
- reconstruction of lost live-only `tools/result` facts;
- persistent sidecar database/index implementation, retention, or compaction;
- cross-session lineage reconciliation;
- multi-writer distributed session-log consensus;
- M4 capability leases/revocation;
- M6 workspace transaction crash recovery.

## 19. Acceptance criteria

M3-017 is complete only when:

- this language-independent contract exists before new TypeScript replay
  implementation;
- required portable fixtures are registered;
- `@dsh-safe/testkit` provides strict Harness-independent parse/run projection;
- boundary tests prove exact overlap idempotence, sequence-gap detection,
  digest-conflict detection, sidecar-anchor integrity, evidence idempotence, and
  expectation/oracle independence;
- Adapter replay reconciliation is exercised directly if production behavior is
  added;
- exact pinned rc5 source-conformance proves the real public seed/snapshot/live
  boundary and crash-repair negative boundary;
- normal CI and exact pinned rc5 source-conformance are green on the exact
  implementation head;
- TypeScript strictness, schemas, validators, compatibility baseline, frozen
  lockfile, architecture/security gates, and security claims remain unchanged or
  stronger.
