# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK remain semantic authority.

## Snapshot

- Recorded at: `2026-08-21`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M3 — Shared TCK Foundation`
- Pull request: `#2 — feat(testkit): establish M3 shared TCK foundation`
- PR state: `OPEN / DRAFT`
- Branch: `feat/m3-shared-tck-foundation`
- Stacked base: `feat/m2-harness-adapter@6a9c64155ec6c376908e64d70f2b50d5b8de1285`
- Verified M3-015 implementation head: `1429d08c3f36c24a13f023fb037ed8c3de514b61`
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
accepted final-outcome source seam. Ordering/correlation is explicit and
fail-closed; final-result content/digest/outcome authority is not inferred from
request evidence.

### M3-012 — denied tool call never enters body Shared TCK

**ACCEPTED on verified implementation head
`7dcabbe1f93c9cc91285584b43b6f24213ffed93`.**

The proof uses explicit DENY evidence plus test-side body-entry instrumentation,
preserves request/body/final-outcome separation, and does not invent a normalized
`body.entered` event.

### M3-013 — Adapter DSH final-result mapping Shared TCK

**ACCEPTED on verified implementation head
`92b742fa4250d5703023ebc560923eceaab86b0b`.**

Normative authority is `specs/0012-m3-adapter-dsh-final-result-mapping-tck.md`.
Live `tools/result` remains the authoritative final-result seam. A real pinned
rc5 post-execute replacement proves the body return is not final authority; real
generic error and explicit non-cancellation error-code mapping are covered. The
gate did not absorb denied, approval-unavailable, cancellation, disposal, replay,
M4, or M6 semantics.

Final evidence for `92b742fa...`: CI #141 PASS, exact Harness rc5 #100 PASS,
19 files / 172 tests PASS, oxlint 0 warnings / 0 errors, exact typecheck/runtime
green.

### M3-014 — Adapter DSH approval unavailable Shared TCK

**ACCEPTED on verified implementation head
`656de1dc4bd4c8d07aa8f3079f7e4ab77e1baf3b`.**

Normative/profile authority is
`specs/0013-m3-adapter-dsh-approval-unavailable-tck.md`. Generic testkit and
Adapter/Harness tests are projections/evidence only.

Accepted semantic proof:

1. `UNAVAILABLE` remains an explicit fail-closed approval decision and is not an
   infrastructure exception, rejection, or cancellation alias;
2. only `ALLOWED_ONCE` authorizes the requested action;
3. M3-014 preserves two distinct unavailable source facts:
   - `SERVICE_ABSENT -> UNAVAILABLE + audit NONE`;
   - `SERVICE_DECISION/UNAVAILABLE -> UNAVAILABLE + audit DURABLE_PAIR`;
4. a genuinely missing Adapter approval service returns `UNAVAILABLE` through
   production `requestApproval()` without fabricating `approval/asked` or
   `approval/decided` evidence;
5. the real pinned rc5 ApprovalService with policy `ask` and no answerer resolves
   `unavailable` through the public service seam;
6. that real no-answer path persists exactly one `approval/asked` followed by one
   `approval/decided`, correlates both by the Harness-generated approval id, and
   records decided outcome `unavailable`;
7. policy `never` remains `REJECTED`, not unavailable;
8. abort/cancellation remains `CANCELLED`, not unavailable;
9. `REJECTED`, `CANCELLED`, and `ALLOWED_ONCE` are rejected by the M3-014 portable
   profile when presented as unavailable source evidence;
10. service-absent fixtures cannot manufacture decision/audit fields, while
    service-decision fixtures require explicit `UNAVAILABLE + DURABLE_PAIR`;
11. malformed/non-portable source facts fail before implementation invocation;
12. implementation exceptions or malformed projections are runner `ERROR`;
    valid mismatches are runner `FAIL`;
