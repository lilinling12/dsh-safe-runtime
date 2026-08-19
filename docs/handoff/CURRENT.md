# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK remain semantic authority.

## Snapshot

- Recorded at: `2026-08-20`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M3 — Shared TCK Foundation`
- Pull request: `#2 — feat(testkit): establish M3 shared TCK foundation`
- PR state: `OPEN / DRAFT`
- Branch: `feat/m3-shared-tck-foundation`
- Stacked base: `feat/m2-harness-adapter@6a9c64155ec6c376908e64d70f2b50d5b8de1285`
- Verified M3-013 implementation head: `92b742fa4250d5703023ebc560923eceaab86b0b`
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
and TypeScript projection remain the foundation for profile-specific TCK contracts.

### M3-004 — Fake approval

Complete on implementation head `cc59a5db1045346792d823e56557d78438dd37c1`.
Portable decisions remain exactly `ALLOWED_ONCE`, `REJECTED`, `CANCELLED`, and
`UNAVAILABLE`; exhaustion remains an explicit infrastructure error.

### M3-005 — Fake tool runtime

Complete on implementation head `d5cc341594e79e7203d2203052db27f37984dfa7`.
Portable outcomes remain exactly `RESULT`, `ERROR`, and `DENIED`; request intent,
body entry, and final outcome remain distinct.

### M3-006 — Fake filesystem/subprocess execution world

Complete on implementation head `de5d4e0cc7099cfa35d91211f81b87f2784ca5df`.
Filesystem/subprocess results remain explicit fake facts; no process/kernel
isolation or workspace transaction guarantee is claimed.

### M3-007 — Deterministic fault injection interface

Complete on implementation head `494e08de5b1304ef039c5a5462f083b7e76b8a29`.
Fault injection remains deterministic test-control data and does not become
production crash/timeout/rollback semantics.

### M3-010 — Adapter DSH turn lifecycle Shared TCK

Complete on verified implementation head
`728f44e73ac61dba1b40d570f2458bd456d79bbc`.

The gate preserves the protocol/adapter authority split, does not invent
`step.ended`, rejects malformed portable evidence before implementation
invocation, and is verified by normal CI plus exact pinned Harness rc5
source-conformance.

### M3-011 — Adapter DSH tool ordering Shared TCK

Complete on verified implementation head
`1d2c92af8ec22ebae4644f1bc9a01fbef557a870`.

The gate establishes:

- durable `session/event: tool/call` -> `tool.requested` request intent;
- live `tools/result` -> `tool.completed` final-outcome source seam;
- source observation order remains authoritative;
- malformed/reordered/correlation-invalid evidence fails closed;
- final-result content/digest/outcome authority remains outside M3-011.

Final evidence: normal CI #117 PASS, exact Harness rc5 #76 PASS, 16 files / 141
tests PASS, oxlint 0 warnings / 0 errors.

### M3-012 — denied tool call never enters body Shared TCK

**ACCEPTED on verified implementation head
`7dcabbe1f93c9cc91285584b43b6f24213ffed93`.**

Normative/profile authority remains in
`specs/0011-m3-adapter-dsh-denied-body-entry-tck.md` and its portable fixture.
The accepted proof keeps request intent, body entry, and final outcome distinct,
uses explicit DENY evidence plus live test-side body-entry instrumentation, and
does not invent a normalized `body.entered` event.

Final evidence: normal CI #129 PASS, exact Harness rc5 #88 PASS, 17 files / 151
tests PASS, oxlint 0 warnings / 0 errors, exact binding typecheck/runtime green.

### M3-013 — Adapter DSH final result mapping Shared TCK

**ACCEPTED on verified implementation head
`92b742fa4250d5703023ebc560923eceaab86b0b`.**

Normative/profile authority is defined in
`specs/0012-m3-adapter-dsh-final-result-mapping-tck.md`. The TypeScript runner,
Adapter conformance tests, and pinned Harness tests are projections/evidence,
never semantic authority.

Accepted semantic proof:

1. live `tools/result` remains the authoritative Adapter DSH final-result source;
2. durable request intent, tool-body entry, and the body's direct return value do
   not establish final success;
3. a real rc5 `tools/post-execute` replacement proves final materialization can
   differ from the body return and the Adapter digests the materialized result;
4. success maps to `tool.completed/outcome=success` only from an authoritative
   final `isError: false` result;
5. a real rc5 tool body throwing an ordinary `Error` produces a materialized
   generic `isError: true` result and maps to `tool.completed/outcome=error`;
6. an explicit non-cancellation source `error.info.code` is preserved as
   normalized `errorCode` by the production final-result normalizer;
7. the portable profile deliberately covers only SUCCESS and GENERIC_ERROR;
8. `ABORTED` and `ABORTED_BEFORE_DISPATCH` are rejected by the M3-013 portable
   profile because cancellation classification belongs to M3-015;
9. policy denial, approval-unavailable, disposal, replay, M4, and M6 semantics are
   not pulled into this gate;
