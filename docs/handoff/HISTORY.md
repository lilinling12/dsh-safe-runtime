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

## 2026-08-18T18:10:00+08:00 — Close M3-004 fake approval

Roadmap synchronization was first completed on head
`79bd048599ac6f64975912b23f1e12f9719ef956` without changing normative
semantics. Normal CI #78 passed frozen install and `pnpm check:all`, so the
recorded prerequisite for fake-runtime work was satisfied.

M3-004 then closed on implementation head
`cc59a5db1045346792d823e56557d78438dd37c1` in protocol-/fixture-first order:

- `specs/0005-m3-fake-approval-test-service.md` defines a language-independent
  deterministic approval fake and explicitly excludes production authorization,
  Harness binding, cancellation mechanics, persistence, and later fake-runtime
  behavior;
- the portable decision set is `ALLOWED_ONCE`, `REJECTED`, `CANCELLED`, and
  `UNAVAILABLE`, preserving the existing fail-closed approval boundary;
- `fixtures/tck/valid/approval-sequence.json` proves FIFO decision consumption;
- `fixtures/tck/valid/approval-script-exhausted.json` proves exhaustion is the
  explicit `FAKE_APPROVAL_SCRIPT_EXHAUSTED` infrastructure error rather than an
  implicit `UNAVAILABLE` or success;
- both fixtures are registered in `fixtures/manifest.json`;
- `packages/testkit/src/fake-approval.ts` is a runtime-independent TypeScript
  projection only and imports no Harness concrete types;
- conformance covers FIFO order, exact decision preservation, invalid scripted
  decisions, defensive observation copies, and explicit exhaustion.

Exact-head evidence for `cc59a5db...`:

- normal CI #79 / job `95673419492`: PASS;
- pinned pnpm enable: PASS;
- `pnpm install --frozen-lockfile`: PASS;
- `pnpm check:all`: PASS.

No schema, validator, TypeScript strictness, conformance test, frozen lockfile,
or security guarantee was weakened. M4 and M6 remain unauthorized.

The next allowed gate is **M3-005 P0 — fake tool runtime**. It must again begin
with a language-independent profile contract and portable fixtures, must retain
the intent-vs-observed-outcome distinction, and must not pull M3-006
filesystem/subprocess or M3-007 fault injection semantics forward.

## 2026-08-19T09:18:00+08:00 — Close M3-005 deterministic fake tool runtime

M3-005 closed on implementation head
`d5cc341594e79e7203d2203052db27f37984dfa7` in protocol-/fixture-first order.

- `specs/0006-m3-fake-tool-runtime-test-service.md` defines the portable fake
  before its TypeScript projection and explicitly excludes production dispatch,
  capability policy, filesystem/subprocess behavior, network access, Harness
  binding, and fault injection;
- the portable scripted outcome vocabulary is exactly `RESULT`, `ERROR`, and
  `DENIED`;
- a request is intent only and is separately observable from body entry and the
  final outcome;
- `RESULT` and deliberate scripted `ERROR` enter the fake body, while `DENIED`
  produces no `BODY_ENTERED` trace entry;
- the portable trace phases `REQUESTED`, `BODY_ENTERED`, and `OUTCOME` are TCK
  test evidence only, not additions to the safe-runtime normalized event
  vocabulary;
- `tool-runtime-sequence.json`, `tool-runtime-denied.json`, and
  `tool-runtime-script-exhausted.json` are ordinary JSON fixtures registered in
  the shared fixture manifest;
- script exhaustion is the explicit infrastructure error
  `FAKE_TOOL_SCRIPT_EXHAUSTED` and does not invent request/body/outcome evidence;
- malformed scripts and requests fail closed before execution evidence can be
  produced;
- the TypeScript projection imports no concrete Harness or adapter types and
  executes no real filesystem, shell, subprocess, network, or environment
  operation.

Exact-head evidence for `d5cc3415...`:

- normal CI #81 / job `95923943524`: PASS;
- pinned pnpm 11.7.0 enable: PASS;
- `pnpm install --frozen-lockfile`: PASS;
- supply-chain lockfile policy: PASS (123 entries);
- architecture boundaries: PASS;
- schema shape: PASS (16 schemas);
- schema compatibility baseline: PASS;
- TypeScript typecheck: PASS;
- fake tool runtime conformance: 6 tests PASS;
- repository tests: 9 files / 73 tests PASS;
- oxlint: 0 warnings / 0 errors.

No schema, validator, TypeScript strictness, fixture contract, frozen lockfile,
architecture boundary, or security guarantee was weakened. M4 and M6 remain
unauthorized.

The next and only newly authorized gate is **M3-006 P0 — fake
filesystem/subprocess**. It must start with a language-independent contract,
retain the accepted same-world/non-isolation provider facts, execute no real
host effects, and must not pull M6 Workspace Transaction or M3-007 fault
injection semantics forward.

## 2026-08-19T09:41:00+08:00 — Close M3-006 deterministic fake execution world

M3-006 closed on verified implementation head
`de5d4e0cc7099cfa35d91211f81b87f2784ca5df` after protocol-/fixture-first
implementation and a stricter lint-clean follow-up.

- `specs/0007-m3-fake-filesystem-subprocess-test-service.md` defines the
  language-independent fake execution-world contract before TypeScript code;
- filesystem resolution, stat, containment, text reads, and process-path values
  are explicit scripted facts rather than derived host/path behavior;
- executable resolution and subprocess spawn are inert JSON operations backed by
  exact mappings and a deterministic FIFO script;
- duplicate or ambiguous facts fail during configuration rather than acquiring
  hidden precedence;
- unknown containment is explicit and is never derived from path-looking
  strings;
- unexpected spawn requests and script exhaustion fail before cursor advancement
  or observation mutation;
- `execution-world-non-mediation.json` preserves the accepted security boundary:
  filesystem and subprocess may share `worldRef`, but a scripted subprocess does
  not implicitly mutate the fake filesystem and no process/kernel isolation is
  claimed;
- the TypeScript projection imports no Harness concrete type and invokes no real
  filesystem, path-normalization, process, shell, network, environment, clock,
  or randomness facility;
- implementation comments document these non-guarantees and fail-closed reasons
  rather than restating syntax.

