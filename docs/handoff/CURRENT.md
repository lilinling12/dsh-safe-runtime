# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK remain semantic authority.

## Snapshot

- Recorded at: `2026-08-19T10:18+08:00`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M3 — Shared TCK Foundation`
- Pull request: `#2 — feat(testkit): establish M3 shared TCK foundation`
- PR state: `OPEN / DRAFT`
- Branch: `feat/m3-shared-tck-foundation`
- Stacked base: `feat/m2-harness-adapter@6a9c64155ec6c376908e64d70f2b50d5b8de1285`
- Verified implementation head: `728f44e73ac61dba1b40d570f2458bd456d79bbc`
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

The gate preserved the protocol/adapter authority split and added independent
portable, adapter, and exact-upstream evidence layers:

1. `specs/0009-m3-adapter-dsh-turn-lifecycle-tck.md` defines the
   language-independent `ADAPTER_DSH` turn-lifecycle profile before the
   TypeScript runner projection;
2. the portable lifecycle observables are only `turn.started`, `step.started`,
   and `turn.ended`, matching the already-authorized Spec 0003 vocabulary;
3. real Harness durable `step/end` source evidence maps explicitly to
   `NO_EVENT`; M3-010 does **not** invent a normalized `step.ended` event;
4. portable fixtures cover completed, cancelled (`aborted`), blocked, failed,
   and unsupported terminal-reason behavior;
5. unknown Harness terminal reasons fail closed with the existing stable adapter
   code `UNSUPPORTED_HARNESS_TURN_END_REASON` at the exact source ordinal;
6. source-array order is authoritative and source `seq` must be strictly
   increasing; timestamps are retained as evidence but never used to reorder or
   infer missing lifecycle facts;
7. malformed lifecycle grammar is rejected before invoking the implementation,
   including mismatched step brackets, cross-turn evidence, unknown fields, and
   non-increasing sequence data;
8. direct TypeScript calls are constrained to portable JSON semantics, including
   rejection of cyclic values, sparse arrays, symbol/named array properties,
   exotic objects, and non-finite numbers;
9. `packages/testkit/src/adapter-dsh-turn-lifecycle.ts` is generic Shared TCK
   infrastructure and imports neither Adapter DSH nor concrete Harness types;
10. `packages/adapter-dsh/test/turn-lifecycle-tck.test.ts` runs the portable cases
    against the existing adapter normalization rather than reimplementing
    production mapping semantics;
11. `packages/adapter-dsh/source-conformance/turn-lifecycle-tck.conformance.ts`
    writes real pinned rc5 `Session.append()` lifecycle events and proves the
    actual upstream seam projects `turn.started -> step.started -> turn.ended`
    while real `step/end` does not fabricate `step.ended`;
12. production normalization semantics and schemas were not changed or weakened.

Portable fixtures added and registered:

- `adapter-dsh-turn-lifecycle-completed.json`;
- `adapter-dsh-turn-lifecycle-cancelled.json`;
- `adapter-dsh-turn-lifecycle-blocked.json`;
- `adapter-dsh-turn-lifecycle-failed.json`;
- `adapter-dsh-turn-lifecycle-unsupported-reason.json`.

Quality review was stricter than green-functionality alone. A self-review found
that direct-call sparse-array detection needed to compare enumerable index count
to array length; this was corrected and dedicated sparse/symbol regression tests
were added. The first resulting functional head passed all repository checks but
had one oxlint `no-array-constructor` warning in the regression-test setup. That
warning was treated as a quality defect rather than accepted. Final head
`728f44e...` changes only the sparse-test construction and restores a clean lint
baseline.

Validation evidence for `728f44e...`:

| Gate | State | Evidence |
| --- | --- | --- |
| Normal CI | **PASS** | run #99 / job `95936172958` |
| Exact Harness rc5 source-conformance | **PASS** | run #58 / job `95936172462` |
| Frozen install | **PASS** | `pnpm install --frozen-lockfile` |
| Supply-chain lockfile policy | **PASS** | 123 entries verified |
| Architecture boundaries | **PASS** | `verify-boundaries.mjs` |
| Schema shape / compatibility baseline | **PASS** | 16 schemas / baseline green |
| TypeScript typecheck | **PASS** | protocol + adapter packages |
| Portable M3-010 profile tests | **PASS** | 18 tests |
| Portable JSON boundary regression | **PASS** | 2 tests |
| Adapter DSH lifecycle TCK | **PASS** | 6 tests |
| Full repository tests | **PASS** | 14 files / 115 tests |
| Lint | **PASS** | 0 warnings / 0 errors |
| Exact pinned rc5 build/binding/runtime seam | **PASS** | source-conformance steps green |

GitHub Actions currently emits external runner/action notices because
`actions/checkout@v4` and `actions/setup-node@v4` target the deprecated Node 20
action runtime and the hosted runner forces Node 24; the action runtime also
emits a `punycode` deprecation notice. These are not repository oxlint warnings
and did not weaken or bypass any repository quality gate.

No schema, validator, TypeScript strictness, fixture contract, compatibility
baseline, frozen lockfile, architecture boundary, adapter mapping, or security
guarantee was weakened.

## Current gate

**M3-011 P0 — Adapter DSH tool ordering Shared TCK.**

This is the next and only newly authorized implementation gate.

M3-011 MUST begin by reconciling Spec 0003, existing M2 adapter mapping, current
normalization tests, and exact pinned rc5 tool-pipeline evidence before defining
portable fixtures. The gate must remain about **ordering evidence**, not absorb
later Adapter TCK responsibilities.

Required boundaries for M3-011:

- define the language-independent profile semantics before TypeScript/Adapter DSH
  projection code;
- preserve `tool/call -> tool.requested` and the existing authoritative
  `tools/result -> tool.completed` source boundary from M2 without expanding the
  generic protocol vocabulary;
- preserve the distinction between request intent, body entry, and final outcome;
  a tool request alone MUST NOT be treated as proof that the body ran or that the
  call succeeded;
- establish ordering from explicit observed source evidence rather than wall
  clock, scheduler races, fixture expectation, or inferred missing events;
- malformed, missing, duplicate, or reordered evidence must fail explicitly and
  must not be silently repaired by sorting timestamps or synthesizing events;
- do not implement M3-012 denied-call/body-entry semantics inside M3-011;
- do not implement M3-013 final-result-authority semantics beyond the already
  accepted source boundary needed to identify ordering evidence;
- do not pull M3-014 approval unavailable, M3-015 cancellation, M3-016 disposal,
  M3-017 replay reconciliation, M4 Capability Broker, or M6 Workspace
  Transaction semantics forward;
- DeepSeek Harness remains adapter compatibility evidence, never protocol
  authority, and no concrete Harness package path/type may define the portable
  fixture contract.

## Deferred M3 work

Not yet implemented:

- `M3-011 P0` tool ordering — **CURRENT GATE**;
- `M3-012 P0` denied call never enters body;
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
- Shared contracts MUST NOT contain concrete `@deepseek-ai/*` package paths.
- No host wall-clock or ambient randomness may decide a fixture result.
- Unknown versions/profiles/operations/semantics fail explicitly.
- Do not weaken TypeScript strictness, schemas, compatibility baseline,
  validators, conformance tests, frozen installs, or security claims for CI.
- Do not implement M4 Capability Broker or M6 Workspace Transaction early.

## Resume instruction

Read `docs/handoff/README.md`, this file, PR #2 live metadata, and workflow runs
for the exact live head before editing. This file records `728f44e...` as the
last verified implementation head; documentation commits may advance the branch,
so live GitHub evidence still wins.

If the exact live head is green, continue with **M3-011 Adapter DSH tool ordering
Shared TCK** in protocol-/fixture-first order. If it fails, inspect the actual
current-head failing job/step/diagnostic and repair it without weakening any
gate.