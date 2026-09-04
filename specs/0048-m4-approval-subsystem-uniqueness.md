# M4-044 — Approval Subsystem Uniqueness Contract

Status: **DRAFT NORMATIVE SPECIFICATION**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-044 P0 — no duplicate approval subsystem`  
Conformance profile: `M4-044_APPROVAL_SUBSYSTEM_UNIQUENESS_V1`  
Pinned Harness compatibility baseline: `0.1.0-rc.5` / `47f943859bef60e4160492346772ded9b24f765a`  
Depends on: accepted M2 Adapter approval port, Spec 0034/M4-023 approval routing, Spec 0046/M4-042 native ToolRuntime approval routing  
Separated from: M4-045 audit redaction, M4-050+ negative enforcement boundaries, M5 durable audit ledger

## 1. Purpose

M4-044 freezes the repository-level ownership rule that one logical approval
attempt MUST have exactly one approval orchestrator. The Gate exists to prevent a
portable Capability Broker approval seam, an Adapter convenience port and the
DeepSeek Harness native ApprovalService path from being accidentally composed as
multiple approval subsystems for the same action.

M4-044 is an architecture and source-conformance Gate. It does not create a new
approval API, outcome, identity, queue, cache, retry policy or persistence model.
Production code MUST be changed only if repository evidence proves a concrete
ownership violation.

DeepSeek Harness remains Adapter compatibility evidence only. It does not define
portable approval semantics.

## 2. Existing authorities remain unchanged

### 2.1 Portable routing authority

Spec 0034 / M4-023 remains the portable routing authority:

```text
policy deny  -> deny; approval is not called
policy allow -> allow; approval is not called
policy ask   -> invoke the supplied ApprovalInvocationPort exactly once
```

The accepted portable outcome vocabulary remains exactly:

```text
ALLOWED_ONCE
REJECTED
CANCELLED
UNAVAILABLE
```

M4-044 MUST NOT add remembered approval, `ALLOWED_ALWAYS`, implicit truthy
approval, automatic retry or a second portable approval state machine.

### 2.2 Adapter ToolRuntime authority

Spec 0046 / M4-042 remains authority for an Adapter DSH ToolRuntime ASK:

```text
safe-runtime ToolPolicyHandler
-> Adapter tools/pre-execute ASK projection
-> final/reached Harness ask
-> ToolRuntime.serviceAsk()
-> ctx.approval.request(...)
-> native approval outcome
-> later monotonic guards / dispatch
```

For that path, ToolRuntime's native ApprovalService is the sole approval
orchestrator. `registerToolPolicy()` MUST NOT additionally call the Adapter's
standalone `requestApproval()` method for the same ASK.

### 2.3 Standalone Adapter approval port

The existing Adapter `requestApproval(request)` method is an explicit standalone
port. Merely exposing this method is not a duplicate subsystem.

It becomes a uniqueness violation only if production wiring automatically invokes
it in addition to another approval orchestrator for the same logical approval
attempt. Callers that explicitly choose the standalone port own that separate
invocation and MUST NOT simultaneously route the same action through the native
ToolRuntime ASK path.

### 2.4 Test-only approval fake

The M3 deterministic fake approval service under `@dsh-safe/testkit` is test
infrastructure. It is not a production approval owner and MUST NOT be wired into
production packages as an independent approval decision service.

## 3. Definition of a duplicate approval subsystem

For M4-044, a duplicate approval subsystem exists when repository production
composition permits one logical approval attempt to acquire two or more
independent approval orchestration owners.

Concrete violations include any of the following for the same action/attempt:

1. `registerToolPolicy()` maps ASK to Harness and also calls Adapter
   `requestApproval()`;
2. ToolRuntime native `ctx.approval` is invoked and a Capability Broker/Adapter
   layer independently asks a second provider before or after it;
3. a second production queue/cache/state machine remembers or replays approval
   decisions outside the accepted owner;
4. a second layer creates independent durable approval identity or asked/decided
   lifecycle for the same native request;
5. an approval result is retried automatically through another provider after the
   accepted owner returns REJECTED, CANCELLED or UNAVAILABLE;
6. test-only fake approval infrastructure is promoted into production wiring as a
   competing approval owner.

## 4. What is not a duplicate subsystem

The following are distinct architectural roles and do not by themselves violate
M4-044:

- a typed dependency-injection port without independent state or orchestration;
- M4-023's runtime-independent routing primitive invoking its one supplied port;
- Adapter `requestApproval()` when explicitly chosen by a caller that is not also
  routing the same attempt through native ToolRuntime ASK;
- M4-042 `registerToolPolicy()` ASK projection, because projection is not the
  approval call;
- normalized observation of native `approval/asked` / `approval/decided`
  evidence;
- deterministic test fakes and conformance fixtures that cannot enter production
  composition.

Names or types that contain the word `approval` are therefore insufficient
evidence of duplication. Ownership and side-effect composition are the deciding
facts.

## 5. ToolRuntime exactly-one ownership invariant

For one final/reached safe-runtime ASK processed by one ToolRuntime execution:

```text
Adapter standalone ApprovalPort calls = 0
native ApprovalService requests       = 1
```

This invariant MUST hold even when the Adapter instance is configured with a
standalone `ApprovalPort`. Configuration alone MUST NOT cause that port to be
invoked by `registerToolPolicy()`.

A real pinned-runtime conformance test MUST exercise this composition directly,
not infer it only from static source review.

## 6. Standalone-port explicit invocation invariant

When a caller explicitly invokes Adapter `requestApproval()` outside the native
ToolRuntime ASK path, the Adapter MAY call its configured `ApprovalPort` exactly
once for that invocation.

The method MUST NOT implicitly register a ToolRuntime ASK, call native
`ctx.approval`, persist a second native approval lifecycle, retry another provider
or create a remembered grant.

M4-044 does not define which later product composition may choose this standalone
port. It only prevents automatic dual ownership.

## 7. Capability Broker ownership invariant

`routeCapabilityApproval()` remains a stateless routing primitive. For one
accepted M4-021 `ask` and a non-failing accepted M4-022 result it invokes exactly
one caller-supplied `ApprovalInvocationPort` and normalizes that exact outcome.

It MUST NOT:

- discover a Harness ApprovalService by itself;
- call Adapter `requestApproval()` by hidden import;
- keep approval decision cache/queue/session state;
- retry a second provider;
- synthesize native Harness approval identity;
- transform `ALLOWED_ONCE` into a durable or permanent grant.

The Capability Broker package MUST remain independent of concrete Adapter/Harness
approval types.

## 8. Production dependency boundary

Repository evidence MUST prove that production package dependencies preserve the
accepted direction:

```text
Capability Broker -> protocol/policy abstractions as already accepted
Adapter DSH       -> protocol + pinned Harness peer surfaces
Testkit           -> test infrastructure only
```

A production dependency from Capability Broker to concrete Adapter/Harness
approval orchestration, or from Adapter production code to testkit approval fakes,
would be a M4-044 defect unless separately authorized by normative architecture.

## 9. Approval identity ownership

For native ToolRuntime ASK, Harness ApprovalService owns the native approval
request identity and its `approval/asked` -> `approval/decided` lifecycle.
Safe-runtime Adapter observation may normalize that evidence but MUST NOT generate
an additional native approval identity for the same request.

Portable `requestRef` / `actionRef` remain opaque portable correlation facts.
M4-044 MUST NOT infer that either equals Harness `callId` or ApprovalRequestId.

## 10. Failure and denial ownership

REJECTED, CANCELLED and UNAVAILABLE from the selected approval owner are terminal
for that approval attempt at the current owner boundary. M4-044 MUST NOT add an
automatic secondary approval provider as fallback.

Provider throw/rejection/malformed outcome remains fail-closed according to the
accepted owning boundary. Uniqueness is not a reason to weaken existing
fail-closed behavior.

## 11. Required repository evidence

M4-044 conformance MUST combine repository architecture review with executable
source/runtime evidence. At minimum it MUST prove:

1. `registerToolPolicy()` ASK projection does not call Adapter
   `requestApproval()`;
2. a configured standalone Adapter ApprovalPort receives zero calls during one
   real pinned ToolRuntime ASK while native ApprovalService receives exactly one;
3. explicit standalone `requestApproval()` invokes only the configured standalone
   port and does not originate native ToolRuntime approval;
4. M4-023 still invokes exactly one supplied `ApprovalInvocationPort` only on the
   accepted ASK path;
5. production package dependency surfaces do not wire testkit approval fakes or
   concrete Adapter approval orchestration into Capability Broker;
6. native approval audit identity remains service-owned rather than duplicated by
   Adapter logic;
7. no production approval cache, remembered-grant store, automatic fallback
   provider or second asked/decided lifecycle is introduced by this Gate.

Existing accepted M4-023/M4-042 tests MAY be reused as evidence where they prove
the exact requirement, but M4-044 MUST add the missing direct dual-port composition
proof from item 2.

## 12. Exact pinned Harness source requirement

Any claim about ToolRuntime `serviceAsk()` or ApprovalService runtime behavior
MUST use the exact pinned baseline:

```text
0.1.0-rc.5
47f943859bef60e4160492346772ded9b24f765a
```

Newer/default-branch Harness behavior MUST NOT be used to rewrite portable
semantics or substitute for pinned source/runtime evidence.

## 13. Fail-closed protocol-first rule

M4-044 begins by proving existing ownership. If evidence reveals a concrete
production duplicate, the smallest authority-consistent production correction MAY
be made only after this protocol-first contract is exact-head dual-green.

If no duplicate is found, production code MUST remain unchanged and the Gate
SHOULD close through source-conformance plus acceptance/governance evidence.

CI MUST NOT be made green by weakening schemas, validators, TCK expectations,
TypeScript strictness, lockfile policy, architecture checks, approval denial
semantics or Harness pinning.

## 14. Non-claims

M4-044 does not prove:

- every host effect traverses ToolRuntime;
- approval implies the external effect succeeded;
- failed execution rolled back external effects;
- provider/process/kernel isolation;
- complete system-wide tool-enforced coverage;
- durable exactly-once approval delivery across retries/processes;
- raw approval/tool data is safe for audit persistence;
- tenant/RBAC/admin authorization for approval providers;
- M4-045 audit redaction or M5 ledger semantics.

## 15. Gate exit criteria

M4-044 may be accepted only when:

1. this contract and its evidence corpus are exact-head dual-green before
   conformance implementation;
2. repository-wide ownership review finds no unaccounted production approval
   orchestrator, or any concrete defect is minimally corrected;
3. real pinned rc5 runtime proves configured-standalone-port zero-call plus one
   native ApprovalService call for a reached ToolRuntime ASK;
4. normal CI and exact pinned Harness source-conformance pass on the same final
   implementation/conformance SHA;
5. acceptance audit records exact scope, evidence and non-claims;
6. final governance bookkeeping is itself exact-head dual-green;
7. M4-045 remains untouched until M4-044 governance is closed.
