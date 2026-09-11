# M4-045 Acceptance Audit — Adapter Audit Admission

Status: **IMPLEMENTATION / CONFORMANCE ACCEPTED — AUDIT EXACT-HEAD VERIFICATION PENDING**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-045 P0 — no raw secret in audit`  
Profile: `M4-045_DSH_AUDIT_ADMISSION_V1`

## 1. Gate authority

Normative candidate:

```text
specs/0049-m4-dsh-audit-admission.md
```

Rationale and evidence recovery:

```text
rfcs/0002-adapter-audit-admission.md
docs/review-notes-m4-045-audit-privacy.md
```

Requirement corpus and independent vectors:

```text
fixtures/dsh-audit-admission/cases.json            DAP-001..036
fixtures/dsh-audit-admission/digest-vectors.json   DAV-001..008
```

Pinned DeepSeek Harness compatibility baseline:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
```

M4-045 owns a bounded in-process Adapter audit-admission egress. It does not
implement a portable ledger, storage, retention, encryption, generic secret
detection, replay admission, or host/process isolation.

## 2. Predecessor governance

M4-044 governance is closed before M4-045 work. The M4-045 evidence-recovery
baseline was reviewed at:

```text
0c47080b509a762e22461eea0ab9a785bb19d30c
```

with:

```text
CI #616 / run 33974251591: PASS
Harness #558 / run 33974251606: PASS
Harness step 10: PASS
Harness step 11: PASS
```

Evidence recovery concluded that ordinary Adapter observation structurally
minimizes several raw bodies but is not an audit privacy boundary. In particular,
caller-owned digest callbacks, opaque names/refs/codes, arbitrary diagnostics and
native Harness history remain privileged channels.

## 3. Protocol-first candidate

The protocol-first candidate head is:

```text
d2cbba3e5b09a4fa326f8e5b386c3bae5a448180
```

It defines a separate concrete `observeAudit` Adapter extension, owned SHA-256
source domains, closed output fields, identity substitution, fixed diagnostics,
atomic projection, bounded ordered delivery and explicit incomplete summaries.

Exact-head predecessor evidence:

```text
CI #619 / run 33992185188: PASS
Harness #561 / run 33992185156: PASS
Harness job 101376265061 step 10: PASS
Harness job 101376265061 step 11: PASS
```

This candidate did not authorize persistence or M5 implementation.

## 4. Executable TCK preparation

Executable test/oracle preparation head:

```text
b434813a06588028af6650715cf4932bdddf1045
```

Evidence:

```text
CI #621 / run 34028600048: PASS
Harness #563 / run 34028600142: PASS
Harness job 101473928632 step 10: PASS
Harness job 101473928632 step 11: PASS
```

The preparation established independent closed-shape assertions, summary
semantics, digest vectors, encoding boundary cases and a real pinned source
prerequisite without substituting a fake audit producer for runtime evidence.

## 5. Owned digest primitive

The private owned digest implementation head is:

```text
2ef4e81e289d9fc7f538067096311816498e668c
```

Evidence:

```text
CI #623 / run 34035204227: PASS
Harness #565 / run 34035204228: PASS
Harness job 101491886479 step 10: PASS
Harness job 101491886479 step 11: PASS
```

The digest primitive:

- owns SHA-256 computation inside Adapter DSH;
- uses the profile/domain envelope defined by Spec 0049;
- applies fixed depth, visited-value and UTF-8-byte limits;
- rejects unsupported input rather than coercing or truncating it;
- does not invoke source getters, `toJSON` or `toString` to manufacture evidence;
- returns fixed rejection codes with no raw fallback.

This primitive alone does not establish source provenance or safe egress.

## 6. Final implementation / conformance head

Final reviewed implementation/conformance exact head:

```text
19fe2261fd7982edad6643390974207382e87a28
```

It is one fast-forward commit from the verified encoder documentation head
`87c1ff3a2d1df1562a5b5e085d71d493c70fd391`.

The exact net delta contains eight files only:

```text
packages/adapter-dsh/src/audit-events.ts
packages/adapter-dsh/src/audit-projection.ts
packages/adapter-dsh/src/audit-dispatcher.ts
packages/adapter-dsh/src/binding.ts
packages/adapter-dsh/src/index.ts
packages/adapter-dsh/test/m4-045-audit-projection.test.ts
packages/adapter-dsh/test/m4-045-audit-dispatcher.test.ts
packages/adapter-dsh/source-conformance/m4-045-audit-delivery.conformance.ts
```

Diff statistics:

```text
source-conformance/m4-045-audit-delivery.conformance.ts  +218 / -0
src/audit-dispatcher.ts                                  +125 / -0
src/audit-events.ts                                      +128 / -0
src/audit-projection.ts                                  +398 / -0
src/binding.ts                                           +177 / -10
src/index.ts                                               +1 / -0
test/m4-045-audit-dispatcher.test.ts                     +127 / -0
test/m4-045-audit-projection.test.ts                     +221 / -0
```

No Spec, portable Schema, policy-engine, capability-broker semantic contract,
package dependency, lockfile, Harness pin, workflow, roadmap, handoff or later
Gate implementation changed in this commit.

## 7. Separate owned audit egress

`observeAudit(sink)` is exposed only by the concrete DSH Adapter return type:

```text
DshRc5Adapter = HarnessRuntimeAdapter & DshAuditObservationExtension
```

The existing portable `HarnessRuntimeAdapter` interface and ordinary
`observe(RuntimeEventSink)` signature remain unchanged.

The audit path captures authoritative runtime facts directly and projects them
before ordinary normalization can lose required source provenance. It never
accepts arbitrary caller-supplied RuntimeEvent, Receipt, sidecar or precomputed
digest as an admission credential.

## 8. Closed event representation

Production defines exactly nine audit event types:

```text
session.started
turn.started
step.started
tool.requested
tool.completed
approval.decided
model.request.failed
turn.completion_requested
turn.ended
```

Output is detached and frozen. The projection never forwards arbitrary source
properties. Raw argument/result/failure bodies, prompt/environment/stdout/stderr,
approval reason, stack/cause, process-local token references and extension bags
are not audit output fields.

## 9. Owned digest and source provenance

Audit projection calls the package-owned `computeAuditDigest` directly. It does
not call, trust or reuse `DshRc5AdapterOptions.digest`.

The implementation preserves the Spec 0049 source ownership rules:

```text
argumentsDigest -> exact durable tool/call arguments string
resultDigest    -> entire final materialized tools/result object
failureDigest   -> entire supported request failure value
metadata        -> distinct owned metadata domains
identities      -> session-scoped typed identity domains
```

A digest-shaped source string is treated as ordinary source data and freshly
hashed under the required domain; it is never accepted as proof of prior safe
projection.

## 10. Final ToolRuntime result authority

Pinned rc5 conformance exercises genuine agent-backed `ToolRuntime` and hashes
the same final frozen result object returned by execution and exposed at
`tools/result`.

The result digest therefore includes the complete materialized final result,
including its structured success/failure representation, rather than an earlier
body value, post-execute candidate, selected content subset or supplied ordinary
digest.

## 11. Shared denial / cancellation classification

Prior ordinary observation consumed one-shot policy disposition inside each
ordinary `tools/result` observer. That was sufficient for a single ordinary
subscriber but would make classification depend on subscriber order once audit
subscribers coexist.

M4-045 therefore moves the one-shot consumption to an internal authoritative
`tools/result` listener and stores the resulting final classification in a
`WeakMap` keyed by the execution object. Ordinary and audit observation read that
same classification without consuming it again.

Real pinned conformance verifies one ordinary subscriber plus two audit
subscribers observe consistent `success`, `denied` and `cancelled` outcomes.
This changes classification ownership, not ToolRuntime result authority.

## 12. Correlation and identity boundaries

All audit refs are substituted using owned identity domains. Within one session,
requested/completed/approval facts preserve real joins through equal `callKey`.
Different sessions and different identity domains remain distinct.

The audit approval correlation cache is keyed by `(sessionRef, approvalRef)`, not
by approval ID alone, so equal textual approval IDs in different sessions cannot
cross-correlate.

Live audit-generated event references use a separate audit sequence. Ordinary
observer count therefore cannot consume or perturb audit event identity.

## 13. Atomic projection and hostile input

Projection uses descriptor-based own-data inspection. Accessors and unsupported
prototypes are rejected rather than invoked. Cycles and other unsupported
representations are rejected by the owned digest primitive.

Projection errors are represented only by fixed codes. No caught error text,
stack, cause, serialized value or ordinary `onObservationFailure` payload is
forwarded through the audit egress.

A failed fact delivers no partial audit event.

## 14. Ordered bounded delivery

Each `observeAudit` subscription owns an independent ordered dispatcher.

The dispatcher:

- performs one sink attempt per admitted event;
- never retries automatically;
- contains sink exceptions;
- records `AUDIT_SINK_FAILED` without raw exception data;
- bounds queued plus in-flight events at 1,024;
- rejects the next fact explicitly with `AUDIT_LIMIT_EXCEEDED`;
- maintains cumulative safe-integer counters;
- saturates counters rather than wrapping;
- marks `countsExact=false` and stops new capture if counter precision is lost;
- keeps prior failure sticky after later successful delivery.

