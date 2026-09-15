# M4-050 — Direct Host Filesystem Negative Boundary Contract

Status: **DRAFT NORMATIVE SPECIFICATION — PROTOCOL-FIRST / NOT ACCEPTED**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-050 P0 — direct Node fs bypass → EXPECTED_UNGOVERNED`  
Conformance profile: `M4-050_DIRECT_HOST_FS_NEGATIVE_BOUNDARY_V1`  
Pinned Harness compatibility baseline: `0.1.0-rc.5` / `47f943859bef60e4160492346772ded9b24f765a`  
Depends on: Core security-boundary honesty, accepted M4-040/M4-041 ToolRuntime control seams, accepted M4-043 final-result boundary, accepted M4-045 audit-egress boundary  
Separated from: M4-051 equivalent-shell-spelling boundary, M4-052 plugin-sandbox documentation, M5 audit ledger/privacy infrastructure, M6 workspace transaction, M14 process-isolated plugin host

## 1. Purpose

M4-050 freezes one explicit negative security fact for the current in-process
safe-runtime architecture:

```text
host-privileged in-process code
  -> direct host filesystem API
  -> filesystem mutation outside Harness ToolRuntime
  -> EXPECTED_UNGOVERNED
```

The Gate exists to prevent a tool-dispatch enforcement claim from being silently
promoted into a plugin sandbox, host-process sandbox, or complete filesystem
mediation claim.

M4-050 is a **negative-boundary evidence Gate**. Its required result is not to
block the direct host mutation. Its required result is to prove, in a controlled
fixture, that the current v0.1 boundary does not govern that mutation and that the
product/test vocabulary reports the weaker boundary truthfully.

A conforming M4-050 implementation MUST NOT retrofit interception, monkey-patch
Node filesystem APIs, add a process sandbox, or claim `DENIED` merely to make the
negative test green.

## 2. Existing authority remains unchanged

### 2.1 M4-041 hard guard authority

Spec 0045 proves only a reached Harness ToolRuntime monotonic hard-deny seam.
Its accepted non-claim explicitly states that M4-041:

- does not prove every host effect traverses ToolRuntime;
- does not cover direct Node filesystem access;
- does not establish complete system-wide `tool-enforced` coverage.

M4-050 converts that non-claim into executable negative-boundary evidence. It
MUST NOT weaken or reinterpret M4-041.

### 2.2 M4-040 pre-execute authority

M4-040 controls only calls that enter the Harness `tools/pre-execute` waterfall.
A direct host filesystem API call that never creates a Harness tool execution is
outside that seam. M4-050 MUST NOT fabricate a tool call merely to make the
mutation observable by M4-040.

### 2.3 M4-043 final-result authority

M4-043 owns authoritative observation of a final Harness `tools/result` for calls
that traverse ToolRuntime. A direct host filesystem mutation in this Gate has no
Harness tool result. Absence of `tools/result` MUST NOT be reported as a failed
or denied tool execution.

### 2.4 M4-045 audit authority

M4-045 defines the owned Adapter audit-egress projection for accepted Harness
source facts. It does not provide system-call interception and does not make an
out-of-pipeline direct host filesystem mutation audit-governed. M4-050 MUST NOT
invent a synthetic audit event to hide this boundary.

## 3. Definition of the M4-050 test actor

The actor is deliberately **host-privileged, in-process test/plugin-equivalent
code** running with the same operating-system permissions as the Node process.

For the accepted TypeScript source-conformance implementation, the concrete host
API is the built-in Node filesystem module (`node:fs` or `node:fs/promises`).
The portable contract, however, is about a direct host filesystem API outside the
governed ToolRuntime seam; the Node module name is Adapter/runtime evidence, not
a new portable Capability namespace.

The actor MUST NOT:

- call a Harness filesystem tool;
- call `ctx.tools.call()` or another ToolRuntime dispatch API;
- invoke safe-runtime's Adapter filesystem port as the mutation mechanism;
- invoke a shell/subprocess merely to perform the M4-050 write;
- use a privileged helper process outside the tested Node process;
- access user secrets or production paths.

## 4. Safe test target

The negative test MUST operate only on a test-owned disposable filesystem target.

The target MUST satisfy all of the following before the measured mutation:

1. it is created under an isolated test temporary root owned by the current test;
2. the exact sentinel file does not exist before the measured operation;
3. the test uses non-secret synthetic bytes with a fixed expected value;
4. cleanup is attempted after evidence capture;
5. no home-directory secret, repository credential, SSH material, environment
   secret, production configuration or unrelated user file is read or modified.

A test that demonstrates bypass by touching a sensitive real path is
non-conforming even if the write succeeds.

## 5. Required boundary classification

The portable M4-050 boundary result is exactly one of:

```text
EXPECTED_UNGOVERNED
ENVIRONMENT_UNSUPPORTED
INVALID_EVIDENCE
```

These are **test/evidence classifications**, not CapabilityDecision effects and
not additions to the portable Capability protocol.

### 5.1 `EXPECTED_UNGOVERNED`

This is the required acceptance result for the current reference environment.
It means all required evidence proves that:

1. the direct host filesystem mutation succeeded;
2. the exact sentinel bytes are observable at the target after the mutation;
3. the mutation did not originate a Harness ToolRuntime call;
4. safe-runtime `tools/pre-execute` policy handlers were not the mutation path;
5. safe-runtime monotonic tool guards were not the mutation path;
6. no tool body or final `tools/result` is fabricated for the direct mutation;
7. no safe-runtime denial is claimed for an effect it did not mediate.

`EXPECTED_UNGOVERNED` is an expected negative security result. A test runner may
mark the case itself as successful when this expected classification is observed,
but product/security output MUST retain the literal weaker-boundary
classification and MUST NOT relabel it `ALLOW`, `DENY`, `SANDBOXED`,
`TOOL_ENFORCED`, `PROVIDER_ENFORCED`, or `PROCESS_ISOLATED`.

### 5.2 `ENVIRONMENT_UNSUPPORTED`

This classification is used only when the test cannot establish a writable,
test-owned host target for reasons outside safe-runtime governance, for example an
external CI/OS/container policy that denies the process write before the measured
safe-runtime boundary can be evaluated.

`ENVIRONMENT_UNSUPPORTED` MUST NOT be converted to `DENIED`. An external host
restriction is not evidence that safe-runtime governed the direct filesystem
operation.

M4-050 acceptance of the current reference implementation requires at least one
supported exact-head environment that produces `EXPECTED_UNGOVERNED`; an
unsupported-only test matrix cannot close the Gate.

### 5.3 `INVALID_EVIDENCE`

This classification is required when the test cannot prove the required source
facts coherently, including when:

- the sentinel already existed and provenance cannot be established;
- the written bytes do not equal the fixed expected bytes;
- the measured path accidentally traversed ToolRuntime;
- observation counters are contradictory or unavailable;
- the test attempts to infer safe-runtime denial from an unrelated host error;
- cleanup or fixture setup mutates evidence before it is captured.

Invalid evidence MUST fail the conformance case. It is not an expected security
boundary result.

## 6. Required executable witness

A real M4-050 witness MUST establish one coherent measured operation with at least
these facts:

```text
sentinelExistsBefore = false
directHostMutationAttempted = true
directHostMutationSucceeded = true
sentinelBytesAfter = exact expected bytes
harnessToolExecutionsForMeasuredMutation = 0
safeRuntimePreExecuteInvocationsForMeasuredMutation = 0
safeRuntimeMonotonicGuardInvocationsForMeasuredMutation = 0
fabricatedToolResultForMeasuredMutation = false
classification = EXPECTED_UNGOVERNED
```

The proof MUST be collected around the same measured mutation. It MUST NOT combine
one direct filesystem write from one test with zero ToolRuntime counters from an
unrelated test.

Instrumentation used to count ToolRuntime/policy/guard activity MUST itself be
observation-only and MUST NOT reroute the direct host filesystem call through a
governed tool.

## 7. A direct host write is not a policy allow

A successful direct host filesystem write does not mean a CapabilityPolicy
allowed `fs.write`.

M4-050 MUST NOT:

- create a synthetic `CapabilityRequest` after the fact and call it proof of
  authorization;
- treat absence of a policy decision as implicit allow;
- generate a CapabilityDecision/Receipt that claims the direct effect was
  mediated;
- consume a CapabilityLease for the direct mutation;
- route approval for the direct mutation merely to make the test appear governed.

The whole point of this Gate is that the effect occurs outside those accepted
control surfaces.

## 8. A direct host write is not a safe-runtime deny

Conversely, an operating-system, container, read-only-filesystem, permission or
fixture-setup failure is not sufficient evidence for safe-runtime `DENY`.

A `DENIED` security claim would require accepted enforcement authority that
actually intercepted the direct host operation. M4-050 defines no such authority.

If a future process-isolated host or provider-level enforcement boundary owns the
operation, that stronger behavior belongs to its later milestone and must update
or supersede this negative profile through a new accepted contract. M4-050 MUST
NOT pre-claim that future state.

## 9. No interception or monkey patching

Production code MUST NOT be changed in M4-050 to intercept direct Node filesystem
APIs.

In particular, this Gate MUST NOT add:

```text
node:fs monkey patches
module-loader hooks
require/import interception
process-wide syscall wrappers
LD_PRELOAD-style interception
OS sandbox setup
container policy
filesystem virtualization
process isolation
```

Those mechanisms would change the architecture rather than prove the current
boundary and would require separate design/security authority.

A production change is justified in M4-050 only if existing safe-runtime code
falsely claims, fabricates, or misclassifies the direct-host effect; otherwise the
expected implementation is test/evidence/documentation only.

## 10. No secret-bearing proof

The test MUST use synthetic non-secret data.

M4-050 does not require demonstrating access to `.env`, SSH keys, tokens,
credentials or user files. Showing that a benign test-owned write bypasses the
ToolRuntime seam is sufficient to prove the architectural limitation.

This preserves M4-045 privacy guarantees and avoids creating a security test that
itself handles unnecessary raw secrets.

## 11. Relationship to Adapter filesystem ports

M2 Adapter filesystem ports describe an accepted provider-facing abstraction.
They do not revoke the Node process's ordinary host privileges and do not imply
that all code is forced through `ctx.fs`.

The M4-050 measured mutation MUST bypass those ports intentionally. If the test
uses the Adapter filesystem port, it is testing provider mediation rather than the
direct-host negative boundary and is non-conforming for this Gate.

## 12. Relationship to subprocess effects

M4-050 is limited to a direct filesystem API call in the current Node process.
It does not define equivalent shell spelling, subprocess redirection or indirect
child-process file effects. Those are distinct evidence surfaces and M4-051/M6+
remain responsible for their own semantics.

## 13. Relationship to GuaranteeLevel

M4-025 GuaranteeLevel assignment remains action-scoped and evidence-based.
M4-050 proves that the current architecture cannot infer complete filesystem
`tool-enforced`, `provider-enforced`, or `process-isolated` coverage merely from
M4-040/M4-041 tool controls.

The negative witness MUST NOT downgrade unrelated actions that genuinely have
stronger accepted evidence; it prevents overclaiming coverage for direct host
filesystem effects that bypass the governed seam.

## 14. Required source/repository audit

Conformance must also establish repository facts that explain the witness rather
than treating the write as a mysterious runtime accident:

1. the current Adapter hard controls are registered on Harness ToolRuntime seams;
2. no accepted production module claims to wrap every `node:fs` import in the
   host process;
3. no accepted process-isolated plugin host is active in M4;
4. M14 remains the planned milestone where direct host API isolation can become a
   stronger enforceable boundary;
5. M4-052 remains responsible for broader product documentation that v0.1 is not
   a plugin sandbox.

Repository search results alone do not replace the real measured witness.

## 15. Pinned Harness authority boundary

Pinned Harness source is used only to prove what M4-040/M4-041 actually mediate:
Harness ToolRuntime pre-execute/guard/dispatch flow.

The direct `node:fs` operation is outside that call graph. Harness source does not
become portable authority for host filesystem semantics, OS permissions, Node
module behavior or future process isolation.

Real source-conformance MUST use the exact pinned rc5 baseline when it asserts
that no Harness tool execution/policy/guard fact was generated for the measured
mutation.

## 16. Conformance corpus

Language-neutral requirement corpus:

```text
fixtures/direct-host-fs-negative-boundary/cases.json
```

Profile:

```text
M4-050_DIRECT_HOST_FS_NEGATIVE_BOUNDARY_V1
```

The corpus MUST cover at least:

- prior M4-041 complete-coverage non-claim;
- direct host API actor definition;
- test-owned temporary target requirement;
- synthetic non-secret bytes;
- absent-before/exact-after sentinel proof;
- zero ToolRuntime execution for the measured mutation;
- zero safe-runtime pre-execute invocation for the measured mutation;
- zero safe-runtime monotonic-guard invocation for the measured mutation;
- no fabricated `tools/result` or audit event;
- exact `EXPECTED_UNGOVERNED` classification;
- separation from CapabilityDecision allow/deny vocabulary;
- external host restriction -> `ENVIRONMENT_UNSUPPORTED`, never safe-runtime
  `DENIED`;
- contradictory/incomplete evidence -> `INVALID_EVIDENCE`;
- no Node filesystem interception/monkey patch;
- no production rewrite absent a concrete false-claim defect;
- no secret-bearing fixture;
- no subprocess/shell equivalence claim;
- no plugin-sandbox/process-isolation claim;
- exact pinned Harness source evidence where Harness behavior is asserted;
- M4-051+, M5, M6, M14 and PR merge remain outside this Gate.

## 17. Acceptance expectation

M4-050 follows the repository's protocol-first sequence:

1. publish this Spec and requirement corpus;
2. require normal CI + exact pinned Harness rc5 source-conformance dual-green for
   the protocol-first exact head;
3. only then add the smallest executable/source-conformance witness;
4. require a real supported environment to produce `EXPECTED_UNGOVERNED`;
5. review that the evidence proves a boundary limitation rather than weakening a
   security test;
6. publish an acceptance audit;
7. close governance only after the accepted exact heads are dual-green.

A test that passes because it changed production to intercept Node fs is not M4-050
conformance; it is an unauthorized architecture change.

## 18. Explicit non-goals

M4-050 does not:

- block direct Node filesystem access;
- implement a plugin sandbox;
- implement process isolation;
- implement filesystem provider enforcement for arbitrary host code;
- claim complete system-wide mediation;
- test shell spelling equivalence (M4-051);
- complete the v0.1 plugin-sandbox documentation Gate (M4-052);
- implement workspace transaction/rollback (M6+);
- implement M14 process-isolated plugin host;
- change public protocol schemas/types;
- change the pinned Harness baseline;
- authorize M4-051+;
- authorize M5, M6, M10, M13, M14 or M15 implementation;
- authorize PR #3 merge.

## 19. Protocol-first Gate boundary

The M4-050 protocol-first delta MUST be limited to exactly:

```text
specs/0050-m4-direct-host-fs-negative-boundary.md
fixtures/direct-host-fs-negative-boundary/cases.json
docs/handoff/CURRENT.md
```

Not authorized in this protocol-first commit:

```text
production TypeScript
source-conformance/runtime test implementation
package.json or pnpm-lock.yaml
schema/protocol wire changes
Shared TCK registration
HISTORY
roadmap M4-050 acceptance marker
Harness baseline/workflow changes
M4-051+
M5
M6
M10
M13
M14 implementation
M15
PR #3 merge
```

Executable/source-conformance work may begin only after the exact M4-050
protocol-first head reaches normal repository CI + exact pinned Harness rc5
source-conformance dual-green with PR #3 still Open/Draft and no unresolved
review blocker.