10. `resultDigest` is explicit authoritative source data in the portable TCK;
    M3-013 does not standardize a digest algorithm/canonicalization/version;
11. malformed, contradictory, cancellation-reserved, non-portable, or malformed
    implementation evidence fails closed;
12. expectation/oracle data cannot manufacture implementation output;
13. all three portable M3-013 fixtures are bound directly through production
    `normalizeFinalToolResult()` in Adapter package conformance;
14. no production Adapter source mapping was changed to satisfy M3-013;
15. no schema, compatibility baseline, TypeScript strictness, frozen lockfile,
    architecture rule, validator, TCK expectation, or security guarantee was
    weakened.

Implemented artifacts include:

- `specs/0012-m3-adapter-dsh-final-result-mapping-tck.md`;
- `fixtures/tck/valid/adapter-dsh-final-result-success.json`;
- `fixtures/tck/valid/adapter-dsh-final-result-error.json`;
- `fixtures/tck/valid/adapter-dsh-final-result-error-code.json`;
- generic fail-closed parser/runner and boundary tests in `packages/testkit`;
- public testkit exports and fixture-manifest registration;
- production-normalizer explicit generic-error-code regression coverage;
- Adapter Shared TCK -> production normalizer bridge conformance;
- exact pinned rc5 post-execute authority and real generic-error runtime proof.

Final exact-head evidence for `92b742fa...`:

| Gate | State | Evidence |
| --- | --- | --- |
| Normal CI | **PASS** | run #141 / run id `32296376737` / job `96208503077` |
| Exact Harness rc5 source-conformance | **PASS** | run #100 / run id `32296376733` / job `96208503325` |
| Frozen install | **PASS** | `pnpm install --frozen-lockfile` |
| Supply-chain lockfile policy | **PASS** | 123 entries verified |
| Architecture boundaries | **PASS** | `verify-boundaries.mjs` |
| Schema shape / compatibility baseline | **PASS** | 16 schemas / baseline green |
| TypeScript typecheck | **PASS** | repository typecheck green |
| Full repository tests | **PASS** | 19 files / 172 tests |
| M3-013 generic runner | **PASS** | 16 tests |
| Adapter M3-013 production bridge | **PASS** | 4 tests |
| Lint | **PASS** | 0 warnings / 0 errors |
| Exact pinned rc5 binding typecheck | **PASS** | source-conformance step 10 green |
| Real pinned rc5 runtime conformance | **PASS** | source-conformance step 11 green |

No per-test name was required as acceptance authority: the completed pinned rc5
workflow records the whole exact runtime-conformance step as successful. The
runtime test itself uses only public pinned rc5 seams and does not fabricate a
private Harness error representation.

## Current gate

**M3-014 P0 — Adapter DSH approval unavailable Shared TCK.**

M3-014 is the next and only newly authorized implementation gate. It MUST begin
with a language-independent approval-unavailable contract before TypeScript or
Adapter-specific implementation work.

Required boundaries for M3-014:

- reconcile Spec 0003 approval-port semantics and the accepted fake approval
  `UNAVAILABLE` decision with the production Adapter DSH `requestApproval()`
  feature/service detection path;
- define exactly which source fact means approval is unavailable before adding
  an Adapter projection;
- preserve the rule that only `ALLOWED_ONCE` authorizes execution;
- distinguish `UNAVAILABLE` from `REJECTED` and `CANCELLED`;
- fail closed when approval cannot be obtained or the required approval service
  is absent;
- do not infer unavailable from an arbitrary exception/string when an explicit
  capability/service fact exists;
- do not change M3-012 body-entry or M3-013 final-result authority semantics;
- do not pull M3-015 cancellation, M3-016 disposal, M3-017 replay, M4 Capability
  Broker, or M6 Workspace Transaction semantics forward;
- DeepSeek Harness remains compatibility evidence, never protocol authority.

Before implementation, inspect Spec 0003, the accepted fake-approval profile,
production `requestApproval()`, and pinned rc5 approval public seams. Then define
the portable M3-014 contract/fixtures first.

## Deferred M3 work

Not yet implemented:

- `M3-014 P0` approval unavailable — **CURRENT GATE**;
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
The current connector exposes only whole-file replacement for those files, so
this closure does not risk a large manual rewrite merely to duplicate evidence
already recorded here. They remain explicit governance follow-ups and MUST NOT be
claimed as updated.

## Resume instruction

Read `docs/handoff/README.md`, this file, PR #2 live metadata, and workflow runs
for the exact live head before editing. The verified M3-013 implementation head
is `92b742fa4250d5703023ebc560923eceaab86b0b`; this documentation commit advances
the branch beyond that implementation head, so live GitHub evidence still wins.

Only after the exact live governance head's triggered checks are green, continue
with **M3-014 Adapter DSH approval unavailable Shared TCK** in
protocol-/fixture-first order. If the governance head fails, repair that exact
failure without weakening any gate and do not start M3-014 early.