Portable fixtures added and registered:

- `execution-world-filesystem.json`;
- `execution-world-subprocess.json`;
- `execution-world-non-mediation.json`;
- `execution-world-subprocess-exhausted.json`.

The first implementation head `78f04e2ea1dee5e62d02a6ee8e840c948ecd70cf`
passed CI #85 and all 81 tests, but oxlint reported one unused-type warning. The
warning was treated as a quality defect rather than accepted because the gate
requires a clean implementation. Follow-up head `de5d4e0c...` removed only that
unused declaration.

Final exact-head evidence for `de5d4e0c...`:

- normal CI #86 / job `95928288279`: PASS;
- pinned pnpm 11.7.0 enable: PASS;
- `pnpm install --frozen-lockfile`: PASS;
- supply-chain lockfile policy: PASS (123 entries);
- architecture boundaries: PASS;
- schema shape: PASS (16 schemas);
- schema compatibility baseline: PASS;
- TypeScript typecheck: PASS;
- fake execution-world conformance: 8 tests PASS;
- repository tests: 10 files / 81 tests PASS;
- oxlint: **0 warnings / 0 errors**.

No schema, validator, TypeScript strictness, fixture contract, frozen lockfile,
architecture boundary, or security guarantee was weakened. M3-006 does not
implement path containment, rollback, transactionality, shell behavior, process
isolation, capability policy, or fault injection.

The next and only newly authorized gate is **M3-007 P0 — fault injection
interface**. It must again start from a language-independent deterministic
contract and portable fixtures, must keep injected faults distinct from ordinary
outcomes, and must not pull M4/M6 or Adapter DSH lifecycle semantics forward.

## 2026-08-19T10:02:00+08:00 — Close M3-007 deterministic fault injection interface

M3-007 closed on verified implementation head
`494e08de5b1304ef039c5a5462f083b7e76b8a29`.

- `specs/0008-m3-deterministic-fault-injection-test-service.md` defines the
  portable test-control contract before TypeScript implementation;
- portable directives are exactly `NO_FAULT` and `INJECT_FAULT`;
- an injected fault is an inert descriptor only and is not automatically thrown,
  crashed, delayed, signaled, retried, rolled back, or translated into an
  ordinary tool/runtime outcome;
- injection points are explicitly declared opaque identifiers, and probes are
  exact inert JSON matched against a deterministic FIFO script;
- unknown points, unexpected probes, malformed probes, and script exhaustion fail
  explicitly without cursor advancement or fabricated observations;
- direct API calls reject cyclic, sparse, exotic, non-finite, and otherwise
  non-portable JSON values;
- observations and directives are defensive immutable snapshots;
- existing M3-005 tool and M3-006 execution-world fakes remain unchanged and do
  not acquire hidden fault behavior;
- three portable fixtures cover directive distinction, unexpected-probe
  non-consumption, and explicit exhaustion;
- eight conformance tests cover the portable and fail-closed boundaries.

The initial implementation commit
`0687e868c62dd373c2be2d6869c3bf4757e8bb7b` was followed by
`494e08de...` only to restore the established pretty formatting of
`fixtures/manifest.json`; the semantic case list was unchanged.

Final exact-head evidence for `494e08de...`:

- normal CI #91 / job `95931880009`: PASS;
- pinned pnpm 11.7.0 enable: PASS;
- `pnpm install --frozen-lockfile`: PASS;
- supply-chain lockfile policy: PASS (123 entries);
- architecture boundaries: PASS;
- schema shape: PASS (16 schemas);
- schema compatibility baseline: PASS;
- TypeScript typecheck: PASS;
- fault-injection conformance: 8 tests PASS;
- repository tests: 11 files / 89 tests PASS;
- oxlint: **0 warnings / 0 errors**.

No validator, schema, compatibility baseline, TypeScript strictness, frozen
install, architecture boundary, TCK expectation, or security guarantee was
weakened.

M3.1 Test Harness foundation work is now complete through M3-007. The next and
only newly authorized gate is **M3-010 P0 — Adapter DSH turn lifecycle Shared
TCK**. It must begin by reconciling the existing normalized event spec, accepted
M2 adapter mapping, and exact rc5 lifecycle evidence; Harness lifecycle names
remain compatibility evidence rather than portable protocol authority.

## 2026-08-19T10:18:00+08:00 — Close M3-010 Adapter DSH turn lifecycle Shared TCK

M3-010 closed on verified implementation head
`728f44e73ac61dba1b40d570f2458bd456d79bbc` with both normal CI and exact
pinned Harness rc5 source-conformance green.

- `specs/0009-m3-adapter-dsh-turn-lifecycle-tck.md` defines the portable
  `ADAPTER_DSH` turn-lifecycle profile before TypeScript projection;
- five portable fixtures cover completed, cancelled, blocked, failed, and
  unsupported terminal-reason behavior;
- normalized lifecycle evidence remains `turn.started`, `step.started`, and
  `turn.ended`; real Harness `step/end` is source evidence but explicitly maps to
  `NO_EVENT`, so no `step.ended` is invented;
- unknown terminal reasons fail closed with
  `UNSUPPORTED_HARNESS_TURN_END_REASON` at the exact source ordinal;
- source order/sequence is explicit evidence and timestamps never repair or infer
  missing lifecycle facts;
- generic testkit rejects malformed lifecycle grammar and direct-call non-portable
  JSON state, including cyclic values, sparse arrays, and named/symbol array
  properties;
- Adapter DSH conformance reuses existing normalization rather than redefining
  production semantics;
- exact rc5 runtime conformance writes real `Session.append()` lifecycle events
  and proves the upstream seam without fabricating normalized evidence.

Quality review caught a sparse-array validation gap and added regressions. A
subsequent functionally green head still had one oxlint `no-array-constructor`
warning in test setup; that warning was treated as a defect and removed before
acceptance.

Final exact-head evidence for `728f44e...`:

- normal CI #99 / job `95936172958`: PASS;
- exact Harness rc5 source-conformance #58 / job `95936172462`: PASS;
- frozen install and supply-chain lockfile policy: PASS (123 entries);
- architecture boundaries: PASS;
- schema shape / compatibility baseline: PASS (16 schemas);
- TypeScript typecheck: PASS;
- portable M3-010 profile tests: 18 PASS;
- portable JSON boundary regressions: 2 PASS;
- Adapter DSH lifecycle TCK: 6 PASS;
- repository tests: 14 files / 115 tests PASS;
- oxlint: **0 warnings / 0 errors**.

