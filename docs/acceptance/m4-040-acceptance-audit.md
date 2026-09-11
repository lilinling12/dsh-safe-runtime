# M4-040 Acceptance Audit — DeepSeek Harness `tools/pre-execute` Registration

Status: **IMPLEMENTATION / CONFORMANCE ACCEPTED — AUDIT EXACT-HEAD VERIFICATION PENDING**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-040 P0 — register tools/pre-execute`

## 1. Gate authority

Normative specification:

```text
specs/0044-m4-dsh-pre-execute-registration.md
```

Portable/source-conformance corpus:

```text
fixtures/dsh-pre-execute-registration/cases.json
```

Conformance profile:

```text
M4-040_DSH_PRE_EXECUTE_REGISTRATION_V1
```

Pinned DeepSeek Harness compatibility baseline:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
```

M4-040 is intentionally an Adapter registration/handoff Gate. It does not define
complete Capability Broker PEP composition and does not promote DeepSeek Harness
behavior into portable protocol authority.

## 2. Reused runtime-independent authority

M4-040 reuses the already accepted M2 Adapter seam unchanged:

```text
HarnessRuntimeAdapter.registerToolPolicy(handler)
```

with the accepted request facts:

```text
callRef
rootCallRef
toolName
arguments
scope = agent(sessionRef, agentRef) | host
```

and decision vocabulary:

```text
ALLOW
DENY(reason)
ASK(reason?)
```

No second `tools/pre-execute` abstraction was introduced in `policy-engine` or
`capability-broker`. No core package imports `@deepseek-ai/*` or concrete Adapter
Context types as a consequence of this Gate.

## 3. Protocol-first accepted head

The protocol-first exact head is:

```text
544a8b13cc93729c1ea6178c54cd976e827983c0
```

Its parent is the governance-closed M4-036 head:

```text
93d0879c9d7960524aafb0d60906ed37b21c835e
```

The protocol-first delta was exactly the three authorized files:

```text
specs/0044-m4-dsh-pre-execute-registration.md
fixtures/dsh-pre-execute-registration/cases.json
docs/handoff/CURRENT.md
```

There was no production TypeScript, package manifest, dependency, lockfile,
Schema/wire-model, Shared TCK registration, HISTORY, roadmap acceptance marker,
Harness workflow/baseline, M4-041+, M4-050+, M5, M6, M10, M13 or M15 change in
that protocol-first commit.

Protocol-first exact-head evidence:

```text
CI #578
run: 33742873583
PASS

Harness rc5 source conformance #520
run: 33742873592
PASS
```

Production/conformance work began only after that exact head became dual-green.

## 4. Implementation strategy — prove the existing binding first

Spec 0044 explicitly requires M4-040 to test the already-existing M2
`registerToolPolicy()` binding before changing production code.

That review found the existing production binding already conforms to the M4-040
registration contract. Therefore the accepted implementation strategy is:

```text
retain the existing M2 production binding unchanged
+ add exact pinned-source conformance evidence
+ add portable-corpus evidence coverage
+ harden the evidence where source review finds gaps
```

This is deliberate. Rewriting already-correct Adapter production code merely to
make the M4-040 diff look larger would increase risk without adding protocol
correctness.

## 5. Exact implementation / conformance delta

Comparing protocol-first head
`544a8b13cc93729c1ea6178c54cd976e827983c0` to the final reviewed conformance head
`46daba5306f4773fcc6f2b9a0927f9e67df6a2f1` shows:

```text
status: ahead
ahead_by: 4
behind_by: 0
total_commits: 4
```

Exactly three files differ:

```text
packages/adapter-dsh/source-conformance/m4-040-pre-execute-registration.conformance.ts
packages/adapter-dsh/source-conformance/m4-040-corpus-coverage.conformance.ts
packages/adapter-dsh/tsconfig.harness-rc5.json
```

No production Adapter source file changed between the accepted protocol-first head
and the final conformance head.

In particular there is no implementation-stage change to:

