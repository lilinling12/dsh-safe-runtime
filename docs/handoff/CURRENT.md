# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK remain semantic authority.

## Snapshot

- Recorded at: `2026-08-19T09:41+08:00`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M3 — Shared TCK Foundation`
- Pull request: `#2 — feat(testkit): establish M3 shared TCK foundation`
- PR state: `OPEN / DRAFT`
- Branch: `feat/m3-shared-tck-foundation`
- Stacked base: `feat/m2-harness-adapter@6a9c64155ec6c376908e64d70f2b50d5b8de1285`
- Verified implementation head: `de5d4e0cc7099cfa35d91211f81b87f2784ca5df`
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

Complete and recorded in `docs/roadmap.md`.

The language-independent foundation consists of:

1. `specs/0004-shared-tck-foundation.md`;
2. `schemas/v1alpha1/tck-fixture.schema.json`;
3. positive and fail-closed negative `fixtures/tck/*` cases;
4. schema index / compatibility baseline / fixture manifest registration;
5. `@dsh-safe/testkit` TypeScript projection and conformance tests.

Roadmap reconciliation head `79bd048599ac6f64975912b23f1e12f9719ef956`
passed normal CI #78, including frozen install and `pnpm check:all`.

### M3-004 — Fake approval

Complete on implementation head `cc59a5db1045346792d823e56557d78438dd37c1`.

`specs/0005-m3-fake-approval-test-service.md` defines the portable fake before the
TypeScript projection. Portable decisions are exactly `ALLOWED_ONCE`, `REJECTED`,
`CANCELLED`, and `UNAVAILABLE`; script exhaustion is the explicit infrastructure
error `FAKE_APPROVAL_SCRIPT_EXHAUSTED`. CI #79 is green.

### M3-005 — Fake tool runtime

Complete on implementation head `d5cc341594e79e7203d2203052db27f37984dfa7`.

`specs/0006-m3-fake-tool-runtime-test-service.md` defines the portable fake before
its TypeScript projection. Portable outcomes are exactly `RESULT`, `ERROR`, and
`DENIED`; a request is intent only, `DENIED` never enters the fake body, and
script exhaustion is the explicit infrastructure error
`FAKE_TOOL_SCRIPT_EXHAUSTED`. CI #81 is green with 73 repository tests and zero
lint warnings/errors.

### M3-006 — Fake filesystem/subprocess execution world

Complete on verified implementation head
`de5d4e0cc7099cfa35d91211f81b87f2784ca5df`.

Governance order and the accepted provider non-guarantees were preserved:

1. `specs/0007-m3-fake-filesystem-subprocess-test-service.md` defines the
   language-independent deterministic fake execution world before the TypeScript
   projection;
2. `fixtures/tck/valid/execution-world-filesystem.json` proves filesystem
   resolution, stat, containment, read, and process-path behavior comes only
   from explicit portable facts rather than host path interpretation;
3. `fixtures/tck/valid/execution-world-subprocess.json` proves executable
   resolution and spawn outcomes come only from exact inert JSON mappings and a
   deterministic FIFO script;
4. `fixtures/tck/valid/execution-world-non-mediation.json` proves that sharing a
   `worldRef` does not imply subprocess filesystem effects traverse the fake
   filesystem provider;
5. `fixtures/tck/valid/execution-world-subprocess-exhausted.json` proves script
   exhaustion is `FAKE_SUBPROCESS_SCRIPT_EXHAUSTED` and fabricates no second
   execution observation;
6. all four fixtures are registered in `fixtures/manifest.json` as portable
   Shared TCK envelopes;
7. `packages/testkit/src/fake-execution-world.ts` is a deterministic TypeScript
   projection with exact-key validation, duplicate/ambiguous configuration
   rejection, structural request matching, immutable defensive snapshots, and
   no host filesystem/process/shell/network/environment dependency;
8. `packages/testkit/src/fake-execution-world.test.ts` adds eight conformance
   tests, including explicit non-containment derivation and the rule that an
   unexpected spawn request does not consume the next scripted outcome.

Security-sensitive comments in the implementation document why path libraries
and real process APIs are intentionally absent, why a spawn mismatch cannot
advance FIFO state, and why `worldRef` is identity/correlation metadata rather
than an isolation or transaction guarantee.