No schema, validator, compatibility baseline, TypeScript strictness, frozen
install, architecture rule, adapter mapping, TCK expectation, or security
guarantee was weakened.

The next and only newly authorized gate is **M3-011 P0 — Adapter DSH tool
ordering Shared TCK**. It must stay focused on explicit ordering evidence and
must not pull M3-012 denied-body semantics or M3-013 final-result-authority
semantics forward.

## 2026-08-21 — Accept M3 Shared TCK Foundation

The live PR state had advanced beyond the stale handoff snapshot: all numbered
M3 gates through M3-017 were implemented, and the M3 acceptance audit had
correctly identified two remaining P0 Definition-of-Done blockers rather than
accepting the milestone from green Adapter CI alone:

- **M3-A1 — Publishable Shared TCK artifact**;
- **M3-A2 — External dummy consumer conformance**.

The remediation was completed without weakening protocol, schema, validator,
TCK, TypeScript strictness, frozen-lockfile, architecture, compatibility or
security guarantees. The package check was wired into normal `pnpm check:all`,
then hardened from predicted pack output to inspection of the actual generated
`.tgz` artifact.

The final accepted M3 remediation implementation head is
`e6522a18760268b56b09f9ac5d9c822671c41666`.

Direct evidence:

- normal CI #218 / run `32482908193`: PASS;
- frozen repository install: PASS;
- architecture/schema/compatibility gates: PASS;
- strict TypeScript: PASS;
- 24 test files / 261 tests: PASS;
- oxlint: 0 warnings / 0 errors;
- actual protocol/testkit tarball construction and inspection: PASS;
- generated package includes all 44 registered TCK assets and required schema;
- an external consumer created outside the repository installs the same-run
  `protocol.tgz` and `testkit.tgz` with npm 10.9.3 in offline/ignore-scripts
  mode;
- the consumer resolves `@dsh-safe/testkit` from installed `node_modules`, not a
  repository/workspace source path;
- the external dummy implementation proves required PASS, deliberate FAIL, and
  thrown-implementation ERROR behavior through public testkit exports;
- exact Harness rc5 source-conformance #177 / run `32482908210`: PASS, including
  pinned source build, projection/idempotence, exact binding typecheck and real
  rc5 runtime conformance.

DeepSeek Harness remains Adapter compatibility evidence only; it did not define
or modify Shared TCK semantics.

`docs/acceptance/m3-acceptance-audit.md` now records **M3 ACCEPTED**. M4 is
therefore authorized only as the next protocol-first milestone, beginning at
`M4-001 P0 — YAML/JSON loader`. M4-002+ and M6 Workspace Transaction remain
unauthorized until their respective gates are reached.

## 2026-08-22 — Accept M4-001 Capability Policy document loader

M4-001 closed at implementation head
`9443d907b2b9db6819fe697a49abd6bf47bf1edf` after an acceptance review that
strengthened the YAML untrusted-input boundary rather than treating an earlier
green run as sufficient.

The accepted boundary is defined by
`specs/0017-m4-capability-policy-document-loader.md` and recorded in
`docs/acceptance/m4-001-acceptance-audit.md`.

Key closure evidence:

- explicit JSON/YAML dispatch with no content-sniffing fallback;
- duplicate-aware custom JSON parsing before object materialization;
- safe YAML portable subset rejecting anchors/aliases, merge keys, explicit tags,
  duplicate keys, non-string keys and non-JSON values;
- exact-pinned `yaml@2.9.0` with synchronized frozen lockfile;
- finite source-byte, nesting-depth and semantic container-entry budgets;
- YAML depth and entry budgets preflighted iteratively over Parser CST before
  Composer, with AST projection rechecks as defense in depth;
- flow and block deep-nesting regressions plus oversized fan-out regression;
- `__proto__` remains ordinary own data without prototype mutation;
- successful loading deliberately does not perform M4-002 schema validation.

Exact implementation-head evidence:

- normal CI #248 / run `32582943266`: PASS;
- frozen install and 124-entry supply-chain policy: PASS;
- architecture/schema/schema-baseline/strict TypeScript: PASS;
- 26 test files / 288 tests: PASS;
- M4-001 loader tests: 18 PASS;
- JSON parser tests: 9 PASS;
- oxlint: 0 warnings / 0 errors;
- Shared TCK packed artifact/external consumer boundary: PASS;
- exact Harness rc5 source-conformance #192 / run `32582943175`: PASS;
- Harness steps 6–11 all PASS, including pinned build, reproducible install,
  projection/idempotence, exact binding typecheck and real runtime conformance.

M4-001 is accepted at its implementation boundary. Governance records are being
updated on PR #3 and their final exact head must itself be dual-green before
M4-002 starts. M4-002 must begin protocol-first by reconciling the existing
`defaultEffect` schema/prose boundary; M4-003+ and M6 remain unauthorized.

## 2026-08-23 — Accept M4-002 CapabilityPolicy schema validation

M4-002 closed at implementation head
`7b87c812fafab860d5ee95bebdfc706ec6e2ba06` after protocol-first reconciliation
of the CapabilityPolicy schema-validation boundary in Spec 0018.

The accepted boundary preserves the existing v0.1 schema rather than
weakening it: `spec.defaultEffect` remains required and constrained to
`deny`. Core §8.3's missing-value => deny rule remains a later evaluator
fail-closed invariant; M4-002 does not synthesize a missing field or treat
a schema-invalid document as valid.

The TypeScript reference implementation uses strict Draft 2020-12
`Ajv2020`, trusted repository-controlled schema IDs and local `$ref`
registration. Validation enables no type coercion, default insertion or
additional-property removal and performs no runtime network schema fetch.
Successful validation returns a detached recursively frozen JSON-compatible
snapshot; invalid documents expose deterministic portable
`instancePath`/`keyword`/`schemaPath` issues, while trusted schema
initialization failures remain distinct and fail closed.

