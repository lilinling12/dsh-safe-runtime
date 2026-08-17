# M2 Status — DeepSeek Harness Adapter Baseline

Status: IN PROGRESS
Branch: `feat/m2-harness-adapter`
Harness baseline: `0.1.0-rc.5` (`47f943859bef60e4160492346772ded9b24f765a`)

## Completed in this branch

- pinned an exact tested-source baseline;
- documented the public Harness seams used by safe-runtime;
- defined a machine-readable feature matrix;
- defined runtime-independent adapter ports;
- defined normalized lifecycle events;
- established process-local/durable correlation rules;
- added deterministic durable-event and final-tool-result normalization;
- added fail-closed behavior for unsupported adapter features and unknown turn-end semantics;
- added rc5 conformance unit fixtures for requested-vs-observed semantics.

## Deliberately not claimed complete

The following remain before M2 can be marked complete:

1. real Cordis binding against published rc5 packages;
2. lifecycle integration tests booting a minimal Harness composition;
3. approval binding integration test;
4. `agent/turn-stopping` steering integration test;
5. filesystem/subprocess feature probes;
6. disposal/unload conformance;
7. generated `pnpm-lock.yaml` and a full dependency-backed CI run.

## Current validation limitation

The execution environment used to prepare this branch cannot resolve external package registries or GitHub over the container network. Therefore dependency installation and a fresh lockfile generation were not fabricated or bypassed. The repository workflow still intentionally uses `pnpm install --frozen-lockfile`.

Before this PR becomes ready for review, a network-capable environment MUST:

```text
corepack enable
pnpm install
pnpm check:all
```

and commit the generated lockfile. The CI workflow MUST NOT be weakened to compensate for a missing lockfile.

## Acceptance boundary

M2 remains `IN PROGRESS` until the real Harness rc5 integration tests prove that the normalized semantics match the public runtime behavior. Passing pure adapter-contract tests alone is insufficient for `TCK_COMPLETE`.
