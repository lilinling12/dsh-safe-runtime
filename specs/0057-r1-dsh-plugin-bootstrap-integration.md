# R1-003 — DeepSeek Harness / Cordis Plugin Bootstrap Integration

Status: **DRAFT NORMATIVE SPECIFICATION**  
Release track: `R1 — DeepSeek Harness Plugin Alpha Release`  
Gate: `R1-003 P0 — DeepSeek plugin/bootstrap integration`  
Conformance profile: `R1-003_DSH_PLUGIN_BOOTSTRAP_V1`  
Pinned Harness compatibility baseline: `0.1.0-rc.5` / `47f943859bef60e4160492346772ded9b24f765a`  
Depends on: R1-002 public Adapter API; Specs 0044, 0045, 0046 and 0048; accepted M4 security/non-sandbox boundaries  
Separated from: R1-004 publishable package metadata, R1-005 external tarball smoke, R1-006 install/compatibility docs, M10 integrated Safe Runtime, M14 process-isolated Plugin Host

## 1. Purpose

R1-003 freezes the smallest truthful DeepSeek Harness/Cordis plugin bootstrap
surface for the already accepted R1-002 Adapter API.

The Gate answers one product-integration question:

> How can a caller install the supported rc5 Adapter as one native Cordis plugin,
> get fail-closed behavior when no tool policy is supplied, preserve native
> ASK/approval ownership, and have plugin unload dispose all Adapter-owned work?

R1-003 is intentionally **not** the complete Capability Broker PEP composition.
It MUST NOT guess unresolved filesystem/process operands, synthesize provider
identity, or silently pull M10 orchestration forward merely to make the Alpha
bootstrap appear more complete.

DeepSeek Harness remains Adapter compatibility evidence only. Portable Subject,
Capability, Resource, policy, Lease, approval and GuaranteeLevel semantics remain
owned by safe-runtime protocol and their accepted M4 profiles.

## 2. Entry precondition

R1-003 repository work is authorized only because R1-002 governance exact head:

```text
3a5e8e780a09c6764eb4d966c4a42348817e0780
```

passed on that same SHA:

```text
CI #677 / run 34394030179: PASS
Harness #619 / run 34394030180: PASS
Harness step 10 pinned-source typecheck: PASS
Harness step 11 real rc5 runtime conformance: PASS
```

PR #3 remains Open / Draft / unmerged. R1-004+, M5-003+, registry publication,
GitHub Release and PR merge remain unauthorized by this Gate.

## 3. Reused R1-002 public Adapter authority

R1-003 MUST build only on the curated R1-002 package-root API:

```text
createDshRc5Adapter(ctx, options): DshRc5Adapter
```

and its public handler types. It MUST NOT deep-import the package-private M2
binding or re-expose the broad `HarnessRuntimeAdapter` type.

The following accepted R1-002 semantics remain unchanged:

- Adapter construction is atomic from the caller ownership boundary;
- `INVALID_ADAPTER_OPTIONS` fails before Adapter-owned Harness registration;
- policy handler failures fail closed;
- monotonic guard malformed/throwing behavior fails closed;
- `dispose()` is aggregate, asynchronous, idempotent and concurrent-safe;
- Adapter disposal owns Adapter-created root/child resources but not the caller
  Context, services or agents;
- post-dispose actions fail before initiating new Harness work.

R1-003 MUST NOT implement a second Adapter runtime beneath the plugin facade.

## 4. Exact pinned Cordis plugin facts

Exact pinned source under `vendor/cordis/` establishes the compatibility facts
used by this Gate:

1. `ctx.plugin(plugin, ...args)` is the native Cordis installation seam;
2. a plugin may be a function, constructor or object with `apply(ctx, config)`;
3. `ctx.plugin()` returns `Fiber & PromiseLike<Fiber>`;
4. a Fiber owns plugin effects and disposers;
5. plugin return values may become owned cleanup effects;
6. Fiber disposal runs owned cleanup and supports asynchronous disposers;
7. plugin construction/loading failure enters failed disposal rather than
   reporting an active plugin;
8. parent Fiber ownership links child plugin lifecycle to the mounting context;
9. `ctx.effect()` exists for explicit external cleanup;
10. registry/fiber lifecycle is already a framework responsibility.

