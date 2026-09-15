# M4-041 Acceptance Audit — DeepSeek Harness Monotonic Tool Guard

Status: **IMPLEMENTATION / CONFORMANCE ACCEPTED — AUDIT EXACT-HEAD VERIFICATION PENDING**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-041 P0 — use ctx.tools.guard() for hard invariant where required`

## 1. Gate authority

Normative specification:

```text
specs/0045-m4-dsh-monotonic-tool-guard.md
```

Portable/source-conformance corpus:

```text
fixtures/dsh-monotonic-tool-guard/cases.json
```

Conformance profile:

```text
M4-041_DSH_MONOTONIC_TOOL_GUARD_V1
```

Pinned DeepSeek Harness compatibility baseline:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
```

M4-041 is intentionally a narrow Adapter hard-deny registration Gate. It does not
implement complete Capability Broker PEP composition and does not make Harness the
portable protocol authority.

## 2. Predecessor governance

M4-040 final governance head:

```text
df21ba12a4b9dea6eb21243a76cfcd9489eabdb7
```

Exact-head evidence:

```text
CI #584 / run 33767121207: PASS
Harness #526 / run 33767121228: PASS
Harness step 10: PASS
Harness step 11: PASS
```

Therefore M4-040 governance was closed before M4-041 protocol-first work began.

## 3. Protocol-first accepted head

M4-041 protocol-first exact head:

```text
4e447a748e8ff8dbeb97a1599e1ce1de87c441cf
```

Its parent is the M4-040 governance-closed head
`df21ba12a4b9dea6eb21243a76cfcd9489eabdb7`.

The protocol-first delta was exactly:

```text
specs/0045-m4-dsh-monotonic-tool-guard.md
fixtures/dsh-monotonic-tool-guard/cases.json
docs/handoff/CURRENT.md
```

No production TypeScript, package dependency, package manifest, frozen lockfile,
workflow, public protocol/schema, HISTORY, roadmap M4-041 marker, M4-042+, M4-050+,
M5, M6, M10, M13 or M15 change entered the protocol-first commit.

Protocol-first exact-head evidence:

```text
CI #585 / run 33767960425: PASS
Harness #527 / run 33767960602: PASS
Harness step 10 exact rc5 typecheck: PASS
Harness step 11 real rc5 runtime: PASS
```

Production/conformance work began only after that exact head became dual-green.

## 4. Existing Adapter seam reused

M4-041 reuses the accepted M2 Adapter surface:

```text
HarnessRuntimeAdapter.registerMonotonicToolGuard?(handler)

ToolGuardDecision =
  ALLOW
  | DENY(reason)
```

The request projection remains the M4-040 shape:

```text
callRef
rootCallRef
toolName
arguments
scope = agent(sessionRef, agentRef) | host
```

No second Harness guard abstraction was added to policy-engine, capability-broker or
protocol packages.

## 5. Pinned rc5 execution boundary

Pinned rc5 source and real runtime evidence establish:

```text
tools/pre-execute waterfall
-> monotonic guards
-> tools/execute
-> tools/post-execute
-> finalization
-> tools/result
```

The concrete guard seam is synchronous:

```text
ToolGuard = execution -> string | undefined
```

A string is a monotonic denial reason. `undefined` is abstention. A later or
prepended pre-execute ALLOW cannot reopen a reached guard denial.

Harness scope/disposal/live-iteration behavior is compatibility evidence only; it
is not promoted into portable Subject or policy-precedence semantics.

## 6. Concrete production non-conformance found

The pre-M4-041 production binding invoked the statically typed handler and then read:

```text
decision.kind
decision.reason
```

directly.

It caught a synchronous handler throw, but did not validate hostile JavaScript
runtime values that bypass TypeScript. A Promise, malformed object or unreadable
Proxy/accessor decision could therefore escape or collapse toward Harness
`undefined` abstention.

For a hard-deny invariant, an evaluation/materialization failure becoming abstention
is a fail-open defect.