Portable `fixtures/policy-schema/` coverage includes the required valid
minimal/lease policies and negative defaultEffect, identity, metadata,
additional-property, required-rule-field, effect, uniqueness and lease
cases. Regression tests additionally cover input non-mutation, recursive
immutability, prototype safety, deterministic issue ordering and broken
trusted-schema configuration.

Dependency hygiene was tightened before acceptance: `@dsh-safe/policy-engine`
now exact-pins `ajv@8.20.0` and no longer declares unused `ajv-formats` at
runtime. The current CapabilityPolicy root reaches only
`defs.schema.json#/$defs/leaseRequest`, which has no `format` assertion; a
future normative root that reaches formatted definitions must add explicit
strict format semantics and new conformance evidence.

Exact-head evidence at `7b87c812...`:

- normal CI #260 / run `32603117802`: PASS;
- frozen install and 124-entry supply-chain policy: PASS;
- architecture/schema/schema-baseline/strict TypeScript: PASS;
- 27 test files / 294 tests: PASS;
- M4-002 validator tests: 6 PASS;
- M4-001 loader regressions: 18 PASS;
- JSON parser regressions: 9 PASS;
- oxlint: 0 warnings / 0 errors;
- Shared TCK packed artifact/external consumer boundary: PASS;
- exact Harness rc5 source-conformance #204 / run `32603117850`: PASS;
- Harness steps 6–11 all PASS.

`docs/acceptance/m4-002-acceptance-audit.md` records **M4-002 ACCEPTED AT
IMPLEMENTATION BOUNDARY**. Governance records must now reach their own
final exact-head dual-green state before M4-003 begins. M4-003 is the next
protocol-first gate only after that evidence; M4-004+ and M6 remain
unauthorized.

## 2026-08-23 — Accept M4-003 canonical resource normalization

M4-003 closed at implementation head
`edd91190eb4489e7b73a8cc7fde05140939cb36d` after protocol-first recovery of
the M1 resource model, precedence stage, schema surface, architecture
constraints and accepted provider seam.

Spec 0019 defines canonicalization as a structural, rejecting boundary,
not an operating-system path resolver. Exact resources retain
`scheme`/`locator`/optional opaque `providerIdentity`; policy selector
strings are parsed only at the first `://`. Accepted strings are preserved
exactly: no trim, Unicode normalization, case folding, URL decoding,
slash rewriting, dot-segment resolution, realpath, DNS, executable lookup
or secret dereference is performed by policy-engine.

The 4096 bound is defined in Unicode code points and is implemented with a
bounded `for...of` traversal. Portable hardening proves both BMP and astral
boundaries, including `😀 x 4096` PASS, `😀 x 4097` LIMIT, and `U+007F`
rejection. C0 controls fail closed.

Provider identity remains opaque. The normalizer never parses or
synthesizes provider tokens and never treats string-prefix relationships as
provider containment. Provider-backed filesystem identity/containment stays
behind the accepted Adapter/runtime provider seam.

Acceptance review also hardened runtime values that bypass JSON Schema:
inherited prototype fields cannot become authorization input, required
resource fields are read only as own properties, and an own
`providerIdentity: undefined` fails rather than being silently treated as
absent. Unexpected own fields remain fail-closed.

Language-independent fixtures contain 35 portable resource-normalization
cases. TypeScript additionally exercises two runtime-only prototype/own-
property cases. Exact implementation-head evidence at `edd91190...`:

- normal CI #275 / run `32604956296`: PASS;
- frozen install and 124-entry supply-chain policy: PASS;
- architecture boundaries / 16-schema shape / schema baseline: PASS;
- strict workspace TypeScript: PASS;
- 29 test files / 334 tests: PASS;
- M4-003 portable normalizer suite: 38 PASS;
- M4-003 runtime object-boundary suite: 2 PASS;
- oxlint: 0 warnings / 0 errors;
- Shared TCK packed artifact + external consumer: 44 assets PASS;
- exact Harness rc5 source-conformance #219 / run `32604956288`: PASS;
- Harness steps 6–11 all PASS.

`docs/acceptance/m4-003-acceptance-audit.md` records **M4-003 ACCEPTED AT
IMPLEMENTATION BOUNDARY**. The governance head recording this acceptance
must itself reach exact-head CI/Harness dual-green before M4-004 starts.
M4-005+ and M6 remain unauthorized.

## 2026-08-23 — Accept M4-004 deterministic rule ordering

M4-004 closed at implementation head
`69934dd62903b325b50e9f7b8df9849021e522b7` after protocol-first recovery of
Core §8.3, the deterministic precedence profile, M4-003's deferred wildcard
boundary and the current CapabilityPolicy priority schema.

Spec 0020 defines the portable v0.1 lexical pattern profile before
implementation: `/` is only a lexical hierarchy separator; `*` is a
single-segment wildcard; `**` matches zero or more complete segments and is
valid only as an entire segment. Matching is whole-locator anchored,
preserves empty segments and Unicode code points, and assigns no shell-glob,
regex or escape semantics to other punctuation.

Resource specificity is the deterministic tuple
`(literalCodePoints DESC, globstarCount ASC, starCount ASC)`. A rule with
multiple matching selectors uses its most-specific match. Optional priority
is comparison-time only, with absent priority equal to zero; specificity
always dominates priority. Equal structural keys remain one precedence band,
and Unicode code-point rule-id ordering inside a band is presentation only,
never a hidden authorization tie-breaker.

The reference implementation uses a custom iterative lexical matcher and
does not depend on a glob/regex/shell/path library. Provider identity remains
opaque and cannot change lexical match or specificity. Effect-looking runtime
fields do not affect M4-004 ordering, preserving the M4-005 boundary.

Portable fixtures contain 37 cases (22 pattern + 15 ordering). Exact
implementation-head evidence at `69934dd6...`:

- normal CI #291 / run `32607126915`: PASS;
- frozen install and 124-entry supply-chain policy: PASS;
- architecture boundaries / 16-schema shape / schema baseline: PASS;
- strict workspace TypeScript: PASS;
- 31 test files / 377 tests: PASS;
- M4-004 rule-ordering suite: 19 PASS;
- M4-004 resource-pattern suite: 24 PASS;
- oxlint: 0 warnings / 0 errors;
- Shared TCK packed artifact + external consumer: 44 assets PASS;
- exact Harness rc5 source-conformance #235 / run `32607126899`: PASS;
- Harness steps 6–11 all PASS.

