# Current Engineering Handoff

> Operational snapshot only. This document is non-normative and MUST be
> reconciled with live GitHub state before code changes.

## Snapshot

- Recorded at: `2026-08-17T18:43:00+08:00`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M2 — DeepSeek Harness Adapter Baseline`
- Pull request: `#1 — feat(adapter-dsh): establish M2 Harness adapter baseline`
- PR state at snapshot: `OPEN / DRAFT`
- Branch: `feat/m2-harness-adapter`
- Last verified implementation head before this handoff maintenance commit:
  `4d089dedc1d15c71267474ae166360b5bf9821a9`
- Base branch: `main`
- M0/M1 base commit: `f88b8783623c8cd15be42329077953044b9fdd3d`

The handoff commit itself advances the branch head. A resumed session MUST query
GitHub for the actual current head rather than treating the SHA above as the
latest branch SHA.

## Exact upstream compatibility baseline

DeepSeek Harness source contract baseline:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
```

This source pin is authoritative for the current M2 conformance work. Do not
silently replace it with an npm `rc.6` package or another upstream commit merely
to make installation/tests pass. If the baseline changes, treat that as an
explicit compatibility decision and update the compatibility record.

The npm distribution baseline remains `distribution-blocked` because the exact
`@deepseek-ai/dsh-session@0.1.0-rc.5` package is not available. Exact-source CI
therefore builds the pinned upstream source and deterministically projects its
`@deepseek-ai/*` workspace packages into both the Harness checkout and
safe-runtime consumer roots.

## Current quality-gate snapshot

At implementation head `4d089dedc1d15c71267474ae166360b5bf9821a9`:

| Gate | State | Evidence |
| --- | --- | --- |
| Normal repository CI | **PASS** | GitHub Actions run `32022049143` (#38) |
| Build pinned Harness public type surface | **PASS** | source-conformance run `32022049099`, job `95363595323`, step 6 |
| Frozen safe-runtime dependency install | **PASS** | step 7 |
| Exact pinned workspace projection | **PASS** | step 8 |
| Projection idempotence | **PASS** | step 9 |
| Exact rc5 binding/source-conformance TypeScript check | **PASS** | step 10 |
| Real rc5 runtime conformance | **PASS** | step 11 |
| Live `tools/result` authoritative final-outcome conformance | **PASS** | included in source-conformance step 11 at this head |

The previous TypeScript and Cordis lifecycle blockers are resolved. Runtime
conformance now executes successfully against the exact pinned Harness source.

## Recently closed blocker: Cordis injected-consumer lifecycle assertion

The diagnostic workflow exposed one real runtime failure in
`harness-runtime.conformance.ts`:

```text
creates service consumers through explicit Cordis injection
Error: cannot get property "parent" without inject
```

Pinned Cordis source showed that Context property reads are mediated by the
injection/tracing proxy, while `ctx.inject()` directly returns the child Fiber.
The fixture now preserves its stable `inject(): Context` API for ordinary
consumers and exposes `injectWithFiber()` only for structural lifecycle tests.
Ownership assertions use the direct Fiber handle rather than round-tripping
through a proxied Context property. No adapter or protocol semantics were
changed.

## Authoritative final tool-result evidence

Source conformance now includes a real ToolRuntime pipeline test proving that
adapter evidence comes from live `tools/result`, not from tool intent or the
body's initial return value.

The test:

1. executes a real agent-scoped `ToolRuntime.execute()` call;
2. lets the tool body return `body-value`;
3. changes the accepted model-facing content in `tools/post-execute` to
   `post-final`;
4. lets Harness materialize and emit `tools/result`;
5. verifies the adapter emits exactly one `tool.completed` whose digest equals
   the final ToolRuntime result digest.

The Agent fixture satisfies the complete public `Agent` interface and uses real
pinned-Harness `Session` and `Inbox` objects; it does not use `as any` to bypass
the public type contract.

## M2 work already established

The branch now contains, among other M2 work:

- Harness adapter contract and feature matrix;
- runtime-independent adapter ports/events;
- fail-closed unsupported-feature handling;
- requested-vs-observed tool normalization;
- explicit exact outcome classification rather than substring security guesses;
- ordered asynchronous observer dispatch;
- public-service-based rc5 binding without coupling protocol semantics to
  `dsh-agent-loop`;
- reproducible `pnpm-lock.yaml` and frozen install gate;
- strict pnpm lifecycle build allowlist rather than global build-script enable;
- strict JSON Schema fixes without weakening AJV strictness;
- deterministic exact-source Harness workspace projection with conflict and
  duplicate detection;
- ToolRuntime policy / Approval / turn-stopping / disposal source-conformance;
- Cordis child-Fiber lifecycle and injected-consumer ownership conformance;
- exact-source TypeScript checking against the pinned upstream source;
- live `tools/result` authoritative final-outcome runtime conformance;
- CI failure diagnostics that preserve the original Vitest exit status while
  surfacing bounded test diagnostics through GitHub annotations/step summary.

## Current gate / active blocker

The previous dual-green prerequisite is satisfied on the last verified
implementation head. M2 remains **IN PROGRESS** and PR #1 remains Draft because
the next required gate is now:

**M2 — Filesystem / Subprocess Provider Probe**

This is a source-backed provider-seam/feature probe only. It must not become a
workspace transaction implementation merely because provider APIs are now being
inspected.

## Next allowed work

Use only the exact pinned upstream source to establish and record:

### Filesystem seam

- public filesystem service/provider package names and exports;
- `FsTarget` identity and containment semantics;
- `processPath()` behavior and trust boundary;
- `fileUrl()` behavior;
- `contains()` behavior, including lexical/canonical/symlink implications;
- `FsVersion` freshness / compare-and-swap semantics;
- which operations are actually provider-mediated;
- path traversal and symlink behavior that can be proven from source/tests.

### Subprocess seam

- public subprocess service/provider package names and exports;
- cwd and environment propagation;
- relationship between subprocess execution and filesystem targets/providers;
- whether a spawned process can directly access host filesystem paths outside
  provider-mediated APIs;
- network behavior when no process-isolation provider is active;
- cancellation / process-tree termination semantics relevant to enforcement.

### Sandbox / guarantee classification

- sandbox provider file-effect modes exposed by the pinned baseline;
- where a provider enforces a resource boundary versus merely offering a seam;
- whether any observed behavior justifies `provider-enforced` or
  `process-isolated` classification;
- explicit unsupported/unknown cases; do not infer stronger guarantees from
  package names or configuration alone.

After the provider probe, reconcile the feature matrix/status documentation,
then perform the M2 Acceptance Audit. Do not mark M2 Ready before that audit.

## Roadmap boundary after M2

Do not jump directly from partial M2 work to Capability Broker implementation.
The intended sequence remains:

```text
M2 Harness Adapter Baseline
  -> M3 Shared / language-neutral TCK
  -> M4 Capability Broker
```

## Protocol and security invariants to preserve

- Protocol namespace: `safe-runtime.dev/v1alpha1`.
- DeepSeek Harness is an adapter, not the protocol domain model.
- Reference implementation does not reverse-define normative semantics.
- Transaction v1 scope is `workspace-filesystem-effects` only.
- Tool-level/provider-level mediation is not process isolation.
- Commit means crash-recoverable, conflict-checked multi-file commit; it does
  not claim a globally atomic transaction.
- Capability is action/capability + resource, not merely a tool name.
- Default deny and fail-closed approval.
- Delegation must attenuate authority.
- Acceptance and Evidence/AVP remain separate concerns.
- Assistant text claiming success is a Claim, not Evidence.
- Unknown/future Harness semantics must fail explicitly rather than silently map
  to success.
- Do not weaken Schema, TCK, validators, TypeScript checks, conformance tests,
  frozen lockfile behavior, or security guarantees to make CI pass.

## Resume instruction

A new session should begin by reading this file and
`docs/handoff/README.md`, then query live GitHub state. Continue from the
**Current gate / active blocker** unless live evidence proves that the gate has
changed.
