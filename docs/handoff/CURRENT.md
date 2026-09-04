# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before changes;
> normative specs/schemas/TCK and accepted exact-head evidence remain authority.

## Snapshot

- Recorded at: `2026-09-04`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M4 — Capability Broker v0.1`
- Active PR: `#3 — feat(policy): begin M4 capability broker`
- Branch: `feat/m4-capability-broker`
- Base: `main@57430273e065be8d38807d67b175fa154c801d43`
- Exact parent governance head: `6be76b80e5e462cd66c8743e1cf142b4e52b2d68`
- M4-001..014: **GOVERNANCE CLOSED**
- M4-020..025: **GOVERNANCE CLOSED**
- M4-030..036: **GOVERNANCE CLOSED**
- M4-040: **GOVERNANCE CLOSED**
- M4-041: **GOVERNANCE CLOSED**
- M4-042: **GOVERNANCE CLOSED**
- M4-043 authoritative `tools/result`: **GOVERNANCE CLOSED**
- M4-044 no duplicate approval subsystem: **PROTOCOL-FIRST CANDIDATE / EXACT-HEAD VERIFICATION REQUIRED**
- M4-045+: **NOT AUTHORIZED until M4-044 governance closure**
- M4-050+, M5, M6, M10, M13, M15: **NOT AUTHORIZED by the current Gate**
- PR #3 merge: **NOT AUTHORIZED without explicit user authorization**

Live GitHub state overrides this snapshot.

## M4-043 governance closure

Final governance evidence head:

```text
6be76b80e5e462cd66c8743e1cf142b4e52b2d68
```

Exact-head closure evidence:

- normal CI #603 / run `33881990790`: PASS;
- exact pinned Harness rc5 source-conformance #545 / run `33881990595`: PASS;
- Harness step 10 exact rc5 binding/source-conformance typecheck: PASS;
- Harness step 11 real rc5 runtime conformance: PASS.

The handoff closure-record head
`576196fca75ef3fcbabd23cd6c5dcde2a8c836c8` also reached exact-head normal CI
and exact pinned Harness rc5 source-conformance dual-green, including Harness
steps 10 and 11. Therefore M4-044 was authorized only after a clean M4-043
boundary.

## M4-044 protocol-first authority

Normative specification:

```text
specs/0048-m4-approval-subsystem-uniqueness.md
profile: M4-044_APPROVAL_SUBSYSTEM_UNIQUENESS_V1
```

Repository/source-conformance corpus:

```text
fixtures/approval-subsystem-uniqueness/cases.json
24 cases: DAU-001 through DAU-024
```

Protocol artifact commit:

```text
08d6080303ea4c0197fe76dfc3e45228eecb5c42
```

That commit adds only Spec 0048 and the DAU corpus. It contains no production
TypeScript, schema, dependency, lockfile, Harness workflow, roadmap acceptance
marker or later-Gate implementation.

The containing CURRENT-record head must itself reach exact-head normal CI + exact
pinned Harness rc5 source-conformance dual-green before M4-044 conformance code is
authorized.

## M4-044 ownership model

M4-044 distinguishes architectural roles from approval orchestration ownership.
Multiple approval-named ports/types are not automatically duplicate subsystems.
A duplicate exists only when the same logical approval attempt can acquire
competing orchestration/state owners.

Accepted portable authority remains M4-023:

```text
policy deny  -> no approval
policy allow -> no approval
policy ask   -> exactly one supplied ApprovalInvocationPort
```

Accepted Adapter DSH ToolRuntime authority remains M4-042:

```text
safe-runtime ASK
-> Adapter tools/pre-execute projection
-> final/reached Harness ask
-> ToolRuntime.serviceAsk()
-> ctx.approval.request(...)
```

For the native ToolRuntime path, Harness ApprovalService is the sole approval
orchestrator. Adapter `registerToolPolicy()` must not call standalone
`requestApproval()` for the same ASK.

The existing Adapter `requestApproval()` method remains an explicit standalone
port for callers that deliberately select it. Its existence alone is not a second
subsystem; automatic composition with the same ToolRuntime ASK would be a defect.