`docs/acceptance/m4-004-acceptance-audit.md` records **M4-004 ACCEPTED AT
IMPLEMENTATION BOUNDARY**. The governance head recording this acceptance
must itself reach exact-head CI/Harness dual-green before M4-005 starts.
M4-006+ and M6 remain unauthorized.

## 2026-08-24 — Accept M4-005 deterministic effect resolution

M4-005 closed at implementation head
`81e09435f1c038205977e740f8ac11c4d1bab796` after protocol-first recovery of
Core §8.2–§8.3, the deterministic precedence profile, the accepted M4-004
structural-band contract and the roadmap separation from M4-006/M4-021.

Spec 0021 deliberately defines a narrow effect-resolution primitive rather
than a full PDP. Input consists only of rules whose full applicability has
already been proven upstream, represented by canonical M4-004 structural
bands plus an exact one-to-one effect binding set.

Accepted semantics are: any fully applicable explicit deny in any band wins
globally; otherwise only the highest structural band participates and
`ask > allow` inside that band. Empty applicable input remains
`NO_APPLICABLE_RULES`; M4-005 does not convert it to deny and therefore does
not implement M4-006 early.

Runtime inputs fail closed when bands are malformed or noncanonical, equal
structural keys are split, rule IDs are duplicated/noncanonical, effect
bindings are missing/extra/duplicated, effects are unknown, specificity is
unsafe or priority is out of range. Required fields must be own properties
and unexpected own fields are rejected.

Acceptance review additionally replaced input-sized `Array.from()` rule-ID
validation with an early-exit Unicode-code-point `for...of` traversal bounded
at 128 code points. Runtime tests cover inherited band/specificity/effect
fields, unexpected fields and a 129-astral-code-point rule ID.

M4-005 creates no CapabilityDecision, approval result, lease, guarantee,
receipt or enforcement claim. Subject resolution and full policy evaluation
remain M4-020/M4-021 responsibilities.

Exact implementation-head evidence at `81e09435...`:

- normal CI #304 / run `32684842763`: PASS;
- frozen install and 124-entry supply-chain policy: PASS;
- architecture boundaries / 16-schema shape / schema baseline: PASS;
- strict workspace TypeScript: PASS;
- 32 test files / 409 tests: PASS;
- M4-005 effect-resolution suite: 32 PASS;
- oxlint: 0 warnings / 0 errors on 104 files;
- Shared TCK packed artifact + external consumer: 44 assets PASS;
- exact Harness rc5 source-conformance #248 / run `32684842738`: PASS;
- Harness steps 6–11 all PASS.

`docs/acceptance/m4-005-acceptance-audit.md` records **M4-005 ACCEPTED AT
IMPLEMENTATION BOUNDARY**. The governance head recording this acceptance
must itself reach exact-head CI/Harness dual-green before M4-006 starts.
M4-007+, M4-020+ and M6 remain unauthorized by this gate.

## 2026-08-24 — Accept M4-006 defensive default deny

M4-006 closed at implementation head
`de614120fdbf5c210c3b4f823d215a9ea89916b5` after reconciling Core default-
deny semantics, deterministic precedence, M4-002's strict
`defaultEffect: deny` schema boundary and M4-005's explicit
`NO_APPLICABLE_RULES` result.

Spec 0022 keeps document validity and evaluator fail-closed behavior
separate. M4-002 still requires an explicit `defaultEffect` whose only
valid value is `deny`; M4-006 never inserts a default or accepts
`allow`/`ask` as schema-conforming configuration. If an internal runtime
path bypasses M4-002, missing or invalid default configuration returns a
distinct configuration-invalid result carrying mandatory fail-closed deny.

Normal M4-006 behavior preserves a valid resolved M4-005 deny/ask/allow
effect and converts only `NO_APPLICABLE_RULES` to the configured deny.
Malformed M4-005 state remains a distinct input-invalid fail-closed deny.
M4-006 produces no CapabilityDecision, receipt, approval, lease, guarantee
or Adapter-enforcement claim.

Acceptance review found and fixed two security-sensitive JavaScript
runtime boundaries even after intermediate heads were green. First, a
scalar default-effect argument erased whether the policy field was actually
present, so the final API consumes a presence-preserving policy-spec object
and rejects prototype-only `defaultEffect`. Second, an own-property check
followed by ordinary property access could execute accessors. The accepted
implementation reads authorization-relevant fields through own data-
property descriptors; accessor-backed `defaultEffect`, `status`, `effect`
and success discriminants are rejected without invoking getters, and
descriptor/proxy inspection failures fail closed.

Portable fixtures contain 20 cases; TypeScript runtime hardening raises the
M4-006 suite to 35 tests. Exact implementation-head evidence:

- normal CI #320 / run `32685942246`: PASS;
- frozen install and 124-entry supply-chain policy: PASS;
- architecture boundaries / 16-schema shape / schema baseline: PASS;
- strict workspace TypeScript: PASS;
- 33 test files / 444 tests: PASS;
- M4-006 default-deny suite: 35 PASS;
- oxlint: 0 warnings / 0 errors on 107 files;
- Shared TCK packed artifact + external consumer: 44 assets PASS;
- exact Harness rc5 source-conformance #264 / run `32685942253`: PASS;
- Harness steps 6–11 all PASS.

Scope from final M4-005 governance is limited to Spec 0022, one portable
fixture corpus and the default-deny TypeScript projection/tests/public
export. No schema, lockfile, Adapter, full-PDP, approval, lease, decision,
receipt, guarantee, classifier, plugin or M6 implementation changed.

`docs/acceptance/m4-006-acceptance-audit.md` records **M4-006 ACCEPTED AT
IMPLEMENTATION BOUNDARY**. The governance head recording this acceptance
must itself reach exact-head CI/Harness dual-green before M4-007 starts.
M4-008+, M4-020+ and M6 remain unauthorized by this gate.

## 2026-08-24 — Accept M4-007 deterministic policy effect explanation

