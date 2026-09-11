# M4-025 — Deterministic Guarantee Level Assignment

Status: **DRAFT NORMATIVE SPECIFICATION**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-025 P0 — guarantee level`  
Depends on: Core §3.2 GuaranteeLevel, M4-024 Decision/Receipt construction  
Separated from: M4-030+ Lease lifecycle, M4-040+ PEP integration, M6 execution isolation

## 1. Purpose

M4-025 defines a deterministic, runtime-independent assignment profile for the
existing protocol `GuaranteeLevel` vocabulary:

```text
advisory
tool-enforced
provider-enforced
process-isolated
```

The Gate does **not** add new wire values and does not change the existing
Decision or Receipt schemas. It answers one narrow question:

> Given a trusted, action-scoped projection of the enforcement boundary that is
> actually active for the governed capability/resource, what is the strongest
> GuaranteeLevel that Safe Runtime may truthfully record?

M4-025 closes the trust gap deliberately left by M4-024. M4-024 can validate and
copy a supplied GuaranteeLevel, but it cannot decide whether that value is true.
M4-025 defines the admissibility and downgrade rules for the trusted source of
that input.

## 2. Security principle

GuaranteeLevel is determined by **active enforcement**, not by component
existence, package names, configuration labels or optimistic feature detection.

The following implications are invalid:

```text
tools/pre-execute exists
  != tool-enforced

ctx.fs exists
  != provider-enforced

ctx.subprocess exists
  != provider-enforced

package name contains "sandbox"
  != process-isolated

sandbox provider reports "full"
  != independently verified process isolation

worker thread exists
  != process-isolated

container exists
  != automatically process-isolated for every capability/resource
```

A stronger claim requires evidence that the relevant boundary is actually
selected for the action, is complete for the claimed capability/resource scope,
and is trusted at the deployment/composition boundary.

## 3. Existing authority retained

### 3.1 GuaranteeLevel wire vocabulary

The authoritative v1alpha1 enum already exists in:

```text
packages/protocol/src/common.ts
schemas/v1alpha1/defs.schema.json
```

M4-025 does not add or remove enum values.

### 3.2 Core semantics

Core §3.2 remains authoritative:

```text
advisory
  matching/prompting/audit only; equivalent bypass paths may exist

tool-enforced
  enforced inside the governed Tool Pipeline; host/plugin bypass may remain

provider-enforced
  enforced by a controlled FS/Process/Network provider boundary

process-isolated
  host privileges are restricted by an OS/container/VM/microVM/isolated-runtime
  boundary
```

M4-025 narrows how those labels may be assigned in the M4 Capability Broker. It
must not reinterpret an availability fact as an enforcement fact.

### 3.3 Per-action scope

A GuaranteeLevel produced by this profile is scoped to the **governed action and
its capability/resource**. It is not a deployment-wide marketing claim.

For example, a `process-isolated` assignment for one `fs.write` action means the
verified process boundary independently constrains the relevant filesystem
capability/resource for that action. It does not imply that network, secrets,
devices or unrelated host resources are also isolated unless their own actions
have equivalent evidence.

## 4. Ordering relative to M4-024

The implementation milestones remain:

```text
M4-021 policy evaluation
  -> M4-022 Lease candidate lookup
  -> M4-023 approval routing
  -> M4-024 Decision/Receipt record primitive
  -> M4-025 trusted GuaranteeLevel assignment semantics
  -> M4-030+ Lease lifecycle
  -> M4-040+ PEP integration
```

This ordering does not permit production composition to let arbitrary callers
choose M4-024 `guaranteeLevel`. Once M4-025 is accepted, production composition
MUST obtain that field from an accepted M4-025 assignment or an explicitly
versioned equivalent that proves the same semantics.

M4-025 itself does not reconstruct the M4-024 records and does not execute an
action.

## 5. Evidence-source boundary

### 5.1 Trusted projection, not raw untrusted input

M4-025 consumes a portable `GuaranteeEvidenceProjection`. The projection is a
small, runtime-independent description of already established enforcement facts.

The projection MUST be created by trusted orchestration/deployment code. It MUST
NOT be directly populated from:

```text
model output
tool arguments
policy free text
provider display names
package names
unverified environment variables
untrusted plugin metadata
```

The TypeScript primitive must still defend against hostile runtime values that
bypass static typing, but runtime shape validation does not magically establish
the provenance of the facts.

### 5.2 Adapter facts are inputs to composition, not automatic guarantees

DeepSeek Harness rc5 remains compatibility evidence only.

In particular:

- `toolsPreExecute: true` proves availability, not action-specific mandatory
  enforcement;
- `filesystemProviderSeam: true` proves mediation can exist, not that a policy
  fence is active;
- `subprocessProviderSeam: true` proves a replaceable subprocess seam, not host
  filesystem/network confinement;
- `fs-sandbox` source proves mutation-fence behavior for calls that traverse the
  provider, but not generic process isolation;
- a sandbox provider `full` report is still provider-reported metadata and may
  come from an operator-supplied runner assertion;
- workflow worker threads are explicitly not a security boundary.

A composition layer may translate these facts into the M4-025 projection only
when it also knows the selected action path and the deployment evidence required
by the relevant profile.

## 6. Logical input

```text
GuaranteeAssignmentInput {
  profile: "M4-025_GUARANTEE_ASSIGNMENT_V1"
  evidence: GuaranteeEvidenceProjection
}

