# Spec 0013: M3 Adapter DSH Approval Unavailable Shared TCK

Status: DRAFT  
Milestone: M3-014  
Profile: `ADAPTER_DSH`

## 1. Purpose

M3-014 defines the language-independent Shared TCK contract for the DeepSeek
Harness adapter's **approval unavailable** behavior.

The existing approval decision vocabulary is:

```text
ALLOWED_ONCE
REJECTED
CANCELLED
UNAVAILABLE
```

Only `ALLOWED_ONCE` authorizes the requested action. `UNAVAILABLE` is an
explicit fail-closed decision; it is not an infrastructure exception, script
exhaustion, rejection, or cancellation alias.

M3-014 verifies two distinct unavailable source facts that the current Adapter
DSH can encounter:

```text
approval service absent
approval service present, but approval resolves unavailable
```

Both produce the portable decision `UNAVAILABLE`, but they do not produce the
same audit evidence. The distinction MUST be preserved by this profile so an
implementation cannot fabricate a durable approval decision when no approval
service handled the request.

DeepSeek Harness remains an adapter compatibility target, never protocol
authority. Harness source-seam names in this `ADAPTER_DSH` profile identify the
source being tested and do not become generic safe-runtime protocol names.

## 2. Authorities

The authorities for this gate are:

1. Spec 0003 for the runtime-independent approval port and closed decision
   vocabulary;
2. Spec 0004 for the Shared TCK envelope and PASS / FAIL / UNSUPPORTED / ERROR
   runner model;
3. Spec 0005 for portable fake-approval semantics, especially that
   `UNAVAILABLE` is an intentional decision and script exhaustion is not;
4. accepted M3-012 for the rule that denial/failed authorization must not be
   confused with body entry;
5. accepted M3-013 for final-result authority, which M3-014 MUST NOT redefine;
6. the accepted exact DeepSeek Harness `0.1.0-rc.5` source baseline only for
   Adapter DSH compatibility evidence.

No concrete Harness package import path, TypeScript type name, private Harness
module path, UI implementation, or agent-loop implementation detail is part of
this portable contract.

## 3. Accepted rc5 approval facts

The accepted pinned rc5 public approval service establishes these compatibility
facts:

1. approval outcomes are exactly `allowed-once`, `rejected`, `cancelled`, and
   `unavailable`;
2. with policy `ask`, a missing answerer resolves explicitly to `unavailable`;
3. a throwing answerer or rogue non-vocabulary answer is contained and resolves
   explicitly to `unavailable`;
4. an unavailable service decision is persisted as one durable
   `approval/asked` followed by one matching `approval/decided` whose outcome is
   `unavailable`;
5. policy `never` resolves to `rejected`, not `unavailable`;
6. an aborted approval request resolves to `cancelled`, not `unavailable`;
7. the production Adapter DSH also fails closed when the approval service is not
   present in the current context by returning runtime-independent
   `UNAVAILABLE` before calling a Harness approval service.

M3-014 preserves these distinctions. It MUST NOT derive `UNAVAILABLE` from
human-readable exception text or from the mere absence of an allow decision
when a stronger explicit source fact is available.

## 4. Operation

M3-014 defines exactly one operation:

```text
approval-unavailable
```

Any other operation MUST fail profile-semantic validation before invoking the
implementation under test.

## 5. Approval request

Every fixture contains one portable approval request:

```json
{
  "sessionRef": "session:tck",
  "callRef": "call-1",
  "toolName": "write",
  "reason": "requires approval"
}
```

Requirements:

- `sessionRef` and `toolName` are non-empty opaque strings;
- `callRef` is optional; when present it is a non-empty opaque string;
- `reason` is optional; when present it is a string;
- unknown request fields are rejected;
- M3-014 fixtures do not carry an abort/cancellation input.

The portable request contains no Harness agent object, callback, listener,
service instance, or signal.

## 6. Source facts

M3-014 accepts exactly two source-fact forms.

