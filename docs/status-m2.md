# M2 Status — DeepSeek Harness Adapter Baseline

Status: IN PROGRESS  
Branch: `feat/m2-harness-adapter`  
Source contract baseline: DeepSeek Harness `0.1.0-rc.5` at `47f943859bef60e4160492346772ded9b24f765a`

## Completed in this branch

- pinned an exact Harness source-contract baseline;
- documented the public Harness seams used by safe-runtime;
- defined a machine-readable feature matrix;
- defined runtime-independent adapter ports and normalized lifecycle events;
- established process-local/durable correlation rules;
- implemented deterministic durable-event and authoritative final-tool-result normalization;
- removed substring-based security outcome inference in favor of exact/correlated facts;
- made monotonic guard semantics synchronous and fail closed;
- added ordered, failure-contained runtime-event dispatch;
- added the rc5 Cordis binding without importing the concrete agent-loop implementation;
- generated and committed a pnpm 11.7.0 lockfile in a network-capable GitHub runner;
- fixed CI bootstrap ordering without weakening `--frozen-lockfile`;
- enabled only the reviewed `esbuild` dependency lifecycle script through pnpm 11 `allowBuilds`;
- passed normal repository CI: architecture boundaries, 15 schema checks, schema baseline, TypeScript, 43 tests, and lint;
- added a separate source-pinned Harness conformance workflow that checks out the exact upstream rc5 commit.

## Distribution reality

The official rc5 GitHub source declares the DSH package family as `0.1.0-rc.5`, but the npm registry does not currently provide a matching `@deepseek-ai/dsh-session@0.1.0-rc.5` artifact while exposing a newer `next` tag.

Safe-runtime therefore separates two concepts:

- **source contract baseline** — exact upstream commit `47f943...`; this is the M2 semantic compatibility target;
- **npm distribution baseline** — currently not accepted as reproducible for the rc5 family.

M2 MUST NOT mix an rc5 source contract with unrelated newer npm artifacts merely to make installation succeed. The real binding is validated against the exact upstream source checkout instead.

## Deliberately not claimed complete

The following remain before M2 can be marked complete:

1. source-pinned rc5 binding typecheck must pass in CI;
2. minimal Harness boot/lifecycle integration tests;
3. approval binding integration tests;
4. `agent/turn-stopping` steering integration tests;
5. filesystem/subprocess feature probes;
6. disposal/unload conformance;
7. an M2 acceptance audit that reconciles source facts, normalized events, and test evidence.

## Current validation evidence

The normal repository CI now proves a reproducible non-Harness build using:

```text
Node 22.19.0
pnpm 11.7.0
pnpm install --frozen-lockfile
pnpm check:all
```

`pnpm check:all` currently covers architecture boundaries, schema shape, schema compatibility hashes, strict TypeScript, unit/schema conformance tests, and lint.

The separate `Harness rc5 source conformance` workflow intentionally owns the binding check because the npm rc5 distribution is incomplete. It checks out the exact upstream source baseline and must fail rather than silently fall forward to another Harness version.

## Acceptance boundary

M2 remains `IN PROGRESS` until real source-pinned Harness integration tests prove that the normalized semantics match the public runtime behavior. Passing pure adapter-contract tests or the normal repository CI alone is insufficient for M2 acceptance.
