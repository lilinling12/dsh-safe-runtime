# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK remain semantic authority.

## Snapshot

- Recorded at: `2026-08-19T18:37+08:00`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M3 — Shared TCK Foundation`
- Pull request: `#2 — feat(testkit): establish M3 shared TCK foundation`
- PR state: `OPEN / DRAFT`
- Branch: `feat/m3-shared-tck-foundation`
- Stacked base: `feat/m2-harness-adapter@6a9c64155ec6c376908e64d70f2b50d5b8de1285`
- Verified M3-012 implementation head: `7dcabbe1f93c9cc91285584b43b6f24213ffed93`
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

Complete on verified implementation head
`1d2c92af8ec22ebae4644f1bc9a01fbef557a870`.

The gate is limited to explicit request/completion ordering and correlation:

- durable `session/event: tool/call` is request intent and maps to
  `tool.requested`;
- live `tools/result` is the accepted final-outcome source seam and maps to
  `tool.completed`, while M3-011 compares only ordering/correlation fields;
- source array order is authoritative; timestamps or inferred evidence do not
  repair/reorder a fixture;
- exact pinned rc5 source-conformance uses real public `Session.append()` and
  `ToolRuntime.execute()` seams through the production ordered dispatcher;
- malformed projector output fails closed as an implementation error;
- production mappings, schemas, compatibility baseline, lockfile, architecture
  rules, and security guarantees were not weakened.

Final evidence for `1d2c92af...`: normal CI #117 PASS, exact Harness rc5
source-conformance #76 PASS, 16 files / 141 tests PASS, and oxlint 0 warnings /
0 errors.

### M3-012 — denied tool call never enters body Shared TCK

**ACCEPTED on verified implementation head
`7dcabbe1f93c9cc91285584b43b6f24213ffed93`.**

Normative/profile authority remains in
`specs/0011-m3-adapter-dsh-denied-body-entry-tck.md` and the portable Shared TCK
fixture `fixtures/tck/valid/adapter-dsh-denied-body-entry.json`. The TypeScript
runner and exact Harness test are projections/evidence, not semantic authority.

Accepted semantic proof:

1. request intent, body entry, and final outcome remain distinct;
2. M3-012 does not add a normalized `body.entered` protocol/runtime event;
3. the denial path requires an explicit Adapter DSH `DENY` fact rather than
   inferring denial from missing completion/body evidence;
4. the exact pinned rc5 test registers a real tool body with explicit body-entry
   instrumentation;
5. an allowed positive control enters that body first, proving the instrumentation
   is live before negative evidence is trusted;
6. the denied target is then executed through the real pinned rc5 `ToolRuntime`
   and production Adapter DSH policy seam;
7. explicit denial is observed and the denied target does not increment the body
   entry counter;
8. generic `@dsh-safe/testkit` owns portable JSON fixture parsing/strictness;
   exact source conformance replays the same registered operative case inside the
   adapter package so exact Harness compilation does not depend on testkit source
   internals or Node-only ambient types;
9. M3-013 final-result authority, M3-014 approval unavailable, M3-015
   cancellation, M3-016 disposal, M3-017 replay reconciliation, M4, and M6 remain
   outside this gate;
10. no production Adapter mapping, schema, compatibility baseline, TypeScript
    strictness, frozen lockfile, architecture rule, or security guarantee was
    weakened to obtain CI success.

Final exact-head evidence for `7dcabbe1...`:

| Gate | State | Evidence |
| --- | --- | --- |
| Normal CI | **PASS** | run #129 / run id `32242949423` / job `96037295669` |
| Exact Harness rc5 source-conformance | **PASS** | run #88 / run id `32242949297` / job `96037295171` |
| Frozen install | **PASS** | `pnpm install --frozen-lockfile` |
| Supply-chain lockfile policy | **PASS** | 123 entries verified |
| Architecture boundaries | **PASS** | `verify-boundaries.mjs` |
| Schema shape / compatibility baseline | **PASS** | 16 schemas / baseline green |
| TypeScript typecheck | **PASS** | repository typecheck green |
| Full repository tests | **PASS** | 17 files / 151 tests |
| Lint | **PASS** | 0 warnings / 0 errors |
| Exact pinned rc5 binding typecheck | **PASS** | source-conformance step 10 green |
| Real pinned rc5 runtime conformance | **PASS** | source-conformance step 11 green |

Two exact-source-only failures were repaired without weakening boundaries:

- `c27c04e213fa4d081e25c362f79bae9a87fb9a5c` removed a cross-package source
  dependency that violated the adapter exact-test `rootDir` boundary;
- `7dcabbe1f93c9cc91285584b43b6f24213ffed93` removed the Node-only fixture
  loader after exact CI exposed `TS2591` for `node:fs/promises`, `node:path`, and
  `node:url`; no `@types/node`, lockfile change, tsconfig relaxation, shim, or
  unsafe cast was introduced.

The final fix does not duplicate generic TCK validation in the Adapter test. The
portable JSON fixture remains validated by the generic testkit, while exact
source-conformance supplies the real pinned Harness compatibility proof.

## Current gate

**M3-013 P0 — Adapter DSH final result mapping Shared TCK.**

M3-013 is the next and only newly authorized implementation gate. It MUST begin
with a language-independent definition of the final-result authority/mapping
contract before TypeScript runner or Adapter DSH changes.

Required boundaries for M3-013:

- reconcile Spec 0003 final-outcome semantics with the production Adapter DSH
  `tools/result` normalization seam and existing M3-011 ordering evidence;
- define what source fact is authoritative for a final tool result before adding
  implementation-specific projection fields;
- keep request intent and body-entry evidence separate from final-result
  authority;
- preserve stable call correlation and fail closed on malformed, duplicate, or
  contradictory final-result evidence;
- do not infer a successful result merely from body entry, durable request
  existence, or missing error evidence;
- do not retroactively expand M3-011 ordering or M3-012 denial/body-entry
  semantics;
- do not pull M3-014 approval unavailable, M3-015 cancellation, M3-016 disposal,
  M3-017 replay reconciliation, M4 Capability Broker, or M6 Workspace
  Transaction semantics forward;
- DeepSeek Harness remains compatibility evidence, never protocol authority.

Before implementation, inspect the current production final-result normalization
and exact pinned rc5 `tools/result` public source seam, then write the portable
contract/fixtures first.

## Deferred M3 work

Not yet implemented:

- `M3-013 P0` final result mapping — **CURRENT GATE**;
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
  validators, conformance tests, frozen installs, architecture/security gates, or
  security claims for CI.
- Do not implement M4 Capability Broker or M6 Workspace Transaction early.

## Governance follow-up

`HISTORY.md` is append-only and `docs/roadmap.md` is a long-lived planning file.
The current connector exposes only whole-file replacement for those files and the
local environment cannot resolve `github.com`, so this closure does not risk a
manual large-file rewrite merely to duplicate evidence already recorded here.
They remain explicit governance follow-ups and MUST NOT be claimed as updated.

## Resume instruction

Read `docs/handoff/README.md`, this file, PR #2 live metadata, and workflow runs
for the exact live head before editing. The verified M3-012 implementation head
is `7dcabbe1f93c9cc91285584b43b6f24213ffed93`; this documentation commit advances
the branch beyond that implementation head, so live GitHub evidence still wins.

Only after the exact live governance head's triggered checks are green, continue
with **M3-013 Adapter DSH final result mapping Shared TCK** in
protocol-/fixture-first order. If the governance head fails, repair that exact
failure without weakening any gate and do not start M3-013 early.