Pinned Harness developer documentation independently describes Harness plugins as
TypeScript modules with `apply(ctx, config)`, automatic cleanup for registrations
made through the plugin Context, optional configuration validation and dependency
injection.

Pinned `@deepseek-ai/dsh-app-boot` additionally owns root-context creation,
configuration-tree loading and Loader resolution. R1-003 MUST NOT reimplement the
Harness app boot loader, plugin registry, Fiber manager or hot-reload engine.

These are compatibility facts, not portable safe-runtime protocol semantics.

## 5. R1-003 public bootstrap entry

R1-003 freezes one additional package-root entry:

```ts
createDshRc5Plugin(options: DshRc5PluginOptions): DshRc5Plugin
```

The returned value MUST be a native Cordis-compatible plugin object that can be
installed programmatically through:

```ts
const plugin = createDshRc5Plugin(options)
const fiber = await ctx.plugin(plugin)
```

The plugin object MUST expose a stable diagnostic name and an `apply` function
structurally accepted by the pinned Cordis `Plugin.Object` contract.

R1-003 does **not** require the package root itself to be a zero-argument/bare
Loader plugin module. A direct `cordis.yml` package-specifier experience would
need a serializable configuration contract for required callbacks and a
publishable package boundary. Those concerns MUST NOT be faked here; R1-004 and
R1-006 own packaging/install UX, and a later normative change may add a safe
serialized entry if required.

## 6. Public plugin configuration

The logical Alpha configuration is:

```ts
interface DshRc5PluginOptions {
  readonly adapter: DshRc5AdapterOptions
  readonly policy?: DshRc5PluginPolicy
}

type DshRc5PluginPolicy =
  | { readonly mode: "DENY_ALL" }
  | {
      readonly mode: "HANDLER"
      readonly handler: ToolPolicyHandler
      readonly monotonicGuard?: ToolGuardHandler
    }
```

Omitted `policy` is semantically identical to:

```text
{ mode: "DENY_ALL" }
```

This configuration is a **programmatic bootstrap contract**, not a serialized
CapabilityPolicy document schema. It deliberately accepts the same public handler
seams already frozen by R1-002 instead of creating a second policy model.

The nested `adapter` options preserve the R1-002 contract, including the required
caller-supplied `digest(value)` callback. R1-003 MUST NOT invent an undocumented
hashing algorithm merely to make function-valued configuration serializable.

## 7. Configuration ownership and validation

The plugin factory MUST materialize a detached bootstrap configuration consisting
only of the fields it owns. Later caller mutation of the source options object
MUST NOT silently change the plugin's selected mode or handler identity.

Plugin-owned configuration inspection MUST NOT execute accessors or coercion
hooks. Unknown mode values, missing/non-callable `HANDLER.handler`, non-callable
`monotonicGuard`, accessor-backed owned fields, unreadable/revoked Proxy
configuration, unexpected own string fields or symbol authority MUST fail before
successful plugin activation.

The stable plugin-owned configuration failure code is:

```text
INVALID_PLUGIN_OPTIONS
```

R1-002 remains owner of nested Adapter option validation and its existing
`INVALID_ADAPTER_OPTIONS` code.

Failure output MUST NOT echo arbitrary callback source, policy objects, tool
arguments, secrets, exception stacks or attacker-controlled configuration values.

## 8. DENY_ALL is the fail-closed default

When `policy` is omitted or explicitly `DENY_ALL`, plugin activation MUST install:

1. one Adapter `registerToolPolicy()` handler that returns stable DENY for every
   reached tool request; and
2. one Adapter `registerMonotonicToolGuard()` handler that returns stable DENY for
   every request reaching the guard stage.

The stable internal denial text is:

```text
safe-runtime plugin default deny
```

No tool name, arguments, Subject, resource or environment value is interpolated
into that text.

The dual registration is intentional. M4-040 proves that `tools/pre-execute` is
reorderable, while M4-041 proves a reached monotonic guard denial cannot be
reopened by that waterfall. In DENY_ALL mode an outer/prepended listener MUST NOT
be able to turn the safe-runtime default into successful tool-body entry.

DENY_ALL does not call approval and does not create a CapabilityDecision, Lease or
Receipt.

## 9. DENY_ALL feature requirements

Successful DENY_ALL activation requires both exact supported features:

```text
toolsPreExecute = true
toolsMonotonicGuard = true
```

