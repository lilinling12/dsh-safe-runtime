# M2 Status — DeepSeek Harness Adapter Baseline

Status: IN PROGRESS — ACCEPTANCE AUDIT  
Branch: `feat/m2-harness-adapter`  
Source contract baseline: DeepSeek Harness `0.1.0-rc.5` at `47f943859bef60e4160492346772ded9b24f765a`

## Verified implementation state

The M2 branch has established and CI-verified:

- exact source-contract pin for the first Harness compatibility baseline;
- machine-readable adapter feature matrix;
- runtime-independent normalized events and adapter ports;
- fail-closed feature detection and unsupported-feature error vocabulary;
- process-local versus durable correlation rules;
- exact/correlated tool outcome classification without substring security inference;
- real rc5 Cordis binding through public services rather than the concrete agent loop;
- real ToolRuntime policy, approval, turn-stopping, lifecycle/disposal conformance;
- authoritative live `tools/result` final-outcome conformance;
- reproducible frozen installs and deterministic projection of the exact pinned
  upstream workspace packages;
- exact-source TypeScript conformance against the upstream-built public type surface;
- source-backed filesystem/subprocess/sandbox provider probe and compile contract.

## Current validation evidence

At implementation/documentation head
`39eaaada8186ad7555456d76aeed647d1a3d7e5f`:

| Gate | Result | Evidence |
| --- | --- | --- |
| Normal repository CI | **PASS** | run `32022994277` (#41) |
| Exact Harness build | **PASS** | source-conformance run `32022994262` (#23), job `95366391189`, step 6 |
| Frozen safe-runtime install | **PASS** | step 7 |
| Exact workspace projection | **PASS** | step 8 |
| Projection idempotence | **PASS** | step 9 |
| Exact-source adapter/provider TypeScript contract | **PASS** | step 10 |
| Real rc5 runtime conformance | **PASS** | step 11 |

The provider contract added in M2 is therefore checked against the exact pinned
upstream source rather than against a guessed or newer npm package family.

## Distribution reality

The source baseline remains distinct from npm distribution support. The exact
rc5 source declares the relevant package family as `0.1.0-rc.5`, while the npm
registry does not provide a complete matching rc5 package family (notably the
required session package).

Safe-runtime therefore keeps:

- **source contract baseline** — exact upstream commit `47f943...`;
- **npm distribution baseline** — `distribution-blocked` until separately proven.

M2 MUST NOT mix rc5 source semantics with newer npm artifacts merely to satisfy
package resolution.

## Provider probe result

Detailed evidence is recorded in:

`docs/compatibility/deepseek-harness-0.1.0-rc.5-provider-probe.md`

The key security conclusions are:

- `FsTargetKey` and `FsVersion` are provider-owned opaque tokens;
- `processPath()` is an explicit bridge from filesystem target identity into
  process/OS path space;
- `fs-local` `cwd` is a resolution base, **not** a containment boundary;
- local target identity is realpath-derived and symlink aliases converge;
- `fs-sandbox` confines mutation calls only; reads pass through;
- `fs-sandbox` is a trusted-code policy fence with residual TOCTOU, not a
  kernel/process isolation boundary;
- `subprocess-local` uses OS paths directly and does not route a child's file
  access through `ctx.fs`;
- managed subprocess lifetime is not filesystem/network confinement;
- sandbox mode vocabulary covers file effects only;
- sandbox `full | partial` is provider-reported completeness for that declared
  scope, and an operator-configured runner may report `full` without the built-in
  functional probe;
- no provider fact in this probe proves universal network confinement or the
  safe-runtime `process-isolated` guarantee level.

These facts prevent a future workspace transaction implementation from assuming
that intercepting `ctx.fs` also intercepts shell/subprocess writes.

## Current gate

**M2 Acceptance Audit** is now the active gate.

M2 remains `IN PROGRESS` and PR #1 remains Draft until the audit reconciles:

1. normative `specs/0003-deepseek-harness-adapter-contract.md` acceptance criteria;
2. the older, broader M2 roadmap tracking items;
3. `docs/tck-security-acceptance.md` adapter/security expectations;
4. actual source-conformance and normal CI evidence;
5. explicit supported/deferred items, without silently marking unimplemented P1
   work or future shared-TCK work complete.

The audit must report real blockers instead of weakening or reinterpreting a
requirement to make M2 appear complete.

## Acceptance boundary

M2 must not be marked Ready merely because current CI is green. The acceptance
audit still needs to answer, at minimum:

- whether every normative Spec 0003 criterion has direct evidence;
- whether unsupported-feature behavior has adequate negative test evidence;
- whether roadmap FS/subprocess ports mean the current compatibility/guarantee
  ports or require a stronger operational abstraction;
- how the roadmap's `previous supported version` condition applies when rc5 is
  the first accepted baseline;
- how the roadmap's event-order TCK condition relates to M3's explicitly
  language-neutral shared TCK milestone;
- whether any remaining P0 item is truly required to close M2.

Until those questions are resolved by evidence and repository governance, M2 is
not Ready.