```text
packages/adapter-dsh/src/binding.ts
packages/adapter-dsh/src/ports.ts
packages/adapter-dsh/src/feature-matrix.ts
packages/adapter-dsh/package.json
package.json
pnpm-lock.yaml
protocol schemas/types
policy-engine
capability-broker
Shared TCK registration
DeepSeek Harness pin/workflow
M4-041+
M4-050+
M5
M6
M10
M13
M15
```

The only tsconfig change is scoped to the dedicated Harness rc5 source-conformance
configuration so the repository-owned JSON corpus can be imported as a typed static
module.

## 6. Exact request projection evidence

Real pinned Harness execution proves the Adapter preserves:

```text
callRef     = String(exec.callId)
rootCallRef = String(exec.rootCallId)
toolName    = exec.name
arguments   = exact materialized exec.arguments reference
```

Host execution projects:

```text
{ kind: "host" }
```

Agent execution projects only:

```text
{
  kind: "agent",
  sessionRef: String(agent.session.id),
  agentRef: String(agent.id)
}
```

The conformance tests additionally prove the Adapter does not synthesize authority
such as `turnRef`, Subject or GuaranteeLevel from these facts.

## 7. Frozen argument boundary

Pinned Harness materializes and freezes tool arguments before the policy waterfall.
The real-source test observes the Harness argument object and proves the Adapter
passes the exact same frozen reference into `ToolPolicyRequest`.

M4-040 does not clone, normalize, mutate or rewrite tool arguments.

The pinned feature matrix remains authoritative that argument rewrite is unavailable
at this seam.

## 8. `ALLOW` is delegation, not final authorization

The accepted production mapping remains:

```text
safe-runtime ALLOW -> waterfall next()
```

Real pinned-source runtime tests prove both sides of the waterfall:

```text
safe-runtime ALLOW -> downstream ALLOW -> tool body executes
safe-runtime ALLOW -> downstream DENY  -> tool body does not execute
safe-runtime ALLOW -> downstream ASK   -> tool body does not execute
```

Accordingly M4-040 `ALLOW` is only non-blocking delegation at this listener. It is
not a final CapabilityDecision allow and does not establish `tool-enforced`.

## 9. `DENY` and `ASK` short-circuit evidence

The accepted production mapping remains:

```text
DENY(reason) -> { kind: "deny", reason }
ASK          -> { kind: "ask" }
ASK(reason)  -> { kind: "ask", reason }
```

Real pinned-source tests prove safe-runtime DENY and ASK do not call downstream
waterfall listeners and do not reach the tool body.

ASK without a safe-runtime reason remains valid. In the tested pinned environment,
missing approval does not cause the tool body to execute.

M4-040 itself does not call the Adapter `requestApproval()` port for the same action.

## 10. Fail-closed handler failure

The reused production Adapter converts policy-handler throw/rejection into the stable
internal denial:

```text
safe-runtime policy evaluation failed closed
```

Real pinned-source conformance proves an asynchronous policy rejection:

- does not call downstream listeners;
- does not reach the tool body;
- produces an error result;
- does not reflect the backend exception text.

No exception fallthrough, automatic retry or error-text leakage was introduced.

## 11. Waterfall reorderability remains an explicit limitation

A dedicated real-source regression registers an earlier Harness
`tools/pre-execute` listener that short-circuits before safe-runtime.

The test proves:

```text
earlier listener can prevent the safe-runtime M4-040 listener from running
```

This is intentional evidence of a limitation, not a failure to make the test green.

M4-040 therefore does not claim that listener registration order is a security
boundary and does not claim `tool-enforced` from this Gate alone.

M4-041 remains the separate owner of the pinned Harness monotonic
`ctx.tools.guard()` hard-deny invariant.

## 12. Feature-detection boundary

The conformance suite proves M4-040 requires:

```text
toolsPreExecute = true
```

When the feature is unavailable, the existing Adapter feature requirement fails
explicitly rather than reporting a silent no-op registration.

M4-040 does not require `toolsMonotonicGuard`; that belongs to M4-041.

