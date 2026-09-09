# Spec 0056 — R1 Public DeepSeek Adapter API

Status: **DRAFT NORMATIVE SPECIFICATION — PROTOCOL-FIRST / NOT ACCEPTED**  
Milestone: `R1 — DeepSeek Harness Plugin Alpha Release`  
Gate: `R1-002 P0 — freeze public DeepSeek Adapter API`  
Profile: `R1-002_DSH_PUBLIC_ADAPTER_API_V1`

## 1. Purpose

R1-002 defines the first intentional, user-facing TypeScript API for constructing
and operating the DeepSeek Harness rc5 Adapter.

The repository already contains a real rc5 binding factory in
`packages/adapter-dsh/src/binding.ts`, but the package root does not export it and
the current binding return type is built directly from M2 internal port
interfaces. R1-002 MUST therefore freeze a curated Alpha API rather than merely
re-exporting the existing implementation shape.

This Gate owns the public construction, lifecycle, disposal, error-state and
semver surface of the Adapter. It does not own plugin/bootstrap installation,
package publication metadata, external tarball smoke, compatibility-range policy
or release automation.

## 2. Authority

Authority order remains:

```text
GitHub live exact-head state
> normative Specs / architecture / compatibility contracts
> Schema / Shared TCK
> accepted implementation/conformance evidence
> CURRENT
> HISTORY
> roadmap planning text / PR body / chat
```

The only supported Harness baseline for R1-002 implementation and source
conformance is:

```text
DeepSeek Harness 0.1.0-rc.5
commit 47f943859bef60e4160492346772ded9b24f765a
```

The immediate predecessor is the R1-001 governance-closure record:

```text
4bb553651061b66176dfd1babe24c96fdd415995
CI #669 / run 34330477937: PASS
Harness #611 / run 34330477951: PASS
```

R1-002 work is authorized only because that same exact predecessor passed normal
CI plus exact pinned Harness source/runtime conformance.

## 3. Existing implementation facts

The protocol is constrained by current accepted implementation evidence, but that
implementation is not automatically public authority.

Current facts:

- `createDshRc5Adapter(ctx, options)` exists in package-internal `binding.ts`;
- the package root `src/index.ts` does not export that factory;
- current `DshRc5Adapter` is defined as the M2 `HarnessRuntimeAdapter` plus the
  audit observation extension;
- `HarnessRuntimeAdapter` includes optional provider-oriented filesystem and
  subprocess ports that the rc5 factory does not materialize;
- construction registers Adapter-owned Harness listeners before returning;
- observation/policy/guard/turn-stopping child handles have their own disposal,
  but the Adapter itself has no aggregate lifecycle `dispose()`;
- test-only deterministic time injection currently exists in the binding options;
- stable machine-readable Adapter errors already exist as `DshAdapterError`.

R1-002 MUST preserve accepted runtime semantics while removing accidental
implementation leakage from the public contract.

## 4. Non-goals

R1-002 MUST NOT:

- implement R1-003 plugin/bootstrap registration;
- change package `private`, package name, `exports`, `files`, registry ownership,
  peer dependency policy or publish credentials;
- add tarball/external-consumer release smoke owned by R1-005;
- define supported Harness ranges beyond the exact accepted rc5 baseline owned by
  R1-006;
- add changesets, version tags, GitHub Release or registry publish logic owned by
  R1-007/R1-008;
- create a second policy, approval, audit or runtime subsystem;
- change portable protocol semantics to match a Harness implementation detail;
- expose source-conformance fixtures/helpers as public API;
- expose test-only clock injection as Alpha user API;
- claim provider isolation, process isolation or arbitrary plugin sandboxing;
- implement M5-003+;
- merge PR #3.

## 5. Public entrypoint

The Alpha public construction entrypoint MUST be:

```ts
createDshRc5Adapter(ctx, options): DshRc5Adapter
```

The factory MUST be importable from the package root.

The package root MUST NOT require consumers to deep-import `src/binding`,
source-conformance modules, test fixtures or M2 internal implementation modules in
order to construct or type the Adapter.

R1-002 contract tests MUST compile against the package root.

## 6. Public options

The public options contract MUST contain only user-meaningful integration inputs.

### 6.1 Required digest function

A caller-provided digest function remains required:

```ts
digest(value: unknown): string
```

R1-002 does not assign cryptographic strength to this function and does not
implement M5-003 record digests. It only preserves the established Adapter
normalization dependency.

The factory MUST validate that `digest` is callable before any Harness listener
or child resource is registered. Invalid options MUST fail without partial
registration.

### 6.2 Observation failure callback

The existing optional observation-failure callback MAY remain public because it
is an operational diagnostic boundary:

```ts
onObservationFailure?(event, error): void
```

Failure of that callback MUST NOT turn an observation failure into authorization,
must not alter policy decisions, and must not crash the Harness event path.

### 6.3 Test-only clock

