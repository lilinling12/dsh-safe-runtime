# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before changes;
> normative specs/schemas/TCK and accepted exact-head evidence remain authority.

## Snapshot

- Recorded at: `2026-09-05`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M4 — Capability Broker v0.1`
- Active PR: `#3 — feat(policy): begin M4 capability broker`
- Branch: `feat/m4-capability-broker`
- Base: `main@57430273e065be8d38807d67b175fa154c801d43`
- Exact parent governance head: `6be76b80e5e462cd66c8743e1cf142b4e52b2d68`
- M4-001..014: **GOVERNANCE CLOSED**
- M4-020..025: **GOVERNANCE CLOSED**
- M4-030..036: **GOVERNANCE CLOSED**
- M4-040: **GOVERNANCE CLOSED**
- M4-041: **GOVERNANCE CLOSED**
- M4-042: **GOVERNANCE CLOSED**
- M4-043 authoritative `tools/result`: **GOVERNANCE CLOSED**
- M4-044 no duplicate approval subsystem: **ACCEPTED / GOVERNANCE EXACT-HEAD VERIFICATION PENDING**
- M4-045+: **NOT AUTHORIZED until M4-044 governance closure**
- M4-050+, M5, M6, M10, M13, M15: **NOT AUTHORIZED by the current Gate**
- PR #3 merge: **NOT AUTHORIZED without explicit user authorization**

Live GitHub state overrides this snapshot.

## Current authority and pinned baseline

- Spec: `specs/0048-m4-approval-subsystem-uniqueness.md`.
- Corpus: `fixtures/approval-subsystem-uniqueness/cases.json`.
- Profile: `M4-044_APPROVAL_SUBSYSTEM_UNIQUENESS_V1`, 24 cases DAU-001..024.
- Portable approval routing remains Spec 0034 / M4-023 authority.
- Adapter native ToolRuntime ASK remains Spec 0046 / M4-042 authority.
- Harness compatibility baseline: `0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a`.
- Harness implementation never overrides portable protocol authority.

M4-043 predecessor governance evidence remains
`6be76b80e5e462cd66c8743e1cf142b4e52b2d68`, CI #603 / 33881990790 and
Harness #545 / 33881990595 PASS. Its accepted tools/result final-authority
boundary remains unchanged; see `docs/acceptance/m4-043-acceptance-audit.md`.

## M4-044 protocol-first evidence

Exact head: `ff7bb64e9bf51c9687598476f52414dd0d964a39`.

- CI #609 / `33883718218`: PASS.
- Harness #551 / `33883718205`: PASS.

Only after this dual-green head did source-conformance implementation begin.

## Accepted conformance

Exact head: `333ac1213c4e4b5f416b7c60497900fe2c2f7a9a`.

- CI #613 / `33930456673`: PASS.
- Harness #555 / `33930456658`: PASS.
- Job `101207810230`, step 10 pinned-source typecheck: PASS.
- Same job, step 11 real rc5 runtime conformance: PASS (21 files / 105 tests).
- M4-044 runtime suite: 2 tests; corpus traceability suite: 4 tests.

Net conformance delta from protocol-first: two added conformance files, +252/-0.
No production, Spec/corpus, schema, dependency, lockfile or workflow change.

The same real Context/Agent proves one native ASK reaches one ApprovalService
request and one correlated asked/decided pair. A later deliberate explicit
Adapter requestApproval reaches the same service once more with a distinct
native ID, without another tools/pre-execute entry or tool-body execution.

Repository-wide review found no competing production approval orchestrator.
Capability Broker invokes one supplied port; Adapter ASK only projects the
native decision; explicit requestApproval calls ctx.get("approval"). Observation
correlation maps are not approval decision/grant stores. Testkit fake approval
remains test-only. No production rewrite is warranted.

## Remediation record

Harness #552 at `869151d25fb13536298127b2615a9e3504aaac9d` failed step 10
with four TS2339 diagnostics at conformance lines 136-138. A helper erased
SessionEvent payload typing. `a18d4467571379da605cdcd81a7a42e5993f2df4`
removed it and directly filtered session.events without weakening assertions;
CI #611 / Harness #553 passed. The Agent was already registered.

Subsequent review aligned DAU-012..023 evidence labels with the normative corpus
and strengthened audit-ID pairing and no-second-pre-execute assertions.
Local review commit cd0470e was published through the GitHub connector as
b90336cd then 333ac121; their final conformance contents match the reviewed files.
The previous upload blocker is resolved.

Windows local check:all encounters the existing duplicated-drive-path failure
in verify-boundaries.mjs. That unrelated script was not changed; do not claim
local full-suite success or weaken checks. Remote fixed-environment CI is the
acceptance evidence.

## Acceptance and next verification

Audit: `docs/acceptance/m4-044-acceptance-audit.md`.

Audit-only head: `ab00b2be8aac3201ab4d20fe686173089d663155`.

