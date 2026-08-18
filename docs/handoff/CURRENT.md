# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK remain semantic authority.

## Snapshot

- Recorded at: `2026-08-18T18:10+08:00`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M3 — Shared TCK Foundation`
- Pull request: `#2 — feat(testkit): establish M3 shared TCK foundation`
- PR state: `OPEN / DRAFT`
- Branch: `feat/m3-shared-tck-foundation`
- Stacked base: `feat/m2-harness-adapter@6a9c64155ec6c376908e64d70f2b50d5b8de1285`
- Verified implementation head: `cc59a5db1045346792d823e56557d78438dd37c1`
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

Governance order was preserved:

1. `specs/0005-m3-fake-approval-test-service.md` defines the portable fake first;
2. `fixtures/tck/valid/approval-sequence.json` covers deterministic FIFO outcome
   consumption;
3. `fixtures/tck/valid/approval-script-exhausted.json` proves exhaustion is an
   explicit infrastructure error rather than an implicit `UNAVAILABLE`;
4. both fixtures are registered in `fixtures/manifest.json` and remain valid
   shared TCK envelopes;
5. `packages/testkit/src/fake-approval.ts` is only the TypeScript projection;
6. `packages/testkit/src/fake-approval.test.ts` covers FIFO order, exact outcome
   preservation, defensive observation copies, invalid script rejection, and
   exhaustion behavior.

Portable fake approval decisions are exactly:

```text
ALLOWED_ONCE
REJECTED
CANCELLED
UNAVAILABLE
```

Only `ALLOWED_ONCE` may authorize under existing approval semantics. Script
exhaustion uses:

```text
FAKE_APPROVAL_SCRIPT_EXHAUSTED
```

It MUST NOT be coerced to `UNAVAILABLE` or success.

Validation evidence for `cc59a5db...`:

| Gate | State | Evidence |
| --- | --- | --- |
| Normal CI | **PASS** | run #79 |
| Frozen install | **PASS** | job `verify`, step 5 |
| `pnpm check:all` | **PASS** | job `verify`, step 6 |
| Portable approval contract precedes implementation | **PASS** | Spec 0005 + testkit projection |
| FIFO scripted decisions | **PASS** | fake approval conformance |
| Script exhaustion fail-closed | **PASS** | fake approval conformance |
| Unknown scripted decision rejected | **PASS** | fake approval conformance |
| Observation exposure defensive | **PASS** | fake approval conformance |
| Harness concrete dependency introduced | **NO** | testkit fake remains runtime-independent |

## Current gate

**M3-005 P0 — fake tool runtime.**

This is the next and only newly authorized implementation gate.

The fake tool runtime must remain deterministic test infrastructure and expose
only the minimum behavior required by normative TCK scenarios. Before adding a
TypeScript fake, define the language-independent profile contract and portable
fixtures that state the observable tool behavior.

The M3-005 design MUST preserve already accepted boundaries:

- a requested tool action is intent, not proof of successful execution;
- denial must be observable without entering the tool body when the relevant TCK
  scenario requires that boundary;
- final result semantics must not be inferred from DeepSeek Harness internals;
- no `@deepseek-ai/*` package path or concrete Harness type may define the shared
  fake runtime contract;
- no host time, ambient randomness, shell execution, real filesystem access, or
  network access may decide a fake tool result;
- unknown fake operations or malformed scripts fail explicitly.

Do not pull M3-006 filesystem/subprocess, M3-007 fault injection, or M4 Capability
Broker behavior into M3-005.

## Deferred M3 work

Not yet implemented:

- `M3-005 P0` fake tool runtime — **CURRENT GATE**;
- `M3-006 P0` fake filesystem/subprocess;
- `M3-007 P0` fault injection interface;
- `M3-010..016` Adapter DSH shared TCK scenarios;
- `M3-017 P1` replay reconciliation.

Real cancellation mechanics remain part of later Adapter DSH TCK work; M3-004
only supports `CANCELLED` as an explicitly scripted portable approval outcome.

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
for the exact live head before editing. This file records `cc59a5db...` as the
last verified implementation head; later documentation commits may advance the
branch, so live GitHub evidence still wins.

If the exact live head is green, continue with **M3-005 fake tool runtime** in
protocol-/fixture-first order. If it fails, inspect the real current-head failing
job/step/diagnostic and repair it without weakening any gate.