GuaranteeEvidenceProjection {
  isolation: ProcessIsolationEvidence
  provider: ProviderEnforcementEvidence
  tool: ToolEnforcementEvidence
}
```

All three evidence slots are required. Absence is represented explicitly by a
valid `NONE` state rather than by omitting fields. This prevents future callers
from accidentally turning a missing security fact into an implicit positive or
negative claim.

The projection contains no raw provider objects, filesystem targets, process
handles, secrets, policy documents, tool arguments, exception objects or
platform-specific runtime types.

## 7. Tool enforcement evidence

`ToolEnforcementEvidence` is exactly one of:

```text
{ state: "NONE" }

{ state: "AVAILABLE_ONLY" }

{
  state: "ENFORCING"
  authorizationBinding: "EXACT_ACTION"
  dispatchControl: "MANDATORY"
}
```

### 7.1 NONE

`NONE` means no tool-level enforcement fact is claimed for the action.

### 7.2 AVAILABLE_ONLY

`AVAILABLE_ONLY` means a tool-policy/guard seam exists, but the trusted
composition does not prove that this exact action must traverse an
authorization-bound pre-dispatch control.

Availability alone MUST NOT produce `tool-enforced`.

### 7.3 ENFORCING

Tool evidence qualifies for `tool-enforced` only when:

```text
state                == ENFORCING
authorizationBinding == EXACT_ACTION
dispatchControl      == MANDATORY
```

`EXACT_ACTION` means the authorization fact remains bound to the action that will
be dispatched. If policy-relevant action data is rewritten after authorization,
the runtime must re-evaluate or reject under Core §8.3; otherwise this fact is
not true.

`MANDATORY` means dispatch cannot proceed through the governed Tool Pipeline
without passing the enforcement decision. Tool visibility/restriction alone is
not authorization.

This level intentionally does not claim that trusted in-process plugin code or a
direct host API call cannot bypass the Tool Pipeline.

## 8. Provider enforcement evidence

`ProviderEnforcementEvidence` is exactly one of:

```text
{ state: "NONE" }

{ state: "MEDIATED_ONLY" }

{
  state: "ENFORCING"
  authorizationBinding: "EXACT_CAPABILITY_RESOURCE"
  traversal: "MANDATORY" | "BYPASSABLE"
  coverage: "COMPLETE" | "PARTIAL"
  resourceIdentity: "PROVIDER_CANONICAL" | "NON_CANONICAL"
  deploymentEvidence: "VERIFIED" | "UNVERIFIED"
}
```

### 8.1 MEDIATED_ONLY is not enforcement

A provider seam that resolves, reads, spawns or otherwise performs an operation
without an active capability/resource policy fence is mediation only.

`MEDIATED_ONLY` MUST NOT produce `provider-enforced`.

### 8.2 Qualification requirements

Provider evidence qualifies for `provider-enforced` only when all conditions
hold:

```text
state                == ENFORCING
authorizationBinding == EXACT_CAPABILITY_RESOURCE
traversal            == MANDATORY
coverage             == COMPLETE
resourceIdentity     == PROVIDER_CANONICAL
deploymentEvidence   == VERIFIED
```

Each condition is security-relevant:

- `EXACT_CAPABILITY_RESOURCE`: the enforced provider operation is bound to the
  same governed capability/resource, not merely a tool name or display path;
- `MANDATORY`: an equivalent effect path for the action cannot bypass the
  selected enforcing provider within the claimed scope;
- `COMPLETE`: the provider is not self-reporting or known to have partial
  enforcement for the claimed capability/resource;
- `PROVIDER_CANONICAL`: identity/containment is based on provider-owned canonical
  semantics, not `startsWith`, presentation paths or guessed opaque tokens;
- `VERIFIED`: trusted deployment/composition evidence establishes that the
  enforcing provider/profile is active. A raw provider string such as `full`
  does not satisfy this field by itself.

### 8.3 Valid weaker provider states

A structurally valid provider record with any of the following is a valid but
non-qualifying stronger-boundary candidate:

```text
traversal          == BYPASSABLE
coverage           == PARTIAL
resourceIdentity   == NON_CANONICAL
deploymentEvidence == UNVERIFIED
```

M4-025 may then evaluate the weaker tool boundary. It MUST NOT silently upgrade
such provider evidence.

### 8.4 Harness rc5 examples

The pinned provider probe implies:

```text
fs-local cwd
  -> no containment guarantee

