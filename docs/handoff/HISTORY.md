# Engineering Handoff History

This is an append-only operational history. It is non-normative.

## 2026-08-17T17:43:00+08:00 — Establish repository-backed handoff

Repository continuity records were added during M2 so future work does not
depend on chat history.

Snapshot at the last verified implementation head
`7c4354e369aaf7097d7a5b25ed47ba452df5fc9b`:

- PR #1 remained open and Draft.
- normal CI passed;
- exact Harness source baseline remained
  `47f943859bef60e4160492346772ded9b24f765a` (`0.1.0-rc.5`);
- source-conformance successfully built pinned Harness, installed safe-runtime
  reproducibly, projected the exact workspace, and verified projection
  idempotence;
- source-conformance failed at step 10, the exact rc5
  binding/source-conformance TypeScript check;
- runtime conformance was skipped because the stricter typecheck failed first;
- the next action was therefore changed from runtime-failure debugging to
  obtaining and fixing the actual compiler diagnostic for the latest head.

The handoff policy requires future sessions to refresh live PR/head/workflow
state before acting and forbids using these snapshots to override normative
specification artifacts or weaken quality gates.

## 2026-08-17T18:43:00+08:00 — Close exact-source runtime prerequisite

The M2 exact-source prerequisite became fully green on implementation head
`4d089dedc1d15c71267474ae166360b5bf9821a9`.

Evidence:

- normal CI run `32022049143` (#38): PASS;
- exact Harness source-conformance run `32022049099` (#20): PASS;
- job `95363595323` steps 6–11 all passed, including exact-source TypeScript and
  real rc5 runtime conformance;
- exact Harness baseline remained
  `47f943859bef60e4160492346772ded9b24f765a` (`0.1.0-rc.5`).

The runtime blocker preceding this state was a Cordis fixture assertion that
read `fiber.parent` through a proxied injected Context. Pinned Cordis source
proved `ctx.inject()` already returns the direct child Fiber. The fixture was
corrected to keep its Context-only `inject()` API stable and add a narrowly
scoped `injectWithFiber()` path for lifecycle assertions. The fix changed only
source-conformance fixture mechanics, not adapter/protocol semantics.

A further real ToolRuntime conformance test was then added for the
`tools/result` authority boundary. It executes an agent-scoped tool, changes the
accepted content in `tools/post-execute`, and verifies the adapter's
`tool.completed.resultDigest` equals the final materialized ToolRuntime result.
The complete public Agent fixture uses real Session/Inbox instances and avoids
unsafe type escape hatches.

With the dual-green prerequisite and authoritative final-result test now
verified, the active M2 gate advances to the Filesystem / Subprocess Provider
Probe. PR #1 remains Draft; M2 is not Ready until the provider probe and M2
Acceptance Audit are complete.

## 2026-08-17T19:10:00+08:00 — Complete portable rc5 provider probe

The Filesystem / Subprocess Provider Probe closed on head
`39eaaada8186ad7555456d76aeed647d1a3d7e5f`.

Evidence:

- normal CI run `32022994277` (#41): PASS;
- exact source-conformance run `32022994262` (#23): PASS;
- job `95366391189` steps 6–11 all passed;
- exact-source TypeScript step 10 compiled the new
  `provider-seams.contract.ts` against the pinned upstream public packages;
- runtime conformance step 11 remained green.

The probe records several security-critical negative facts: local FS cwd is not
containment, `fs-sandbox` is mutation-only provider fencing rather than general
isolation, local subprocess filesystem effects bypass `ctx.fs`, sandbox policy
scope is file effects only, and a provider-reported `full` value is not by
itself environment attestation (a configured runner can assert it without the
built-in functional probe).

The active gate advances to the **M2 Acceptance Audit**. The audit must reconcile
the normative adapter spec, TCK/security expectations, stale roadmap tracking
items, and live CI evidence. PR #1 remains Draft until that audit either proves
M2 acceptance or identifies/fixes the remaining P0 blockers.

## 2026-08-17T20:49:00+08:00 — Acceptance audit closes B1/B2 remediation

The repository-backed M2 Acceptance Audit was recorded in
`docs/acceptance/m2-acceptance-audit.md`. It kept PR #1 Draft and identified four
P0 remediation items rather than treating green CI as semantic acceptance.

Two normative gaps were then remediated and verified on implementation head
`e53d13ba4531c9e315a0fd2e3f999cbf463d595c`:

- **P0-B1 completion steering budget**: `CompletionSteerRequest` now carries the
  caller-defined `maxRetries`; malformed budgets fail explicitly; over-budget
  steering fails with `COMPLETION_STEER_BUDGET_EXHAUSTED` before Harness
  `agent.steer()` is invoked; exact rc5 runtime conformance covers the positive
  boundary and negative exhausted-budget path.
- **P0-B2 sidecar correlation**: the adapter now exposes a minimal
  `SidecarEvidenceRecord` / `SidecarEvidenceSink` boundary keyed by durable
  Harness event ref/sequence and evidence ref/digest. Projection is allow-listed
  and explicitly omits `processLocalTokenRef`. Full ledger persistence, hash
  chaining, retention, and replay indexes remain later-milestone work.

A real intermediate CI failure was fixed from current-head evidence rather than
old logs: head `fd4e7c03ffe526cca10440933a9188d536b1454e` passed frozen install but failed
`pnpm check:all`; check-run annotations reported `Cannot find module
'@dsh-safe/protocol' or its corresponding type declarations.` The sidecar seam
was corrected to remain package-local/runtime-independent instead of weakening
TypeScript or frozen-install requirements.

Final evidence at `e53d13ba4531c9e315a0fd2e3f999cbf463d595c`:

- normal CI run `32031495534` / job `95392301947`: PASS;
- frozen install: PASS;
- `pnpm check:all`: PASS;
- exact rc5 source-conformance run `32031495546` / job `95392301956`: PASS;
- pinned upstream build, reproducible install, package projection,
  idempotence, exact-source TypeScript, and real rc5 runtime conformance all
  passed.

M2 is still **NOT ACCEPTED**. The active blocker advances to **P0-B3: minimal
operational Filesystem/Subprocess adapter ports**. P0-B4 exact-source
subagent/workflow reconnaissance remains after B3. M3 shared TCK and M4
Capability Broker remain unauthorized until M2 P0 remediation is complete.

## 2026-08-17T20:55:14+08:00 — Close B3 operational provider ports

P0-B3 closed on implementation head
`c5d42ac67cff40102de5b5e6a3aea459e646d7ba` with dual-green evidence.

The guarantee-only filesystem/subprocess markers were replaced by minimal
operational, runtime-independent ports:

- filesystem preserves opaque provider target identity and exposes only the M2
  resolve/stat/contains/readText/processPath seam;
- guessed/unresolved target identities fail explicitly rather than being
  interpreted as paths;
- subprocess exposes executable resolution and an explicit bounded
  collected-output spawn request;
- missing requested stdout/stderr collectors fail closed;
- both ports declare provider mediation while explicitly refusing to assert
  process/kernel isolation;
- filesystem/subprocess are recorded as sharing an execution world without
  claiming subprocess file effects traverse `ctx.fs`;
- raw Node streams, shell defaults, PTY policy, workspace transactions and
  broader sandbox semantics were not pulled into M2.

Exact-source `provider-seams.contract.ts` now proves the official pinned rc5
`FileSystem` and `SubprocessRuntime` public types bind directly to these
structural adapters. No concrete Harness type was promoted into protocol/core.

A real intermediate normal-CI failure on head
`04ab5764d127be6979976c96998de0a40e36ead2` was caused only by current-head
`TS7006` implicit-any diagnostics in new factory callbacks. Frozen install
passed. The fix added explicit parameter/return types; TypeScript strictness and
all validation requirements remained unchanged.

Final evidence at `c5d42ac67cff40102de5b5e6a3aea459e646d7ba`:

- normal CI run `32032290309` / job `95394774984`: PASS;
- frozen install and `pnpm check:all`: PASS;
- exact rc5 source-conformance run `32032290352` / job `95394780881`: PASS;
- source-conformance steps 6–11 all PASS, including exact-source TypeScript
  binding against official rc5 and real runtime conformance.

M2 remains **NOT ACCEPTED**. The active blocker advances to **P0-B4: exact-source
subagent/workflow reconnaissance and explicit supported/non-supported seam
documentation**. Roadmap M2-017 subagent lineage implementation remains P1 and
is not authorized by this gate. PR #1 remains Draft; M3/M4 remain unauthorized.

## 2026-08-18 — Close B4 and accept M2 P0 baseline

P0-B4 exact-source reconnaissance was completed against only the pinned Harness
commit `47f943859bef60e4160492346772ded9b24f765a`.

The public source confirms:

- `subagent/` and `workflow/` are Product-stable capability families;
- `ctx.subagents` exposes named-provider delegation, one-shot/continuable child
  operations, and public `subagent/start` / `subagent/end` events;
- subagent lifecycle pairs by `runId` and exposes child `SessionId`;
- session-backed children persist `parentSession`, `origin: 'subagent'`, and
  `delegationDepth` metadata;
- `ctx.workflowEngine` is public and `WorkflowEngine.start()` returns a
  holder-owned live run;
- workflow child lifecycle pairs `workflow/agent-start` and
  `workflow/agent-end` by per-call `seq` and carries child `SessionId`;
- worker-thread execution is explicitly documented upstream as not being a
  security boundary.

The compatibility note records the corresponding non-guarantees. Harness ids,
provider names, phases, activation state and session metadata are compatibility
evidence, not portable safe-runtime protocol semantics. Remote providers are not
assumed equivalent to local providers, and live parent attribution alone is not
future authorization proof.

During source review one wording defect was found and corrected: the
compatibility table had said `WorkflowEngine.start()` "owns" a live run, while
the public rc5 contract states that it returns a **holder-owned** live run. The
correction was documentation-only and strengthened lifecycle precision rather
than changing behavior.

`docs/acceptance/m2-acceptance-audit.md` was refreshed after B4. Its result is:

- P0-B1: PASS;
- P0-B2: PASS;
- P0-B3: PASS;
- P0-B4: PASS;
- M2: **ACCEPTED**;
- M2-017 P1 subagent lineage mapping: still DEFERRED;
- M3 shared TCK: next authorized milestone only after the final documentation
  head is dual-green;
- M4 Capability Broker: still not authorized.

PR #1 remains Draft during the final exact-head verification. Draft state is not
a substitute for acceptance and acceptance is not automatic permission to merge.

## 2026-08-18T17:22:00+08:00 — Enter M3 Shared TCK Foundation

Final M2 head `6a9c64155ec6c376908e64d70f2b50d5b8de1285` was rechecked before crossing the
milestone boundary:

- normal CI #71: PASS;
- exact Harness rc5 source-conformance #53: PASS.

To preserve the accepted M2 evidence line, M3 work was moved to a separate
stacked branch and Draft PR:

- branch: `feat/m3-shared-tck-foundation`;
- PR #2: `feat(testkit): establish M3 shared TCK foundation`;
- base: `feat/m2-harness-adapter@6a9c64155ec6c376908e64d70f2b50d5b8de1285`.

The first M3 foundation work follows repository governance order rather than
letting a TypeScript runner define the contract:

1. `specs/0004-shared-tck-foundation.md` defines a language-independent fixture
   envelope and runner lifecycle;
2. `schemas/v1alpha1/tck-fixture.schema.json` publishes the Draft 2020-12 shape;
3. positive and fail-closed negative fixtures cover valid determinism, missing
   clock tick, and unknown top-level fields;
4. schema index, compatibility baseline and fixture manifest register the new
   contract;
5. `@dsh-safe/testkit` projects the contract into TypeScript and validates it as
   one implementation only.

The contract requires explicit seed and logical clock inputs, forbids host time
from deciding fixture outcomes, keeps profile input/output as opaque JSON at the
envelope layer, and distinguishes `PASS`, `FAIL`, `UNSUPPORTED`, and `ERROR`.
`UNSUPPORTED`/`ERROR` cannot be coerced to `PASS`.

CI evidence:

- foundation head `bcee18375c63c736559b9540c942aaea09e936c4`: normal CI #72 PASS;
- review-clean head `9610b2bc7935ab60e050b7f4998862c82699d17a`: normal CI #73 PASS.

The second head restores the existing pretty fixture-manifest formatting so the
PR diff contains only four deletions instead of unrelated formatting churn.

M3-004 fake approval, M3-005 fake tool runtime, M3-006 fake fs/subprocess,
M3-007 fault injection, Adapter DSH shared TCK cases, M4, and M6 remain
unimplemented. `docs/roadmap.md` still needs planning-only reconciliation; it
must not invent normalized `step.ended` or retroactively claim that M3's
language-neutral Event Order TCK was completed inside M2.