13. expectation/oracle data cannot manufacture unavailable source classification;
14. no M3-015 cancellation, M3-016 disposal, M3-017 replay, M4 Capability Broker,
    or M6 Workspace Transaction semantics were pulled forward;
15. no production Adapter source logic was changed to satisfy the TCK;
16. no schema, compatibility baseline, TypeScript strictness, frozen lockfile,
    architecture rule, validator, TCK expectation, or security guarantee was
    weakened.

Final exact-head evidence for `656de1dc...`: CI #150 PASS and exact Harness rc5
#109 PASS, including source-conformance steps 10 and 11.

### M3-015 — Adapter DSH cancellation Shared TCK

**ACCEPTED on verified implementation head
`1429d08c3f36c24a13f023fb037ed8c3de514b61`.**

Normative/profile authority is
`specs/0014-m3-adapter-dsh-cancellation-tck.md`. Generic testkit, production
Adapter observation, and pinned Harness tests are projections/evidence only.

Accepted semantic proof:

1. approval-request cancellation and final tool-result cancellation remain two
   distinct authority families; the portable profile does not synthesize a
   third combined cancellation event;
2. approval cancellation requires the explicit decision
   `APPROVAL_DECISION/CANCELLED` and remains distinct from `REJECTED`,
   `UNAVAILABLE`, and `ALLOWED_ONCE`;
3. approval cancellation persists one correlated durable
   `approval/asked + approval/decided(cancelled)` pair in the real pinned rc5
   ApprovalService proof;
4. final tool cancellation remains authoritative only through live
   `tools/result` evidence and exact machine codes `ABORTED` or
   `ABORTED_BEFORE_DISPATCH`;
5. `ABORTED_BEFORE_DISPATCH` is proven against the real pinned rc5 ToolRuntime
   with body-entry instrumentation showing the registered body was not invoked;
6. `ABORTED` is proven against the real pinned rc5 ToolRuntime after the body
   explicitly entered and cooperatively settled following caller cancellation;
7. production Adapter observation maps both exact final-result codes to
   `tool.completed/outcome=cancelled` while preserving exact `errorCode` and the
   authoritative final-result digest;
8. production `policyCancelled` same-call correlation is exercised directly:
   an explicit approval `cancelled` decision may authoritatively classify the
   correlated final error as cancelled even when that final error does not carry
   either `ABORTED*` code;
9. that correlation does not broaden arbitrary errors into cancellation and does
   not make approval cancellation an alias for final-result code authority;
10. arbitrary error codes, successful results carrying cancellation codes,
    missing/malformed correlation, and non-`CANCELLED` approval decisions fail
    closed in the portable profile;
11. expectation/oracle data cannot manufacture cancellation classification;
12. malformed/non-portable inputs fail before implementation invocation;
    implementation exceptions/malformed projections are runner `ERROR`, while
    valid mismatches are runner `FAIL`;
13. the pinned rc5 optional `ToolFailure.info` surface is respected by the exact
    test through safe optional metadata access; no cast, `any`, `@ts-ignore`,
    tsconfig relaxation, dependency change, or production workaround was used;
14. no production Adapter source logic was changed for M3-015;
15. no schema, compatibility baseline, TypeScript strictness, frozen lockfile,
    architecture rule, validator, TCK expectation, or security guarantee was
    weakened;
16. M3-016 disposal, M3-017 replay reconciliation, M4 Capability Broker, and M6
    Workspace Transaction semantics remain out of scope.

Implemented artifacts include:

- `specs/0014-m3-adapter-dsh-cancellation-tck.md`;
- three portable M3-015 fixtures for approval cancellation,
  `ABORTED_BEFORE_DISPATCH`, and `ABORTED`;
- strict generic cancellation parser/runner and boundary tests in
  `packages/testkit`;
- public testkit exports and manifest registration;
- exact pinned rc5 cancellation source-conformance through public
  ApprovalService and ToolRuntime seams plus production Adapter observation.

Final exact-head evidence for `1429d08c...`:

