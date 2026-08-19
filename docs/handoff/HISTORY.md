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

A further real intermediate conformance test was then added for authoritative
ToolRuntime result behavior. The exact accepted evidence remains recorded in the
repository's M2 acceptance artifacts.

## 2026-08-17T19:10:00+08:00 — Complete portable rc5 provider probe

The Filesystem / Subprocess Provider Probe closed on head
`39eaaada8186ad7555456d76aeed647d1a3d7e5f`.

Evidence:

- normal CI run `32022994277` (#41): PASS;
- exact source-conformance run `32022994262` (#23): PASS;
- job `95366391189` steps 6–11 all passed.

The probe records security-critical negative facts: local FS cwd is not
containment, `fs-sandbox` is mutation-only provider fencing rather than general
isolation, local subprocess filesystem effects bypass `ctx.fs`, and provider
metadata is not by itself environment attestation.

## 2026-08-17T20:49:00+08:00 — Acceptance audit closes B1/B2 remediation

The repository-backed M2 Acceptance Audit was recorded in
`docs/acceptance/m2-acceptance-audit.md`. P0-B1 completion steering budget and
P0-B2 sidecar correlation were remediated without weakening TypeScript,
validation, frozen-install, or security requirements.

Final evidence at `e53d13ba4531c9e315a0fd2e3f999cbf463d595c`:

- normal CI run `32031495534` / job `95392301947`: PASS;
- exact rc5 source-conformance run `32031495546` / job `95392301956`: PASS.

## 2026-08-17T20:55:14+08:00 — Close B3 operational provider ports

P0-B3 closed on implementation head
`c5d42ac67cff40102de5b5e6a3aea459e646d7ba` with dual-green evidence.

The filesystem/subprocess adapter ports preserve opaque provider identities,
explicit bounded process behavior, provider mediation without claiming process
or kernel isolation, and the accepted same-execution-world/non-mediation
boundary.

Final evidence:

- normal CI `32032290309`: PASS;
- exact rc5 source-conformance `32032290352`: PASS.

## 2026-08-18 — Close B4 and accept M2 P0 baseline

P0-B4 exact-source reconnaissance was completed against the pinned Harness
commit `47f943859bef60e4160492346772ded9b24f765a`.

The compatibility note records subagent/workflow public seams and explicit
non-guarantees without promoting Harness ids, phases, provider names, or worker
threads into portable safe-runtime semantics.

`docs/acceptance/m2-acceptance-audit.md` records:

- P0-B1: PASS;
- P0-B2: PASS;
- P0-B3: PASS;
- P0-B4: PASS;
- M2: **ACCEPTED**;
- M2-017 P1 lineage mapping: DEFERRED.

## 2026-08-18T17:22:00+08:00 — Enter M3 Shared TCK Foundation

Final M2 head `6a9c64155ec6c376908e64d70f2b50d5b8de1285` was rechecked before crossing the
milestone boundary:

- normal CI #71: PASS;
- exact Harness rc5 source-conformance #53: PASS.

M3 moved to branch `feat/m3-shared-tck-foundation` and Draft PR #2, stacked on
the accepted M2 head. Spec 0004, the generic TCK fixture schema, portable
fixtures, compatibility registration, and TypeScript projection established the
language-independent foundation.

## 2026-08-18T18:10:00+08:00 — Close M3-004 fake approval

M3-004 closed on implementation head
`cc59a5db1045346792d823e56557d78438dd37c1` in protocol-/fixture-first order.
Portable decisions are exactly `ALLOWED_ONCE`, `REJECTED`, `CANCELLED`, and
`UNAVAILABLE`; script exhaustion is explicit and does not become an approval
decision. CI #79 PASS.

## 2026-08-19T09:18:00+08:00 — Close M3-005 deterministic fake tool runtime

M3-005 closed on implementation head
`d5cc341594e79e7203d2203052db27f37984dfa7`.

- portable outcomes are exactly `RESULT`, `ERROR`, and `DENIED`;
- request intent, body entry, and final outcome remain distinct;
- `DENIED` never enters the fake body;
- script exhaustion is explicit;
- no real filesystem, process, shell, network, environment, or Harness concrete
  dependency is introduced.

CI #81 passed with 73 repository tests and oxlint 0 warnings / 0 errors.

## 2026-08-19T09:41:00+08:00 — Close M3-006 deterministic fake execution world

M3-006 closed on verified implementation head
`de5d4e0cc7099cfa35d91211f81b87f2784ca5df`.

- explicit fake filesystem facts are not derived from path text;
- subprocess resolution/execution is deterministic and scripted;
- same `worldRef` does not imply subprocess file effects traverse the fake
  filesystem provider;
- no process/kernel isolation or workspace transaction guarantee is claimed;
- unexpected requests/exhaustion do not consume or fabricate evidence.

An earlier functionally green head had one lint warning; it was not accepted as
quality complete. CI #86 is the lint-clean baseline with 81 tests and oxlint 0/0.

## 2026-08-19T10:02:00+08:00 — Close M3-007 deterministic fault injection interface

M3-007 closed on verified implementation head
`494e08de5b1304ef039c5a5462f083b7e76b8a29`.

- Spec 0008 defines fault injection as deterministic test-control data only;
- directives are exactly `NO_FAULT` and `INJECT_FAULT`;
- injected faults are inert descriptors and do not automatically throw, crash,
  delay, signal, retry, roll back, or rewrite ordinary outcomes;
- probes use explicit declared points and deterministic exact FIFO matching;
- malformed/unknown/unexpected/exhausted cases fail without consuming state or
  fabricating observations;
- direct calls reject non-portable JSON state;
- existing fake tool/execution-world services receive no hidden fault hooks.

Final exact-head evidence:

- CI #91 / job `95931880009`: PASS;
- 11 test files / 89 tests PASS;
- oxlint 0 warnings / 0 errors.

## 2026-08-19T10:18:00+08:00 — Close M3-010 Adapter DSH turn lifecycle Shared TCK

M3-010 closed on verified implementation head
`728f44e73ac61dba1b40d570f2458bd456d79bbc` with both normal CI and the exact
pinned Harness rc5 source-conformance gate green.

- `specs/0009-m3-adapter-dsh-turn-lifecycle-tck.md` defines the portable
  `ADAPTER_DSH` turn-lifecycle profile before its TypeScript projection;
- five portable fixtures cover completed, cancelled, blocked, failed, and
  unsupported terminal reason behavior;
- normalized lifecycle evidence remains exactly the already-authorized
  `turn.started`, `step.started`, and `turn.ended` subset for this gate;
- real Harness `step/end` remains durable source evidence but maps explicitly to
  `NO_EVENT`; no normalized `step.ended` is invented;
- terminal mapping preserves the accepted M2 behavior and unknown reasons fail
  closed as `UNSUPPORTED_HARNESS_TURN_END_REASON` at the exact source ordinal;
- fixture validation rejects malformed lifecycle brackets, cross-turn evidence,
  unknown fields, non-increasing sequence data, cyclic/non-finite/exotic values,
  sparse arrays, and named/symbol array properties before implementation
  invocation;
- source order is explicit evidence; timestamps are not used to reorder or infer
  lifecycle facts;
- generic testkit imports no Adapter DSH or Harness concrete types;
- adapter conformance reuses existing production normalization rather than
  redefining mapping semantics;
- exact rc5 runtime conformance writes real `Session.append()` turn/step source
  events and proves the live upstream seam produces the expected normalized
  lifecycle without fabricating `step.ended`.

Quality review found and fixed a sparse-array direct-call validation gap. A later
functional head was fully green but the new regression test itself produced one
oxlint `no-array-constructor` warning; that warning was treated as a quality
defect and fixed without changing semantics. Final head `728f44e...` is the
lint-clean evidence line.

Final exact-head evidence:

- normal CI #99 / job `95936172958`: PASS;
- exact Harness rc5 source-conformance #58 / job `95936172462`: PASS;
- frozen install: PASS;
- supply-chain lockfile policy: PASS (123 entries);
- architecture boundaries: PASS;
- schema shape: PASS (16 schemas);
- schema compatibility baseline: PASS;
- TypeScript typecheck: PASS;
- M3-010 portable profile tests: 18 PASS;
- portable JSON boundary regressions: 2 PASS;
- Adapter DSH lifecycle TCK: 6 PASS;
- repository tests: 14 files / 115 tests PASS;
- oxlint: **0 warnings / 0 errors**.

No schema, validator, compatibility baseline, TypeScript strictness, frozen
install, architecture rule, adapter normalization, TCK expectation, or security
guarantee was weakened.

The next and only newly authorized gate is **M3-011 P0 — Adapter DSH tool
ordering Shared TCK**. It must remain an ordering-evidence gate and must not pull
M3-012 denied-call body semantics or M3-013 final-result-authority semantics
forward.