This concrete non-conformance justified a production change under Spec 0045.

## 7. Production hardening strategy

The implementation adds one package-private module:

```text
packages/adapter-dsh/src/monotonic-tool-guard.ts
```

It materializes the handler result without executing decision getters or coercion
hooks and returns only:

```text
ALLOW
DENY(exact string reason)
DENY("safe-runtime monotonic guard failed closed")
```

Runtime invalid/failure cases map to the stable fail-closed reason.

The binding change is deliberately small: `binding.ts` imports the evaluator and
replaces the previous local try/direct-property logic with the normalized decision.
No public Adapter API changes.

## 8. Runtime-shape hardening

The hardened boundary rejects/fails closed for at least:

```text
null / non-object return
function return
Promise return
custom thenable return
missing kind
unknown kind
accessor-backed kind
revoked/unreadable Proxy
DENY without string reason
accessor-backed/unreadable DENY reason
descriptor/prototype trap
handler throw
```

Descriptor/prototype inspection failures are themselves fail-closed events.

The implementation does not await thenables and does not execute `then`, `kind` or
`reason` getters.

Valid `DENY` preserves its reason exactly, including an empty string. No trimming,
normalization or backend-error reflection is introduced.

## 9. Exact implementation delta

Final reviewed implementation/conformance head:

```text
9e1372e285f38f3e0e7e69cb61c1c7546b769cca
```

Compared with protocol-first head `4e447a748e8ff8dbeb97a1599e1ce1de87c441cf`,
the delta is exactly five files:

```text
packages/adapter-dsh/src/monotonic-tool-guard.ts
packages/adapter-dsh/src/binding.ts
packages/adapter-dsh/test/monotonic-tool-guard.test.ts
packages/adapter-dsh/source-conformance/m4-041-monotonic-tool-guard.conformance.ts
packages/adapter-dsh/source-conformance/m4-041-corpus-coverage.conformance.ts
```

`binding.ts` changes only 9 lines (`+2/-7`): one evaluator import and replacement
of the previous local guard-decision try/direct-read block.

No changes were made to:

```text
ports.ts
feature-matrix.ts
package.json
pnpm-lock.yaml
Harness workflow/pin
public protocol/schema
policy-engine
capability-broker
Shared TCK registration
M4-042+
M4-050+
M5
M6
M10
M13
M15
```

## 10. ALLOW and DENY semantics

Validated:

```text
ALLOW -> Harness guard undefined / abstention
DENY(reason) -> exact Harness reason string
```

ALLOW at this seam is not final Capability authorization.

Real rc5 tests prove a guard DENY prevents tool-body entry and remains terminal even
when a pre-execute listener returns ALLOW with prepend ordering.

Multiple guards remain monotonic: an abstaining guard does not erase a denial from
another guard.

## 11. Exact request projection

Real pinned execution proves the guard handler receives:

```text
callRef     = String(exec.callId)
rootCallRef = String(exec.rootCallId)
toolName    = exec.name
arguments   = exact already-materialized/frozen exec.arguments reference
```

Host scope remains `{ kind: "host" }`.

Agent scope remains only:

```text
{
  kind: "agent",
  sessionRef: String(agent.session.id),
  agentRef: String(agent.id)
}
```

No turnRef, Capability, Resource, Lease, approval, Receipt or GuaranteeLevel is
synthesized by this Gate.

## 12. Disposal and scope evidence

Real safe-runtime/pinned rc5 tests prove registration disposal and duplicate
registration independence.

Pinned official rc5 scoped tests prove an agent-scoped guard applies only to that
agent and not subject-less/other-agent calls.

M4-041 does not depend on live guard-registry mutation during handler execution;
that pinned implementation behavior remains explicitly non-portable.

## 13. Feature detection

M4-041 requires:

```text
toolsMonotonicGuard = true
```

Real source-conformance proves an unavailable feature fails the existing Adapter
feature requirement explicitly rather than silently falling back to M4-040
pre-execute semantics.