If either feature is unavailable, activation MUST fail explicitly using the
existing Adapter unsupported-feature boundary and MUST dispose any Adapter work
created by the failed attempt.

It MUST NOT silently fall back to a reorderable policy listener while claiming
the same default-deny hard-veto property.

## 10. HANDLER mode

`HANDLER` mode installs the exact caller-supplied `ToolPolicyHandler` through the
R1-002 `registerToolPolicy()` method exactly once.

The plugin MUST NOT:

- copy/reimplement the Handler's policy logic;
- inspect or rewrite the ToolPolicyRequest before delegating it;
- create a second pre-execute listener for the same handler;
- retry a failed handler automatically;
- translate an Adapter fail-closed DENY back to ALLOW/ASK.

At minimum `toolsPreExecute = true` is required. Missing support fails activation
explicitly.

The accepted R1-002/M4-040 semantics remain:

```text
ALLOW -> delegate in pre-execute waterfall
DENY  -> fail closed at the Adapter listener
ASK   -> return native Harness ask when it is the final/reached decision
```

## 11. Optional HANDLER monotonic guard

If `HANDLER.monotonicGuard` is supplied, the plugin MUST require
`toolsMonotonicGuard = true` and install that exact handler through
`registerMonotonicToolGuard()` exactly once.

The plugin MUST NOT derive a monotonic guard automatically from an asynchronous
policy handler. In particular, it MUST NOT treat `ASK` as a synchronous hard-deny
or assume that reaching the guard proves which pre-execute listener produced the
final ASK.

If no `monotonicGuard` is supplied, the plugin MUST NOT fabricate one and MUST NOT
claim a non-reorderable tool-enforcement property from the policy listener alone.

## 12. Native ASK / approval ownership

For HANDLER mode, an `ASK` returned by the tool policy MUST preserve Specs 0046
and 0048:

```text
HANDLER policy -> Adapter ASK projection
-> final/reached Harness ask
-> ToolRuntime.serviceAsk()
-> ctx.approval.request(...)
-> native approval outcome
```

The plugin MUST NOT automatically call `adapter.requestApproval()` for the same
ToolRuntime ASK and MUST NOT introduce a second approval provider, queue, cache,
retry loop or remembered-grant store.

One reached ASK therefore continues to have exactly one native approval owner.
`allowed-once` may proceed to later guards; rejected, cancelled or unavailable
must not enter the tool body. Agent-less ASK remains fail closed and the plugin
MUST NOT synthesize an approval owner.

The M4-040/M4-042 final-waterfall limitation remains explicit: another in-process
plugin can suppress or replace a downstream decision. R1-003 MUST NOT relabel
that reorderable fact as process isolation or complete mediation.

## 13. No premature CapabilityPolicy-to-tool composition

R1-003 MUST NOT automatically wire a serialized CapabilityPolicy document to
ToolRuntime requests in this Gate.

This is a deliberate safety boundary, not missing convenience. Accepted
classifier output still includes unresolved operands such as:

```text
filesystem: EXECUTION_ROOT
shell:      EXECUTION_ROOT
shell:      ARGUMENT_WORKDIR
```

and Core requires filesystem authorization to respect provider-owned stable
identity/containment rather than guessed string-path authority. M4-010/M4-011
explicitly defer provider resolution; M4-040/M4-041 explicitly defer complete
classifier/PDP aggregation.

Therefore R1-003 MUST NOT invent mappings such as:

```text
raw path     -> guessed workspace:// locator
raw path     -> guessed hostfs:// locator
shell text   -> guessed process:// executable
host cwd     -> implicit execution-root authority
```

solely to obtain an ALLOW/ASK result from the accepted policy engine.

A caller may compose accepted policy-engine/capability-broker primitives behind a
`ToolPolicyHandler` only when that caller has a separately valid resource/
provider mapping. That composition is outside R1-003 conformance. The repository's
full integrated Capability -> execution orchestration remains M10 work.

## 14. Plugin activation atomicity

Plugin `apply` MUST construct exactly one R1-002 Adapter on the Cordis plugin
Context and register only the resources required by the selected mode.

Successful activation publishes one live plugin Fiber only after all required
registrations have succeeded.

If any step after Adapter construction fails, activation MUST:

1. begin Adapter disposal;
2. ensure no Adapter-owned plugin registration is left live by the failed attempt;
3. fail plugin loading rather than return an ACTIVE plugin;
4. never dispose the caller-owned root Context.