Before M4-007 implementation began, the already accepted M2 and M3
milestone PRs were merged into `main` with merge commits
`52233e19c15504d5c5f77522bb4bf58a2d23c56f` and
`57430273e065be8d38807d67b175fa154c801d43`. This preserved the accepted
exact commit ancestry. PR #3 was retargeted directly to `main` without
rebasing, squashing or force-rewriting the M4 history.

M4-007 closed at implementation head
`1c8bc9ef50a6c680a930814821267e76d79357ac` after recovering the existing
CapabilityDecision explanation surface, M4-004 presentation-only rule-ID
ordering, M4-005's fully-applicable effect-resolution boundary and
M4-006's defensive default-deny distinction.

Spec 0023 deliberately defines a narrow effect-explanation primitive,
not a full PDP or CapabilityDecision constructor. It consumes only
fully-applicable M4-004 bands, exact M4-005 effect bindings and the
presence-preserving policy spec required by M4-006, then reuses
`resolveApplicableRuleEffects()` and `finalizeDefaultDeny()` rather than
defining a second precedence/default-deny algorithm.

Explanation bases are `EXPLICIT_DENY`, `HIGHEST_BAND_ASK`,
`HIGHEST_BAND_ALLOW`, `DEFAULT_DENY` and `FAIL_CLOSED`.
`contributingRuleIds` is explicitly not
`CapabilityDecision.matchedRuleRefs`: explicit deny reports every
fully-applicable deny contributor, ask/allow report only the
effect-contributing highest-band rules, and default/fail-closed deny
report no synthetic rule IDs. Unicode code-point rule-ID order is
presentation only and never authorization precedence.

The TypeScript boundary materializes JavaScript bands/effects through
own data-property descriptors before M4-005. Accessor-backed band,
specificity, effect-binding and rule-ID element fields are rejected
without invoking getters; sparse/named/symbol arrays and revoked
bands/effects proxies fail explicitly. Policy-spec accessors/revoked
proxies remain M4-006-owned and preserve its configuration-invalid
fail-closed behavior. Success/failure outputs and detached contributor
lists are frozen, and caller inputs are not mutated.

The first implementation head `ab01ff52...` was already dual-green, but
acceptance review deliberately added five more security regressions
before accepting the final head. Portable fixtures contain 18 cases;
the final M4-007 runtime suite contains 33 tests.

Exact accepted implementation-head evidence:

- normal CI #329 / run `32716573950`: PASS;
- frozen install and 124-entry supply-chain policy: PASS;
- architecture boundaries / 16-schema shape / schema baseline: PASS;
- strict workspace TypeScript: PASS;
- 34 test files / 477 tests: PASS;
- M4-007 explanation suite: 33 PASS;
- oxlint: 0 warnings / 0 errors on 110 files;
- Shared TCK packed artifact + external consumer: 44 assets PASS;
- exact Harness rc5 source-conformance #271 / run `32716573857`: PASS;
- Harness steps 6–11 all PASS.

Scope is limited to Spec 0023, one portable fixture corpus, the
policy-effect explanation TypeScript projection/tests/public export,
acceptance record and handoff/governance state. No dependency,
lockfile, schema, protocol CapabilityDecision, Adapter, full-PDP,
approval, lease, receipt/provenance, guarantee, classifier, plugin or
M6 implementation changed.

`docs/acceptance/m4-007-acceptance-audit.md` records **M4-007 ACCEPTED
AT IMPLEMENTATION BOUNDARY**. The governance head recording this
acceptance must itself reach exact-head CI/Harness dual-green before
M4-008 begins. M4-020+ and M6 remain unauthorized by this gate.


## 2026-08-25 — Accept M4-008 deterministic CapabilityPolicy diagnostics

M4-008 closed at the implementation boundary on
`2aa8250f6c98b9853497481c08e584df866863ff` after protocol-first definition of
a non-authoritative CapabilityPolicy diagnostics layer in Spec 0024.

The accepted diagnostics boundary consumes only an already M4-002-validated
policy snapshot. It never changes schema validity, resource normalization,
structural ordering, effect resolution, defensive default deny, or M4-007
explanation semantics. It also does not implement subject resolution, full PDP
matching, lease semantics, approval routing, guarantee assignment, decision
receipts, provenance, provider containment, or M4-009 hot reload.

Portable diagnostics are deterministic and privacy-preserving: stable severity
and code plus RFC 6901 source paths only. v0.1 reports accepted M4-003 selector
normalization failures, M4-004 resource-pattern syntax failures, exact duplicate
rule-ID warnings, redundant deny priority, redundant zero priority on allow/ask,
and empty rule sets. Output is capped at 256 findings and signals truncation
without making presentation order authorization precedence.

The implementation reuses the accepted M4-004 pattern compiler through a
package-internal syntax-validation seam rather than maintaining a second `**`
parser. Runtime hardening reads only required own data properties, rejects
accessor-backed/sparse/named/symbol arrays and descriptor/proxy failures, does
not execute deferred capability/subject/constraint/lease getters, does not
mutate caller input, and returns frozen detached results.

Protocol review found and corrected two fixture defects before production code
was accepted: a missing control-code locator case was added and the future-field
lease example was corrected from nonexistent `ttlSeconds` to schema-defined
`ttlMs`. A temporary whole-file JSON reformat was rejected rather than accepted
as governance noise.

The first implementation head `d87ad0bb...` was already dual-green, but
acceptance review strengthened evidence further. Portable cases are now run
through the real M4-001 loader and M4-002 schema validator before diagnostics,
and additional inherited-field and revoked-proxy regressions were added.

Final accepted implementation evidence at `2aa8250f...`:

- normal CI #335 / run `32798605219`: PASS;
- exact Harness rc5 source-conformance #277 / run `32798605222`: PASS;
- frozen install / 124-entry supply-chain policy: PASS;
- architecture boundaries / 16-schema shape / schema baseline: PASS;
- strict workspace TypeScript: PASS;
- 35 test files / 510 tests: PASS;
- M4-008 diagnostics suite: 33 PASS;
- oxlint: 0 warnings / 0 errors on 113 files;
- Shared TCK packed artifact + external consumer: 44 assets PASS;
- Harness compatibility steps 6–11: all PASS.

Implementation acceptance was recorded on
`202283944ae6736dc324f1251e9546b20af5019d`; that acceptance head also reached
normal CI #336 / run `32814355683` PASS and exact Harness rc5 source-conformance
#278 / run `32814355684` PASS before this final governance record was prepared.

