# M4-043 Acceptance Audit — DeepSeek Harness Authoritative Tool Result

Status: **IMPLEMENTATION / CONFORMANCE ACCEPTED — AUDIT EXACT-HEAD VERIFICATION PENDING**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-043 P0 — observe authoritative tools/result`

## 1. Gate authority

Normative specification:

```text
specs/0047-m4-dsh-authoritative-tool-result.md
```

Portable/source-conformance corpus:

```text
fixtures/dsh-authoritative-tool-result/cases.json
```

Conformance profile:

```text
M4-043_DSH_AUTHORITATIVE_TOOL_RESULT_V1
```

Pinned DeepSeek Harness compatibility baseline:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
```

M4-043 is intentionally an Adapter/source-conformance ownership Gate. It proves
which already-materialized Harness ToolRuntime result the Adapter may treat as
the live final tool outcome. It does not redefine the portable tool lifecycle,
prove complete host-effect mediation, or create a broader PEP.

## 2. Predecessor governance

M4-042 final governance exact head:

```text
0bd01855bd71fa39e6a0c9e7437515faaf8c63b2
```

Exact-head evidence:

```text
CI #592 / run 33784947948: PASS
Harness #534 / run 33784947972: PASS
Harness step 10: PASS
Harness step 11: PASS
```

M4-043 protocol-first work began only after that governance head became
dual-green.

## 3. Protocol-first accepted head

M4-043 protocol-first exact head:

```text
48259967bcae767cf292a7934c23c29a2274658e
```

Its exact delta from M4-042 governance changed only:

```text
specs/0047-m4-dsh-authoritative-tool-result.md
fixtures/dsh-authoritative-tool-result/cases.json
docs/handoff/CURRENT.md
```

No production TypeScript, package dependency, package manifest, frozen lockfile,
Harness workflow, public protocol/schema, HISTORY, roadmap M4-043 marker,
M4-044+, M4-050+, M5, M6, M10, M13 or M15 change entered the protocol-first
commit.

Protocol-first exact-head evidence:

```text
CI #593 / run 33788981150: PASS
Harness #535 / run 33788981153: PASS
```

Production/conformance work was authorized only after this exact head became
dual-green.

## 4. Existing portable lifecycle authority reused

M4-043 does not create a second portable lifecycle vocabulary.

Accepted M3 authority remains:

```text
tool.requested = request intent only
tool.completed = observed final outcome
```

For Adapter DSH, M4-043 binds the live final outcome source to Harness
`tools/result` after ToolRuntime has completed its own result pipeline.

The body return, a `tools/post-execute` candidate, policy/guard/approval intent,
and process-local disposition state are not promoted into final-result authority.

## 5. Exact pinned ToolRuntime ownership chain

Pinned rc5 source establishes the relevant ordering:

```text
body / tools/execute
-> tools/post-execute
-> materialize candidate
-> definition-owned final content
-> materialize final result
-> notifyResult(exec, finalResult)
-> return finalResult
```

The `tools/result` notification therefore observes the same final ToolRuntime
result object that is returned by the execution path after final materialization.

M4-043 deliberately binds to this public compatibility fact rather than to an
intermediate body or policy value.

## 6. Existing Adapter production binding review

The existing Adapter production binding in:

```text
packages/adapter-dsh/src/binding.ts
```

already subscribes to:

```text
ctx.on("tools/result", (exec, result) => ...)
```

For an agent-backed execution, the binding:

1. derives `sessionRef` from the live execution agent/session;
2. correlates `exec.callId` and `exec.name`;
3. uses process-local denial/cancellation disposition only as classification aid;
4. computes `resultDigest` from the exact observed `result`;
5. normalizes from that same final source fact;
6. emits through the existing ordered observation dispatcher.

Agent-less ToolRuntime results are not fabricated into session-scoped
`tool.completed` events.

The source-conformance review found no concrete production-binding defect that
would justify a rewrite. M4-043 is therefore accepted as a
**proof-of-existing-binding** Gate.

