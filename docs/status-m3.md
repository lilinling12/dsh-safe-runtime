# M3 Status — Shared TCK Foundation

Status: **IN PROGRESS — FOUNDATION CONTRACT REVIEW**  
Branch: `feat/m3-shared-tck-foundation`  
Draft PR: `#2 — feat(testkit): establish M3 shared TCK foundation`  
Stacked base: `feat/m2-harness-adapter@6a9c64155ec6c376908e64d70f2b50d5b8de1285`

## Purpose

M3 establishes a language-independent TCK before more complex runtime implementation. TypeScript testkit code is an implementation of the shared contract, never its semantic authority.

## Current foundation scope

The current branch implements the first three M3 foundation items for review:

- `M3-001` — language-independent fixture envelope;
- `M3-002` — runner lifecycle and explicit `PASS / FAIL / UNSUPPORTED / ERROR` distinction;
- `M3-003` — explicit deterministic seed and logical-clock inputs without host wall-clock dependence.

Normative/portable artifacts:

- `specs/0004-shared-tck-foundation.md`;
- `schemas/v1alpha1/tck-fixture.schema.json`;
- `fixtures/tck/valid/foundation-auth.json`;
- negative fixtures for missing deterministic clock data and unknown top-level fields.

Implementation-side evidence:

- `packages/testkit/src/tck-contract.ts` is a TypeScript projection of the spec/schema;
- `packages/testkit/src/tck-foundation.test.ts` verifies valid/invalid envelopes and prevents concrete Harness package paths from entering the shared schema;
- schema index, schema compatibility baseline and fixture manifest include the new contract.

## Determinism boundary

The fixture envelope carries:

```text
seed
clock.startUnixMs
clock.tickMs
```

The TCK does not read the host wall clock to decide expected behavior. The exact pseudo-random algorithm is intentionally **not** promoted into portable protocol semantics yet; fixtures that require a particular random sequence must carry the generated values explicitly until a shared PRNG algorithm is adopted normatively.

## Explicitly not implemented yet

The current foundation does not implement:

- `M3-004` fake approval;
- `M3-005` fake tool runtime;
- `M3-006` fake filesystem/subprocess;
- `M3-007` fault injection;
- M3 Adapter DSH lifecycle/order cases;
- M4 Capability Broker;
- M6 Workspace Transaction runtime.

No later milestone behavior may be inferred from the generic `stimulus` / `expect` JSON fields. Their semantics belong to profile-specific TCK contracts.

## Quality gates

A foundation head is acceptable only when:

- `pnpm install --frozen-lockfile` passes;
- `pnpm check:all` passes with existing TypeScript strictness unchanged;
- Draft 2020-12 schema shape checks pass;
- schema compatibility baseline passes;
- positive and negative TCK fixtures pass their declared schema outcomes;
- the shared fixture schema remains independent of `@deepseek-ai/*` concrete package paths;
- PR #2 remains reviewable and does not contain unrelated M2/M4/M6 implementation changes.

## Next gate

Once M3-001/002/003 are green and recorded, continue with the fake-runtime foundation beginning at `M3-004` and `M3-005`. These fakes must expose only behavior required by normative TCK scenarios and must not become a second protocol definition.