Cordis Fiber failure cleanup may provide an additional lifecycle safety net, but
R1-003 MUST NOT rely on a leaked Adapter handle and hope the process exits later.

A cleanup failure must remain observable; it MUST NOT be reported as successful
activation.

## 15. Successful lifecycle ownership

On successful activation, the Cordis plugin Fiber MUST own an asynchronous cleanup
effect whose teardown awaits:

```text
adapter.dispose()
```

Consequently:

```text
await fiber.dispose()
```

MUST settle only after the Adapter's aggregate disposal completion for work owned
by that plugin instance.

Plugin unload MUST NOT call `ctx.dispose()` on the caller root Context. After one
plugin Fiber is disposed, independent caller listeners/services and the root
Context remain usable.

R1-003 MUST NOT create a process-wide singleton. Distinct plugin instances have
independent Adapter/fiber ownership, subject to normal Harness listener
composition semantics.

## 16. Re-mount and unload behavior

After a plugin Fiber has fully disposed, the caller MAY create/mount a new plugin
instance on a still-live compatible Context.

The old instance's policy/guard handlers MUST NOT receive later calls. New state
must come from the new plugin instance only.

R1-003 does not define automatic restart, file watching, Loader HMR ordering or
cross-instance state migration.

## 17. Context / Fiber authority boundary

R1-003 uses Cordis lifecycle rather than creating another lifecycle manager.

The plugin owns:

- its R1-002 Adapter;
- policy/guard registrations created through that Adapter;
- any Adapter-owned observations/subscriptions created later through that Adapter
  instance;
- the plugin Fiber cleanup effect that awaits Adapter disposal.

The plugin does not own:

- caller root Context;
- unrelated Fibers/plugins;
- Harness agents/sessions/services created by the caller;
- independent approval providers;
- independent listeners registered outside the plugin;
- OS process/container lifetime.

## 18. Public export boundary

After implementation, the package root may add only the public symbols required
for the R1-003 bootstrap contract, expected to include:

```text
createDshRc5Plugin
DshRc5Plugin
DshRc5PluginOptions
DshRc5PluginPolicy
```

plus any narrowly required public error-code extension such as
`INVALID_PLUGIN_OPTIONS`.

R1-003 MUST preserve R1-002's explicit allowlist. Internal plugin helpers,
Cordis/Fiber test fixtures, source-conformance helpers and package-stage markers
MUST NOT become Alpha semver commitments merely because they exist in source.

## 19. Package publication boundary

R1-003 MUST NOT:

- remove `private: true`;
- finalize package `exports`, `types`, `files` or `engines` metadata;
- change registry scope/ownership;
- add publish credentials;
- generate a registry release or GitHub Release;
- claim a bare package-specifier Loader installation is release-ready.

Those are R1-004+ responsibilities.

A dependency/package.json change is not expected for the minimal factory design;
if implementation discovers one is truly required, it must be justified by this
Gate's exact public runtime need and MUST NOT smuggle R1-004 publishability work
forward.

## 20. Security / guarantee boundary

R1-003 remains a same-process plugin integration.

It MUST preserve the accepted facts that:

- arbitrary in-process plugins are `HOST_PLUGIN_TRUSTED`, not sandboxed;
- direct Node filesystem access may bypass ToolRuntime and remains the M4-050
  `EXPECTED_UNGOVERNED` boundary;
- shell command text is not a trustworthy nested-effect parser;
- `tool-enforced` evidence applies only to proven ToolRuntime control surfaces;
- provider/process isolation requires separate evidence;
- R1-003 does not implement M14 process-isolated Plugin Host.

DENY_ALL's monotonic guard proves a reached ToolRuntime body cannot execute past
that guard. It does not prove all host effects traverse ToolRuntime.

## 21. Exact supported-baseline requirement

R1-003 implementation and conformance MUST remain pinned to:

```text
0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a
```

Real source-conformance MUST use actual Cordis `ctx.plugin` / Fiber lifecycle and
actual Harness ToolRuntime/ApprovalService behavior for claims about plugin
mounting, unload, default deny and ASK.

Fake-only plugin lifecycle or approval evidence is insufficient.

## 22. Required conformance

The executable/source-conformance phase MUST prove at least:

1. package-root `createDshRc5Plugin` and public plugin types compile against the
   exact supported Cordis type surface;