| Gate | State | Evidence |
| --- | --- | --- |
| Normal CI | **PASS** | run #162 / run id `32414114339` / job `96571199366` |
| Frozen install / repository checks | **PASS** | CI `pnpm install --frozen-lockfile` + `pnpm check:all` |
| Exact Harness rc5 source-conformance | **PASS** | run #121 / run id `32414114346` / job `96571199379` |
| Exact pinned rc5 source projection | **PASS** | source-conformance steps 6–9 green |
| Exact pinned rc5 binding typecheck | **PASS** | source-conformance step 10 green |
| Real pinned rc5 runtime conformance | **PASS** | source-conformance step 11 green |

The initial exact conformance head `c714ec80...` exposed a strict pinned-type
mismatch in test-side access to optional `ToolFailure.info`. Commit
`3b3af9291de6bb0f023a1b926929c7a0d97127ac` corrected only the test read from
`error?.info.code` to `error?.info?.code`; its CI #161 and Harness #120 both
passed, including steps 10/11. This preserved rather than weakened the pinned
public type contract.

The manifest registration commit `1429d08c...` was audited as one tail-only hunk:
three M3-015 records were appended after the two M3-014 records; no existing
fixture record was reordered or semantically modified.

## Current gate

**M3-016 P0 — Adapter DSH disposal Shared TCK.**

M3-016 is the next and only newly authorized implementation gate, but it MUST NOT
start until the exact live governance head containing this handoff update has
both normal CI and exact Harness rc5 source-conformance green.

Required boundaries for M3-016:

- begin with a language-independent disposal/lifecycle contract before adding or
  changing TypeScript or Adapter-specific behavior;
- define which owned subscriptions, listeners, policies, guards, and other
  resources require explicit disposal and which are externally owned;
- distinguish registration lifetime, subscription lifetime, observation drain,
  and disposal completion rather than treating them as one boolean state;
- prove disposal is idempotent or explicitly reject repeat disposal according to
  the normative contract; do not rely on incidental implementation behavior;
- prove disposed resources stop producing future observable effects without
  deleting or rewriting already durable evidence;
- preserve M3-010 through M3-015 event authority, ordering, denied-body-entry,
  final-result, unavailable, and cancellation semantics;
- do not infer successful disposal from missing events, timing, garbage
  collection, or process exit;
- use public pinned rc5 lifecycle/disposal seams only for compatibility evidence;
  private fields or implementation-only collection inspection are not protocol
  authority;
- do not pull M3-017 replay reconciliation, M4 Capability Broker, or M6 Workspace
  Transaction semantics forward;
- DeepSeek Harness remains compatibility evidence, never protocol authority.

Before implementation, inspect existing Adapter `observe()` / policy registration
cleanup behavior, package-local subscription/disposal tests, Spec 0003 lifecycle
language, and the exact pinned rc5 public registration/disposal APIs. Then define
the portable M3-016 source facts and contract before fixtures or TypeScript.

## Deferred M3 work

Not yet implemented:

- `M3-016 P0` disposal — **NEXT GATE AFTER GOVERNANCE DUAL-GREEN**;
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
The current safe connector mutation path is whole-file replacement for those
files, so this closure does not risk a large manual rewrite merely to duplicate
evidence already recorded here. They remain explicit governance follow-ups and
MUST NOT be claimed as updated.

## Resume instruction

Read `docs/handoff/README.md`, this file, PR #2 live metadata, and workflow runs
for the exact live head before editing. The verified M3-015 implementation head
is `1429d08c3f36c24a13f023fb037ed8c3de514b61`; this documentation commit advances
the branch beyond that implementation head, so live GitHub evidence still wins.

Only after this exact live governance head's triggered checks are green, continue
with **M3-016 Adapter DSH disposal Shared TCK** in protocol-/fixture-first order.
If the governance head fails, repair that exact failure without weakening any
gate and do not start M3-016 early.