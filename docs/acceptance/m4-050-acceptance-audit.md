# M4-050 Acceptance Audit — Direct Host Filesystem Negative Boundary

Status: **IMPLEMENTATION / CONFORMANCE ACCEPTED — AUDIT EXACT-HEAD VERIFICATION PENDING**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-050 P0 — direct Node fs bypass → EXPECTED_UNGOVERNED`  
Profile: `M4-050_DIRECT_HOST_FS_NEGATIVE_BOUNDARY_V1`

## 1. Gate authority

Normative candidate:

```text
specs/0050-m4-direct-host-fs-negative-boundary.md
```

Requirement corpus:

```text
fixtures/direct-host-fs-negative-boundary/cases.json
DHFS-001..024
```

Pinned DeepSeek Harness compatibility baseline:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
```

M4-050 freezes one negative security boundary of the current in-process runtime:
a host-privileged direct filesystem mutation that bypasses Harness ToolRuntime is
not governed by the M4-040/M4-041 tool seams and must be reported truthfully as
`EXPECTED_UNGOVERNED` when the required evidence is coherent.

This Gate does not introduce a new portable CapabilityDecision value and does not
add host interception, provider isolation, process isolation, transactionality or
rollback.

## 2. Predecessor governance

M4-045 governance was closed before M4-050 began. The verified predecessor
closure head is:

```text
4124fbfbcc8186b972f4f61646a42b012ce1977f
```

Evidence:

```text
CI #628 / run 34193010886: PASS
Harness #570 / run 34193010872: PASS
Harness job 101954759178 step 10 exact pinned-source typecheck: PASS
Harness job 101954759178 step 11 real rc5 runtime conformance: PASS
```

The accepted predecessor boundaries remain unchanged: M4-041 proves only a
reached ToolRuntime monotonic hard guard; M4-043 owns final `tools/result` only
for calls that traverse ToolRuntime; M4-045 owns Adapter audit admission only for
accepted source facts.

## 3. Protocol-first candidate

The protocol-first exact head is:

```text
302ec43ee48937f13859079c2e00891131ecd9ad
```

The commit is restricted to:

```text
specs/0050-m4-direct-host-fs-negative-boundary.md
fixtures/direct-host-fs-negative-boundary/cases.json
docs/handoff/CURRENT.md
```

No production TypeScript, executable/source-conformance test, dependency,
lockfile, Schema, Shared TCK registration, workflow, HISTORY or roadmap marker
changed in this protocol-first commit.

Exact-head evidence:

```text
CI #629 / run 34193629081: PASS
Harness #571 / run 34193629078: PASS
Harness job 101956581627 step 10 exact pinned-source typecheck: PASS
Harness job 101956581627 step 11 real rc5 runtime conformance: PASS
```

Executable work therefore began only after the protocol-first exact head reached
the required dual-green boundary.

## 4. Exact pinned Harness source review

The source-conformance workflow checks out exactly:

```text
deepseek-ai/deepseek-harness@47f943859bef60e4160492346772ded9b24f765a
```

and builds/projects that source before typecheck and runtime execution.

At that exact baseline, `@deepseek-ai/dsh-tools` defines ToolRuntime policy and
observation around the ToolRuntime execution pipeline: `tools/pre-execute`, the
registered monotonic guards, dispatch/post-execute processing and `tools/result`.
The guard API is explicitly evaluated after the extensible pre-execute waterfall
and before the tool body.

M4-050 does not elevate these Harness implementation details into portable
filesystem authority. The pinned source is used only to establish what the
accepted ToolRuntime seams mediate. The negative witness separately demonstrates
that a direct `node:fs/promises` mutation does not enter those seams.

## 5. Final executable/source-conformance head

Final reviewed executable exact head:

```text
a92a0fcf1b20ec460d85de2e1338c8139c370cc1
```

It is exactly one fast-forward commit from the dual-green protocol-first head.
The net delta contains two files only:

```text
packages/adapter-dsh/source-conformance/m4-050-corpus-coverage.conformance.ts
packages/adapter-dsh/source-conformance/m4-050-direct-host-fs-negative-boundary.conformance.ts
```

Diff statistics:

```text
m4-050-corpus-coverage.conformance.ts                    +110 / -0
m4-050-direct-host-fs-negative-boundary.conformance.ts   +190 / -0
```

No production implementation, package manifest, lockfile, Schema, portable
protocol wire, workflow, roadmap, HISTORY or later-Gate artifact changed in this
implementation/conformance delta.

## 6. Real supported negative-boundary witness

The pinned-runtime witness creates a unique temporary test-owned root and a
sentinel that must not exist before the measured operation. It writes only the
fixed benign payload:

```text
m4-050-benign-direct-host-fs-witness\n
```

The measured mutation is a direct call to `node:fs/promises.writeFile` with
exclusive-create semantics. It does not call `ctx.tools.execute`, an Adapter
filesystem port, a shell or a subprocess.

The same measured operation records and asserts:

```text
sentinelExistsBefore = false
directHostMutationAttempted = true
directHostMutationSucceeded = true
sentinelBytesAfter = exact expected bytes
rawPreExecuteCalls = 0
safeRuntimePolicyCalls = 0
safeRuntimeGuardCalls = 0
toolBodyCalls = 0
toolResultCalls = 0
classification = EXPECTED_UNGOVERNED
```

This is the required supported-environment witness. It is not an
`ENVIRONMENT_UNSUPPORTED` substitute and does not infer a safe-runtime denial
from host permissions.

## 7. Control-surface participation proof

The witness deliberately installs observation/control instrumentation around the
accepted runtime seams before the direct write:

- a raw `tools/pre-execute` listener;
- the existing Adapter `registerToolPolicy` handler;
- the existing Adapter monotonic tool guard;
- a registered control-surface witness tool body;
- a `tools/result` listener.

All five counters remain zero for the same direct host mutation. The test does not
manufacture a Harness tool call merely to make the mutation visible.

This establishes the exact negative claim required by M4-050: the current
in-process host-privileged filesystem call is outside the accepted ToolRuntime
mediation path.

## 8. Classification integrity

The local evidence classifier returns `EXPECTED_UNGOVERNED` only when all
required facts are coherent. It returns `INVALID_EVIDENCE` for contradictory
provenance or mediation facts.

Regression assertions specifically reject at least:

```text
pre-existing sentinel
wrong final bytes
non-zero safe-runtime guard participation
non-zero tools/result observation
```

`EXPECTED_UNGOVERNED` remains a test/evidence classification. It is not added to
CapabilityDecision, Receipt or GuaranteeLevel vocabularies and is not relabeled
as `ALLOW`, `DENY`, `SANDBOXED`, `TOOL_ENFORCED`, `PROVIDER_ENFORCED` or
`PROCESS_ISOLATED`.

## 9. Corpus traceability

The companion corpus-coverage conformance test pins:

```text
profile: M4-050_DIRECT_HOST_FS_NEGATIVE_BOUNDARY_V1
Harness: 0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a
cases: DHFS-001..024 exactly once
```

It binds every corpus requirement to an explicit evidence kind and identifies the
requirements that depend on the same real rc5 runtime witness separately from
static architecture, repository-source, existing-authority and gate-process
requirements.

The real witness is therefore not treated as a substitute for protocol,
architecture or governance requirements, while static review is not treated as a
substitute for the required runtime bypass proof.

## 10. Production-change review

No production change is required or permitted by the evidence found in M4-050.
The accepted production implementation does not falsely claim that direct host
filesystem calls are governed by ToolRuntime, and the executable witness confirms
the documented limitation.

Accordingly this Gate does not add:

```text
node:fs monkey patches
module-loader interception
process-wide syscall wrappers
provider/kernel mediation
OS/container sandbox policy
filesystem virtualization
process isolation
synthetic CapabilityRequest/Decision/Receipt/Lease facts
synthetic approval or audit facts
```