The M3 deterministic fake approval service remains test-only infrastructure and
must not become a production approval owner.

## Required missing conformance proof

M4-042 already proves one reached ToolRuntime ASK produces exactly one native
ApprovalService request and no observed second Adapter approval call. M4-044
strengthens that into a direct dual-port composition invariant:

```text
one real pinned ToolRuntime ASK
+ Adapter configured with standalone ApprovalPort
=> standalone ApprovalPort calls = 0
=> native ApprovalService calls   = 1
```

Both counters must be observed in the same execution. This avoids assembling the
uniqueness claim from unrelated tests.

M4-044 must also prove that explicit standalone `requestApproval()` invokes only
the configured standalone port and does not originate a ToolRuntime ASK/native
ApprovalService request.

## Repository evidence already recovered

Accepted M4-023 audit establishes:

- Capability Broker owns a runtime-independent `ApprovalInvocationPort`;
- allow/deny and upstream fail-closed paths do not call approval;
- an eligible ask calls the supplied port exactly once;
- there is no retry, remembered approval or permanent grant;
- Capability Broker imports no concrete Adapter/Harness approval types.

Accepted M4-042 audit and current Adapter source establish:

- `registerToolPolicy()` maps ASK to Harness `{ kind: "ask", reason? }`;
- it does not invoke `requestApproval()`;
- pinned ToolRuntime owns native `serviceAsk()` / `ctx.approval.request()`;
- one reached ASK has one native asked/decided identity pair;
- standalone `requestApproval()` remains a separate explicit port.

Current package manifests also preserve the architectural split: Adapter DSH has
`@dsh-safe/protocol` as its workspace dependency and pinned Harness surfaces as
peer dependencies; no testkit approval fake is a production dependency.

No concrete production duplicate has been identified so far. Therefore production
rewrite remains unauthorized unless the remaining repository/source-conformance
audit proves otherwise.

## Pinned Harness baseline

Exact pinned Harness compatibility baseline remains:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
```

All ToolRuntime `serviceAsk()` / ApprovalService behavior claims must be proven
against this exact source/runtime. Newer/default-branch behavior is not portable
protocol authority.

## M4-044 security / non-claim boundary

M4-044 does not prove:

```text
every host effect traverses ToolRuntime
approval means the external effect succeeded
failed execution rolled back external effects
provider/process/kernel isolation
complete system-wide tool-enforced coverage
durable exactly-once approval across retries/processes
raw approval/tool data is safe for audit persistence
tenant/RBAC/admin authorization for approval providers
```

M4-045 remains owner of raw-secret/audit redaction. M4-050+ remains owner of
negative enforcement boundaries. M5 remains owner of durable audit ledger
semantics.

## M4-044 protocol-first boundary

Before protocol-first exact-head dual-green, M4-044 MUST NOT change:

```text
production Adapter or Capability Broker TypeScript
public protocol/schema
Shared TCK registration
package manifests/dependencies
pnpm-lock.yaml
Harness baseline/workflow
roadmap M4-044 acceptance marker
HISTORY
M4-045+
M4-050+
M5
M6
M10
M13
M15
PR #3 merge state
```

After dual-green, conformance may add only the smallest evidence needed to prove
uniqueness. Production changes are allowed only if exact evidence identifies a
concrete duplicate approval owner.

## Resume instruction

1. refresh PR #3 and the current exact head;
2. require this containing protocol-first head to be normal-CI + exact pinned
   Harness rc5 source-conformance dual-green on the same SHA;
3. if it fails, read the current exact-head failed job/step/diagnostic before any
   modification;
4. only after dual-green add M4-044 source/runtime conformance;
5. directly prove configured standalone ApprovalPort `0` calls plus native
   ApprovalService `1` call in one real pinned ToolRuntime ASK execution;
6. prove explicit standalone `requestApproval()` does not originate native
   ToolRuntime approval;
7. complete repository ownership/dependency audit and keep testkit fake test-only;
8. if no duplicate exists, do not rewrite production code;
9. require final conformance exact-head dual-green before acceptance audit;
10. do not begin M4-045 or M4-050+ until M4-044 governance closure;
11. never merge PR #3 without explicit user authorization.
