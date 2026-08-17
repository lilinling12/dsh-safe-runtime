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