### 6.1 Approval service absent

```json
{
  "kind": "SERVICE_ABSENT"
}
```

This fact means the Adapter's approval dependency is unavailable in the current
runtime context before an approval service can handle the request.

Required projection:

```text
decision = UNAVAILABLE
audit = NONE
```

`audit = NONE` is significant. The implementation MUST NOT synthesize an
`approval/asked`, `approval/decided`, approval id, or equivalent durable approval
pair for a service that never handled the request.

This source fact does not claim the surrounding agent/session is invalid. A
missing or non-live agent is a different Adapter error and is outside this
fixture form.

### 6.2 Approval service decision unavailable

```json
{
  "kind": "SERVICE_DECISION",
  "decision": "UNAVAILABLE",
  "audit": "DURABLE_PAIR"
}
```

This fact means an approval service handled the request and its authoritative
closed decision was unavailable.

Required projection:

```text
decision = UNAVAILABLE
audit = DURABLE_PAIR
```

The portable TCK deliberately does not carry a concrete approval id. The pinned
Harness service generates its own process/runtime identity, while the semantic
requirement is only that exactly one asked/decided pair is correlated internally
and the decided outcome is unavailable.

A source decision of `REJECTED`, `CANCELLED`, or `ALLOWED_ONCE` is not an
M3-014 fixture.

## 7. Portable observable

The M3-014 portable observable is exactly:

```json
{
  "kind": "APPROVAL_UNAVAILABLE",
  "decision": "UNAVAILABLE",
  "audit": "NONE"
}
```

or:

```json
{
  "kind": "APPROVAL_UNAVAILABLE",
  "decision": "UNAVAILABLE",
  "audit": "DURABLE_PAIR"
}
```

No approval id, timestamp, session-event sequence, UI state, callback identity,
or Harness concrete object appears in the portable observable.

The `audit` field describes evidence shape, not authorization strength. Both
forms fail closed identically: neither authorizes execution.

## 8. Expectation

The expectation shape is the Section 7 observable itself.

Comparison is exact. A valid implementation result with the wrong decision or
wrong audit evidence shape is `FAIL`.

Examples:

```text
SERVICE_ABSENT -> UNAVAILABLE + DURABLE_PAIR = FAIL
SERVICE_DECISION/UNAVAILABLE -> UNAVAILABLE + NONE = FAIL
SERVICE_ABSENT -> REJECTED = FAIL
```

An implementation exception or malformed/non-portable implementation projection
is runner `ERROR`, not PASS and not ordinary mismatch.

The expected result MUST NOT be used to decide which source fact is supplied to
the implementation.

## 9. Fail-closed validation

Before invoking the implementation under test, a conforming M3-014 runner MUST
reject at least:

- an unknown operation;
- unknown fields at any profile-owned object level;
- empty `sessionRef`, `callRef`, or `toolName` where present;
- a non-string `reason`;
- an unknown source-fact kind;
- additional decision/audit fields on `SERVICE_ABSENT`;
- a `SERVICE_DECISION` other than exactly `UNAVAILABLE`;
- a service-decision audit value other than `DURABLE_PAIR`;
- `REJECTED`, `CANCELLED`, or `ALLOWED_ONCE` masquerading as unavailable;
- cancellation/abort-specific fixture input;
- an expectation whose audit form contradicts the source fact;
- non-portable direct-call values such as cyclic values, sparse/decorated
  arrays, exotic objects, symbol properties, or non-finite numbers.

Malformed fixture evidence MUST be rejected before implementation invocation.
The runner MUST NOT repair, infer, or synthesize an unavailable decision.

## 10. Oracle independence

The source fact is stimulus; the expectation is only the comparison oracle.

Changing `expect.decision` or `expect.audit` while leaving the stimulus unchanged
MUST NOT alter the implementation input or source-fact classification.

A conforming runner MUST NOT manufacture `UNAVAILABLE` or an audit pair from the
expected output.

## 11. Determinism