`drain()` waits for work captured before the call and returns an immutable
summary. `dispose()` detaches capture first, then drains, and repeated disposal is
idempotent.

## 15. Real ordinary/audit coexistence evidence

The new pinned rc5 conformance deliberately configures ordinary Adapter digest as:

```text
() => M4_045_SYNTHETIC_SECRET_CANARY
```

Ordinary observation therefore still receives that privileged caller-owned value,
which proves existing ordinary semantics were not silently redefined.

At the same time two independent audit subscribers:

- receive equal closed events;
- contain no raw synthetic canary;
- independently match owned expected SHA-256 domain digests;
- preserve successful, denied and cancelled final classification;
- hash the exact final ToolRuntime result;
- derive `argumentsDigest` from the exact durable raw argument string.

This is a real pinned-runtime witness, not a helper-only substitute.

## 16. Exact-head verification

Final implementation/conformance head:

```text
19fe2261fd7982edad6643390974207382e87a28
```

Evidence on that exact SHA:

```text
CI #625 / run 34145630754: PASS
Harness #567 / run 34145630728: PASS
Harness job 101816949714 step 10 exact pinned-source typecheck: PASS
Harness job 101816949714 step 11 real rc5 runtime conformance: PASS
```

PR #3 remains Open, Draft and unmerged on this SHA.

## 17. Compatibility review

M4-045 does not modify:

```text
portable HarnessRuntimeAdapter.observe signature
RuntimeEvent union semantics
policy / guard raw decision inputs
approval ownership
portable JSON Schemas
Decision / Receipt construction authority
replay or sidecar ingress
Harness 0.1.0-rc.5 pin
M5 ledger/storage/retention contracts
```

The new event type is an Adapter-only egress type, not a seventeenth portable
v1alpha1 persisted document.

## 18. Security and privacy non-claims

M4-045 does **not** prove or claim:

```text
native Harness session history is redacted
a malicious in-process host cannot observe raw values
SHA-256 is encryption or hides low-entropy values from guessing
a canary-absence test alone proves universal secret absence
ordinary RuntimeEvent is safe to persist
onObservationFailure is an audit-safe diagnostic channel
replay/sidecar/Receipt automatically become audit-safe
persistence, durable exactly-once delivery, spool or crash recovery
retention TTL, export/delete or encryption at rest
generic secret detection or environment redaction
provider/process/kernel isolation
```

These exclusions are part of the accepted boundary. Removing them would overstate
the Gate guarantee.

## 19. Corpus disposition

DAP-001..036 are covered through the combined evidence set rather than by one
single test style:

- source/architecture cases use reviewed Adapter and pinned Harness source;
- projection cases use independently authored digest expectations and negative
  malformed/hostile inputs;
- delivery cases exercise ordering, failure, capacity, drain and counter limits;
- real-runtime cases use genuine pinned ToolRuntime for source provenance,
  final-result ownership and ordinary/audit coexistence;
- compatibility and governance cases reuse existing repository checks and the
  exact-head dual-green chain.

Helper-only fixtures are not used to replace requirements that explicitly demand
real pinned runtime evidence.

## 20. Acceptance decision

M4-045 implementation/conformance is **ACCEPTED** at:

```text
19fe2261fd7982edad6643390974207382e87a28
```

because:

- protocol-first authority preceded implementation and was dual-green;
- executable test preparation preceded production egress implementation;
- the owned digest primitive was independently verified before source projection;
- audit source provenance is captured at authoritative runtime seams;
- caller-owned ordinary digest output is excluded from audit admission;
- output is a closed immutable nine-event union with owned typed digests;
- final result hashing follows the complete authoritative pinned ToolRuntime result;
- denial/cancellation classification is shared without one subscriber consuming it;
- projection rejects unsupported/hostile inputs atomically with fixed diagnostics;
- delivery is ordered, bounded, single-attempt and explicitly incomplete on failure;
- ordinary control and observation semantics remain compatible;
- normal CI and exact pinned Harness typecheck/runtime are dual-green on the same
  final reviewed SHA;
- privacy/security non-claims remain explicit.

This **audit commit itself is not yet accepted** until its own exact head passes
normal CI and exact pinned Harness source-conformance.

No roadmap M4-045 marker, HISTORY closure entry, M4-046/M4-050/M5 authorization or
PR merge state may change merely because this file was created.
