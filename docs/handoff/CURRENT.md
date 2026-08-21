# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK and accepted exact-head evidence
> remain semantic authority.

## Snapshot

- Recorded at: `2026-08-21`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M3 — Shared TCK Foundation`
- Pull request: `#2 — feat(testkit): establish M3 shared TCK foundation`
- PR state: `OPEN / DRAFT`
- Branch: `feat/m3-shared-tck-foundation`
- Stacked base: `feat/m2-harness-adapter@6a9c64155ec6c376908e64d70f2b50d5b8de1285`
- Verified M3-016 implementation head: `30752090db29d916dbe486365e7d7d67fd8746b3`
- M2 acceptance: **ACCEPTED**

PR #2 remains intentionally stacked on the accepted M2 branch. M3 changes MUST
NOT be added back into PR #1 because that would mutate the accepted M2 evidence
line.

## Accepted compatibility baseline

DeepSeek Harness remains an adapter compatibility baseline, never protocol authority:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

Accepted M2 head: `6a9c64155ec6c376908e64d70f2b50d5b8de1285`.
`docs/acceptance/m2-acceptance-audit.md` remains the M2 acceptance authority.

## Completed M3 gates

### M3-001 / M3-002 / M3-003 — Shared TCK foundation

Complete. The language-independent envelope, runner statuses, deterministic
seed/logical-clock inputs, fixture schema, portable fixtures, and TypeScript
projection remain the common foundation.

### M3-004 — Fake approval

Complete on `cc59a5db1045346792d823e56557d78438dd37c1`. Portable decisions remain exactly
`ALLOWED_ONCE`, `REJECTED`, `CANCELLED`, and `UNAVAILABLE`; script exhaustion is
an infrastructure error rather than an approval decision.

### M3-005 — Fake tool runtime

Complete on `d5cc341594e79e7203d2203052db27f37984dfa7`. Request intent, body entry, and
final outcome remain distinct.

### M3-006 — Fake filesystem/subprocess execution world

Complete on `de5d4e0cc7099cfa35d91211f81b87f2784ca5df`. No process/kernel isolation or
workspace transaction guarantee is claimed.

### M3-007 — Deterministic fault injection

Complete on `494e08de5b1304ef039c5a5462f083b7e76b8a29`. Fault injection remains explicit
deterministic test-control data.

### M3-010 — Adapter DSH turn lifecycle Shared TCK

Complete on verified implementation head
`728f44e73ac61dba1b40d570f2458bd456d79bbc`.

### M3-011 — Adapter DSH tool ordering Shared TCK

Complete on verified implementation head
`1d2c92af8ec22ebae4644f1bc9a01fbef557a870`.
Durable `tool/call` remains request intent; live `tools/result` remains the
accepted final-outcome source seam.

### M3-012 — denied tool call never enters body Shared TCK

**ACCEPTED** on verified implementation head
`7dcabbe1f93c9cc91285584b43b6f24213ffed93`.

### M3-013 — Adapter DSH final-result mapping Shared TCK

**ACCEPTED** on verified implementation head
`92b742fa4250d5703023ebc560923eceaab86b0b`.
Normative authority is `specs/0012-m3-adapter-dsh-final-result-mapping-tck.md`.
Live `tools/result` remains authoritative final-result evidence.

### M3-014 — Adapter DSH approval unavailable Shared TCK

**ACCEPTED** on verified implementation head
`656de1dc4bd4c8d07aa8f3079f7e4ab77e1baf3b`.
Normative authority is `specs/0013-m3-adapter-dsh-approval-unavailable-tck.md`.
`SERVICE_ABSENT` and explicit `SERVICE_DECISION/UNAVAILABLE` remain distinct
source families; only `ALLOWED_ONCE` authorizes.

### M3-015 — Adapter DSH cancellation Shared TCK

**ACCEPTED** on verified implementation head
`1429d08c3f36c24a13f023fb037ed8c3de514b61`.
Normative authority is `specs/0014-m3-adapter-dsh-cancellation-tck.md`.
Approval cancellation and authoritative final `tools/result` cancellation remain
separate source families. Exact final cancellation codes remain only `ABORTED`
and `ABORTED_BEFORE_DISPATCH`; production same-call approval correlation does not
broaden arbitrary failures into cancellation.