plain ctx.fs / ctx.subprocess seam
  -> MEDIATED_ONLY unless an enforcing provider is actually selected

fs-sandbox mutation call traversing an active verified fence
  -> can contribute provider-enforced evidence for that mutation scope

local subprocess filesystem effects
  -> cannot claim provider-enforced merely because ctx.fs is replaced

sandbox enforcement: partial
  -> coverage PARTIAL ceiling

sandbox enforcement: full from provider self-report only
  -> deploymentEvidence UNVERIFIED until separate deployment evidence exists
```

## 9. Process isolation evidence

`ProcessIsolationEvidence` is exactly one of:

```text
{ state: "NONE" }

{
  state: "NON_SECURITY_BOUNDARY"
  mechanism: "PLAIN_PROCESS" | "WORKER_THREAD" | "SAME_WORLD_SANDBOX"
}

{
  state: "ENFORCING"
  boundary:
    "OS_PROCESS_SANDBOX" |
    "CONTAINER" |
    "VM" |
    "MICROVM" |
    "REMOTE_ISOLATED_RUNTIME"
  authorizationBinding: "EXACT_CAPABILITY_RESOURCE"
  coverage: "COMPLETE" | "PARTIAL"
  directHostBypass: "BLOCKED" | "NOT_BLOCKED"
  deploymentEvidence: "VERIFIED" | "UNVERIFIED"
}
```

### 9.1 NON_SECURITY_BOUNDARY

The following mechanisms are explicitly valid observations but do not qualify as
Safe Runtime `process-isolated` evidence by themselves:

```text
PLAIN_PROCESS
WORKER_THREAD
SAME_WORLD_SANDBOX
```

A plain child process with the same host credentials does not become a host
privilege boundary merely because it has another PID. A worker thread is not a
security isolation boundary. The pinned rc5 same-world sandbox is a file-effect
provider mechanism, not universal process isolation.

### 9.2 Qualification requirements

Isolation evidence qualifies for `process-isolated` only when all conditions
hold:

```text
state                == ENFORCING
boundary             == one accepted security-boundary value
authorizationBinding == EXACT_CAPABILITY_RESOURCE
coverage             == COMPLETE
directHostBypass     == BLOCKED
deploymentEvidence   == VERIFIED
```

The boundary name alone is insufficient.

For example, `CONTAINER` does not qualify if the container is privileged, mounts
unrestricted host resources, or otherwise fails to block direct host bypass for
the claimed capability/resource. Similarly, a VM/microVM/remote runtime must be
verified for the relevant action scope; its product category is not a guarantee.

### 9.3 Valid weaker isolation states

A structurally valid ENFORCING record with:

```text
coverage             == PARTIAL
directHostBypass     == NOT_BLOCKED
deploymentEvidence   == UNVERIFIED
```

is valid evidence of a weaker/insufficient isolation candidate. M4-025 then
checks provider and tool evidence. It MUST NOT promote the record to
`process-isolated`.

## 10. Deterministic strongest-boundary precedence

For this profile only, the assignment order is:

```text
process-isolated
  > provider-enforced
  > tool-enforced
  > advisory
