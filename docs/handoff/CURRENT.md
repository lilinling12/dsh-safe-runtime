# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before changes;
> normative specs/schemas/TCK and accepted exact-head evidence remain authority.

## Snapshot

- Recorded at: `2026-09-04`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M4 — Capability Broker v0.1`
- Active PR: `#3 — feat(policy): begin M4 capability broker`
- Branch: `feat/m4-capability-broker`
- Base: `main@57430273e065be8d38807d67b175fa154c801d43`
- Exact parent governance head: `0bd01855bd71fa39e6a0c9e7437515faaf8c63b2`
- M4-001..014: **GOVERNANCE CLOSED**
- M4-020..025: **GOVERNANCE CLOSED**
- M4-030..036: **GOVERNANCE CLOSED**
- M4-040: **GOVERNANCE CLOSED**
- M4-041: **GOVERNANCE CLOSED**
- M4-042: **GOVERNANCE CLOSED**
- M4-043 authoritative `tools/result`: **PROTOCOL-FIRST CANDIDATE / EXACT-HEAD VERIFICATION REQUIRED**
- M4-044+: **NOT AUTHORIZED until M4-043 governance closure**
- M4-050+, M5, M6, M10, M13, M15: **NOT AUTHORIZED by the current Gate**
- PR #3 merge: **NOT AUTHORIZED without explicit user authorization**

Live GitHub state overrides this snapshot.

## M4-042 final closure

M4-042 final governance exact head:

```text
0bd01855bd71fa39e6a0c9e7437515faaf8c63b2
```

Its governance delta was exactly:

```text
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md   # append-only
docs/roadmap.md           # M4-042 marker only
```

Exact-head evidence:

- CI #592 / run `33784947948`: PASS;
- exact pinned Harness rc5 source-conformance #534 / run `33784947972`: PASS;
- Harness step 10 exact rc5 binding/source-conformance typecheck: PASS;
- Harness step 11 real rc5 runtime conformance: PASS.

Therefore M4-042 governance is CLOSED and M4-043 is the sole newly authorized
protocol-first Gate.

## M4-043 normative authority candidate

New normative specification:

```text
specs/0047-m4-dsh-authoritative-tool-result.md
profile: M4-043_DSH_AUTHORITATIVE_TOOL_RESULT_V1
```

Portable/source-conformance corpus:

```text
fixtures/dsh-authoritative-tool-result/cases.json
32 cases: DATR-001 through DATR-032
```

M4-043 reuses rather than redefines accepted M3-013 authority:

```text
tool.requested = request intent only
tool.completed = observed final outcome
tools/result   = final authoritative live tool outcome for Adapter DSH
```

## Existing production binding under review

The existing Adapter already observes:

```text
ctx.on("tools/result", (exec, result) => ...)
```

For an agent-backed result it:

1. derives `sessionRef` from `exec.agent.session.id`;
2. correlates exact `exec.callId` / `exec.name`;
3. reads only process-local policy/cancellation disposition as classification aid;
4. computes `options.digest(result)` from the exact observed result;
5. passes the same final source fact to `normalizeFinalToolResult()`;
6. emits through the existing ordered observation dispatcher.

Agent-less results are not synthesized into session-scoped `tool.completed`.

M4-043 MUST begin by proving this existing binding. No production change is
authorized before exact-source conformance demonstrates a concrete gap.

## Pinned rc5 final-result facts

Exact pinned Harness baseline remains:

```text
0.1.0-rc.5
47f943859bef60e4160492346772ded9b24f765a
```

Exact ToolRuntime source establishes:

```text
body / tools/execute
-> tools/post-execute
-> materialize candidate
-> apply definition-owned final content
-> materialize again
-> notifyResult(exec, finalResult)
-> return finalResult
```

`notifyResult()` freezes the live execution object, dispatches the emit-style
`tools/result` notification with that exact `finalResult`, and contains both
synchronous observer throws and asynchronous observer rejections so observers do
not acquire a mutation/error channel back into the already-final result.

## M3-013 evidence reused

Existing `packages/adapter-dsh/source-conformance/tool-result.conformance.ts`
already proves against real rc5:

- body return can differ from final post-execute content;
- ToolRuntime returns the post-processed materialized final result;
- a real `tools/result` observer sees that final result;
- Adapter emits exactly one correlated `tool.completed`;
- Adapter `resultDigest` equals the digest of the final result, not body return;
- a real body throw maps from authoritative final error to normalized error.

M4-043 will not duplicate this portable mapping. It adds ownership-specific
evidence for exact final-object authority, observer failure containment,
agent-less boundary, durable/live non-duplication, disposition-as-classification
only, and explicit non-claims.

## M4-043 required ownership rules

The protocol-first contract freezes these boundaries:

```text
body return                         != final authority
post-execute pre-final candidate    != final authority
policy/guard/approval intent        != final authority
final materialized tools/result     == Adapter DSH live final authority
```

Required digest ownership:

```text
resultDigest = digest(exact tools/result result)
```

The digest algorithm itself is not standardized by M4-043.

Existing process-local `denied` / `cancelled` disposition state may classify the
normalized final event only after the authoritative result arrives. It MUST NOT
replace or synthesize the final result or digest source.

## Durable/live separation

M4-043 keeps live notification ownership separate from durable replay:

- native live `tools/result` may produce one normalized `tool.completed` for an
  active agent-backed observation subscription;
- the later durable session `tool/result` must not produce a second live
  completion;
- M3-017 remains authority for replay reconciliation;
- M4-043 does not define durable exactly-once delivery or storage.

## Security / non-claim boundary

M4-043 does not prove:

```text
every host effect traverses ToolRuntime
successful result means every claimed external effect happened
failed result means external effects were absent or rolled back
provider/process isolation
complete system-wide tool-enforced coverage
raw-result persistence is safe
```

M4-045 remains owner of audit redaction. M4-044 remains owner of repository-wide
approval-subsystem uniqueness. M4-050+ remains owner of negative enforcement
boundaries.

## Protocol-first candidate boundary

This transition is authorized to change exactly:

```text
specs/0047-m4-dsh-authoritative-tool-result.md
fixtures/dsh-authoritative-tool-result/cases.json
docs/handoff/CURRENT.md
```

It MUST NOT change:

```text
production TypeScript
existing M3-013 implementation/tests
HISTORY
roadmap M4-043 marker
public protocol/schema
Shared TCK registration
package manifests/dependencies
pnpm-lock.yaml
Harness baseline/workflow
M4-044+
M4-050+
M5
M6
M10
M13
M15
PR #3 merge state
```

## Resume instruction

1. refresh PR #3 and require the protocol-first candidate to be based directly on
   M4-042 governance head `0bd01855bd71fa39e6a0c9e7437515faaf8c63b2`;
2. verify the candidate diff contains exactly Spec 0047, DATR corpus and CURRENT;
3. require exact-head normal CI + exact pinned Harness rc5 source-conformance
   green, including steps 10 and 11;
4. only then authorize M4-043 source-conformance/production review;
5. source-conformance must test the existing production binding before any code
   rewrite and reuse M3-013 evidence rather than fork its semantics;
6. do not begin M4-044 approval uniqueness or M4-045 redaction early;
7. keep M4-050+, M5, M6, M10, M13, M15 and PR #3 merge unauthorized.