M3-006 intentionally does **not** implement path canonicalization, symlink or
junction policy, workspace rollback/commit, shell semantics, process isolation,
real output buffering/spilling algorithms, capability authorization, or fault
injection. Those remain later-gate concerns.

Validation evidence for `de5d4e0c...`:

| Gate | State | Evidence |
| --- | --- | --- |
| Normal CI | **PASS** | run #86 / job `95928288279` |
| Frozen install | **PASS** | `pnpm install --frozen-lockfile` |
| Supply-chain lockfile policy | **PASS** | 123 entries verified |
| `pnpm check:all` | **PASS** | job `verify` |
| Architecture boundaries | **PASS** | `verify-boundaries.mjs` |
| Schema shape / compatibility baseline | **PASS** | 16 schemas / baseline green |
| TypeScript typecheck | **PASS** | protocol + adapter packages |
| Fake execution-world conformance | **PASS** | 8 tests |
| Full repository tests | **PASS** | 10 files / 81 tests |
| Lint | **PASS** | 0 warnings / 0 errors |
| Harness concrete dependency introduced | **NO** | portable fake remains runtime-independent |

An earlier implementation head `78f04e2e...` had already passed all functional
checks and all 81 tests in CI #85, but oxlint reported one unused-type warning.
That warning was removed rather than accepted as completion evidence; CI #86 is
the clean quality baseline above.

No schema, validator, TypeScript strictness, fixture contract, frozen lockfile,
architecture boundary, or security guarantee was weakened.

## Current gate

**M3-007 P0 — fault injection interface.**

This is the next and only newly authorized implementation gate.

M3-007 must again begin with a language-independent contract and portable
fixtures before a TypeScript projection. The interface must remain deterministic
test infrastructure and MUST NOT turn fault scheduling into production runtime
semantics.

The M3-007 design must preserve the following boundaries:

- injected faults must be explicit fixture/script facts; host timing, ambient
  randomness, scheduler races, filesystem state, process state, or network state
  MUST NOT decide whether a fault occurs;
- a fault must remain distinguishable from an ordinary successful, denied, or
  deliberate business/runtime outcome; the fake MUST NOT silently rewrite one
  category into another;
- injection points and consumption order must be explicit and fail closed when
  malformed, unknown, ambiguous, or exhausted;
- M3-006 filesystem/subprocess behavior MUST NOT gain hidden fault behavior or
  implicit host effects merely to support M3-007;
- no M4 Capability Broker policy/authorization, M6 Workspace Transaction,
  crash-recovery journal, or later Adapter DSH lifecycle semantics may be pulled
  into this gate;
- no `@deepseek-ai/*` package path or concrete Harness type may define the
  portable fault contract;
- professional implementation comments should explain failure-boundary and
  determinism decisions rather than restating syntax.

## Deferred M3 work

Not yet implemented:

- `M3-007 P0` fault injection interface — **CURRENT GATE**;
- `M3-010..016` Adapter DSH shared TCK scenarios;
- `M3-017 P1` replay reconciliation.

Real cancellation mechanics remain part of later Adapter DSH TCK work.

## Boundaries that remain enforced

- Spec/Schema/fixtures define shared semantics before TypeScript implementation.
- `packages/testkit` is one implementation; it does not define portable semantics.
- shared TCK fixtures MUST remain consumable by a non-TypeScript implementation.
- DeepSeek Harness is an Adapter and MUST NOT define protocol or generic fake
  runtime semantics.
- shared contracts MUST NOT contain concrete `@deepseek-ai/*` package paths.
- no host wall-clock or ambient randomness may decide a fixture result.
- unknown versions/profiles/operations/semantics fail explicitly.
- do not weaken TypeScript strictness, schemas, compatibility baseline,
  validators, conformance tests, frozen installs, or security claims for CI.
- do not implement M4 Capability Broker or M6 Workspace Transaction early.

## Resume instruction

Read `docs/handoff/README.md`, this file, PR #2 live metadata, and workflow runs
for the exact live head before editing. This file records `de5d4e0c...` as the
last verified implementation head; documentation commits may advance the branch,
so live GitHub evidence still wins.

If the exact live head is green, continue with **M3-007 fault injection
interface** in protocol-/fixture-first order. If it fails, inspect the real
current-head failing job/step/diagnostic and repair it without weakening any
gate.
