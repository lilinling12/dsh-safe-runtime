# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before changes;
> normative specs/schemas/TCK and accepted exact-head evidence remain authority.

## Snapshot

- Recorded at: `2026-09-11`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `R1 — DeepSeek Harness Plugin Alpha Release`
- Active PR: `#3 — feat(policy): begin M4 capability broker`
- Branch: `feat/m4-capability-broker`
- Base: `main@57430273e065be8d38807d67b175fa154c801d43`
- R1-001 P0 Alpha readiness reconciliation: **GOVERNANCE CLOSED**
- R1-002 P0 public DeepSeek Adapter API: **GOVERNANCE CLOSED**
- R1-003 P0 DeepSeek plugin/bootstrap integration: **IMPLEMENTATION ACCEPTED / GOVERNANCE CLOSURE CANDIDATE**
- R1-004 P0 publishable Adapter package: **NOT AUTHORIZED UNTIL THIS GOVERNANCE EXACT HEAD IS DUAL-GREEN**
- R1-005+: **NOT AUTHORIZED by the current Gate**
- M5-003+: **PAUSED until R1 Alpha release governance closes**
- npm/registry publish and GitHub Release: **NOT AUTHORIZED**
- PR #3 merge / Ready-for-review transition: **NOT AUTHORIZED without explicit user authorization**

Live GitHub state overrides this snapshot.

## R1-003 accepted authority chain

R1-002 predecessor governance authority:

```text
3a5e8e780a09c6764eb4d966c4a42348817e0780
CI #677 / run 34394030179: PASS
Harness #619 / run 34394030180: PASS
Harness step 10 pinned-source typecheck: PASS
Harness step 11 real rc5 runtime conformance: PASS
```

R1-003 protocol-first authority:

```text
fa89e3993c812aafa0325fab6b33dc339d7323dc
CI #678 / run 34425239915: PASS
Harness #620 / run 34425239924: PASS
```

Normative artifacts:

```text
specs/0057-r1-dsh-plugin-bootstrap-integration.md
fixtures/dsh-plugin-bootstrap/cases.json
profile: R1-003_DSH_PLUGIN_BOOTSTRAP_V1
cases: DPB-001..DPB-032
```

Final reviewed implementation/conformance head:

```text
bbe3f18625de565564e57073599efd66baafd826
CI #681 / run 34445638834: PASS
Harness #623 / run 34445638813: PASS
Harness step 10 pinned-source typecheck: PASS
Harness step 11 real rc5 runtime conformance: PASS
```

Acceptance audit:

```text
docs/acceptance/r1-003-plugin-bootstrap-integration.md
head: fea37f8574585813f6c6c264a9d2c548286a6a41
CI #682 / run 34446201887: PASS
Harness #624 / run 34446201886: PASS
Harness step 10 pinned-source typecheck: PASS
Harness step 11 real rc5 runtime conformance: PASS
```

The implementation line descends from the accepted protocol-first head. No
protocol authority was rebased, squashed or force-rewritten.

## Accepted R1-003 public bootstrap boundary

The package root adds exactly one bootstrap factory and its narrowly required
public types:

```text
createDshRc5Plugin(options): DshRc5Plugin
DshRc5Plugin
DshRc5PluginOptions
DshRc5PluginPolicy
```

The plugin is installed through the native Cordis seam:

```text
const plugin = createDshRc5Plugin(options)
const fiber = await ctx.plugin(plugin)
```

It reuses the accepted R1-002 Adapter surface rather than deep-importing the
package-private binding or creating another runtime subsystem.

The programmatic Alpha policy modes remain exactly:

```text
DENY_ALL
HANDLER(handler, optional monotonicGuard)
```

Omitted policy is `DENY_ALL`.

## Fail-closed and approval behavior

`DENY_ALL` installs both an Adapter tool-policy DENY and a monotonic-guard DENY
using the same stable internal reason:

```text
safe-runtime plugin default deny
```

Both `toolsPreExecute` and `toolsMonotonicGuard` are required for successful
DENY_ALL activation. Missing required support fails activation explicitly; the
plugin does not downgrade silently to a reorderable-only listener.

HANDLER mode installs the caller-supplied policy handler exactly once. An optional
monotonic guard is installed only when explicitly supplied. The plugin does not
derive a synchronous guard from an async policy handler and does not turn ASK into
a hard guard.

A reached ASK remains owned by the native Harness path:

```text
Adapter ASK -> ToolRuntime.serviceAsk() -> ctx.approval.request(...)
```

The plugin does not automatically call Adapter `requestApproval()` for the same
ToolRuntime ASK and does not add another approval provider/state machine.
Agent-less ASK remains fail closed.

## Lifecycle ownership

Each mount constructs exactly one R1-002 Adapter. Failed post-construction
activation awaits Adapter rollback before propagating failure. Successful Cordis
Fiber cleanup awaits `adapter.dispose()`.

Therefore:

```text
await fiber.dispose()
```

settles only after plugin-owned Adapter teardown. Root Context, sessions, agents,
services, independent listeners and independent approval providers remain
caller-owned. Disposed plugin handlers do not survive a later remount, and no
process-global singleton is introduced.

## Preserved security and package boundaries

R1-003 does not:

- claim arbitrary in-process plugin sandboxing or process isolation;
- claim complete direct Node filesystem/process/network/secret mediation;
- invent provider/resource identity or containment;
- map unresolved `EXECUTION_ROOT` / `ARGUMENT_WORKDIR` into guessed authority;
- automatically compose a serialized CapabilityPolicy into a complete PEP;
- add a second approval/policy/runtime/lifecycle subsystem;
- expose R1-002 filesystem/subprocess internal ports;
- remove `private: true`;
- finalize package `exports`, `types`, `files`, `engines`, license/repository or
  peer-dependency publication metadata;
- claim bare `cordis.yml` package loading is release-ready;
- perform R1-005 external tarball smoke;
- define R1-006 compatibility/install ranges;
- implement R1-007 release/provenance automation;
- resume M5-003+;
- publish to npm/registry or create a GitHub Release;
- authorize PR #3 merge or Ready-for-review transition.

Pinned `0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a`
remains Adapter compatibility evidence only and does not redefine portable
safe-runtime protocol semantics.

## Governance-closure delta boundary

The final R1-003 governance transition is restricted to exactly:

```text
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md   # append-only
docs/roadmap.md           # only R1-003 acceptance marker/details
```

This transition must not change production code, source-conformance tests,
Spec/corpus/Schema, Shared TCK, dependency/lockfile state, Harness baseline or
workflow, package publication metadata, R1-004+ implementation, M5-003+ work,
registry state, GitHub Release state or PR merge/readiness state.

## Next allowed action

Verify the resulting governance exact head through both normal CI and exact
pinned Harness rc5 source-conformance.

The same SHA must pass:

```text
normal CI
Harness pinned-source TypeScript step 10
Harness real rc5 runtime conformance step 11
```

Only after that same exact governance SHA is dual-green may repository state be
interpreted as:

```text
R1-003 GOVERNANCE CLOSED
R1-004 P0 PUBLISHABLE PACKAGE AUTHORIZED FOR PROTOCOL-FIRST / DESIGN-FIRST WORK
R1-005+ NOT AUTHORIZED
M5-003+ PAUSED
PR #3 REMAINS OPEN / DRAFT / UNMERGED
```

Until that evidence exists, R1-004 repository modification remains unauthorized.
