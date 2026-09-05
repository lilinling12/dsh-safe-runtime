# M4-045 — Adapter Audit Admission Contract

Status: **DRAFT NORMATIVE CANDIDATE — NOT IMPLEMENTED OR ACCEPTED**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-045 P0 — no raw secret in audit`  
Profile: `M4-045_DSH_AUDIT_ADMISSION_V1`  
Rationale: `rfcs/0002-adapter-audit-admission.md`  
Corpus: `fixtures/dsh-audit-admission/cases.json`  
Digest vectors: `fixtures/dsh-audit-admission/digest-vectors.json` (DAV-001..008)  
Pinned compatibility baseline: `0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a`

## 1. Authority and scope

Core Spec 0001 sections 13/28 requires redaction before evidence persistence.
Spec 0002 section 6 owns digest-domain honesty. Specs 0035 and 0047 do not grant
persistence authority to constructed Receipt or observed final results.
This profile defines a safe-runtime-owned, in-process Adapter audit projection
and its delivery boundary. It does not implement persistence or a portable ledger.

The guarantee is bounded: the owned projection MUST NOT copy unrestricted
source strings, raw bodies or arbitrary diagnostic objects to its audit consumer.
This is an Adapter software boundary, not a process-isolation guarantee.
Hash substitution does not promise confidentiality against guessing low-entropy
inputs, equality analysis, covert channels or a malicious privileged host.

All arbitrary string-bearing fields are classified as sensitive by default.
Whole-field digest substitution or omission is this profile's redaction rule.
No string is admitted unchanged merely because a detector found no match,
a caller marked it safe, or a schema/digest-shaped regex accepted it.

## 2. Owned entry and exit

The concrete rc5 Adapter SHALL expose a separate `observeAudit(sink)` extension.
Its sink receives only `DshAuditEvent` projections defined here. The existing
portable `HarnessRuntimeAdapter.observe(RuntimeEventSink)`, RuntimeEvent union,
policy inputs, approval routing and replay interfaces MUST retain their meaning.
The extension belongs to Adapter DSH, not Protocol or Capability Broker.

The owned path is:

```text
pinned runtime fact
-> existing authority/classification and source correlation
-> owned audit digest + closed-field projection
-> detached immutable DshAuditEvent
-> audit sink.accept(projectedEvent)
```

The extension MUST capture raw digest input at its authoritative source seam,
before raw input becomes inaccessible through ordinary normalization.
It MUST NOT accept arbitrary caller-supplied RuntimeEvents, Receipt, sidecar
records or precomputed digests as proof that a source fact was safely projected.
A public method returning a digest-shaped string is not an admission credential.

`DshRc5AdapterOptions.digest` remains a privileged ordinary-observation callback.
The audit path MUST NOT call it, reuse its outputs, or offer an equivalent
caller-replaceable hashing/redaction callback. Trusted computing dependencies
are the owned projection/encoder, SHA-256 implementation and in-process runtime.
JavaScript cannot constrain a hostile host that replaces these dependencies.

No persistence API is added. A future safe-runtime default audit writer MUST
consume this projection or another explicitly accepted privacy profile; ordinary
RuntimeEventSink and upstream session history MUST NOT be wired as safe defaults.

## 3. Closed event representation

Every emitted event has exactly the common fields below plus the fields for its
type. Unknown fields MUST NOT be forwarded. Result construction MUST detach and
freeze its own data; freezing is mutation protection, not an isolation claim.

| Common field | Treatment |
| --- | --- |
| profile | Literal `M4-045_DSH_AUDIT_ADMISSION_V1`. |
| type | One of the nine accepted RuntimeEvent type literals, checked at runtime. |
| eventKey | Owned event-identity digest, section 5. |
| sessionKey | Owned session-identity digest, section 5. |
| observedAt | Valid UTC timestamp reconstructed from the source epoch time or validated clock value; no source timestamp text copied verbatim. |

| Type | Additional fields (all others absent) |
| --- | --- |
| session.started | source: startup / resume / clear / compact |
| turn.started | turnKey |
| step.started | turnKey, stepKey |
| tool.requested | callKey, toolNameDigest, argumentsDigest; optional turnKey, stepKey, rootCallKey when source correlation actually provides them |
| tool.completed | callKey, toolNameDigest, resultDigest, outcome: success / error / denied / cancelled; optional errorCodeDigest |
| approval.decided | approvalKey, outcome: ALLOWED_ONCE / REJECTED / CANCELLED / UNAVAILABLE; optional callKey |
| model.request.failed | turnKey, stepKey, failureClassDigest, failureDigest |
| turn.completion_requested | turnKey |
| turn.ended | turnKey, status: completed / failed / blocked / cancelled |

All *Key and *Digest values MUST be freshly computed by this owned path using
section 4/5, never copied even when input already starts with `sha256:`.
Enums MUST be selected from these closed sets, not cast from an arbitrary string.
Missing required fields, invalid types, invalid enums or invalid timestamps
reject the whole projection. Optional absent fields remain absent.

There is no raw arguments/result/failure field, raw ref/name/code, approval reason,
source snippet, environment, prompt, stdout/stderr, message, stack, cause,
processLocalTokenRef, retention override or caller-defined extension bag.
These fields MUST NOT be included even when present as unknown input properties.

## 4. Owned digest and input domains

For profile constant P above, let:

```text
D(domain, value) = "sha256:" + lowercaseHex(
  SHA256(UTF8(JCS([P, domain, value])))
)
```

JCS denotes [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785); this profile uses
domain-tagged envelopes, not a bare hash
of a string or an unspecified JSON.stringify result. The exact domain is part
of the profile. An audit digest need not equal the ordinary host Digest output.
The encoder is scoped to audit input; M5 ledger canonicalization and record
digests are not implemented or accepted by this rule.

| Output | Domain | Exact value input |
| --- | --- | --- |
| argumentsDigest | arguments/raw-string | Exact durable tool/call arguments string, including its whitespace; do not parse/rewrite its JSON text. |
| resultDigest | result/final-json | Entire final materialized value received at the authoritative live tools/result seam. |
| failureDigest | failure/source-json | Entire supported failure value at agent/request-error, before any redaction. |
| toolNameDigest | metadata/tool-name | Exact tool name string. |
| errorCodeDigest | metadata/error-code | Exact supported optional snapshot error.info.code string; not a claim that every rc5 error supplies it. |
| failureClassDigest | metadata/failure-class | Exact failure code/class string. |

Result input MUST NOT be an earlier mutable middleware candidate, durable replay
substitute, selected subset of the final result, normalized event, supplied
resultDigest, or a digest of any of these. There is no raw or digest-of-digest
fallback. If source evidence cannot be encoded exactly under this profile,
the event is rejected; it is not emitted with a misleading successful digest.

Structured input is restricted to JSON primitives, dense arrays and plain data
objects (Object.prototype or null prototype). Only own enumerable string-keyed
data properties are supported. Reject accessors, symbol properties, unsupported
prototypes, sparse/extended arrays, cycles, undefined, bigint, functions,
non-finite numbers and invalid Unicode. No source toJSON, getter or toString
may be invoked to obtain an admissible representation. Inspection failures,
including thrown Proxy traps, are caught without retaining their error payload.
This is not a promise to detect all Proxies or suppress hostile trap side effects.

Each D invocation permits at most 64 nested arrays/objects (the domain envelope
counts as depth 1), 65,536 visited values (including containers), and 1,048,576
encoded UTF-8 bytes. Object keys count toward bytes, not visited values. Repeated
acyclic references are counted each time. Limits are inclusive and not caller
configurable. Exceeding a limit rejects the event without truncating its domain.

## 5. Identity substitution and correlation

Let S be the exact source sessionRef and R the exact source identifier:

```text
sessionKey = D("identity/session", S)
eventKey   = D("identity/event", [S, R])
turnKey    = D("identity/turn", [S, R])
stepKey    = D("identity/step", [S, R])
callKey    = D("identity/call", [S, R])
rootCallKey = D("identity/call", [S, R])
approvalKey = D("identity/approval", [S, R])
```

A ref is a nonempty source string. Do not infer identifiers from display names or
generate a new business identity to conceal missing required correlation.
Call and root-call use the same domain so a real root reference joins its call.
Equal source identities within one session yield equal keys across requested,
completed and approval events. Different identity domains and different sessions
remain distinguishable (subject to the usual cryptographic collision assumption).

The projection MUST use the same source identities/classification as ordinary
observation. Shared one-shot denial/cancellation correlation MUST NOT be consumed
twice or lost when ordinary and audit subscriptions coexist, or when multiple
audit subscribers observe a fact. Projection is synchronous with fact capture
before asynchronous delivery can race mutable input.

These are audit keys, not portable raw refs. They MUST NOT be substituted into
RuntimeEvent, policy requests, Lease/Decision/Receipt or replay reconciliation.
A later replay audit profile could reuse these domains only after establishing
the same actual source identity; live-only IDs must never be invented on replay.
Hashing identities does not authenticate them or deduplicate reused source IDs.

## 6. Failure and delivery semantics

Projection is atomic: either one complete valid immutable event is enqueued, or
no event for that fact is delivered to the audit sink. Failure produces only
one of these closed diagnostics, without raw event, offending field, exception
text, stack, cause or serialized value:

- AUDIT_INPUT_INVALID
- AUDIT_INPUT_UNSUPPORTED
- AUDIT_LIMIT_EXCEEDED
- AUDIT_DIGEST_FAILED
- AUDIT_SINK_FAILED

Input invalid means missing/invalid required scalar, enum or time. Unsupported
means a disallowed source representation or failed safe property inspection.
Limit exceeded takes precedence once a declared limit is reached. Digest failed
means failure of the owned hash operation after supported encoding. Sink failed
means accept threw or rejected. Implementations MUST NOT stringify caught errors.

The concrete Adapter extension has this API shape; it does not extend the return
type of the existing ordinary ObservationSubscription:

```ts
interface AuditDeliverySummary {
  readonly delivered: number;
  readonly projectionRejected: number;
  readonly deliveryFailed: number;
  readonly countsExact: boolean;
  readonly status: "COMPLETE" | "INCOMPLETE";
  readonly diagnostics: readonly AuditDiagnosticCode[];
}
interface AuditObservationSubscription {
  drain(): Promise<AuditDeliverySummary>;
  dispose(): Promise<AuditDeliverySummary>;
}
// DshAuditEvent is the closed discriminated union in section 3.
interface DshAuditEventSink {
  accept(event: DshAuditEvent): void | Promise<void>;
}
// Concrete DSH extension, in addition to unchanged HarnessRuntimeAdapter members:
// observeAudit(sink: DshAuditEventSink): AuditObservationSubscription;
```

Status is INCOMPLETE if any projection/delivery failed or a count lost precision.
Counters are cumulative safe integers, saturate at Number.MAX_SAFE_INTEGER and
never wrap. Saturation sets countsExact=false, records AUDIT_LIMIT_EXCEEDED and
stops new capture for that subscription; already queued events still settle.
Diagnostics contain unique codes in the fixed order listed above, no per-fact
free text. At most 1,024 events may be outstanding (queued plus in-flight); a new
fact at that limit is rejected with AUDIT_LIMIT_EXCEEDED, never silently dropped.
drain covers facts captured before the call and returns an immutable snapshot;
later activity may be reflected but must never erase earlier failures. dispose
detaches then drains; repeated dispose is idempotent. Neither method converts a
sink exception to a rejection carrying its raw error.

Delivery is ordered per subscription, has no automatic retry/raw fallback, and
continues to expose prior failure in its cumulative result after a later success.
COMPLETE means the captured projection deliveries settled successfully; it is
not a persistence, coverage, tool success or exactly-once durability verdict.
Sink failure is never promoted to successful recording. The sink is trusted to
handle admitted data; its own logging or fabricated exceptions are outside this
egress guarantee and MUST NOT be forwarded to ordinary diagnostic callbacks.

Audit failure MUST NOT change ToolPolicyRequest arguments, ALLOW/DENY/ASK,
approval ownership, final result, stopping behavior or accepted RuntimeEvent
semantics. This is fail-closed audit admission, not a retroactive effect veto.
M5 owns required-audit availability policy, spool and reconciliation.

## 7. Other channels and unsupported claims

| Channel | Required treatment |
| --- | --- |
| Ordinary observe / onObservationFailure | Privileged in-process channels, not audit-safe. Audit failures use section 6, not the raw callback. |
| Native Harness session history | Separate raw source under Harness ownership; do not claim this projection redacts historical/native storage. |
| Replay / sidecar | No new audit ingress in this profile. Existing structural omission of processLocalTokenRef stays intact but does not authorize persisting opaque strings/digests. |
| Decision / Receipt construction | Spec 0035 stays construction-only. Constructor success and schema validity do not authorize persistence; Core redaction obligations still apply. |
| Policy, guard and explicit approval input | Preserve raw facts needed for correct decisions; do not redact control inputs as an audit shortcut. |
| Later storage/export consumers | Must establish their own accepted admission/profile integration before writing raw portable objects or declaring retention compliance. |

No secrets/rawPrompt/environment opt-in is added. EvidenceRetentionProfile remains
unchanged. General detection, source opt-in, env redaction, TTL, deletion/export,
encryption, ledger/store/hash-chain and persistence recovery stay in M5.

This candidate introduces an Adapter-only projection, not a seventeenth portable
v1alpha1 document. Existing JSON Schemas and compatibility hashes therefore have
no delta. If later work makes it a portable durable record, schema/fixtures/TCK
must be specified before that work; this exemption cannot be reused for it.

## 8. Conformance and sequence

Corpus DAP-001..036 is a requirement/evidence plan, not executable privacy proof.
Evidence categories distinguish source/architecture, pure projection vectors,
real pinned runtime and reused accepted contracts. Every requirement needs an
explicit executable or reviewed source witness before acceptance.

Before production implementation: review this candidate/RFC, encode its limits
and API types in executable TCK, and obtain exact-head normal CI plus pinned Harness
typecheck/runtime green. Then implement the minimum owned path. Candidate-head
green only establishes predecessor regressions still pass.

Acceptance MUST include synthetic canaries in payloads, all opaque metadata,
unsafe host digest output and thrown diagnostics; closed-output allowlist checks;
independent canonical digest vectors; positive correlation plus cross-session/
cross-domain negative cases; malformed/accessor/cyclic input; atomic rejection;
ordered delivery failure with INCOMPLETE status; and real final-result rewriting
at the pinned runtime seam. A canary omission test alone is insufficient.

Real-runtime cases MUST keep the genuine agent-backed execution and test ordinary
and audit observation together, preserving denial/cancellation classification,
approval uniqueness and the exact final materialized result. Supported failure
snapshots and unsupported error objects need distinct evidence; helper-only error
shapes cannot be passed off as real rc5 behavior.

The final implementation/conformance head, acceptance audit and governance records
each require their own exact-head dual-green. M4-045 stays unchecked until those
criteria are met. M4-050+, M5 implementation and PR #3 merge are not authorized
by publication of this candidate.