2. a returned plugin is accepted by real `ctx.plugin(plugin)`;
3. factory creation alone touches no Harness registration;
4. invalid plugin-owned configuration fails without successful activation;
5. invalid nested Adapter options preserve `INVALID_ADAPTER_OPTIONS` before
   Adapter-owned Harness registration;
6. omitted policy selects DENY_ALL;
7. explicit DENY_ALL behaves identically;
8. DENY_ALL installs both pre-execute DENY and monotonic DENY;
9. an outer/prepended pre-execute listener cannot produce tool-body entry around
   DENY_ALL because the monotonic guard remains terminal;
10. missing required default-deny feature fails activation and rolls back;
11. HANDLER installs the exact policy handler once;
12. HANDLER ALLOW preserves M4-040 delegation semantics;
13. HANDLER DENY prevents body entry when it is the final/reached decision;
14. HANDLER ASK uses native Harness approval exactly once;
15. allowed-once can proceed to later guards/body only when no later denial wins;
16. rejected/cancelled/unavailable ASK never enters body;
17. agent-less ASK remains fail closed;
18. policy throw/rejection remains Adapter fail-closed DENY;
19. optional monotonic guard is registered once and can veto after policy/approval;
20. absent optional monotonic guard is not fabricated;
21. plugin never automatically calls `requestApproval()` for ToolRuntime ASK;
22. failed activation leaves no live plugin-owned Adapter listener/guard;
23. Fiber disposal awaits Adapter aggregate disposal;
24. unload removes old policy/guard participation;
25. root Context and independent listener remain usable after plugin unload;
26. remount creates independent new plugin state;
27. multiple plugin instances do not rely on a hidden global singleton;
28. no direct package-private binding import is required by a consumer;
29. no CapabilityPolicy/resource/provider mapping is guessed by the plugin;
30. direct Node host bypass remains an explicit non-sandbox limitation;
31. exact public-root allowlist remains curated;
32. package publishability metadata remains outside the Gate.

## 23. Implementation expectation

The preferred production shape is one small Adapter-side plugin facade around the
R1-002 public factory. It SHOULD NOT create a new package, plugin registry,
approval service, policy engine, event bus or lifecycle subsystem.

The implementation SHOULD reuse:

```text
createDshRc5Adapter
DshRc5Adapter.dispose
registerToolPolicy
registerMonotonicToolGuard
Cordis native plugin/Fiber lifecycle
```

and add only the validation/ownership glue required by this Spec.

Source-conformance SHOULD test real rc5 Cordis/Harness lifecycle before any
broader product integration is considered.

## 24. Explicit non-goals

R1-003 does not:

- implement a serialized CapabilityPolicy document loader inside the plugin;
- guess classifier -> canonical Resource/provider mappings;
- implement full classifier/PDP/Lease/receipt orchestration;
- consume/revoke/issue Leases;
- construct complete CapabilityDecision/Receipt records;
- assign final GuaranteeLevel for a complete action;
- implement M10 integrated Safe Runtime;
- expose filesystem/subprocess provider ports through the public Adapter;
- add a second approval subsystem;
- implement direct `cordis.yml` bare-module package configuration;
- make the package publishable;
- run an external tarball consumer;
- define compatibility ranges beyond the exact accepted rc5 baseline;
- add release/version/provenance automation;
- publish a registry package or GitHub Release;
- implement process isolation/plugin sandboxing;
- resume M5-003+;
- authorize R1-004+ or PR #3 merge.

## 25. Protocol-first Gate boundary

The R1-003 protocol-first delta MUST be limited to exactly:

```text
specs/0057-r1-dsh-plugin-bootstrap-integration.md
fixtures/dsh-plugin-bootstrap/cases.json
docs/handoff/CURRENT.md
```

Not authorized in this protocol-first commit:

```text
production TypeScript
source-conformance implementation
package.json / pnpm-lock.yaml
package publishability metadata
schema/protocol wire changes
Shared TCK registration
HISTORY
roadmap R1-003 acceptance marker
R1-004+
M5-003+
registry publish
GitHub Release
PR #3 merge
```

Production/conformance work may begin only after this exact protocol-first head
passes normal repository CI plus exact pinned Harness rc5 source-conformance,
including pinned-source TypeScript step 10 and real runtime step 11, with PR #3
still Open/Draft/unmerged and no review/thread blocker.