The existing deterministic `now` injection is a test/source-conformance seam. It
MUST NOT be part of the frozen Alpha user options.

The implementation MAY retain a package-private factory/helper for deterministic
tests, provided that helper is not reachable from the package public root or
published public type surface.

## 7. Curated Adapter surface

`DshRc5Adapter` MUST be a dedicated public interface. It MUST NOT be defined by
publicly extending the broad M2 `HarnessRuntimeAdapter` interface.

The public interface MAY reuse stable public type aliases for arguments and
results, but its member list is explicit.

Required public members:

```text
adapterName
adapterVersion
harnessVersion
harnessCommit
features

observe(...)
observeAudit(...)
registerToolPolicy(...)
registerMonotonicToolGuard(...)
registerTurnStopping(...)
requestApproval(...)
steerCompletion(...)
dispose()
```

The rc5 public surface MUST NOT expose `filesystem` or `subprocess` provider ports.
Those M2 ports remain internal architecture seams and are not materialized by the
current rc5 binding.

## 8. Public types and export ownership

The root contract MUST expose the types necessary to use the members in section 7
without deep imports. This includes the Adapter/options/error types and the
handler/request/result/sink/subscription types referenced by the public methods.

The implementation MUST maintain an explicit public export allowlist.

Symbols that exist only for internal normalization, dispatcher implementation,
provider ports, replay/source-conformance helpers, package stage markers or
testing MUST NOT become semver commitments merely because they were historically
re-exported while the package was private.

R1-002 MAY remove accidental private-package root exports before the first public
release. Such removal is not a published-package compatibility break because the
package has not yet been released as the R1 Alpha artifact.

## 9. Construction atomicity

Construction MUST be atomic from the caller's ownership perspective:

```text
either:
  return one live DshRc5Adapter handle
or:
  throw/reject construction and leave no Adapter-owned listener/resource live
```

All user-option validation that can be performed without touching Harness MUST
occur before registration.

If Harness registration fails after one or more Adapter-owned registrations have
succeeded, construction MUST attempt rollback of every registration created by
that construction attempt before propagating failure.

A failed construction MUST NOT leave policy, audit, observation or classification
listeners attached.

This rule does not require rolling back pre-existing caller/Harness state.

## 10. Adapter lifecycle

The public Adapter lifecycle is:

```text
LIVE -> DISPOSING -> DISPOSED
```

No transition back to `LIVE` exists.

### 10.1 Adapter-owned resources

The Adapter owns:

- Harness listeners registered directly by its factory;
- observation/audit subscriptions created through the Adapter;
- policy registrations created through the Adapter;
- monotonic guard registrations created through the Adapter;
- turn-stopping registrations created through the Adapter;
- Adapter-owned correlation/dispatcher state.

The Adapter does not own:

- the caller-supplied Cordis/Harness `Context`;
- Harness services or agents;
- independent listeners/guards registered by the caller;
- caller-provided sinks, handlers, digest function or abort controllers.

### 10.2 Aggregate dispose

`dispose()` MUST:

1. be idempotent;
2. prevent creation of new Adapter child resources once disposal begins;
3. detach Adapter-owned root Harness listeners;
4. dispose all still-live Adapter-owned child registrations/subscriptions;
5. close Adapter-owned dispatchers/correlation state;
6. await draining of events already accepted by Adapter-owned observation/audit
   dispatchers before the returned promise settles;
7. leave caller-owned Harness/context resources usable.

Concurrent calls to `dispose()` MUST observe one shared disposal completion rather
than running competing teardown sequences.

### 10.3 In-flight caller operations

R1-002 does not invent cancellation for an already-started Harness approval or
steering call. Caller-provided `AbortSignal` semantics remain authoritative where
already supported.

Disposal MUST prevent new calls after the lifecycle leaves `LIVE`, but it MUST NOT
claim rollback of an external effect already initiated before disposal.

## 11. Post-dispose behavior

After disposal begins, public operations that would register, observe or perform a
new Harness action MUST fail before touching Harness.

The failure MUST be a stable `DshAdapterError` with code:

```text
ADAPTER_DISPOSED
```

This applies to at least:

```text
observe
observeAudit
registerToolPolicy
registerMonotonicToolGuard
registerTurnStopping
requestApproval
steerCompletion
```

`dispose()` itself remains idempotent and non-failing solely because the Adapter
is already disposed.

Metadata fields remain readable.

Child handles already returned before Adapter disposal remain safe to dispose
again. Observation child `drain()` remains usable for confirming already accepted
work has settled.

## 12. Option validation error

Invalid public construction options MUST fail with stable code:

```text
INVALID_ADAPTER_OPTIONS
```

Validation MUST happen before Adapter-owned Harness registration where the invalid
condition is locally knowable.

This Gate does not require converting every arbitrary Harness/provider exception
into a new Adapter error code. Existing accepted `DshAdapterError` mappings remain
authoritative unless this Spec explicitly adds a lifecycle code.