```

The evaluator checks the strongest boundary first.

```text
1. validate outer input/profile/evidence container
2. inspect isolation evidence
3. if isolation qualifies -> process-isolated; stop
4. otherwise inspect provider evidence
5. if provider qualifies -> provider-enforced; stop
6. otherwise inspect tool evidence
7. if tool qualifies -> tool-enforced; stop
8. otherwise -> advisory
```

This order is not a hidden authorization precedence rule. Authorization has
already been resolved by M4-021 through M4-024. M4-025 only classifies the
strength of the active enforcement boundary.

## 11. Advisory assignment

`advisory` is an explicit valid result, not an error.

It is assigned when the complete evidence projection is structurally valid but
no stronger boundary qualifies.

Examples include:

```text
all states NONE
only tool AVAILABLE_ONLY
provider MEDIATED_ONLY with no tool enforcement
provider PARTIAL/UNVERIFIED with no qualifying tool
plain process only
worker thread only
same-world sandbox only
container category present but deployment evidence unverified
```

A later deployment policy may require a minimum GuaranteeLevel and reject an
`advisory` action. **M4-025 does not define minimum-level negotiation or reject an
authorization merely because the assigned level is weak.** That is a later
composition/PEP policy concern.

## 12. Successful output

Success shape:

```text
{
  status: "ASSIGNED"
  guaranteeLevel: GuaranteeLevel
  reasonCode:
    "GUARANTEE_ASSIGNED_ADVISORY" |
    "GUARANTEE_ASSIGNED_TOOL_ENFORCED" |
    "GUARANTEE_ASSIGNED_PROVIDER_ENFORCED" |
    "GUARANTEE_ASSIGNED_PROCESS_ISOLATED"
}
```

The `reasonCode` describes the selected boundary only. M4-025 does not copy raw
evidence, platform names, provider identifiers, process IDs or deployment
attestation text into the result.

The result MUST be detached and immutable.

## 13. Failure contract

M4-025-owned failures are:

```text
GUARANTEE_ASSIGNMENT_INPUT_INVALID
GUARANTEE_ASSIGNMENT_PROFILE_INVALID
GUARANTEE_ASSIGNMENT_EVIDENCE_INVALID
GUARANTEE_ASSIGNMENT_ISOLATION_EVIDENCE_INVALID
GUARANTEE_ASSIGNMENT_PROVIDER_EVIDENCE_INVALID
GUARANTEE_ASSIGNMENT_TOOL_EVIDENCE_INVALID
```

Failure shape:

```text
{
  status: "FAIL_CLOSED"
  stage: "INPUT" | "EVIDENCE" | "ISOLATION" | "PROVIDER" | "TOOL"
  reasonCode: <stable M4-025 reason>
}
```

A malformed stronger-boundary record MUST fail closed. It MUST NOT be silently
ignored in order to return a weaker guarantee.

This distinction is important:

```text
valid but non-qualifying stronger evidence
  -> continue to a weaker boundary

malformed/unreadable stronger evidence
  -> FAIL_CLOSED
```

Failure output MUST NOT echo attacker-controlled values, provider strings,
platform details, exception messages or stacks.

## 14. Runtime hostile-object boundary

Portable fixtures are plain JSON, but host-language callers may pass Proxies,
accessors, inherited values, symbols or coercion hooks.

The TypeScript implementation, once authorized, MUST:

- accept runtime input as `unknown` at the defensive boundary;
- validate exact own-key domains for each consumed record;
- read consumed fields only through own data-property descriptors;
- reject accessor-backed security facts without executing getters;
- reject unexpected symbol fields;
- fail closed on revoked Proxies, ownKeys traps and unreadable descriptors;
- use exact scalar comparisons only;
- never call `String(value)`, implicit template coercion, `valueOf`,
  `Symbol.toPrimitive`, locale conversion or generic JSON serialization to
  interpret security facts;
- not retain caller-owned records in output;
- recursively freeze the successful/failure result.

## 15. Short-circuit and non-traversal requirements

The strongest qualifying boundary ends evaluation.

Therefore:

```text
qualifying process-isolated evidence
  -> provider/tool values are not read or traversed

non-qualifying valid isolation + qualifying provider evidence
  -> tool value is not read or traversed
