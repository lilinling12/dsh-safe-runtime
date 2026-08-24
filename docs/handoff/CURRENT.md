# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK and accepted exact-head evidence
> remain semantic authority.

## Snapshot

- Recorded at: `2026-08-21`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M3 — Shared TCK Foundation (ACCEPTED)`
- Pull request: `#2 — feat(testkit): establish M3 shared TCK foundation`
- PR state at acceptance closure: `OPEN / DRAFT`
- Branch: `feat/m3-shared-tck-foundation`
- Stacked base: `feat/m2-harness-adapter@6a9c64155ec6c376908e64d70f2b50d5b8de1285`
- M2 acceptance: **ACCEPTED**
- M3 acceptance: **ACCEPTED**
- M3 acceptance record: `docs/acceptance/m3-acceptance-audit.md`
- Accepted M3 remediation implementation head: `e6522a18760268b56b09f9ac5d9c822671c41666`
- Acceptance-record commit: `37ac802df729f2a5f9f3b96082aeea6082e6b8b5`
- Current next gate: **M4-001 P0 — Capability Broker YAML/JSON loader, protocol/spec first**

Live GitHub state always overrides this file. PR #2 remains intentionally stacked
on the accepted M2 branch. M3 acceptance does not authorize skipping ahead within
M4 and does not authorize M6 Workspace Transaction work.

## Accepted compatibility baseline

DeepSeek Harness remains an Adapter compatibility target, never protocol authority:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

M2 acceptance authority remains `docs/acceptance/m2-acceptance-audit.md`.
M3 acceptance authority is `docs/acceptance/m3-acceptance-audit.md`.

## M3 final status

All currently numbered M3 gates are complete and accepted:

```text
M3-001  language-independent fixture format
M3-002  shared runner contract
M3-003  deterministic seed / logical clock
M3-004  deterministic fake approval
M3-005  deterministic fake tool runtime
M3-006  deterministic fake filesystem / subprocess execution world
M3-007  deterministic fault injection
M3-010  Adapter DSH turn lifecycle Shared TCK
M3-011  Adapter DSH tool ordering Shared TCK
M3-012  denied tool call never enters body Shared TCK
M3-013  authoritative final-result mapping Shared TCK
M3-014  approval-unavailable Shared TCK
M3-015  cancellation Shared TCK
M3-016  disposal Shared TCK
M3-017  replay reconciliation Shared TCK
```

There is no M3-018 gate in the current roadmap.

### M3 Definition of Done

All three M3 DoD requirements now have direct evidence:

1. **Independent publication — PASS.** `@dsh-safe/testkit` has a package-local
   build, explicit exports/files, canonical generated TCK assets, real tarball
   inspection and normal-CI gating.
2. **External dummy consumer — PASS.** A generated consumer outside the
   repository/workspace installs the same-run `protocol.tgz` and `testkit.tgz`
   with npm 10.9.3 in offline mode, imports only installed testkit public exports,
   loads all 44 registered assets, and exercises PASS/FAIL/ERROR without Adapter
   or Reference Runtime internals.
3. **No TypeScript-only fixture semantics — PASS.** Portable TCK fixtures remain
   JSON/schema-defined; TypeScript is a projection, not the fixture authority.

## Final M3 acceptance evidence

Accepted remediation implementation head:

```text
e6522a18760268b56b09f9ac5d9c822671c41666
```

Exact-head normal CI:

- CI #218 / run `32482908193`: **PASS**;
- `pnpm install --frozen-lockfile`: **PASS**;
- architecture boundaries: **PASS**;
- schema shape: **PASS** (`16 schemas`);
- schema compatibility baseline: **PASS**;
- strict TypeScript typecheck: **PASS**;
- tests: **PASS** (`24 files / 261 tests`);
- oxlint: **PASS** (`0 warnings / 0 errors`);
- actual protocol/testkit tarball build and inspection: **PASS**;
- external non-workspace offline dummy consumer: **PASS**;
- installed TCK assets: **44**;
- dummy implementation PASS/FAIL/ERROR behavior: **PASS**.