## 7. Exact implementation / conformance delta

Comparing protocol-first head:

```text
48259967bcae767cf292a7934c23c29a2274658e
```

to final reviewed conformance head:

```text
f681138030626c1be73810b788052a7306bd80ab
```

shows four commits whose net delta is exactly two added source-conformance files:

```text
packages/adapter-dsh/source-conformance/m4-043-authoritative-tool-result.conformance.ts
packages/adapter-dsh/source-conformance/m4-043-corpus-coverage.conformance.ts
```

Net diff statistics:

```text
m4-043-authoritative-tool-result.conformance.ts  +473 / -0
m4-043-corpus-coverage.conformance.ts             +115 / -0
```

There is no production-code delta between protocol-first and final conformance.

In particular M4-043 changes no:

```text
packages/adapter-dsh/src/binding.ts
packages/adapter-dsh/src/ports.ts
public protocol/schema
policy-engine
capability-broker production implementation
Shared TCK registration
package manifests/dependencies
pnpm-lock.yaml
Harness pin/workflow
M4-044+
M4-050+
M5
M6
M10
M13
M15
```

## 8. Final-object authority

Real pinned rc5 conformance executes a tool whose stages intentionally disagree:

```text
body value              = body-value
post-execute content    = post-execute
definition final content = definition-final
```

The returned ToolRuntime result and the object observed by `tools/result` are the
same final object, and Adapter `tool.completed.resultDigest` is computed from that
final result rather than from the body value.

The execution and result seen by the final observer are also verified frozen at
the pinned boundary.

## 9. Post-execute block remains final error authority

A body may succeed and a later `tools/post-execute` policy may block the outcome.
Real pinned execution proves the authoritative `tools/result` is then an error
result, and the Adapter completion/digest follows that final error rather than the
earlier body success.

This prevents an intermediate success from acquiring authority merely because it
occurred earlier in the pipeline.

## 10. Definition finalization failure remains final error authority

Real pinned execution proves a definition-owned finalization failure is
materialized as the authoritative final error result.

The Adapter does not retain or digest the earlier successful body value when the
final ToolRuntime outcome is an error.

## 11. Body failure maps only from final result

The existing M3-013 behavior is reused and the M4-043 source-conformance suite
keeps the ownership assertion explicit: a real tool-body throw is observed only
through the final ToolRuntime error result and normalized from that result.

M4-043 does not introduce a second body-error channel.

## 12. Policy disposition is classification, not result authority

The Adapter may retain process-local denial/cancellation disposition so the final
normalized outcome can distinguish states such as `denied` from a generic error.

M4-043 freezes the boundary:

```text
disposition may classify the arrived final result
disposition must not replace/synthesize the final result
disposition must not become resultDigest input
```

Real conformance proves a policy denial prevents body entry while the digest is
still derived from the authoritative ToolRuntime result.

## 13. Agent-less boundary

A native ToolRuntime execution without an agent still produces the pinned
`tools/result` notification, but the Adapter does not synthesize a
session-scoped `tool.completed` event because no authoritative session owner is
available.

This is a fail-closed attribution boundary rather than a guessed session mapping.

## 14. Observer failure containment

Spec 0047 requires downstream observer failures not to rewrite Harness execution
semantics.

Pinned rc5 `ToolRuntime.notifyResult()` contains both:

```text
synchronous observer throws
Promise/thenable observer rejections
```

Real conformance covers both paths. The asynchronous case intentionally registers
through the public raw event-service seam because the typed `ctx.on()`
`tools/result` listener contract is synchronous, while ToolRuntime's runtime
notification path explicitly contains returned thenables.

In both cases the tool execution still returns its successful final result.

## 15. Adapter observation failure containment

A failure inside Adapter observation/normalization, demonstrated with a throwing
digest function, is reported through the Adapter observation-failure hook and
does not mutate or replace the already-authoritative ToolRuntime result.