## 13. Existing fail-closed semantics

R1-002 MUST preserve, not redesign, accepted Adapter behavior:

- an exception from the tool-policy handler resolves through the existing
  fail-closed DENY path;
- a genuinely absent approval service remains `UNAVAILABLE`;
- unsupported approval outcomes remain explicit Adapter errors;
- missing/non-live agents remain explicit failure;
- observer/sink failures are contained within the observation boundary and cannot
  authorize tool execution;
- authoritative `tools/result` semantics remain M4-043 authority;
- approval uniqueness remains M4-044 authority;
- audit-egress redaction remains M4-045 authority;
- M4-041 monotonic guard semantics are not weakened.

A public API cleanup MUST NOT reinterpret those outcomes.

## 14. Semver contract

For the first R1 Alpha package, the R1-002 public allowlist is the semver-relevant
TypeScript surface.

Contract evidence MUST verify at minimum:

- root import of the factory;
- root import of all types required to use its public methods;
- no deep import is needed by an external consumer;
- the returned type exposes exactly the curated Adapter capability set and does
  not require M2 provider ports;
- `dispose()` is present and typed as an asynchronous lifecycle boundary;
- stable lifecycle error codes are type-visible;
- test/source-conformance-only helpers are absent from the public root contract.

R1-004 later owns actual package `exports`, `types`, `files` and publishable
metadata. R1-002 MUST NOT mark those packaging requirements complete.

## 15. Security and non-claims

A successfully constructed public Adapter proves only that the Adapter has bound
to the supported Harness seams represented by accepted conformance evidence.

R1-002 does not prove:

```text
all host effects traverse ToolRuntime
all arbitrary plugin code is mediated
successful tool outcome means all claimed external effects occurred
failed tool outcome means no external side effect occurred
external effects are rolled back
provider/process isolation
arbitrary-plugin sandboxing
network or secret mediation
future Harness versions are compatible
raw Harness history is audit-safe
```

Adapter disposal is resource/lifecycle cleanup, not rollback of external effects.

## 16. Exact rc5 conformance rule

The R1-002 implementation and final reviewed evidence MUST continue to run against:

```text
0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a
```

At the same exact commit SHA, acceptance requires:

```text
normal CI
+
Harness source-conformance step 10: pinned-source typecheck
+
Harness source-conformance step 11: real rc5 runtime conformance
```

The public API Spec MUST NOT be weakened to accommodate a Harness-specific
implementation failure. A concrete mismatch must first be classified as public
contract error, portable protocol conflict or rc5 compatibility gap.

## 17. Portable profile

Portable contract corpus:

```text
fixtures/dsh-public-adapter-api/cases.json
profile: R1-002_DSH_PUBLIC_ADAPTER_API_V1
cases: DPA-001..DPA-036
```

The corpus is the R1-002 public-surface/lifecycle contract. After protocol-first
dual-green, implementation and contract tests MUST resolve every case.

## 18. Protocol-first change boundary

This protocol-first candidate is restricted to exactly:

```text
specs/0056-r1-dsh-public-adapter-api.md
fixtures/dsh-public-adapter-api/cases.json
docs/handoff/CURRENT.md
```

It MUST NOT modify:

```text
docs/roadmap.md
docs/handoff/HISTORY.md
packages/** production or tests
package.json / pnpm-lock.yaml
Schema / Shared TCK
Harness compatibility baseline
workflow files
R1-003+ artifacts
M5-003+
registry/GitHub Release state
```

Only after this exact protocol-first head passes normal CI and exact pinned
Harness rc5 source/runtime conformance may R1-002 production/API contract-test
implementation begin.

## 19. R1-002 acceptance rule

R1-002 may proceed to acceptance/governance only when all of the following hold:

- protocol-first exact head is dual-green;
- package root exports the reviewed public factory;
- public options do not expose the test clock;
- public Adapter type is curated rather than inheriting broad M2 ports;
- no filesystem/subprocess provider port leaks into the rc5 public return type;
- aggregate Adapter disposal exists and is idempotent;
- construction rollback prevents partial-listener leaks;
- Adapter disposal removes Adapter-owned resources but not caller-owned Harness
  state;
- accepted observation/audit work is drained before disposal resolves;
- post-dispose operations fail before Harness touch with `ADAPTER_DISPOSED`;
- invalid locally-known options fail before registration with
  `INVALID_ADAPTER_OPTIONS`;
- existing fail-closed policy/approval/guard/audit semantics remain unchanged;
- root-level TypeScript contract tests prove the allowlisted surface;
- no R1-003+, R1-004 package-publication metadata, M5-003+, registry publish,
  GitHub Release or PR merge work is bundled;
- final reviewed implementation exact head passes normal CI plus exact pinned
  Harness source/runtime conformance.

R1-002 acceptance freezes the Alpha TypeScript API contract only. It does not make
the package publishable and does not authorize R1-003 until R1-002 governance
closure is itself established.
