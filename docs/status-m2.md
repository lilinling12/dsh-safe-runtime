# M2 Status — DeepSeek Harness Adapter Baseline

Status: **ACCEPTED**  
Branch: `feat/m2-harness-adapter`  
Accepted head: `6a9c64155ec6c376908e64d70f2b50d5b8de1285`  
Source contract baseline: DeepSeek Harness `0.1.0-rc.5` at `47f943859bef60e4160492346772ded9b24f765a`

## Acceptance record

The authoritative M2 acceptance review is:

`docs/acceptance/m2-acceptance-audit.md`

M2 was accepted only after all identified P0 blockers were closed with direct evidence:

- completion steering enforces the caller-defined budget and fails before Harness steering when exhausted;
- the adapter exposes a runtime-independent sidecar evidence/correlation boundary without persisting process-local execution tokens;
- filesystem and subprocess ports are operational while preserving opaque provider identity and refusing to overclaim isolation;
- exact pinned-source reconnaissance records public subagent/workflow seams and explicit non-guarantees without implementing deferred portable lineage semantics.

Roadmap `M2-017`, `M2-025`, and `M2-033` remain P1 work and were not silently promoted into M2 P0 acceptance requirements.

## Final validation evidence

Accepted documentation/handoff head `6a9c64155ec6c376908e64d70f2b50d5b8de1285` is dual-green:

| Gate | Result | Evidence |
| --- | --- | --- |
| Normal repository CI | **PASS** | run #71 |
| Frozen safe-runtime install | **PASS** | normal CI |
| `pnpm check:all` | **PASS** | normal CI |
| Exact Harness source conformance | **PASS** | run #53 |
| Pinned upstream build | **PASS** | source-conformance |
| Frozen safe-runtime install in source gate | **PASS** | source-conformance |
| Exact workspace projection | **PASS** | source-conformance |
| Projection idempotence | **PASS** | source-conformance |
| Exact-source TypeScript/provider contract | **PASS** | source-conformance |
| Real rc5 runtime conformance | **PASS** | source-conformance |

The exact rc5 source, not a newer npm artifact family, remains the semantic compatibility baseline.

## Compatibility and security conclusions

M2 establishes an adapter boundary, not protocol authority for DeepSeek Harness. In particular:

- `tool/call` is intent; live `tools/result` is the authoritative final outcome;
- unknown required adapter semantics fail closed;
- `ctx.tools.restrict()` is visibility composition, not authorization;
- filesystem/provider mediation is not process isolation;
- local subprocess file effects do not automatically traverse `ctx.fs`;
- workflow worker threads are not a security boundary;
- Harness subagent/workflow run ids, sequence values, provider names, phases and session metadata are compatibility evidence, not portable safe-runtime identifiers;
- `M2-017 P1` subagent lineage normalization remains deferred.

## Distribution reality

The source contract and npm distribution claims remain separate:

```text
source baseline:       0.1.0-rc.5 @ 47f943859bef60e4160492346772ded9b24f765a
npm distribution:      distribution-blocked
```

M2 MUST NOT mix rc5 source semantics with a newer npm package family merely to make dependency resolution pass.

## Milestone boundary

M2 acceptance authorizes M3 Shared TCK Foundation. It does **not** imply that the M3 language-neutral Event Order TCK was completed inside M2.

PR #1 remaining Draft is a review/merge decision separate from the semantic M2 acceptance decision. M3 work is maintained on a separate stacked branch so later TCK changes do not mutate the accepted M2 evidence line.
