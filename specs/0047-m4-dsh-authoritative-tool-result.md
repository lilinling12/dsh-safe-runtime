# M4-043 — DeepSeek Harness Authoritative Tool Result Observation Contract

Status: **DRAFT NORMATIVE SPECIFICATION**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-043 P0 — observe authoritative tools/result`  
Conformance profile: `M4-043_DSH_AUTHORITATIVE_TOOL_RESULT_V1`  
Pinned Harness compatibility baseline: `0.1.0-rc.5` / `47f943859bef60e4160492346772ded9b24f765a`  
Depends on: Spec 0003 DeepSeek Harness Adapter Contract, Spec 0012 M3-013 final-result Shared TCK, accepted M4-040/041/042 Adapter boundaries  
Separated from: M4-044 approval-subsystem uniqueness, M4-045 audit redaction, M4-050+ negative enforcement boundaries

## 1. Purpose

M4-043 defines the narrow Adapter ownership contract for observing the final
materialized outcome of a DeepSeek Harness ToolRuntime execution.

For Adapter DSH, the authoritative live source is the pinned Harness
`tools/result` notification. M4-043 does not create a second final-result model and
does not redefine the portable `tool.completed` semantics already accepted by
M3-013.

DeepSeek Harness remains compatibility evidence for the Adapter implementation;
it is not portable safe-runtime protocol authority.

## 2. Existing portable authority reused unchanged

Spec 0012 already freezes the portable authority boundary:

```text
tool.requested = request intent only
tool.completed = observed final outcome
tools/result   = final authoritative live tool outcome for Adapter DSH
```

A tool body's direct return is not authoritative. A post-execute candidate is not
authoritative. Approval or policy intent is not authoritative execution outcome.
The Adapter MUST use the final materialized `tools/result` fact.

M4-043 MUST reuse the existing normalized `ToolCompletedEvent` vocabulary and MUST
NOT add a second completion event type.

## 3. Existing Adapter observation surface

The accepted Adapter already exposes:

```text
observe(sink)
```

and production binding already registers:

```text
ctx.on("tools/result", (exec, result) => ...)
```

For an agent-backed call the existing binding derives the session from
`exec.agent`, correlates by exact `exec.callId`, computes `resultDigest` from the
observed `result`, and passes that same final source fact to
`normalizeFinalToolResult()`.

M4-043 MUST begin by proving this existing binding against the contract. A
production rewrite is justified only by concrete non-conformance.

## 4. Pinned Harness finalization order

At the exact pinned rc5 baseline, official ToolRuntime source establishes the
relevant finalization order:

```text
tool body / tools/execute
-> tools/post-execute
-> materialize final-result candidate
-> apply definition-owned final content transform
-> materialize again
-> notify tools/result observers with finalResult
-> return that finalResult from ToolRuntime
```

The authoritative object is the `finalResult` passed to `notifyResult()` and then
returned by `finishScheduledExecution()`.

M4-043 MUST NOT treat an earlier object in this pipeline as final authority.

## 5. Exact final-object identity

Pinned ToolRuntime passes the exact `finalResult` object to `tools/result` and
returns that same object from its finalization function.

Real source-conformance SHOULD prove object identity when the public runtime seam
preserves it, in addition to semantic equality.

The Adapter MAY digest/project the observed object but MUST NOT substitute the body
return or reconstruct a look-alike result as its authoritative source.

## 6. Post-execute replacement authority

A body may return an intermediate successful value. `tools/post-execute` may
replace the accepted content or value before final materialization.

M4-043 MUST preserve the M3-013 invariant:

```text
body return != final authority
post-execute-finalized tools/result = final authority
```

A normalized `tool.completed.resultDigest` MUST correspond to the materialized
`tools/result`, not the pre-post-execute body value.

## 7. Definition-owned final content authority

Pinned ToolRuntime may apply a definition-owned final content transform after the
post-execute stage and then materialize again before `tools/result` notification.

Where public rc5 seams permit direct conformance coverage, M4-043 SHOULD prove
that `tools/result` observes the post-finalizer content rather than the earlier
post-execute candidate.

M4-043 MUST NOT bypass this finalization stage when determining result authority.

## 8. Error authority

Body throw, dispatch failure, post-execute failure, policy/guard denial,
approval-derived denial, cancellation and finalization failure can all result in a
materialized ToolRuntime error outcome.

M4-043 does not redefine their domain-specific classification. It requires only
that final normalized completion fields are derived from the authoritative
`tools/result` source fact.

Existing M3-014/M3-015 and M4 disposition rules remain authoritative for approval
and cancellation/policy classification.

## 9. Exactly one live completion projection

For one agent-backed native `tools/result` notification observed by one active
Adapter observation subscription, the Adapter MUST emit exactly one correlated
live normalized `tool.completed` event unless normalization itself fails and is
reported through the observation-failure channel.

The Adapter MUST NOT emit one completion from the body and another from
`tools/result`.

The later durable Session `tool/result` record MUST NOT be projected as a second
live `tool.completed` event for the same native completion.

Replay reconciliation remains governed by accepted M3-017 and is not redefined in
M4-043.

## 10. Correlation

For an agent-backed `tools/result`, correlation uses the exact Harness execution
facts:

```text
sessionRef = String(exec.agent.session.id)
callRef    = String(exec.callId)
toolName   = exec.name
```

The Adapter MUST NOT generate replacement call identity or infer a portable
`actionRef` from the Harness call id.

Root-call, turn/step and Subject lineage are separate concerns and MUST NOT be
fabricated merely because the final result is observed.

## 11. Result digest source

The production Adapter receives a digest function from its host integration. M4-043
does not standardize that digest algorithm.

The required ownership rule is:

```text
resultDigest = digest(exact authoritative tools/result result)
```

It MUST NOT be computed from:

```text
body return
pre-execute decision
approval outcome
post-execute pre-final candidate
expected fixture output
durable replay record standing in for the live source
```

## 12. Disposition metadata is classification only

Existing M4-040/M4-041 Adapter logic may retain process-local call disposition
metadata such as policy denied/cancelled correlation until the authoritative
`tools/result` arrives.

That metadata may select the normalized portable outcome class when an accepted
contract requires it, but it MUST NOT replace or synthesize the authoritative
result object or its digest.

In other words:

```text
disposition metadata -> classification aid
tools/result result   -> final outcome/result-digest authority
```

## 13. Agent-less result boundary

The current normalized runtime event surface requires a session. Therefore an
agent-less Harness `tools/result` MUST NOT cause the Adapter to synthesize an
agent, session, Subject or `tool.completed` event.

M4-043 records this as an honest Adapter boundary, not as evidence that the host
call did not execute.

A later protocol may define host-scoped normalized evidence separately; M4-043
MUST NOT invent it.

## 14. Observer is read-only with respect to ToolRuntime outcome

Pinned `tools/result` is an emit-style notification after final materialization,
not a waterfall mutation seam.

The Adapter observation callback MUST NOT return replacement result data or alter
the ToolRuntime outcome.

M4-043 is observation, not post-execute enforcement.

## 15. Observer failure containment

Pinned ToolRuntime contains synchronous observer throws and asynchronous observer
rejections by reporting them to Harness logging; they do not replace or reject the
already-final ToolRuntime result.

Real source-conformance SHOULD prove at least one observer-failure path does not
change the returned final result.

The Adapter's own normalization/reporting failure is also observation failure, not
a permission to mutate execution outcome. Existing `onObservationFailure` remains
the reporting channel.

M4-043 does not define durable retry/spooling for observation failure.

## 16. Frozen execution identity

Pinned ToolRuntime freezes the live execution object before `tools/result`
observers receive it.

M4-043 may use this as compatibility evidence that observers cannot mutate the
execution identity through ordinary writes. It MUST NOT promote JavaScript
freezing into a portable security guarantee or process-isolation claim.

## 17. Result materialization boundary

Pinned ToolRuntime materializes final results to its accepted JSON-compatible,
frozen result representation before observer notification.

M4-043 relies on that supported Adapter seam. It does not define the portable
canonical JSON/digest algorithm and does not authorize reading arbitrary raw
secret-bearing values into later audit storage.

M4-045 remains the owner of audit redaction.

## 18. No durable-event double authority

The Adapter already observes durable session events for lifecycle/request and
approval facts. The live final completion authority is nevertheless
`tools/result`.

M4-043 MUST NOT reinterpret a later durable `tool/result` as a second independent
live authority source and emit duplicate completion evidence.

M3-017 replay reconciliation may use durable evidence for recovery/reconciliation;
that is a different operational path and MUST remain distinguishable from live
notification ownership.

## 19. Policy/approval decisions are not execution success

M4-040/041/042 decisions occur before final execution result.

Therefore:

```text
ALLOW != execution success
allowed-once != execution success
hard-guard abstention != execution success
body entry != execution success
```

Only the authoritative final result may establish the observed completion outcome.

This prevents false-success reasoning from policy or approval intent.

## 20. Finalization failures

If ToolRuntime final materialization or definition-owned final-content processing
fails, pinned source converts that failure into a materialized tool error and then
notifies `tools/result` with that error.

M4-043 MUST treat the resulting `tools/result` error as authoritative. It MUST NOT
fall back to the earlier successful body or post-execute candidate.

## 21. Ordering relative to M4-040/041/042

The relevant accepted pipeline is:

```text
M4-040 pre-execute waterfall
-> M4-042 native approval when final decision is ASK
-> M4-041 monotonic guards
-> dispatch/body
-> post-execute/finalization
-> M4-043 authoritative tools/result observation
```

This ordering does not make every earlier gate final-result authority.

## 22. Feature requirement

A deployment relying on M4-043 MUST require the accepted Adapter feature:

```text
toolsFinalResultObserver = true
```

Missing support MUST fail explicitly rather than silently deriving completion from
a weaker source such as body return or durable `tool/call`.

## 23. Observation lifecycle

An Adapter observation subscription owns its exact event registrations.

After disposal, future `tools/result` notifications MUST NOT be emitted through
that subscription. Existing observation disposal/replay contracts remain
applicable; M4-043 does not create another subscription system.

## 24. Guarantee boundary

M4-043 proves only trustworthy ownership of the final ToolRuntime outcome at the
supported Adapter seam.

It does NOT prove:

```text
every host effect traverses ToolRuntime
ToolRuntime outcome implies provider/process isolation
final result proves rollback of external effects
successful result proves all claimed effects occurred
failed result proves no external effects occurred
```

GuaranteeLevel remains governed by accepted M4-025 evidence semantics and later
negative-boundary tests.

## 25. No approval-subsystem or redaction work in this Gate

M4-043 MUST NOT perform the M4-044 repository-wide duplicate approval-subsystem
audit and MUST NOT implement M4-045 raw-secret audit redaction.

Result observation may expose a result to the Adapter's digest function; M4-043
MUST NOT use that fact to authorize raw result persistence.

## 26. DeepSeek Harness authority boundary

Pinned Harness source is compatibility authority only for:

```text
finalization order
materialization order
exact tools/result notification seam
observer failure containment
execution freeze at notification
```

It MUST NOT define portable Capability, Subject, Resource, Lease, policy,
GuaranteeLevel, audit retention or secret-redaction semantics.

## 27. Conformance corpus

Portable/source-conformance corpus:

```text
fixtures/dsh-authoritative-tool-result/cases.json
```

Profile:

```text
M4-043_DSH_AUTHORITATIVE_TOOL_RESULT_V1
```

The corpus covers at least:

- exact pinned baseline and feature requirement;
- `tools/result` as live Adapter DSH final authority;
- body return is non-authoritative;
- post-execute replacement precedes final authority;
- definition-owned final content precedes final authority where testable;
- exact final result object is observed and returned;
- digest derives from final observed result;
- success and generic error final mapping;
- policy/guard/approval intent cannot synthesize success;
- finalization error overrides earlier success;
- one agent-backed live result -> one normalized completion;
- durable tool/result does not create a second live completion;
- exact session/call/tool correlation;
- agent-less result does not synthesize session completion;
- execution is frozen before notification;
- observer callback cannot rewrite result;
- observer throw/rejection is contained;
- Adapter normalization failure is observation failure, not execution mutation;
- disposition metadata is classification-only;
- observation disposal stops future delivery;
- replay reconciliation remains separate;
- no raw-result persistence/redaction claim;
- no complete `tool-enforced` or external-effect atomicity claim.

Real source-conformance against the exact pinned rc5 commit MUST exercise the
native ToolRuntime finalization/notification path, not only a fake event emitter.

## 28. Implementation expectation

The repository already contains production `ctx.on("tools/result", ...)`
observation and M3-013 real rc5 final-result conformance.

M4-043 MUST therefore begin as a proof-of-existing-binding and ownership-hardening
Gate.

Production code may change only if new conformance demonstrates a concrete gap in
final-source ownership, duplicate emission, correlation, digest source, observer
failure handling or disposal.

Passing the Gate by deriving result from body return, policy state or approval
state is forbidden.

## 29. Explicit non-goals

M4-043 does not:

- redefine `ToolCompletedEvent`;
- create another final-result event;
- persist an audit ledger;
- store raw result content;
- implement M4-044 approval uniqueness;
- implement M4-045 audit redaction;
- define replay storage or exactly-once durable delivery;
- infer Subject/action identity from Harness call ids;
- assign final GuaranteeLevel;
- prove provider/process isolation;
- prove transaction rollback;
- authorize M4-044+ before governance closure;
- authorize M4-050+, M5, M6, M10, M13 or M15;
- authorize PR #3 merge.
