# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK remain semantic authority.

## Snapshot

- Recorded at: `2026-08-19T10:02+08:00`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M3 — Shared TCK Foundation`
- Pull request: `#2 — feat(testkit): establish M3 shared TCK foundation`
- PR state: `OPEN / DRAFT`
- Branch: `feat/m3-shared-tck-foundation`
- Stacked base: `feat/m2-harness-adapter@6a9c64155ec6c376908e64d70f2b50d5b8de1285`
- Verified implementation head: `494e08de5b1304ef039c5a5462f083b7e76b8a29`
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

Complete on verified implementation head
`494e08de5b1304ef039c5a5462f083b7e76b8a29`.

Governance order and failure-category boundaries were preserved:

1. `specs/0008-m3-deterministic-fault-injection-test-service.md` defines the
   language-independent contract before TypeScript implementation;
2. portable directives are exactly `NO_FAULT` and `INJECT_FAULT`;
3. `INJECT_FAULT` exposes an inert fault descriptor (`faultRef`, `faultCode`,
   optional JSON `detail`) but does not itself throw, crash, sleep, terminate a
   process, mutate a filesystem, access a network, or rewrite an ordinary runtime
   outcome;
4. injection points are explicitly declared opaque identifiers rather than
   inferred lifecycle semantics;
5. runtime probes are exact inert JSON (`pointRef`, `context`) and are matched
   against a deterministic FIFO script using structural key-order-independent
   equality;
6. unknown points, unexpected probes, malformed probes, and script exhaustion
   fail explicitly and do not consume scripted state or fabricate observations;
7. direct TypeScript callers are checked for portable JSON semantics, including
   rejection of cyclic/sparse/exotic/non-finite values;
8. observations and returned directives are defensive immutable snapshots;
9. M3-005 tool and M3-006 execution-world fakes were not modified to acquire
   hidden fault hooks; composition remains explicit in later TCK scenarios.

Portable fixtures added and registered:

- `fixtures/tck/valid/fault-injection-sequence.json`;
- `fixtures/tck/valid/fault-injection-unexpected-probe.json`;
- `fixtures/tck/valid/fault-injection-script-exhausted.json`.

Implementation:

- `packages/testkit/src/fake-fault-injection.ts`;
- `packages/testkit/src/fake-fault-injection.test.ts`;
- `packages/testkit/src/index.ts` stage/export update.

The first implementation commit `0687e868c62dd373c2be2d6869c3bf4757e8bb7b`
was followed by `494e08de...` solely to restore the existing human-reviewable
fixture-manifest formatting after registration. The semantic case list was not
changed by that formatting cleanup.

Validation evidence for `494e08de...`:

| Gate | State | Evidence |
| --- | --- | --- |
| Normal CI | **PASS** | run #91 / job `95931880009` |
| Frozen install | **PASS** | `pnpm install --frozen-lockfile` |
| Supply-chain lockfile policy | **PASS** | 123 entries verified |
| `pnpm check:all` | **PASS** | job `verify` |
| Architecture boundaries | **PASS** | `verify-boundaries.mjs` |
| Schema shape / compatibility baseline | **PASS** | 16 schemas / baseline green |
| TypeScript typecheck | **PASS** | protocol + adapter packages |
| Fault-injection conformance | **PASS** | 8 tests |
| Full repository tests | **PASS** | 11 files / 89 tests |
| Lint | **PASS** | 0 warnings / 0 errors |
| Harness concrete dependency introduced | **NO** | portable fake remains runtime-independent |

No schema, validator, TypeScript strictness, fixture contract, frozen lockfile,
architecture boundary, or security guarantee was weakened.

## Current gate

**M3-010 P0 — Adapter DSH turn lifecycle Shared TCK.**

This is the next and only newly authorized implementation gate. M3.1 Test Harness
foundation work (M3-001..007) is complete; work now enters M3.2 Adapter TCK.

M3-010 MUST preserve the authority split already established by M2/M3:

- the portable Shared TCK contract must be specified before the TypeScript/DSH
  runner projection;
- DeepSeek Harness rc5 remains compatibility evidence and an Adapter target, not
  portable protocol authority;
- use only normalized safe-runtime semantics already authorized by normative
  specs; do not invent new normalized events from Harness lifecycle names;
- the accepted M2 minimum event vocabulary includes `turn.started` and
  `step.started`; it does not gain `step.ended` merely because a Harness event
  exists;
- lifecycle ordering assertions must distinguish observed adapter evidence from
  portable protocol semantics;
- unknown/missing adapter lifecycle evidence must fail explicitly rather than be
  guessed from timestamps or test execution order;
- do not implement M3-011 tool ordering, M3-012 denial-before-body, M3-013 final
  result, M3-014 approval unavailable, M3-015 cancellation, or M3-016 disposal
  inside M3-010;
- do not pull M4 Capability Broker, M6 Workspace Transaction, or later
  subagent/replay semantics forward;
- current + accepted Harness compatibility baselines must never be weakened to
  make Shared TCK green.

Before implementation, re-read the existing normalized event spec, M2 adapter
mapping, and exact rc5 lifecycle evidence so the portable contract reflects
safe-runtime semantics rather than copying Harness event vocabulary.

## Deferred M3 work

Not yet implemented:

- `M3-010 P0` turn lifecycle — **CURRENT GATE**;
- `M3-011 P0` tool ordering;
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
for the exact live head before editing. This file records `494e08de...` as the
last verified implementation head; documentation commits may advance the branch,
so live GitHub evidence still wins.

If the exact live head is green, continue with **M3-010 Adapter DSH turn
lifecycle Shared TCK** in protocol-/fixture-first order. If it fails, inspect the
real current-head failing job/step/diagnostic and repair it without weakening any
gate.
