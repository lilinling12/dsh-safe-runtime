# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK remain semantic authority.

## Snapshot

- Recorded at: `2026-08-18`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M3 — Shared TCK Foundation`
- Pull request: `#2 — feat(testkit): establish M3 shared TCK foundation`
- PR state: `OPEN / DRAFT`
- Branch: `feat/m3-shared-tck-foundation`
- Stacked base: `feat/m2-harness-adapter@6a9c64155ec6c376908e64d70f2b50d5b8de1285`
- M2 acceptance: **ACCEPTED**

PR #2 is intentionally stacked on the accepted M2 branch. M3 changes MUST NOT
be added back into PR #1 because that would mutate the accepted M2 evidence line.

## M2 accepted baseline carried forward

DeepSeek Harness remains an adapter compatibility baseline, never protocol authority:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

Accepted M2 head `6a9c64155ec6c376908e64d70f2b50d5b8de1285` is dual-green:

- normal CI #71: PASS;
- exact Harness rc5 source-conformance #53: PASS.

`docs/acceptance/m2-acceptance-audit.md` remains the M2 acceptance authority.

## Current M3 gate

**M3-001 / M3-002 / M3-003 — shared language-independent TCK foundation.**

The current branch establishes, in governance order:

1. `specs/0004-shared-tck-foundation.md`;
2. `schemas/v1alpha1/tck-fixture.schema.json`;
3. positive and fail-closed negative `fixtures/tck/*` cases;
4. schema index / compatibility baseline / fixture manifest registration;
5. `@dsh-safe/testkit` TypeScript projection and conformance tests.

The shared fixture envelope is ordinary JSON and contains:

```text
apiVersion
id
profile
description
determinism
stimulus
expect
```

Deterministic inputs are explicit:

```text
seed
clock.startUnixMs
clock.tickMs
```

The runner contract distinguishes at least:

```text
PASS
FAIL
UNSUPPORTED
ERROR
```

`UNSUPPORTED` and `ERROR` MUST NOT be coerced to `PASS`.

## Current validation evidence

Foundation implementation head `9610b2bc7935ab60e050b7f4998862c82699d17a`:

| Gate | State | Evidence |
| --- | --- | --- |
| Normal CI | **PASS** | run #73 |
| Frozen install | **PASS** | normal CI |
| `pnpm check:all` | **PASS** | normal CI |
| Draft 2020-12 schema shape | **PASS** | normal CI |
| Schema compatibility baseline | **PASS** | normal CI |
| Shared TCK positive fixture | **PASS** | testkit conformance |
| Shared TCK negative fixtures | **PASS** | testkit conformance |
| Harness concrete-path exclusion | **PASS** | testkit conformance |

An earlier foundation head `bcee18375c63c736559b9540c942aaea09e936c4`
also passed normal CI #72. The fixture manifest was then reformatted back to the
repository's review-friendly style so PR #2 contains only four deletions instead
of unrelated formatting churn; head `9610b2bc...` verifies that cleanup.

This handoff/status maintenance advances the branch beyond the verified
implementation head above. A resumed session MUST query the exact live PR #2
head and its current Actions before declaring the foundation complete.

## Boundaries that remain enforced

- Spec/Schema/fixtures define the shared contract before TypeScript implementation.
- `packages/testkit` is one implementation; it does not define portable semantics.
- shared TCK fixtures MUST remain consumable by a non-TypeScript implementation.
- shared schema MUST NOT contain concrete `@deepseek-ai/*` package paths.
- no host wall-clock or ambient randomness may decide a fixture result.
- unknown fixture versions/profiles/semantics fail explicitly.
- existing M2 adapter tests are evidence inputs, not the M3 language-neutral TCK.
- do not weaken TypeScript strictness, schemas, compatibility baseline, validators,
  tests, frozen installs, or security claims for CI.
- do not implement M4 Capability Broker or M6 Workspace Transaction early.

## Deferred M3 work

The current foundation does **not** yet implement:

- `M3-004 P0` fake approval;
- `M3-005 P0` fake tool runtime;
- `M3-006 P0` fake filesystem/subprocess;
- `M3-007 P0` fault injection interface;
- `M3-010..016` Adapter DSH shared TCK scenarios;
- `M3-017 P1` replay reconciliation.

The generic `stimulus` and `expect` values are opaque JSON at the envelope layer.
Their business semantics MUST be introduced by profile-specific normative TCK
contracts, not inferred from the current TypeScript testkit.

## Planning maintenance still required

`docs/roadmap.md` is stale in its M2 checkboxes and M2 DoD wording. When editing
it, preserve these accepted boundaries:

- mark evidence-complete M2 P0 items done;
- keep `M2-017`, `M2-025`, and `M2-033` P1 work deferred unless separately implemented;
- do not invent normalized `step.ended`; Spec 0003's M2 minimum vocabulary defines
  `step.started`;
- the language-neutral Event Order TCK belongs to M3, not retroactively to M2;
- rc5 is the first accepted Harness baseline, so there was no previous accepted
  baseline to test for first-baseline M2 acceptance.

Roadmap maintenance is planning synchronization only and MUST NOT redefine the
normative specs.

## Next allowed gate

After the exact current PR #2 head is green and M3-001/002/003 are recorded as
complete, continue inside M3 with the fake-runtime foundation:

1. `M3-004` fake approval;
2. `M3-005` fake tool runtime;
3. `M3-006` fake filesystem/subprocess;
4. `M3-007` fault injection interface.

These fakes must expose only the minimum behavior required by normative TCK
scenarios and must not become an alternative protocol definition.

## Resume instruction

Read `docs/handoff/README.md`, this file, PR #2 live metadata, and workflow runs
for its exact head. If the exact head is green, finish roadmap synchronization
and continue from the M3 fake-runtime foundation. If it fails, inspect the real
current-head diagnostic and fix it without weakening any gate.