Adding such mechanisms would change the architecture instead of proving its
current boundary.

## 11. Exact-head verification

Final executable/source-conformance head:

```text
a92a0fcf1b20ec460d85de2e1338c8139c370cc1
```

Evidence on that same SHA:

```text
CI #630 / run 34194046009: PASS
Harness #572 / run 34194046036: PASS
Harness job 101957818163 step 10 exact pinned-source typecheck: PASS
Harness job 101957818163 step 11 real rc5 runtime conformance: PASS
```

PR #3 is Open, Draft, unmerged and mergeable. `main` remains exactly
`57430273e065be8d38807d67b175fa154c801d43`, equal to the PR base SHA, so no base
drift exists at this acceptance review. GitHub reports no PR reviews and no
inline review threads.

## 12. Compatibility review

M4-050 does not modify:

```text
portable Capability protocol schemas
CapabilityDecision / CapabilityReceipt semantics
GuaranteeLevel semantics
M4-040 tools/pre-execute authority
M4-041 monotonic guard authority
M4-043 tools/result authority
M4-045 audit admission authority
Adapter production filesystem ports
Harness 0.1.0-rc.5 pin
frozen lockfile or dependency graph
workflow behavior
```

The direct Node API spelling is source-conformance evidence for the current
Adapter/runtime implementation, not a new portable Capability namespace.

## 13. Security non-claims

M4-050 does **not** prove or claim:

```text
every host effect traverses ToolRuntime
direct Node filesystem access is denied or sandboxed
successful tools/result means every claimed external effect occurred
failed tools/result means no external side effect occurred
external effects are rolled back
shell/subprocess equivalents have the same measured boundary
provider or process isolation
complete system-wide tool-enforced coverage
native Harness history is an audit-safe channel
raw tool result is safe for persistence
M6 workspace transactions are implemented
M14 process-isolated plugin hosting is implemented
```

The negative witness exists specifically to prevent these stronger claims from
being inferred from tool-dispatch controls.

## 14. Gate separation

M4-050 acceptance does not authorize implementation of M4-051 or later Gates.
In particular:

```text
M4-051 equivalent shell spelling boundary: not implemented by this Gate
M4-052 plugin-sandbox documentation: not implemented by this Gate
M5 audit ledger/privacy infrastructure: not implemented by this Gate
M6 workspace transaction: not implemented by this Gate
M14 process-isolated plugin host: not implemented by this Gate
PR #3 merge: not authorized by this audit
```

The roadmap marker must remain unchanged until this audit commit itself reaches
normal CI plus exact pinned Harness source-conformance dual-green.

## 15. Acceptance decision

M4-050 implementation/conformance is **ACCEPTED** at:

```text
a92a0fcf1b20ec460d85de2e1338c8139c370cc1
```

because:

- protocol-first authority preceded executable work and was dual-green;
- the exact pinned Harness rc5 source baseline is used for ToolRuntime behavior;
- the implementation delta is test/source-conformance only and contains no
  speculative production rewrite;
- one real supported exact-head environment proves a benign direct host write
  succeeds while ToolRuntime, policy, monotonic guard, tool body and
  `tools/result` participation all remain zero;
- the exact classification stays `EXPECTED_UNGOVERNED` and is not upgraded into
  an allow/deny/sandbox guarantee;
- contradictory provenance and mediation evidence fail as `INVALID_EVIDENCE`;
- all DHFS-001..024 requirements are explicitly traceable;
- synthetic non-secret bytes and a disposable test-owned target preserve the
  security-fixture boundary;
- normal CI and exact pinned Harness typecheck/runtime are dual-green on the same
  final reviewed SHA;
- compatibility and security non-claims remain explicit.

This **audit commit itself is not yet accepted** until its own exact head passes
normal CI and exact pinned Harness source-conformance.

No roadmap M4-050 marker, HISTORY closure entry, M4-051 authorization or PR merge
state may change merely because this file was created.