Final M3-015 evidence: CI #162 PASS and exact Harness rc5 #121 PASS, including
source-conformance steps 10 and 11.

### M3-016 — Adapter DSH disposal Shared TCK

**ACCEPTED on verified implementation head
`30752090db29d916dbe486365e7d7d67fd8746b3`.**

Normative/profile authority is `specs/0015-m3-adapter-dsh-disposal-tck.md`.
Generic testkit and pinned Harness tests are projections/evidence only.

M3-016 deliberately separates four lifecycle concerns:

1. **ownership** — only resources owned by the returned registration/subscription
   handle may be disposed;
2. **cutoff** — after explicit disposal cutoff the disposed handle contributes no
   new future effect;
3. **drain** — observation work already accepted before cutoff settles before
   observation disposal completes;
4. **completion** — successful disposal requires explicit source-side completion
   evidence rather than inference from silence.

The portable resource-kind closed set is exactly:

```text
OBSERVATION_SUBSCRIPTION
TOOL_POLICY_REGISTRATION
MONOTONIC_TOOL_GUARD_REGISTRATION
TURN_STOPPING_REGISTRATION
```

Accepted semantic proof:

1. `operation: disposal` represents explicit disposal invocation intent; it is
   not itself completion authority;
2. during implementation, the protocol/fixture design exposed a real proof gap:
   the original source facts could not prove explicit disposal completion while
   Spec 0015 required it;
3. that gap was repaired protocol-first by requiring
   `sourceFact.disposeCompleted: true`; expectation data remains comparison-only
   and cannot manufacture completion;
4. all four source-fact forms are closed and resource-specific; wrong-kind
   fields, unknown kinds, missing before controls, missing completion, and missing
   post-disposal probes fail fixture validation before implementation invocation;
5. observation requires at least one accepted-before probe and one post-disposal
   source probe, drains accepted work before disposal resolves, rejects future
   observer delivery after cutoff, and standardizes repeated disposal as
   `IDEMPOTENT`;
6. repeat-dispose idempotence is deliberately **not** standardized for policy,
   monotonic guard, or turn-stopping registrations in M3-016;
7. a real pinned rc5 SessionStore continues accepting durable `step/start`
   evidence after the Adapter observation subscription is disposed, while the
   disposed observer receives no future delivery; disposal therefore does not
   imply external-runtime teardown or durable-evidence deletion;
8. the observation drain proof uses an explicit Promise gate rather than sleeps,
   wall-clock timing, garbage collection, or process exit;
9. a real pinned rc5 ToolRuntime proves an isolated Adapter tool-policy denial is
   active before disposal, then ordinary execution resumes after the exact
   registration is disposed;
10. a real pinned rc5 ToolRuntime independently proves the same before/after
    lifecycle for the exact monotonic tool guard returned by
    `registerMonotonicToolGuard()`;
11. real/public `@deepseek-ai/dsh-agent` `agentEvents(...).serial()` is used to
    exercise the turn-stopping boundary: the Adapter handler runs before
    disposal, no longer runs afterward, and an independent handler still runs on
    the later boundary, proving the external event seam remains live;
12. no private Harness listener collection, private guard collection,
    implementation-only state inspection, sleeps, GC, process exit, or concrete
    `dsh-agent-loop` import is used as disposal evidence;
13. valid-but-wrong implementation projections are runner `FAIL`; implementation
    exceptions or malformed projections are runner `ERROR`;
14. cyclic values, exotic objects, sparse/decorated arrays, symbols, and
    non-finite JSON numbers fail closed at the generic portable boundary;
15. the generic testkit profile contains no `@deepseek-ai/` or `dsh-agent-loop`
    dependency/path and therefore remains Harness-independent;
16. exact pinned rc5 evidence exposed no production correctness gap, so M3-016
    required **no production Adapter source change**;
17. disposal of Adapter-owned handles does not imply disposal of externally owned
    Harness Context, SessionStore, ToolRuntime, ApprovalService, tools, agents,
    sessions, durable evidence, or the process;
18. M3-017 replay reconciliation, M4 Capability Broker, M6 Workspace Transaction,
    and hard cancellation of already-running non-observation callbacks remain out
    of scope;
19. no schema, compatibility baseline, TypeScript strictness, frozen lockfile,
    architecture rule, validator, TCK expectation, or security guarantee was
    weakened.

