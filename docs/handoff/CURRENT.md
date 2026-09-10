# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before changes;
> normative specs/schemas/TCK and accepted exact-head evidence remain authority.

## Snapshot

- Recorded at: `2026-09-10`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `R1 — DeepSeek Harness Plugin Alpha Release`
- Active PR: `#3 — feat(policy): begin M4 capability broker`
- Branch: `feat/m4-capability-broker`
- Base: `main@57430273e065be8d38807d67b175fa154c801d43`
- R1-001 P0 Alpha readiness reconciliation: **GOVERNANCE CLOSED**
- R1-002 P0 public DeepSeek Adapter API: **GOVERNANCE CLOSED**
- R1-003 P0 DeepSeek plugin/bootstrap integration: **PROTOCOL-FIRST CANDIDATE / IMPLEMENTATION NOT AUTHORIZED UNTIL THIS EXACT HEAD IS DUAL-GREEN**
- R1-004+: **NOT AUTHORIZED by the current Gate**
- M5-003+: **PAUSED until R1 Alpha release governance closes**
- npm/registry publish and GitHub Release: **NOT AUTHORIZED**
- PR #3 merge: **NOT AUTHORIZED without explicit user authorization**

Live GitHub state overrides this snapshot.

## R1-002 closure authority

R1-002 final governance exact head:

```text
3a5e8e780a09c6764eb4d966c4a42348817e0780
CI #677 / run 34394030179: PASS
Harness #619 / run 34394030180: PASS
Harness step 10 pinned-source typecheck: PASS
Harness step 11 real rc5 runtime conformance: PASS
```

The exact governance delta from accepted audit head
`97d7904d2fe1ac7c54bbbb0b81ac931ee58e8117` was one commit and exactly three
governance files: CURRENT, append-only HISTORY and only the R1-002 roadmap marker.
Therefore R1-002 is **GOVERNANCE CLOSED** and R1-003 is the sole newly authorized
engineering Gate.

The accepted R1-002 package-root Adapter remains:

```text
createDshRc5Adapter(ctx, options): DshRc5Adapter
```

with aggregate asynchronous disposal, atomic construction rollback, stable
fail-closed lifecycle errors and the explicit public export allowlist. R1-003 MUST
reuse that public boundary rather than deep-importing the package-private binding.

## R1-003 normative candidate

Normative candidate:

```text
specs/0057-r1-dsh-plugin-bootstrap-integration.md
```

Contract corpus:

```text
fixtures/dsh-plugin-bootstrap/cases.json
profile: R1-003_DSH_PLUGIN_BOOTSTRAP_V1
cases: DPB-001..DPB-032
```

Pinned compatibility baseline remains exactly:

```text
0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a
```

DeepSeek Harness/Cordis source is Adapter compatibility evidence only. It does not
redefine portable Capability, Resource, Subject, policy, Lease, approval,
GuaranteeLevel or audit semantics.

## Recovered pinned Cordis / Harness facts

Exact pinned source establishes the integration facts required by R1-003:

- `ctx.plugin(plugin, ...args)` is Cordis' native plugin installation seam;
- the returned `Fiber & PromiseLike<Fiber>` owns plugin effects/disposers;
- plugin return cleanup and `ctx.effect()` support asynchronous Fiber-owned
  teardown;
- failed plugin construction enters failed cleanup rather than a successful ACTIVE
  plugin;
- child plugin lifecycle belongs to the parent Fiber/context;
- pinned Harness app-boot/Loader already owns root Context creation, configuration
  tree loading, plugin resolution and framework lifecycle.

R1-003 therefore MUST NOT create another plugin manager, registry, Fiber manager,
root Context loader or hot-reload subsystem.

## Candidate public bootstrap boundary

The candidate freezes one additional package-root programmatic entry:

```text
createDshRc5Plugin(options): DshRc5Plugin
```

whose result is installed through real Cordis:

```text
const plugin = createDshRc5Plugin(options)
const fiber = await ctx.plugin(plugin)
```

The logical bootstrap options preserve R1-002 Adapter options and select exactly
one policy mode:

```text
DENY_ALL
HANDLER(handler, optional monotonicGuard)
```

Omitted policy is identical to `DENY_ALL`.

This is intentionally a programmatic Alpha bootstrap. R1-002 requires a
caller-supplied function-valued `digest(value)` option, so R1-003 does not pretend
that a plain serialized `cordis.yml` package entry can already express the full
contract. Publishable/bare-package install UX remains R1-004/R1-006 work.