Exact-head DeepSeek Harness compatibility evidence:

- Harness rc5 source-conformance #177 / run `32482908210`: **PASS**;
- exact baseline checkout `47f943859bef60e4160492346772ded9b24f765a`: **PASS**;
- pinned Harness public type-surface build: **PASS**;
- reproducible safe-runtime install: **PASS**;
- exact workspace projection: **PASS**;
- projection idempotence: **PASS**;
- exact pinned binding typecheck: **PASS**;
- real rc5 runtime conformance: **PASS**.

The Harness result is compatibility evidence only. The accepted M3 protocol/TCK
semantics continue to come from repository specs, schemas and portable fixtures.

## M3 package-boundary remediation record

The acceptance audit originally identified two real P0 blockers:

```text
M3-A1 — Publishable Shared TCK artifact
M3-A2 — External dummy consumer conformance
```

They were closed without weakening existing gates.

### M3-A1

The final package boundary proves the actual generated `.tgz` content rather than
a package-manager dry-run prediction. Required public `dist` files, manifest,
fixture schema and all registered TCK fixtures are present. Source files,
source-conformance internals, node_modules, build cache, temporary staging and test
sources are rejected from the artifact boundary.

Generated package assets are derived from canonical repository fixtures/schemas
and checked before consumption; they are not an independent semantic source of
truth.

### M3-A2

The final accepted consumer is created under the OS temporary directory outside
the repository. It intentionally does **not** create a `pnpm-workspace.yaml` and
therefore is not accepted through workspace linking.

Repository build/pack remains pinned to pnpm 11.7.0. External-consumer installation
uses npm 10.9.3 with:

```text
--offline
--ignore-scripts
--package-lock=false
--no-audit
--no-fund
```

Both local tarballs are declared as direct file dependencies. npm installs exactly
those same-run artifacts and resolves the testkit protocol dependency from the
installed local protocol package. Registry availability cannot mask a missing
publication dependency.

The consumer additionally asserts that `@dsh-safe/testkit` resolves from its own
installed `node_modules`, not from repository source paths.

## Boundaries that remain enforced

- Spec/Schema/fixtures define shared semantics before implementation.
- `packages/testkit` is one implementation/projection; it does not define portable
  semantics.
- Shared TCK fixtures must remain consumable by a non-TypeScript implementation.
- DeepSeek Harness is an Adapter and must not define protocol/core semantics.
- Shared contracts must not leak concrete Harness package paths.
- No host wall-clock or ambient randomness may decide a fixture result.
- Unknown versions/profiles/operations/semantics fail explicitly.
- Do not weaken TypeScript strictness, schemas, compatibility baseline,
  validators, conformance tests, frozen installs, architecture/security gates, or
  security claims for CI.
- M6 Workspace Transaction semantics remain out of scope.

## Current gate — M4-001 P0

M3 acceptance authorizes entry into M4, but only at the first uncompleted M4 gate:

```text
M4-001 P0 — YAML/JSON loader
```

The next engineering work must remain protocol-first. Before production loader
implementation, determine and document the normative M4 policy-document contract
needed by M4-001. Reuse existing M1 Capability semantics where they are already
normative; do not silently redefine them in loader code.

Do not pull forward M4-002+ behavior merely for convenience. In particular:

- validation semantics belong to their explicit schema/validation gate;
- canonical resource normalization and deterministic rule ordering remain their
  own later gates;
- deny/ask/allow and default-deny behavior must not be invented by the parser;
- DeepSeek Harness behavior must not define Capability Broker policy syntax or
  semantics.

## Resume instruction

On the next work session:

1. read `docs/handoff/README.md` and this file;
2. fetch PR #2 live state, branch head and exact-head workflow results;
3. live GitHub evidence overrides this snapshot;
4. if the latest governance head is not green, inspect that exact job/step/log and
   repair it without weakening any gate;
5. otherwise continue only with **M4-001 P0** from its protocol/spec boundary;
6. do not start M4-002+ or M6 work early.