Implemented artifacts include:

- `specs/0015-m3-adapter-dsh-disposal-tck.md`;
- four portable M3-016 fixtures, one for each resource kind;
- strict Harness-independent parser/runner and boundary tests in
  `packages/testkit`;
- public `@dsh-safe/testkit` disposal exports;
- exact pinned rc5 disposal source-conformance through public SessionStore,
  ToolRuntime, tool guard, and `agentEvents` seams;
- manifest registration of all four fixtures.

The generic runner/boundary-test head `551e25d137df7d25bd7887e89efbb906de02adbb`
was dual-green in CI #176 and Harness #135.

The exact disposal conformance head
`b6848c056fffee95c2e67a8f58ad69453e307451` was dual-green in CI #178 and Harness
#137, including exact source-conformance steps 10 and 11.

The manifest registration commit
`30752090db29d916dbe486365e7d7d67fd8746b3` was audited against `b6848c05...` as
one commit changing exactly `fixtures/manifest.json`, `+24/-0`. Its patch is one
tail hunk appending exactly the four M3-016 records after the final M3-015 record;
no existing manifest record was deleted, reordered, or semantically modified.

Final exact-head evidence for `30752090...`:

| Gate | State | Evidence |
| --- | --- | --- |
| Normal CI | **PASS** | run #179 / run id `32443033468` |
| Frozen install / repository checks | **PASS** | CI `pnpm install --frozen-lockfile` + `pnpm check:all` |
| Exact Harness rc5 source-conformance | **PASS** | run #138 / run id `32443033494` / job `96657346908` |
| Exact pinned rc5 source projection | **PASS** | source-conformance steps 6–9 green |
| Exact pinned rc5 binding typecheck | **PASS** | source-conformance step 10 green |
| Real pinned rc5 runtime conformance | **PASS** | source-conformance step 11 green |

## Current gate

**M3-017 P1 — Adapter DSH replay reconciliation.**

M3-016 implementation is accepted, but M3-017 MUST NOT begin until the exact
live governance head containing this handoff update has both normal CI and exact
Harness rc5 source-conformance green.

Required boundaries for M3-017:

- define replay/live reconciliation semantics in a language-independent contract
  before adding TypeScript- or Harness-specific behavior;
- preserve M3-010 through M3-016 authority boundaries, especially request versus
  final-result authority and disposal cutoff/completion semantics;
- distinguish durable replay evidence from live-only observations and define the
  reconciliation key/order rules explicitly rather than deduplicating by timing;
- fail closed on ambiguous, missing, contradictory, or non-correlatable evidence;
- do not reinterpret already accepted durable evidence during replay;
- use deterministic fixture facts, not host wall-clock, sleeps, process timing,
  object identity, or incidental listener order as the reconciliation oracle;
- use pinned rc5 public replay/session/event seams only as compatibility evidence;
- do not pull M4 Capability Broker or M6 Workspace Transaction semantics forward;
- DeepSeek Harness remains compatibility evidence, never protocol authority.

Before implementation, inspect Spec 0003 replay/lifecycle language, durable
SessionStore event identity/order behavior, existing Adapter observation
normalization/correlation, and exact pinned rc5 public replay/session APIs. Define
the portable reconciliation contract and source facts before fixtures or code.

## Deferred M3 work

Not yet implemented:

- `M3-017 P1` replay reconciliation — **NEXT GATE AFTER GOVERNANCE DUAL-GREEN**.

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
The current safe connector mutation path is whole-file replacement for those
files, so this closure does not risk a large manual rewrite merely to duplicate
evidence already recorded here. They remain explicit governance follow-ups and
MUST NOT be claimed as updated.

## Resume instruction

Read `docs/handoff/README.md`, this file, PR #2 live metadata, and workflow runs
for the exact live head before editing. The verified M3-016 implementation head
is `30752090db29d916dbe486365e7d7d67fd8746b3`; this documentation commit advances
the branch beyond that implementation head, so live GitHub evidence still wins.

Only after this exact live governance head's triggered checks are green, continue
with **M3-017 Adapter DSH replay reconciliation Shared TCK** in protocol-first
order. If the governance head fails, repair that exact failure without weakening
any gate and do not start M3-017 early.