No synthetic completion is emitted when the Adapter cannot safely finish its own
observation projection.

This keeps Adapter observability failure separate from Harness execution
semantics.

## 16. Subscription disposal

Real conformance proves disposing the Adapter observation subscription prevents
future `tools/result` delivery from producing normalized completion events for
that subscription.

Disposal does not rewrite ToolRuntime behavior; it only terminates Adapter
observation ownership.

## 17. Corpus coverage

The M4-043 source-conformance corpus contains exactly 32 cases:

```text
DATR-001 through DATR-032
```

The gate-local corpus coverage test checks profile/case coverage without
registering M4-043 as a new portable Shared TCK lifecycle surface. M4-043 remains
an Adapter compatibility/source-conformance Gate over the existing portable
lifecycle contract.

## 18. Type-safety corrections during exact-source verification

The first source-conformance candidate correctly identified the intended rc5
runtime seams but exposed test-helper typing defects under the exact pinned public
source.

The fixes remained test-only and source-backed:

1. `defineTool.execute` was wrapped as an async function because pinned rc5
   requires a Promise-returning execute callback;
2. the asynchronous `tools/result` observer used the public raw event service to
   exercise ToolRuntime's real thenable-containment path without weakening the
   typed `ctx.on()` contract;
3. the helper stopped recursively reflecting the generic `defineTool` signature
   and instead used the exact public rc5 `ToolExecution`, `ToolExecutionResult`
   and `ContentBlock[] | undefined` finalizer signature.

The last exact TypeScript blocker was:

```text
TS2321: Excessive stack depth comparing types 'InferObject<S, ?>' and 'InferObject<S, ?>'.
```

It was caused by test-helper generic type reflection, not by production Adapter
semantics. No `any`, unsafe cast, validator relaxation, TypeScript weakening or
production rewrite was introduced to obtain green conformance.

## 19. Final reviewed exact-head evidence

Final reviewed conformance exact head:

```text
f681138030626c1be73810b788052a7306bd80ab
```

Evidence on that same SHA:

```text
CI #597 / run 33857013262: PASS
Harness #539 / run 33857013278: PASS
Harness step 10 exact rc5 binding/source-conformance typecheck: PASS
Harness step 11 real rc5 runtime conformance: PASS
```

PR #3 remained Open and Draft. At audit preparation time it was mergeable, with
no submitted reviews and no review threads.

## 20. Security and compatibility non-claims

M4-043 does **not** prove or claim:

```text
every host effect traverses Harness ToolRuntime
a successful tool result proves every claimed external effect happened
a failed tool result proves external effects were absent or rolled back
provider/process/kernel isolation
complete system-wide tool-enforced coverage
durable exactly-once delivery or storage
raw tool results are safe to persist in audit records
```

Raw-result redaction/persistence remains later audit ownership, including
M4-045. Repository-wide duplicate approval-subsystem uniqueness remains M4-044.
Negative enforcement boundaries remain M4-050+.

These exclusions are part of acceptance; removing them would overstate the
security guarantee.

## 21. Acceptance decision

M4-043 implementation/source-conformance is **ACCEPTED** at:

```text
f681138030626c1be73810b788052a7306bd80ab
```

because:

- protocol-first authority was established and dual-green before conformance;
- the existing production binding was reviewed before considering changes;
- exact pinned rc5 source and runtime prove `tools/result` final ownership;
- digest ownership follows the exact final result;
- intermediate body/policy/disposition state is not promoted to authority;
- agent-less attribution fails closed;
- sync/async observer failures and Adapter observation failure are contained;
- the final conformance delta is test-only and production-neutral;
- normal CI and exact pinned Harness source-conformance are dual-green on the
  same final reviewed SHA;
- the security/non-claim boundary remains explicit.

This audit commit itself is **not yet accepted** until its own exact head passes
normal CI and exact pinned Harness rc5 source-conformance.

No roadmap M4-043 marker, HISTORY entry, M4-044 authorization, or PR merge state
may change merely because this file was created.