`docs/acceptance/m4-008-acceptance-audit.md` records **M4-008 ACCEPTED AT
IMPLEMENTATION BOUNDARY**. This governance head must itself reach exact-head
normal CI + Harness rc5 source-conformance dual-green before M4-009 is
authorized. M4-020+ and M6 remain unauthorized by this gate.


## 2026-08-25 — Close M4-008 governance and authorize M4-009

Final M4-008 governance head
`71046abef4568668ba9e3448b496430b5c48ebb7` reached exact-head dual-green:

- normal CI #337 / run `32814874559`: PASS;
- exact Harness rc5 source-conformance #279 / run `32814874566`: PASS.

Therefore M4-008 governance is CLOSED and M4-009 P1 policy hot reload with
atomic swap is formally authorized. M4-009 must begin protocol-first;
M4-010+, M4-020+ and M6 remain unauthorized by this gate.

## 2026-08-25 — Accept M4-009 atomic CapabilityPolicy hot reload

M4-009 closed at accepted implementation head
`76dd50e731df617c1fafc1929be306f73458b7d4` after protocol-first definition
of a synchronous single-isolate policy activation store in Spec 0025.

The reload path preserves existing authority boundaries: M4-001 owns document
format/loading, M4-002 owns schema validity, M4-003 owns selector normalization,
and M4-004 owns lexical pattern syntax. M4-008 diagnostics remain advisory and
cannot silently become activation blockers. No full PDP, tool classifier,
approval, lease, receipt/provenance, guarantee, watcher, distributed config or
Adapter-enforcement semantics were pulled into M4-009.

The accepted store publishes exactly one immutable active-record reference. A
candidate is fully loaded, schema-validated and resource-preflighted before a
complete frozen next record is constructed; the final reference assignment is
the single-isolate linearization point. Rejected REQUEST, LOAD, SCHEMA,
RESOURCE and STATE candidates retain the exact last-known-good record reference
and epoch. Old ACTIVE handles remain frozen and stable across later swaps.

Runtime hardening rejects accessor/inherited/extra/symbol/revoked request
shapes without executing `format` or `source` getters. Candidate source text is
not retained as store state or copied into failure output. Epoch exhaustion
fails without publication. The reduced-epoch test seam remains package-internal
and is not exported from the package root.

Exact accepted implementation evidence at `76dd50e7...`:

- normal CI #346 / run `32822338122`: PASS;
- exact Harness rc5 source-conformance #288 / run `32822338113`: PASS;
- frozen install / 124-entry supply-chain policy: PASS;
- architecture / 16-schema shape / schema baseline: PASS;
- strict workspace TypeScript: PASS;
- 37 test files / 538 tests: PASS;
- primary M4-009 suite: 25 PASS;
- green-after-review hardening: 3 PASS;
- oxlint: 0 warnings / 0 errors on 117 files;
- Shared TCK packed artifact + external consumer: 44 assets PASS;
- Harness steps 6–11: all PASS.

Implementation acceptance was recorded at
`ae6c53d5f23f9b666f7d1dbc258756d52a6eb0c1`; that acceptance head itself
reached normal CI #347 / run `32822755197` PASS and exact Harness rc5
source-conformance #289 / run `32822755212` PASS before this governance
record was prepared.

`docs/acceptance/m4-009-acceptance-audit.md` records M4-009 accepted at
implementation boundary. This final governance head must itself reach exact-head
normal CI + Harness dual-green before any M4-010+ gate is authorized. M4-020+
and M6 remain unauthorized by this gate.

## 2026-08-27 — Accept M4-010 built-in filesystem tool classification

M4-010 is accepted at implementation boundary on
`4be1fffc452358acf6a1af4dff5d849ea7868ec8` after protocol-first definition in
Spec 0026 and a 22-case portable fixture corpus.

The accepted classifier remains deliberately narrower than authorization. It
maps only the exact pinned built-in filesystem tool surface to conservative
`fs.*` effect envelopes plus unresolved operands. Canonical `fs.*` vocabulary
remains protocol authority; DeepSeek Harness `0.1.0-rc.5` at
`47f943859bef60e4160492346772ded9b24f765a` is compatibility evidence only.

Accepted mappings cover `read`, `read_image`, `write`, `edit`, `glob`, `grep`
and `str_replace_editor`. Provider target identity, canonicalization,
containment, symlink/junction behavior and execution are explicitly outside this
Gate. Omitted `glob`/`grep` paths remain unresolved `EXECUTION_ROOT`; no `/`,
`.`, host cwd or Adapter scope is guessed. `NOT_APPLICABLE` for unknown exact
tools is not allow/deny and does not pull M4-013 forward.

Runtime hardening is fail closed: inherited/accessor-backed security fields,
arrays, symbol substitution and proxy descriptor failures cannot manufacture
authority. Unknown tools do not inspect hostile arguments. Successful results
are detached and deeply frozen.

The first implementation head
`80d29a7a3a4a8b714a29b950181c54fe2cb3eb2e` passed Harness #292 but exact
current-head CI #350 failed strict TypeScript with TS2307 because the new broker
consumer imported protocol declarations exposed from `dist/` while workspace
no-emit typecheck did not build that dependency. The correction preserved the
protocol dependency and strictness: capability-broker now builds protocol types
before its own no-emit typecheck. Frozen lockfile and security gates were not
weakened.

Exact accepted implementation evidence at `4be1fffc...`:

- normal CI #351 / run `33036068127`: PASS;
- exact Harness rc5 source-conformance #293 / run `33036068108`: PASS;
- frozen install / 124-entry supply-chain policy: PASS;
- architecture / 16-schema shape / schema baseline: PASS;
- strict workspace TypeScript: PASS;
- 38 test files / 572 tests: PASS;
- M4-010 classifier suite: 34 PASS;
- oxlint: 0 warnings / 0 errors on 119 files;
- Shared TCK packed artifact + external non-workspace consumer: 44 assets PASS;
- Harness steps 6–11: all PASS.

Implementation acceptance was recorded at
`1222c9f903e1d6be42633f7e63e8a0d54cbaff2c`; that acceptance-record head itself
reached normal CI #352 / run `33036276956` PASS and exact Harness rc5
source-conformance #294 / run `33036276974` PASS before this final governance
record was prepared.