```

This is normative observable behavior for hostile host-language inputs.

The outer evidence object may be key-enumerated to verify its exact key domain,
but irrelevant nested evidence records must not be materialized, cloned,
stringified or inspected after a stronger boundary has already qualified.

This prevents irrelevant malicious getters/proxies from becoming side effects of
an already complete classification and matches the repository's established
fail-closed/short-circuit discipline.

## 16. No host probing inside the primitive

M4-025 assignment is pure and deterministic. It MUST NOT directly call:

```text
Date.now / clock APIs
randomness
node:fs
child_process / subprocess
network APIs
container runtime APIs
Harness services
provider methods
platform sandbox probes
```

Environment probing and acceptance belong to trusted deployment/composition
code. M4-025 consumes only the resulting bounded projection.

This separation keeps the protocol portable and prevents Linux/macOS/Windows or
one Harness implementation from defining core semantics.

## 17. No Adapter/Harness dependency in capability-broker core

The M4-025 TypeScript reference implementation, once authorized, belongs in
`@dsh-safe/capability-broker` and MAY import the protocol `GuaranteeLevel` type.

It MUST NOT import concrete:

```text
@dsh-safe/adapter-dsh
@deepseek-ai/*
```

The runtime composition layer is responsible for adapting platform/Adapter facts
to the portable trusted projection.

## 18. Interaction with M4-024

After M4-025 is accepted, production composition should conceptually perform:

```text
guarantee = assignGuaranteeLevel(trustedEvidence)

if guarantee FAIL_CLOSED
  -> do not construct authoritative M4-024 records with a guessed level

if guarantee ASSIGNED
  -> pass guarantee.guaranteeLevel into M4-024 issuance context
```

M4-025 does not modify M4-024 identifiers, timestamps, routing results or record
fields.

A caller MUST NOT override a successful M4-025 assignment with a stronger
caller-chosen enum before M4-024 construction.

## 19. Explicit non-goals

M4-025 does not implement:

- PEP registration or execution;
- Tool guard wiring;
- provider policy enforcement;
- OS sandbox creation;
- container/microVM lifecycle;
- platform attestation generation;
- minimum GuaranteeLevel policy negotiation;
- Lease validity/consume/revocation/attenuation;
- action execution;
- audit persistence;
- receipt resultDigest semantics;
- secret/network broker enforcement;
- M6 Workspace Transaction;
- M14 isolated plugin host.

A green M4-025 assignment primitive proves deterministic classification of
trusted enforcement facts. It does not prove that a deployment has actually
installed those enforcement mechanisms.

## 20. Portable fixture requirements

The portable corpus MUST cover at minimum:

1. all-NONE -> advisory;
2. tool AVAILABLE_ONLY -> advisory;
3. exact mandatory tool enforcement -> tool-enforced;
4. provider mediation only -> no provider upgrade;
5. complete canonical mandatory verified provider -> provider-enforced;
6. provider PARTIAL / BYPASSABLE / NON_CANONICAL / UNVERIFIED downgrades;
7. verified complete process isolation -> process-isolated;
8. isolation PARTIAL / NOT_BLOCKED / UNVERIFIED downgrades;
9. plain process / worker thread / same-world sandbox never process-isolated;
10. provider self-report alone never process-isolated;
11. strongest-boundary precedence;
12. malformed stronger evidence fails instead of falling through;
13. unknown profile/state/mechanism/boundary fails closed;
14. missing/extra fields fail closed;
15. no implicit boolean/string coercion.

Hostile-runtime tests in the later implementation Gate MUST additionally prove
getter/proxy non-execution, strongest-boundary short-circuiting, detachment and
immutability.

## 21. Protocol-first change boundary

The M4-025 protocol-first Gate is intentionally narrow. Relative to the M4-024
final-governance head, the allowed change set is:

```text
specs/0036-m4-guarantee-assignment.md
fixtures/guarantee-assignment/cases.json
docs/handoff/CURRENT.md
```

No production M4-025 TypeScript is authorized before the protocol-first exact
head is dual-green.

The Gate MUST NOT modify:

```text
protocol GuaranteeLevel enum
Decision/Receipt schemas
M4-024 implementation
Adapter/Harness baseline
lockfile/dependencies
Shared TCK semantics
M4-030+
M4-040+
M6
```

If protocol review proves that an existing Core/schema statement is actually
inconsistent, that inconsistency must be documented and reviewed explicitly
rather than silently repaired inside implementation code.

## 22. Protocol-first acceptance gate

Before M4-025 production implementation is authorized, one exact head containing
only the allowed protocol-first files MUST satisfy:

1. normal CI PASS;
2. exact pinned Harness rc5 source-conformance PASS;
3. portable corpus structure/case IDs mechanically validated;
4. no review/review-thread blocker;
5. PR #3 remains Draft;
6. no M4-030+, M4-040+ or M6 implementation begins.

Only after that same-head dual-green evidence may production implementation of
the M4-025 assignment primitive begin.

## 23. Informative security references

These references support the conservative design rationale but do not override
Safe Runtime normative semantics:

- NIST SP 800-207, *Zero Trust Architecture* — distinguishes policy decision
  from the Policy Enforcement Point that actually gates access to resources.
- NIST SP 800-190, *Application Container Security Guide* — documents that
  container isolation strength depends on host/runtime configuration and that
  containers do not provide the same security boundary as VMs merely by
  category/name.
- NISTIR 8176, *Security Assurance Requirements for Linux Application Container
  Deployments* — emphasizes assurance requirements for security mechanisms to
  meet their intended security objectives.

The Safe Runtime project remains stricter than simply inheriting terminology
from those documents: a GuaranteeLevel is assigned only from this profile's
explicit action-scoped evidence semantics.