- CI #614 / `33930612203`: PASS.
- Harness #556 / `33930612213`: PASS.
- Harness steps 10 and 11: PASS.

The governance update is restricted to CURRENT, append-only HISTORY and the
M4-044 roadmap acceptance marker. Its final exact head must independently pass
normal CI plus pinned Harness steps 10/11 before M4-044 governance is closed.
M4-045 remains locked until then.

## Non-claims and resume

This Gate does not prove arbitrary callers cannot deliberately double-invoke
approval APIs, complete host-effect mediation, effect success or rollback,
provider/process/kernel isolation, durable exactly-once approval, raw audit-data
secrecy, or M5 ledger semantics.

1. Refresh PR #3 metadata, exact head, base, reviews and review threads.
2. Verify the final governance head itself has normal CI and Harness dual-green.
3. If failing, read the current failed job/step/diagnostic before any edit.
4. After governance passes, record closure and authorize only M4-045 protocol-first
   evidence recovery. Do not silently begin its implementation.
5. Keep PR #3 Open / Draft. Never merge, force-push or rewrite accepted ancestry.
6. Preserve HISTORY append-only and avoid unrelated production or dependency work.

## Preserved predecessor recovery record

The following M4-043 evidence and original M4-044 recovery guidance are retained
for continuity. The verified M4-044 status and resume steps above are current.

## M4-043 protocol-first authority

Normative specification:

```text
specs/0047-m4-dsh-authoritative-tool-result.md
profile: M4-043_DSH_AUTHORITATIVE_TOOL_RESULT_V1
```

Portable/source-conformance corpus:

```text
fixtures/dsh-authoritative-tool-result/cases.json
32 cases: DATR-001 through DATR-032
```

Protocol-first exact head:

```text
48259967bcae767cf292a7934c23c29a2274658e
```

Its parent is M4-042 final governance head:

```text
0bd01855bd71fa39e6a0c9e7437515faaf8c63b2
```

Protocol-first exact-head evidence:

- CI #593 / run `33788981150`: PASS;
- exact pinned Harness rc5 source-conformance #535 / run `33788981153`: PASS.

Only after that head became dual-green did M4-043 source-conformance work begin.

## Accepted ownership model

M4-043 reuses the accepted portable lifecycle boundary:

```text
tool.requested = request intent only
tool.completed = observed final outcome
```

For Adapter DSH, the accepted live final-result source is:

```text
final materialized Harness tools/result
```

The following are explicitly not final authority:

```text
tool body return
post-execute pre-final candidate
policy / guard / approval intent
process-local denied / cancelled disposition state
```

Required digest ownership remains:

```text
resultDigest = digest(exact tools/result result)
```

The digest algorithm itself remains host-defined.

## Existing production binding accepted without rewrite

The existing Adapter production binding in:

```text
packages/adapter-dsh/src/binding.ts
```

already observes:

```text
ctx.on("tools/result", (exec, result) => ...)
```

For an agent-backed result it:

1. derives `sessionRef` from the live execution agent/session;
2. correlates exact `exec.callId` and `exec.name`;
3. uses process-local denial/cancellation disposition only as classification aid;
4. computes `resultDigest` from the exact observed final result;
5. normalizes from that same source fact;
6. emits through the existing ordered observation dispatcher.

Agent-less results are not synthesized into session-scoped `tool.completed`.

Exact-source review found no concrete production defect requiring a rewrite.
M4-043 therefore remains a proof-of-existing-binding Gate.

## Pinned Harness baseline and final-result chain