## 13. Corpus evidence classification

The 24-case portable/source-conformance corpus is covered explicitly by an evidence
registry rather than pretending every architectural non-claim is a runtime test.

Evidence is classified as:

```text
REAL_RC5_RUNTIME
EXISTING_CONFORMANCE
STATIC_ARCHITECTURE
```

Static architectural cases remain visibly distinct from runtime facts. In
particular, the following remain non-claims rather than fabricated executable
behavior:

```text
reorderable waterfall is not a hard enforcement claim
M4-040 does not directly invoke approval routing
M4-040 does not own authoritative final tools/result semantics
M4-040 does not define multi-requirement classifier/PDP aggregation
```

The coverage test asserts the corpus IDs are exactly `DPER-001` through `DPER-024`
with no duplicate or missing evidence record.

## 14. Conformance hardening after the first green implementation

The first source-conformance implementation head was:

```text
104c92625e9860592248687be92e8485f6654775
```

Exact-head evidence:

```text
CI #579 / run 33744719534: PASS
Harness #521 / run 33744719552: PASS
```

That green head was not treated as sufficient acceptance. Review added explicit
portable-corpus coverage and then additional waterfall evidence for downstream
ALLOW/ASK behavior.

The resulting coverage commit `a0739a82933a0f7bdb2f7fa51110ecb9b7f38dd9`
introduced a source-conformance-only typecheck regression:

```text
CI #580 / run 33747029071: PASS
Harness #522 / run 33747029186: FAIL
```

The later waterfall-hardening head
`2405635e79c00d382167f5f1c482bbb2bb2eea9d` preserved the same failure:

```text
CI #581 / run 33747173913: PASS
Harness #523 / run 33747173901: FAIL
```

Both failures occurred in the dedicated exact-source typecheck step before runtime
conformance executed.

## 15. Typecheck regression root-cause reconciliation

The first failing coverage file was the first M4-040 conformance file to import:

```text
node:fs/promises
```

only to read the repository-owned static JSON corpus.

The Harness-specific tsconfig includes `source-conformance/**/*.ts`, whereas the
normal adapter typecheck does not compile that evidence directory. The safe-runtime
workspace also did not explicitly install Node ambient types for this test path.
This explains the observed split where normal CI stayed green while the exact-source
Harness typecheck failed.

The repair deliberately did **not**:

- weaken TypeScript strictness;
- add `any` escape hatches;
- suppress diagnostics;
- modify the Harness workflow;
- add global Node ambient types solely to satisfy one static fixture read;
- hand-edit the frozen lockfile;
- remove the corpus-coverage test.

Instead, the coverage test now imports the repository-owned JSON fixture directly,
and only the dedicated Harness source-conformance tsconfig enables
`resolveJsonModule`.

This narrows the test dependency boundary and keeps the evidence deterministic and
self-contained.

## 16. Final reviewed conformance head

The final reviewed conformance head is:

```text
46daba5306f4773fcc6f2b9a0927f9e67df6a2f1
```

Exact-head normal CI:

```text
CI #582
run: 33760915397
PASS
```

Exact-head pinned Harness source conformance:

```text
Harness rc5 source conformance #524
run: 33760915449
PASS
```

The Harness job proves every source-conformance stage completed successfully:

```text
checkout safe-runtime: PASS
checkout exact pinned Harness: PASS
setup Node: PASS
enable pinned pnpm: PASS
build pinned Harness public type surface: PASS
safe-runtime frozen install: PASS
exact workspace projection: PASS
projection idempotence: PASS
exact rc5 binding/source-conformance TypeScript: PASS
real rc5 runtime conformance: PASS
```

Normal CI #582 also proves:

```text
pnpm install --frozen-lockfile: PASS
pnpm check:all: PASS
```

No schema, validator, Shared TCK, TypeScript strictness, frozen-lockfile policy,
supply-chain rule, architecture boundary, compatibility baseline, provider security
boundary, protocol authority boundary or fail-closed invariant was weakened to
obtain this result.