Given the same validated fixture and implementation/configuration, the verdict
MUST be independent of:

- host wall clock;
- timezone/locale;
- scheduler timing;
- ambient randomness;
- filesystem/process/network state;
- UI availability not represented by the explicit source fact.

The surrounding Shared TCK seed/logical clock remain available but M3-014 does
not consume them to choose an approval decision.

## 12. Adapter DSH projection boundary

The production Adapter DSH behavior currently has two relevant paths:

```text
ctx approval service absent
  -> requestApproval() returns UNAVAILABLE
  -> no Harness approval audit pair exists

ctx approval service present
  -> approval.request(...)
  -> Harness outcome unavailable
  -> requestApproval() returns UNAVAILABLE
  -> durable approval/asked + approval/decided(unavailable) pair exists
```

This section records the Adapter projection under test; it does not elevate
`ctx.get()` or Harness event names into generic protocol semantics.

The TypeScript testkit MUST NOT import Adapter DSH or Harness concrete types.

## 13. Out of scope

M3-014 does not implement or verify:

- `ALLOWED_ONCE` behavior beyond preserving its status as the only grant;
- policy `never` / `REJECTED` semantics except as a negative boundary;
- abort/cancellation behavior (`M3-015`);
- observation/subscription disposal (`M3-016`);
- replay reconciliation (`M3-017`);
- UI prompt rendering or answerer discovery;
- approval persistence beyond the minimal service-decision durable-pair evidence;
- capability leases or remembered approvals;
- denied tool body entry, already covered by M3-012;
- final tool-result authority, already covered by M3-013;
- M4 Capability Broker or M6 Workspace Transaction semantics.

In particular, M3-014 MUST NOT treat `CANCELLED` as an unavailable synonym or
use an abort signal to manufacture an unavailable test case.

## 14. Exact Harness source-conformance requirement

The reference Adapter DSH implementation MUST remain green against the accepted
exact rc5 source baseline.

Exact source conformance for M3-014 MUST prove both unavailable paths using
public seams:

1. **service absent path**
   - construct an Adapter context where the approval service is genuinely absent;
   - call the production Adapter approval port;
   - observe `UNAVAILABLE`;
   - prove no approval audit pair was fabricated;

2. **service present / no-answer path**
   - install the real pinned rc5 approval service in an open live turn;
   - register no approval answerer;
   - call the production Adapter approval port;
   - observe `UNAVAILABLE`;
   - prove exactly one durable `approval/asked` + `approval/decided` pair exists;
   - prove the decided outcome is `unavailable` and the pair is internally
     correlated by the Harness-generated approval id.

The exact test MUST NOT:

- stub `requestApproval()` itself;
- invent a private Harness approval result;
- use policy `never` as unavailable evidence;
- use abort/cancellation to obtain unavailable;
- require a deterministic Harness-generated approval id value.

## 15. Acceptance criteria

M3-014 is complete only when:

- this language-independent contract exists before TypeScript/Adapter-specific
  runner work;
- portable fixtures cover both `SERVICE_ABSENT` and
  `SERVICE_DECISION/UNAVAILABLE`;
- profile validation fails closed on rejected/cancelled/allowed masquerades,
  contradictory audit forms, malformed evidence, and non-portable input;
- the generic testkit imports no Adapter DSH or Harness concrete type;
- oracle-independence tests prevent expected output from manufacturing
  unavailable behavior;
- Adapter conformance proves the two portable evidence forms against production
  behavior without changing production approval semantics merely for the TCK;
- exact pinned rc5 source-conformance proves the real service-present no-answer
  path and a real service-absent Adapter path;
- only `ALLOWED_ONCE` remains an authorization grant;
- `REJECTED`, `CANCELLED`, and `UNAVAILABLE` remain distinct;
- M3-015..017, M4, and M6 semantics are not pulled into this gate;
- frozen install, normal CI, exact rc5 source-conformance, tests, type checks,
  architecture checks, and lint remain green without weakening any existing
  gate.