`docs/acceptance/m4-010-acceptance-audit.md` records M4-010 accepted at the
implementation boundary. This governance head is intentionally limited to
HISTORY, roadmap and CURRENT state. It must itself reach exact-head normal CI +
Harness rc5 dual-green before M4-011 is authorized. M4-012+, M4-020+ and M6
remain unauthorized by this Gate.

## 2026-08-28 — Accept M4-011 built-in shell tool classification

M4-011 is accepted at implementation boundary on
`c8a5318220622e977e042b1585dcf183efff39e7` after protocol-first definition in
Spec 0027 and a 22-case portable fixture corpus.

The accepted classifier recognizes only exact `bash` and `pwsh` and maps each
call to exactly one `process.exec` requirement. It deliberately does not infer
`process.resolve`, `process.terminal`, `process.signal`, or nested filesystem,
network or secret authority from shell text. Command text is opaque and
preserved exactly after a non-blank own-data-property check.

Workdir remains unresolved evidence: explicit non-blank `workdir` is
`ARGUMENT_WORKDIR`, while omission is `EXECUTION_ROOT`; no host cwd, Adapter
scope, provider root or path canonicalization is invented. Background intent is
limited to `run_in_background`: omitted/false is `FOREGROUND`, true is
`BACKGROUND`, and explicit non-boolean input fails closed.

Runtime hardening uses bounded own-data-property descriptor reads in deterministic
order (`command`, `workdir`, `run_in_background`). Accessors, inherited
security-relevant values, arrays and proxy descriptor failures cannot manufacture
authority. Unknown tools do not inspect hostile arguments, and successful results
are detached and deeply frozen.

M4-011 also introduced package-internal classifier modularization:
`tool-classifier/hostile-input.ts`, `builtin-filesystem.ts`, and
`builtin-shell.ts`, while retaining the original filesystem classifier import as
a compatibility facade. This is not a registry and does not pull M4-014 forward.

Exact accepted implementation evidence at `c8a53182...`:

- normal CI #356 / run `33116459841`: PASS;
- exact Harness rc5 source-conformance #298 / run `33116459834`: PASS;
- frozen install / 124-entry supply-chain policy: PASS;
- architecture / 16-schema shape / schema baseline: PASS;
- strict workspace TypeScript: PASS;
- 39 test files / 610 tests: PASS;
- M4-011 shell classifier suite: 38 PASS;
- M4-010 filesystem classifier suite: 34 PASS;
- oxlint: 0 warnings / 0 errors on 123 files;
- Shared TCK packed artifact + external non-workspace consumer: 44 assets PASS;
- Harness steps 6–11: all PASS.

Implementation acceptance was recorded through audit commit
`d3aeb2e9625c307c4b7f1d0042dcf6dfe50ab2d8` and acceptance-record head
`2d95d5b6904f24da226cd09e6e70a6a92507e27a`. That exact acceptance-record head
reached normal CI #358 / run `33117086290` PASS and exact Harness rc5
source-conformance #300 / run `33117086251` PASS before this final governance
record was prepared.

`docs/acceptance/m4-011-acceptance-audit.md` records M4-011 accepted at the
implementation boundary. This governance head is intentionally limited to
HISTORY, roadmap and CURRENT state. It must itself reach exact-head normal CI +
Harness rc5 dual-green before M4-012 is authorized. M4-013+, M4-020+ and M6
remain unauthorized by this Gate.

## 2026-08-28 — Accept M4-012 MCP ToolAnnotations advisory metadata classification

M4-012 is accepted at the implementation boundary on
`debfce009c4d082aed6cd62646943e36242396e1` after protocol-first definition in
Spec 0028 and a 19-case portable corpus under MCP `2025-11-25`.

The classifier normalizes only the four standard boolean ToolAnnotations hints
as immutable evidence fixed to `authority: ADVISORY_ONLY` and
`trust: UNVERIFIED_SERVER`. It cannot create capabilities, authorize execution,
establish trust, skip PDP/approval/lease/resource resolution, parse MCP public
names, or invent the missing rc5 annotations-retention seam. `title` and unknown
fields are ignored without enumeration; explicit/default provenance and
read-only applicability are preserved.

Acceptance review found and fixed a real hostile-runtime gap after the initial
implementation was already green: `Array.isArray()` throws on revoked Proxies.
The shared hostile-input primitive now distinguishes record/invalid/unreadable,
so revoked metadata/annotations fail closed with
`MCP_TOOL_METADATA_UNREADABLE` rather than escaping a host exception. Tests also
cover `annotations: undefined`, all four known-hint `undefined`/accessor cases,
outer/title getters, `ownKeys` traps, descriptor failures at every normative
inspection position, deterministic order, detachment and recursive immutability.

Exact accepted implementation evidence at `debfce00...`:

- normal CI #366 / run `33136379895`: PASS;
- exact Harness rc5 source-conformance #308 / run `33136379910`: PASS;
- frozen install / supply-chain policy 124 entries: PASS;
- architecture / 16-schema shape / schema baseline / strict TypeScript: PASS;
- 40 test files / 654 tests: PASS;
- M4-012 suite: 44 PASS;
- M4-011 shell: 38 PASS;
- M4-010 filesystem: 34 PASS;
- oxlint 125 files: 0 warnings / 0 errors;
- packed Shared TCK + external non-workspace consumer: 44 assets PASS;
- Harness steps 6–11: PASS.

Acceptance audit commit is
`10f385990b2c3aff0d3bef902cafe404c47dba61`. Acceptance-record head is
`18360fb464d66b7e1c427e23a4f6750144f1d2c3`, which reached normal CI #368 /
run `33149738632` PASS and exact Harness rc5 source-conformance #310 /
run `33149738626` PASS before this final governance record was prepared.

`docs/acceptance/m4-012-acceptance-audit.md` records M4-012 accepted at the
implementation boundary. This governance head is intentionally limited to
HISTORY, roadmap and CURRENT state. It must itself reach exact-head normal CI +
Harness rc5 dual-green before M4-013 is authorized. M4-014+, M4-020+ and M6
remain unauthorized by this Gate.
