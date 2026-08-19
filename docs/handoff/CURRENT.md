# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK remain semantic authority.

## Snapshot

- Recorded at: `2026-08-19T09:18+08:00`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M3 — Shared TCK Foundation`
- Pull request: `#2 — feat(testkit): establish M3 shared TCK foundation`
- PR state: `OPEN / DRAFT`
- Branch: `feat/m3-shared-tck-foundation`
- Stacked base: `feat/m2-harness-adapter@6a9c64155ec6c376908e64d70f2b50d5b8de1285`
- Verified implementation head: `d5cc341594e79e7203d2203052db27f37984dfa7`
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

Governance order and the intent/result authority boundary were preserved:

1. `specs/0006-m3-fake-tool-runtime-test-service.md` defines language-independent
   deterministic fake tool semantics before implementation;
2. `fixtures/tck/valid/tool-runtime-sequence.json` proves that a request is only
   intent, and distinguishes `REQUESTED`, `BODY_ENTERED`, and final `OUTCOME`;
3. `fixtures/tck/valid/tool-runtime-denied.json` proves `DENIED` is observable
   without entering the tool body;
4. `fixtures/tck/valid/tool-runtime-script-exhausted.json` proves exhaustion is
   `FAKE_TOOL_SCRIPT_EXHAUSTED` and adds no invented execution trace;
5. all three fixtures are registered in `fixtures/manifest.json` as portable
   shared TCK envelopes;
6. `packages/testkit/src/fake-tool-runtime.ts` is only the TypeScript projection;
7. `packages/testkit/src/fake-tool-runtime.test.ts` covers exact outcome
   preservation, request/body/outcome ordering, denial-before-body, fail-closed
   malformed input, explicit exhaustion, defensive trace reads, and Harness
   concrete-path exclusion.

Portable fake outcomes are exactly:

```text
RESULT
ERROR
DENIED
```

`RESULT` and deliberate scripted `ERROR` enter the fake body. `DENIED` MUST NOT
enter it. The fake trace phases are test evidence only and MUST NOT be promoted
into the safe-runtime normalized event vocabulary.

Validation evidence for `d5cc3415...`:

| Gate | State | Evidence |
| --- | --- | --- |
| Normal CI | **PASS** | run #81 / job `95923943524` |
| Frozen install | **PASS** | `pnpm install --frozen-lockfile` |
| Supply-chain lockfile policy | **PASS** | 123 entries verified |
| `pnpm check:all` | **PASS** | job `verify` |
| Architecture boundaries | **PASS** | `verify-boundaries.mjs` |
| Schema shape / compatibility baseline | **PASS** | 16 schemas / baseline green |
| TypeScript typecheck | **PASS** | protocol + adapter packages |
| Fake tool conformance | **PASS** | 6 tests |
| Full repository tests | **PASS** | 9 files / 73 tests |
| Lint | **PASS** | 0 warnings / 0 errors |
| Harness concrete dependency introduced | **NO** | shared fake remains runtime-independent |

No schema, validator, TypeScript strictness, fixture contract, frozen lockfile,
architecture boundary, or security guarantee was weakened.

## Current gate

**M3-006 P0 — fake filesystem/subprocess.**

This is the next and only newly authorized implementation gate.

M3-006 must begin with a language-independent test-service contract and portable
fixtures before TypeScript implementation. It must remain deterministic fake
infrastructure, not a host filesystem/process implementation and not a workspace
transaction runtime.

The M3-006 design MUST preserve accepted provider facts and security boundaries:

- filesystem and subprocess may model one execution world, but this MUST NOT be
  interpreted as proof that subprocess filesystem effects traverse a filesystem
  provider;
- provider mediation MUST NOT be promoted into process/kernel isolation;
- fake filesystem targets/paths and subprocess requests are inert portable data;
  fixtures MUST NOT cause real host file access, shell interpretation, command
  execution, network access, or environment access;
- no path-containment or rollback semantics from M6 Workspace Transaction may be
  pulled into this gate;
- deterministic outcomes must come only from explicit fixture state/script;
- malformed/unknown operations and exhausted scripted behavior fail explicitly;
- no `@deepseek-ai/*` package path or concrete Harness type may define the
  portable contract;
- do not implement M3-007 fault injection inside M3-006.

## Deferred M3 work

Not yet implemented:

- `M3-006 P0` fake filesystem/subprocess — **CURRENT GATE**;
- `M3-007 P0` fault injection interface;
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
for the exact live head before editing. This file records `d5cc3415...` as the
last verified implementation head; documentation commits may advance the branch,
so live GitHub evidence still wins.

If the exact live head is green, continue with **M3-006 fake filesystem/subprocess**
in protocol-/fixture-first order. If it fails, inspect the real current-head
failing job/step/diagnostic and repair it without weakening any gate.