The concrete rc5 Adapter exposes `registerMonotonicToolGuard`; no downgrade path was
added.

## 14. Corpus evidence classification

The 32-case corpus is bound one-to-one to explicit evidence classes:

```text
REAL_RC5_RUNTIME
NORMAL_CI_RUNTIME
PINNED_RC5_SOURCE_TEST
STATIC_ARCHITECTURE
```

The coverage suite asserts exact IDs `DMGR-001` through `DMGR-032` with no duplicate
or missing record.

Architecture non-claims remain visibly separate from executable runtime evidence.
In particular M4-041 does not fabricate tests that claim complete host-effect
coverage, final Capability authorization, full PDP aggregation or final result
ownership.

## 15. Exact implementation-head evidence

Normal CI:

```text
CI #586
run: 33773380454
PASS
```

This includes the frozen install and repository `pnpm check:all` gate, including
strict TypeScript, unit/runtime regressions, lint, schemas, architecture boundaries
and testkit package checks.

Pinned Harness source-conformance:

```text
Harness #528
run: 33773380443
PASS
```

The exact Harness job completed:

```text
build pinned Harness public type surface: PASS
safe-runtime frozen install: PASS
exact workspace projection: PASS
projection idempotence: PASS
step 10 exact rc5 binding/source-conformance typecheck: PASS
step 11 real rc5 runtime conformance: PASS
```

No validator, schema, TypeScript strictness, test expectation, frozen-lock policy,
architecture boundary, compatibility baseline or security claim was weakened to
obtain green automation.

## 16. Security/guarantee boundary

M4-041 proves a hard-deny invariant at the reached Harness ToolRuntime monotonic
guard seam.

It does not prove that every host effect traverses that seam. It does not govern
direct Node filesystem access or effects outside ToolRuntime, and it does not by
itself justify complete Capability Broker `tool-enforced` claims.

GuaranteeLevel remains governed by accepted M4-025 evidence semantics and must name
only the actually enforced action/boundary.

## 17. Explicit non-claims

M4-041 does not:

- route ASK/approval;
- call requestApproval from the hard guard;
- implement M4-042 approval routing;
- own M4-043 authoritative final result composition;
- implement M4-044 approval-subsystem uniqueness;
- implement M4-045 audit redaction;
- aggregate classifier/PDP requirements;
- resolve provider/execution-root operands;
- select, reserve or consume Leases;
- construct complete CapabilityDecision/Receipt state;
- cover direct Node fs/process/network effects;
- close M4-050 negative boundaries;
- change public protocol schemas/types;
- change the pinned Harness baseline;
- authorize M4-042+ before M4-041 governance closure;
- authorize M4-050+, M5, M6, M10, M13 or M15;
- authorize PR #3 merge.

## 18. Pull request state at acceptance

At the implementation head, PR #3 remained:

```text
Open
Draft
mergeable: true
head: 9e1372e285f38f3e0e7e69cb61c1c7546b769cca
base: main@57430273e065be8d38807d67b175fa154c801d43
reviews: none
review threads: none
```

The PR body contains stale historical Gate text and is not current engineering
authority.

## 19. Acceptance decision

```text
M4-040 governance: CLOSED
M4-041 protocol-first: CLOSED
M4-041 production hardening: ACCEPTED
M4-041 exact rc5 conformance: ACCEPTED
M4-041 final reviewed implementation head: 9e1372e285f38f3e0e7e69cb61c1c7546b769cca
M4-041 acceptance audit: RECORDED / EXACT-HEAD VERIFICATION PENDING
M4-041 final governance: NOT YET CLOSED
M4-042+: NOT AUTHORIZED
PR #3 merge: NOT AUTHORIZED
```

The audit-only commit must itself pass exact-head normal CI and exact pinned Harness
rc5 source-conformance before the final governance transition may update CURRENT,
append-only HISTORY and only the M4-041 roadmap acceptance marker.