## 17. Production-code review result

The existing production implementation in
`packages/adapter-dsh/src/binding.ts` remains the accepted implementation.

Review confirms it already performs the Spec 0044 mapping:

```text
ToolExecution -> exact ToolPolicyRequest projection
ALLOW -> next()
DENY -> Harness deny
ASK -> Harness ask
handler throw/reject -> stable fail-closed deny
registration -> exact disposable
```

There is no justified production rewrite for M4-040 after the conformance evidence
closed all required cases.

## 18. Adapter package-stage boundary

`@dsh-safe/adapter-dsh` currently records:

```text
PACKAGE_STAGE = "M2-ADAPTER-CONFORMANCE"
```

M4-040 does not require promoting that package marker. This Gate accepts M4 usage of
an already-accepted M2 Adapter seam; it does not redefine the Adapter package as a
new M4 production implementation.

Changing the package marker merely to mirror the roadmap Gate would overstate the
architectural ownership of M4-040 and is therefore not part of this acceptance.

## 19. Pull request state at acceptance

At the final reviewed conformance head, PR #3 is:

```text
Open
Draft
mergeable: true
head: 46daba5306f4773fcc6f2b9a0927f9e67df6a2f1
base: main@57430273e065be8d38807d67b175fa154c801d43
reviews: none
review threads: none
```

The PR description contains stale historical Gate text and is not treated as current
engineering authority.

PR #3 merge remains unauthorized without explicit user authorization.

## 20. DeepSeek Harness authority boundary

DeepSeek Harness remains Adapter/source-conformance evidence only.

Pinned source facts used here do not define portable:

- Capability names;
- Resource semantics;
- Subject lineage;
- policy precedence;
- Lease validity/selection/consumption;
- GuaranteeLevel semantics;
- durable audit record shape;
- final execution success semantics.

Those remain safe-runtime protocol authority and later-Gate responsibilities.

## 21. Explicit non-claims

M4-040 does not:

- implement M4-041 monotonic `ctx.tools.guard()` hard enforcement;
- claim listener order as a security boundary;
- claim `tool-enforced` from the pre-execute waterfall alone;
- implement M4-042 approval routing;
- observe M4-043 authoritative final `tools/result` as this Gate's output;
- implement M4-044 approval-subsystem uniqueness beyond not adding a duplicate path;
- implement M4-045 audit redaction;
- aggregate multiple classifier capability requirements;
- resolve execution-root/provider operands;
- select, reserve or consume Leases;
- construct complete CapabilityDecision/Receipt records;
- create a new DSH plugin package;
- change public protocol schemas/types;
- change the pinned Harness baseline;
- authorize M4-041+ or M4-050+ before governance closure;
- authorize M5, M6, M10, M13 or M15 work;
- authorize PR #3 merge.

## 22. Current Gate decision

Decision:

```text
M4-036 governance: CLOSED

M4-040 protocol-first: CLOSED
M4-040 existing production Adapter binding: CONFORMING / NO REWRITE REQUIRED
M4-040 source-conformance/hardening: ACCEPTED
M4-040 final reviewed implementation/conformance head: 46daba5306f4773fcc6f2b9a0927f9e67df6a2f1
M4-040 acceptance audit: RECORDED / EXACT-HEAD VERIFICATION PENDING

M4-040 final governance: NOT AUTHORIZED YET
M4-041+: NOT AUTHORIZED YET
M4-050+: NOT AUTHORIZED
M5: NOT AUTHORIZED
M6: NOT AUTHORIZED
M10: NOT AUTHORIZED BY THIS GATE
M13: NOT AUTHORIZED
M15: NOT AUTHORIZED
PR #3 merge: NOT AUTHORIZED
```

The next permitted action is only exact-head normal CI + exact pinned Harness rc5
source-conformance verification of this audit commit. If and only if that audit head
is dual-green, M4-040 final governance may update the roadmap/handoff records and
make M4-041 the next protocol-first Gate.