## Fail-closed default

`DENY_ALL` installs both:

```text
registerToolPolicy()          -> DENY
registerMonotonicToolGuard()  -> DENY
```

with stable internal reason:

```text
safe-runtime plugin default deny
```

and requires both `toolsPreExecute` and `toolsMonotonicGuard` support.

The two registrations preserve accepted M4 semantics: pre-execute is reorderable,
while the reached monotonic guard is a hard ToolRuntime veto. Missing required
support fails activation explicitly; the plugin must not silently downgrade and
claim the same guarantee.

This still does not mean arbitrary in-process host effects are sandboxed or that
every effect traverses ToolRuntime.

## HANDLER / approval boundary

`HANDLER` mode reuses the exact caller-supplied R1-002 ToolPolicyHandler once.
ALLOW/DENY/ASK retain accepted M4-040 behavior. Optional monotonic guard is
installed only when explicitly supplied and supported; the plugin must not derive a
synchronous guard from an async policy handler or convert ASK into a hard guard.

A reached ASK remains owned by the pinned Harness native path:

```text
Adapter ASK -> ToolRuntime.serviceAsk() -> ctx.approval.request(...)
```

The plugin must not automatically call Adapter `requestApproval()` for the same
ToolRuntime ASK or create another approval provider/state machine.

## Deliberate non-composition boundary

R1-003 does not automatically wire a serialized CapabilityPolicy into complete
ToolRuntime authorization. Accepted M4 classifiers still contain unresolved
operands including `EXECUTION_ROOT` and `ARGUMENT_WORKDIR`, while Core requires
provider-owned identity/containment rather than guessed path authority.

The plugin therefore MUST NOT guess:

```text
raw path -> workspace:// or hostfs://
shell text -> process:// executable
host cwd -> execution-root authorization
```

Full Capability -> provider/resource -> PDP -> Lease -> decision/receipt ->
execution composition remains later integrated-runtime work. R1-003 is only the
native plugin/bootstrap lifecycle and safe default boundary.

## Activation / disposal ownership

A successful plugin activation constructs exactly one R1-002 Adapter and installs
only the registrations required by the selected mode. If a post-construction step
fails, Adapter disposal must run and no plugin-owned listener/guard may remain
live.

On successful activation, the Cordis Fiber owns cleanup that awaits
`adapter.dispose()`. Therefore `await fiber.dispose()` must not complete before
aggregate Adapter teardown settles. Unload must not dispose the caller-owned root
Context, agents, services or independent listeners. A later remount is a new
independent plugin instance; no process-global singleton is introduced.

## Security and package non-claims

R1-003 does not:

- claim arbitrary in-process plugin sandboxing or process isolation;
- claim direct Node host filesystem/process/network effects are completely
  mediated;
- invent provider identity or resource containment;
- implement complete M10 orchestration;
- expose R1-002 filesystem/subprocess internal ports;
- add a second approval/policy/runtime subsystem;
- remove `private: true`;
- finalize package `exports` / `types` / `files` / `engines` metadata;
- claim bare `cordis.yml` package loading is release-ready;
- run R1-005 external tarball smoke;
- define R1-006 compatibility ranges/install docs;
- implement R1-007 release/provenance automation;
- resume M5-003+;
- publish to npm/registry or create a GitHub Release;
- authorize PR #3 merge.

## Protocol-first delta boundary

Before exact-head dual-green, the repository delta is restricted to exactly:

```text
specs/0057-r1-dsh-plugin-bootstrap-integration.md
fixtures/dsh-plugin-bootstrap/cases.json
docs/handoff/CURRENT.md
```

Not authorized in this candidate:

```text
production TypeScript
source-conformance implementation
package.json / pnpm-lock.yaml
Schema / protocol wire changes
Shared TCK registration
HISTORY
roadmap R1-003 acceptance marker
R1-004+
M5-003+
registry publish / GitHub Release
PR #3 merge
```

## Next allowed action

Verify this exact R1-003 protocol-first head through both normal CI and exact
pinned Harness rc5 source-conformance, including step 10 pinned-source TypeScript
and step 11 real runtime conformance.

Only if the same exact SHA is dual-green may the smallest R1-003 production and
source-conformance implementation begin. Until then:

```text
R1-003 IMPLEMENTATION NOT AUTHORIZED
R1-004+ NOT AUTHORIZED
```
