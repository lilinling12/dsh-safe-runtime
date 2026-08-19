# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK remain semantic authority.

## Snapshot

- Recorded at: `2026-08-19T15:32+08:00`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M3 — Shared TCK Foundation`
- Pull request: `#2 — feat(testkit): establish M3 shared TCK foundation`
- PR state: `OPEN / DRAFT`
- Branch: `feat/m3-shared-tck-foundation`
- Stacked base: `feat/m2-harness-adapter@6a9c64155ec6c376908e64d70f2b50d5b8de1285`
- Verified M3-011 implementation head: `1d2c92af8ec22ebae4644f1bc9a01fbef557a870`
- M2 acceptance: **ACCEPTED**

PR #2 remains intentionally stacked on the accepted M2 branch. M3 changes MUST
NOT be added back into PR #1 because that would mutate the accepted M2 evidence
line.

## M2 accepted baseline carried forward

DeepSeek Harness remains an adapter compatibility baseline, never protocol authority:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

Accepted M2 head `6a9c64155ec6c376908e64d70f2b50d5b8de1285` remains the accepted evidence line:

- normal CI #71: PASS;
- exact Harness rc5 source-conformance #53: PASS.

`docs/acceptance/m2-acceptance-audit.md` remains the M2 acceptance authority.

## Completed M3 gates

### M3-001 / M3-002 / M3-003 — Shared TCK foundation

Complete. The language-independent envelope, runner status semantics, explicit
deterministic seed/logical-clock inputs, Draft 2020-12 schema, portable fixtures,
and TypeScript projection remain the foundation for later profile-specific TCK
contracts.

### M3-004 — Fake approval