Exact pinned Harness compatibility baseline remains:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
```

Pinned ToolRuntime source establishes:

```text
body / tools/execute
-> tools/post-execute
-> materialize candidate
-> definition-owned final content
-> materialize final result
-> notifyResult(exec, finalResult)
-> return finalResult
```

`notifyResult()` contains both synchronous observer throws and returned
Promise/thenable rejections. Observer failure therefore does not become a channel
for replacing the already-final ToolRuntime result.

## Final reviewed conformance

Final reviewed conformance exact head:

```text
f681138030626c1be73810b788052a7306bd80ab
```

Its net delta from the protocol-first head is exactly two source-conformance
files:

```text
packages/adapter-dsh/source-conformance/m4-043-authoritative-tool-result.conformance.ts
packages/adapter-dsh/source-conformance/m4-043-corpus-coverage.conformance.ts
```

There is no production-code delta.

Real pinned rc5/source evidence covers:

- exact final object identity after post-execute and definition finalization;
- final success/error authority rather than earlier body state;
- exact final-result digest ownership;
- policy disposition as classification only;
- exact session/call/tool correlation;
- agent-less fail-closed attribution;
- frozen execution boundary;
- synchronous observer throw containment;
- asynchronous observer rejection containment;
- Adapter observation/digest failure containment;
- subscription disposal;
- explicit separation of executable evidence, pinned-source evidence, reused
  M3 conformance and architecture non-claims.

Final reviewed exact-head evidence:

- CI #597 / run `33857013262`: PASS;
- exact pinned Harness rc5 source-conformance #539 / run `33857013278`: PASS;
- Harness step 10 exact rc5 binding/source-conformance typecheck: PASS;
- Harness step 11 real rc5 runtime conformance: PASS.

## Exact-source TypeScript remediation record

M4-043 source-conformance encountered test-helper typing defects under the exact
pinned public source. They were corrected without weakening any quality gate:

1. `defineTool.execute` was aligned to the pinned Promise-returning contract;
2. the async DATR-023 observer was registered through the public raw event-service
   seam so ToolRuntime's real thenable-containment path is exercised without
   weakening the typed `ctx.on()` contract;
3. brittle recursive `Parameters<typeof defineTool>` reflection was replaced by
   the public rc5 `ToolExecution`, `ToolExecutionResult` and
   `ContentBlock[] | undefined` finalizer signature after exact-head TS2321 proved
   compiler recursion in the helper type.

No `any`, unsafe cast, TypeScript relaxation, validator/schema/TCK weakening,
production rewrite, dependency or lockfile change was used to obtain green CI.

## Acceptance audit

Acceptance audit:

```text
docs/acceptance/m4-043-acceptance-audit.md
```

Audit-only exact head:

```text
5455ce99c7de06b209af616f43a544bf2e6eec3b
```

Audit exact-head evidence:

- CI #598 / run `33857346910`: PASS;
- exact pinned Harness rc5 source-conformance #540 / run `33857346900`: PASS;
- Harness step 10: PASS;
- Harness step 11: PASS;
- PR #3 remained Open, Draft and mergeable;
- reviews: none;
- review threads: none.

The audit accepts M4-043 implementation/source-conformance at `f681138...`.

## M4-043 governance closure

Final governance evidence head:

```text
6be76b80e5e462cd66c8743e1cf142b4e52b2d68
```

The exact diff from audit head `5455ce99c7de06b209af616f43a544bf2e6eec3b`
is restricted to the authorized governance files. `docs/handoff/HISTORY.md` is
append-only in the resulting state (`+63/-0` from the audit head); no production,
Spec/corpus/schema, dependency, lockfile or Harness workflow behavior changed.

Exact-head closure evidence:

- normal CI #603 / run `33881990790`: PASS;
- exact pinned Harness rc5 source-conformance #545 / run `33881990595`: PASS;
- Harness step 10 exact rc5 binding/source-conformance typecheck: PASS;
- Harness step 11 real rc5 runtime conformance: PASS.

Therefore M4-043 governance is CLOSED. M4-044 P0 `no duplicate approval
subsystem` is the sole newly authorized Gate.

## Security / non-claim boundary

M4-043 does not prove:

```text
every host effect traverses ToolRuntime
successful result means every claimed external effect happened
failed result means external effects were absent or rolled back
provider/process/kernel isolation
complete system-wide tool-enforced coverage
durable exactly-once delivery or storage
raw tool results are safe for audit persistence
```

M4-044 owns formal repository-wide duplicate approval-subsystem audit. M4-045
owns raw-secret/audit redaction. M4-050+ owns negative enforcement boundaries.

## M4-044 active Gate boundary

M4-044 must begin from existing approval ownership and repository evidence. It
must prove that the accepted portable approval-routing seam and the Adapter DSH
native ToolRuntime approval path do not create competing approval orchestration
for one action.

M4-044 MUST NOT:

```text
invent a second approval service or state machine
change M4-023 approval semantics without a concrete authority conflict
replace Harness native ApprovalService ownership with Adapter-local orchestration
start M4-045 audit redaction
start M4-050+ negative boundary work
change public protocol/schema without normative authority
merge PR #3
```

Production changes are allowed only if repository-wide evidence identifies a
concrete duplicate-subsystem defect. Otherwise this Gate should close by audit and
conformance evidence rather than speculative refactoring.

## Resume instruction

1. refresh PR #3 and current exact head before any M4-044 modification;
2. recover approval ownership from M4-023, M4-042, Adapter production binding and
   exact pinned Harness rc5 source/tests;
3. inspect repository approval-related entry points, ports, services, tests and
   integration wiring for duplicate orchestration or independent decision state;
4. distinguish portable approval routing from Harness compatibility binding;
5. if a concrete duplicate path exists, make the smallest authority-consistent
   fix and prove it; otherwise produce a repository-wide uniqueness audit with
   executable/source evidence and no production rewrite;
6. require exact-head normal CI + exact pinned Harness rc5 source-conformance for
   M4-044 acceptance/governance;
7. do not begin M4-045 or M4-050+ before M4-044 governance closure;
8. keep M5, M6, M10, M13, M15 and PR #3 merge unauthorized;
9. never merge PR #3 without explicit user authorization.