Complete on implementation head `cc59a5db1045346792d823e56557d78438dd37c1`
(CI #79 PASS). Portable decisions remain exactly `ALLOWED_ONCE`, `REJECTED`,
`CANCELLED`, and `UNAVAILABLE`; exhaustion remains an explicit infrastructure
error rather than an approval decision.

### M3-005 — Fake tool runtime

Complete on implementation head `d5cc341594e79e7203d2203052db27f37984dfa7`
(CI #81 PASS). Portable outcomes remain exactly `RESULT`, `ERROR`, and `DENIED`;
request intent, body entry, and final outcome remain distinct.

### M3-006 — Fake filesystem/subprocess execution world

Complete on implementation head `de5d4e0cc7099cfa35d91211f81b87f2784ca5df`
(CI #86 PASS). Filesystem/subprocess results remain explicit fake facts, paths are
inert data, same-world correlation does not imply provider mediation of process
file effects, and no process/kernel isolation or workspace transaction guarantee
is claimed.

### M3-007 — Deterministic fault injection interface

Complete on implementation head `494e08de5b1304ef039c5a5462f083b7e76b8a29`
(CI #91 PASS). Fault injection remains explicit deterministic test-control data;
it does not become production crash/timeout/rollback semantics or hidden behavior
inside the existing fake tool/execution-world services.

### M3-010 — Adapter DSH turn lifecycle Shared TCK

Complete on verified implementation head
`728f44e73ac61dba1b40d570f2458bd456d79bbc`.

The gate preserves the protocol/adapter authority split, does not invent
`step.ended`, rejects malformed portable evidence before implementation
invocation, and is verified by normal CI #99 plus exact Harness rc5
source-conformance #58 with oxlint 0 warnings / 0 errors.

### M3-011 — Adapter DSH tool ordering Shared TCK

**Complete on verified implementation head
`1d2c92af8ec22ebae4644f1bc9a01fbef557a870`.**

The gate is intentionally limited to explicit request/completion ordering and
correlation evidence:

1. `specs/0010-m3-adapter-dsh-tool-ordering-tck.md` defines the
   language-independent `ADAPTER_DSH` ordering contract before the TypeScript
   projection;
2. durable `session/event: tool/call` remains request intent and maps to
   `tool.requested`;
3. live `tools/result` remains the accepted final-outcome source seam and maps to
   `tool.completed`, but M3-011 compares only ordering/correlation fields;
4. one fixture models a completed tool batch inside one turn/step;
5. source array order is authoritative; timestamps, scheduler timing, expected
   output, or inferred missing events MUST NOT reorder/repair evidence;
6. portable fixtures cover single-call, parallel-dispatch/model-order completion,
   and barrier/sequential ordering;
7. malformed evidence fails before implementation invocation, including
   result-before-request, duplicate request/result, missing completion,
   completion-order reversal, tool-name mismatch, cross-turn/cross-step evidence,
   and non-increasing durable request sequence;
8. direct-call values reject cyclic, sparse, exotic, non-finite, named-property,
   and symbol-property JSON-incompatible state;
9. Adapter DSH conformance reuses production `normalizeDurableEvent()` and
   `normalizeFinalToolResult()` rather than redefining adapter semantics;
10. exact pinned rc5 source-conformance uses real public `Session.append()` and
    `ToolRuntime.execute()` seams and proves correlated
    `tool.requested -> tool.completed` delivery through the production ordered
    dispatcher with asynchronous sink acceptance;
11. the final quality review hardened the reference runner so malformed projector
    output fails closed as `ADAPTER_DSH_TOOL_ORDERING_IMPLEMENTATION_ERROR`
    instead of being misclassified as a normal expectation mismatch;
12. production adapter mapping, schemas, compatibility baseline, lockfile,
    architecture rules, and security guarantees were not changed or weakened.

Portable fixtures added and registered:

- `adapter-dsh-tool-ordering-single.json`;
- `adapter-dsh-tool-ordering-parallel-model-order.json`;
- `adapter-dsh-tool-ordering-barrier.json`.

Final exact-head evidence for `1d2c92af...`:

| Gate | State | Evidence |
| --- | --- | --- |
| Normal CI | **PASS** | run #117 / job `95989874919` |
| Exact Harness rc5 source-conformance | **PASS** | run #76 / job `95989874925` |
| Frozen install | **PASS** | `pnpm install --frozen-lockfile` |
| Supply-chain lockfile policy | **PASS** | 123 entries verified |
| Architecture boundaries | **PASS** | `verify-boundaries.mjs` |
| Schema shape / compatibility baseline | **PASS** | 16 schemas / baseline green |
| TypeScript typecheck | **PASS** | protocol + adapter packages |
| Portable M3-011 profile tests | **PASS** | 22 tests |
| Adapter DSH ordering TCK | **PASS** | 4 tests |
| Full repository tests | **PASS** | 16 files / 141 tests |
| Lint | **PASS** | 0 warnings / 0 errors |
| Exact pinned rc5 build/binding/runtime seam | **PASS** | source-conformance steps 6–11 green |

The earlier CI #115 portability failure was fixed by making Spec 0010
package-neutral while retaining the portability regression guard. The stale
queued CI #116 was not treated as acceptance evidence; the final verified normal
CI line is #117 on `1d2c92af...`.

## Current gate

**M3-012 P0 — denied tool call never enters body Shared TCK.**

This is the next and only newly authorized implementation gate.

M3-012 MUST begin by reconciling:

- Spec 0003 request/outcome semantics;
- Spec 0006 fake tool trace distinction between request intent, body entry, and
  outcome (test evidence only, not normalized protocol vocabulary);
- current Adapter DSH `registerToolPolicy()` / monotonic guard behavior;
- exact pinned rc5 `tools/pre-execute`, guard, approval-denial, and ToolRuntime
  execution seams;
- existing exact-source policy/approval conformance.

Required boundaries for M3-012:

- define language-independent denied/body-entry semantics before TypeScript or
  Adapter DSH projection code;
- prove a denied call does not invoke the registered tool body using explicit
  test-side instrumentation/evidence;
- do not invent a normalized `body.entered` runtime event unless a higher
  authority explicitly requires one;
- request intent MUST remain distinct from body entry and final outcome;
- denial evidence must fail closed and must not be inferred from absence alone
  when the source seam can provide an explicit decision/result fact;
- do not absorb M3-013 final-result content/digest/outcome authority;
- do not pull M3-014 approval unavailable, M3-015 cancellation, M3-016 disposal,
  M3-017 replay reconciliation, M4 Capability Broker, or M6 Workspace
  Transaction semantics forward;
- DeepSeek Harness remains compatibility evidence, never protocol authority.

## Deferred M3 work

Not yet implemented:

- `M3-012 P0` denied call never enters body — **CURRENT GATE**;
- `M3-013 P0` final result mapping;
- `M3-014 P0` approval unavailable;
- `M3-015 P0` cancellation;
- `M3-016 P0` disposal;
- `M3-017 P1` replay reconciliation.

## Boundaries that remain enforced

- Spec/Schema/fixtures define shared semantics before TypeScript implementation.
- `packages/testkit` is one implementation; it does not define portable semantics.
- Shared TCK fixtures MUST remain consumable by a non-TypeScript implementation.
- DeepSeek Harness is an Adapter and MUST NOT define protocol or generic fake
  runtime semantics.
- Shared contracts MUST NOT contain concrete Harness package paths.
- No host wall-clock or ambient randomness may decide a fixture result.
- Unknown versions/profiles/operations/semantics fail explicitly.
- Do not weaken TypeScript strictness, schemas, compatibility baseline,
  validators, conformance tests, frozen installs, or security claims for CI.
- Do not implement M4 Capability Broker or M6 Workspace Transaction early.

## Governance follow-up

`HISTORY.md` is append-only and `docs/roadmap.md` is a long-lived planning file.
The current connector exposes only whole-file replacement for those files and the
local environment cannot resolve `github.com`, so this session did not risk a
manual 25KB+ rewrite merely to record the closure. They remain governance
follow-ups; the live/normative M3-011 acceptance evidence above is authoritative
for continuing from M3-012.

## Resume instruction

Read `docs/handoff/README.md`, this file, PR #2 live metadata, and workflow runs
for the exact live head before editing. The verified M3-011 implementation head
is `1d2c92af8ec22ebae4644f1bc9a01fbef557a870`; documentation commits may advance
the branch, so live GitHub evidence still wins.

If the exact live documentation head remains green, continue with **M3-012 denied
tool call never enters body Shared TCK** in protocol-/fixture-first order. If it
fails, inspect the actual current-head failing job/step/diagnostic and repair it
without weakening any gate.