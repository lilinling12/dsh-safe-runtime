# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK and accepted exact-head evidence
> remain semantic authority.

## Snapshot

- Recorded at: `2026-09-01`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M4 — Capability Broker v0.1`
- Active pull request: `#3 — feat(policy): begin M4 capability broker`
- Branch: `feat/m4-capability-broker`
- Base: `main@57430273e065be8d38807d67b175fa154c801d43`
- M4-001 through M4-014: **GOVERNANCE CLOSED**
- M4-020 through M4-024: **GOVERNANCE CLOSED**
- M4-025 guarantee level: **AUTHORIZED / PROTOCOL-FIRST IN PROGRESS**
- M4-025 production implementation: **NOT AUTHORIZED until protocol-first exact head is dual-green**
- M4-030+, M4-040+ and M6: **NOT AUTHORIZED**

Live GitHub state overrides this file.

## Live ancestry note

The long-running PR retains known ancestry-only drift relative to `main`. The
reconciled merge-base `65870612d039ce026a6952c16d5e069b11bd24a7` and
`main@57430273e065be8d38807d67b175fa154c801d43` point to the same source tree
`ed0c142bf6bbd00f607cc169222f0bf67057fca5`.

Do not rebase, force-update, squash, or rewrite accepted ancestry merely to
change GitHub compare counters.

## Compatibility baseline

DeepSeek Harness remains Adapter compatibility evidence only:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

Harness behavior MUST NOT define portable GuaranteeLevel semantics. Availability
or provider metadata from Harness may contribute trusted composition evidence,
but package names, feature flags or provider strings are never sufficient by
themselves to upgrade a guarantee.

## M4-024 final closure

Final-governance exact head:

```text
08acc32c3c7d789c5a0d2c591529414d95bcf39e
```

Exact-head evidence:

- normal CI #496 / run `33384319578`: PASS;
- exact Harness rc5 source-conformance #438 / run `33384319584`: PASS;
- pinned Harness public type build: PASS;
- reproducible safe-runtime install: PASS;
- exact workspace projection: PASS;
- projection idempotence: PASS;
- exact-source TypeScript binding: PASS;
- real rc5 runtime conformance: PASS.

Final governance net delta from acceptance-record head
`bfb42d9600b223937081f8ebaf19627ea4282bbc` was exactly:

```text
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md   # +61 / -0 append-only
docs/roadmap.md           # +1 / -1; only M4-024 acceptance marker
```

PR #3 remained Open, Draft and mergeable with no review/review-thread blocker.
No merge is authorized.

Therefore:

```text
M4-024: GOVERNANCE CLOSED
M4-025: P0 guarantee level — AUTHORIZED / PROTOCOL-FIRST
```

## M4-025 authority research

Existing v1alpha1 GuaranteeLevel authority is already stable and MUST NOT be
changed by this Gate:

```text
packages/protocol/src/common.ts
schemas/v1alpha1/defs.schema.json
specs/0001-safe-runtime-core.md §3.2
```

Existing values are exactly:

```text
advisory
tool-enforced
provider-enforced
process-isolated
```

M4-025 is therefore an **assignment/admissibility Gate**, not an enum-design
Gate.

Research also reconciled:

```text
docs/architecture.md
docs/compatibility/deepseek-harness-0.1.0-rc.5.md
docs/compatibility/deepseek-harness-0.1.0-rc.5-provider-probe.md
packages/adapter-dsh/src/feature-matrix.ts
packages/adapter-dsh/src/ports.ts
packages/adapter-dsh/src/provider-ports.ts
specs/0035-m4-decision-receipt-construction.md
```

Critical retained negative facts include:

- `tools/pre-execute` availability is not proof that an exact action cannot bypass enforcement;
- `ctx.fs` / `ctx.subprocess` existence is mediation availability, not provider enforcement;
- `fs-local` cwd is not containment;
- local subprocess filesystem access does not traverse `ctx.fs`;
- `fs-sandbox` is a mutation provider fence, not read/network/process isolation;
- sandbox `full` is provider-reported scope metadata and may originate from an operator assertion;
- sandbox `partial` is a hard ceiling;
- workflow worker threads are not a security boundary;
- a plain child process is not process isolation merely because it has a separate PID.

## M4-025 normative draft

Protocol-first specification:

```text
specs/0036-m4-guarantee-assignment.md
```

Portable corpus:

```text
fixtures/guarantee-assignment/cases.json
```

Corpus profile:

```text
M4-025_GUARANTEE_ASSIGNMENT_V1
```

Portable cases: `30` (`GA-001` through `GA-030`).

## Guarantee assignment principle

GuaranteeLevel is action-scoped and is assigned from **active enforcement**, not
component existence, product/category names or optimistic configuration.

The deterministic strength order for this classification profile is:

```text
process-isolated
  > provider-enforced
  > tool-enforced
  > advisory
```

This is not authorization precedence. Authorization is already resolved by
M4-021 through M4-024. M4-025 only classifies the strongest proven enforcement
boundary for the governed capability/resource.

## Portable evidence projection

M4-025 consumes a trusted runtime-independent projection:

```text
GuaranteeAssignmentInput {
  profile: "M4-025_GUARANTEE_ASSIGNMENT_V1"
  evidence: {
    isolation: ProcessIsolationEvidence
    provider: ProviderEnforcementEvidence
    tool: ToolEnforcementEvidence
  }
}
```

All three evidence slots are explicit. Missing facts use a valid `NONE` state;
omission is malformed rather than silently interpreted.

The primitive does not receive raw provider objects, filesystem targets,
subprocess handles, secrets, policy documents, tool arguments, environment
variables or platform-specific runtime types.

## Tool-enforced qualification

Tool evidence qualifies only when it explicitly proves:

```text
state                = ENFORCING
authorizationBinding = EXACT_ACTION
dispatchControl      = MANDATORY
```

`AVAILABLE_ONLY` remains advisory unless a stronger boundary qualifies.

This deliberately leaves direct trusted plugin/host API bypass outside the
`tool-enforced` claim.

## Provider-enforced qualification

Provider evidence qualifies only when all are true:

```text
state                = ENFORCING
authorizationBinding = EXACT_CAPABILITY_RESOURCE
traversal            = MANDATORY
coverage             = COMPLETE
resourceIdentity     = PROVIDER_CANONICAL
deploymentEvidence   = VERIFIED
```

Valid but weaker evidence such as:

```text
BYPASSABLE
PARTIAL
NON_CANONICAL
UNVERIFIED
```

does not fail merely for being weak; it cannot produce provider-enforced and the
evaluator may continue to a weaker boundary.

A malformed or unreadable provider record, however, MUST fail closed rather than
be ignored.

## Process-isolated qualification

Accepted security-boundary categories are intentionally explicit:

```text
OS_PROCESS_SANDBOX
CONTAINER
VM
MICROVM
REMOTE_ISOLATED_RUNTIME
```

The category name alone never qualifies. Assignment additionally requires:

```text
authorizationBinding = EXACT_CAPABILITY_RESOURCE
coverage             = COMPLETE
directHostBypass     = BLOCKED
deploymentEvidence   = VERIFIED
```

Explicit non-security-boundary observations are:

```text
PLAIN_PROCESS
WORKER_THREAD
SAME_WORLD_SANDBOX
```

Those may be valid facts but never qualify as `process-isolated` by themselves.

## Action-scoped meaning

A GuaranteeLevel is scoped to the exact governed action/capability/resource.

For example, proving process isolation for one filesystem mutation does not
silently claim that network, secret, device or unrelated host access is also
isolated. Each governed action must carry evidence appropriate to its own
capability/resource scope.

This prevents a deployment from turning one strong sandbox property into an
unbounded global marketing claim.

## Valid weakness versus malformed evidence

M4-025 makes a strict distinction:

```text
structurally valid but non-qualifying stronger evidence
  -> continue to weaker boundary

malformed / unknown / unreadable stronger evidence
  -> FAIL_CLOSED
```

A broken process-isolation record MUST NOT be ignored merely because provider or
tool evidence could otherwise produce a weaker label.

## Successful result

```text
{
  status: "ASSIGNED"
  guaranteeLevel: GuaranteeLevel
  reasonCode:
    GUARANTEE_ASSIGNED_ADVISORY |
    GUARANTEE_ASSIGNED_TOOL_ENFORCED |
    GUARANTEE_ASSIGNED_PROVIDER_ENFORCED |
    GUARANTEE_ASSIGNED_PROCESS_ISOLATED
}
```

The result contains no provider names, platform identifiers, process IDs,
attestation text or raw evidence.

## Failure result

Stable M4-025 failures are:

```text
GUARANTEE_ASSIGNMENT_INPUT_INVALID
GUARANTEE_ASSIGNMENT_PROFILE_INVALID
GUARANTEE_ASSIGNMENT_EVIDENCE_INVALID
GUARANTEE_ASSIGNMENT_ISOLATION_EVIDENCE_INVALID
GUARANTEE_ASSIGNMENT_PROVIDER_EVIDENCE_INVALID
GUARANTEE_ASSIGNMENT_TOOL_EVIDENCE_INVALID
```

Failure output is bounded and sanitized and MUST NOT echo attacker-controlled
values/errors.

## Hostile-runtime requirements for later implementation

Once production implementation is authorized, it must:

- accept runtime values defensively as unknown;
- use exact own-key domains;
- consume security facts through own data-property descriptors;
- reject accessors without executing getters;
- reject symbol fields;
- fail closed on revoked Proxies / ownKeys / descriptor traps;
- use exact scalar comparisons only;
- never call String(value), valueOf, Symbol.toPrimitive or generic JSON serialization on security discriminants;
- detach and freeze output;
- short-circuit after the strongest qualifying boundary so irrelevant nested hostile records are not traversed.

## Pure deterministic boundary

M4-025 assignment itself MUST NOT probe the host or runtime. It cannot call:

```text
clock/randomness
node:fs
subprocess
network
container APIs
Harness services
provider methods
platform sandbox probes
```

Deployment/platform probing belongs to trusted composition code, which then
projects bounded evidence into this portable profile.

This separation is required for long-term maintainability and non-TypeScript /
non-Harness reimplementation.

## M4-024 integration boundary

Once M4-025 is implementation-accepted, production composition should
conceptually be:

```text
guarantee = assignGuaranteeLevel(trustedEvidence)

if FAIL_CLOSED:
  do not construct authoritative M4-024 records with a guessed level

if ASSIGNED:
  use guarantee.guaranteeLevel as M4-024 issuance.guaranteeLevel
```

Callers MUST NOT override the assigned result with a stronger arbitrary enum.

M4-025 does not modify M4-024 record fields or reconstruct Decision/Receipt.

## Protocol-first exact file scope

Relative to M4-024 final-governance head
`08acc32c3c7d789c5a0d2c591529414d95bcf39e`, this Gate may contain exactly:

```text
specs/0036-m4-guarantee-assignment.md
fixtures/guarantee-assignment/cases.json
docs/handoff/CURRENT.md
```

It MUST NOT contain:

```text
production M4-025 TypeScript
GuaranteeLevel enum/schema changes
M4-024 implementation changes
Adapter/Harness baseline changes
Shared TCK changes
dependency/lockfile changes
M4-030+
M4-040+
M6
```

## Protocol-first Gate

Production M4-025 implementation remains **NOT AUTHORIZED** until one exact head
with only the three allowed protocol-first files reaches:

1. normal CI PASS;
2. exact pinned Harness rc5 source-conformance PASS;
3. mechanical corpus validation confirms exactly 30 unique sequential IDs
   `GA-001` through `GA-030` and valid JSON;
4. no review/review-thread blocker.

Only after same-head dual-green may M4-025 production implementation begin.

## Boundaries that remain enforced

- Protocol/Schema/Core remain authority over the enum and high-level meaning.
- M4-025 cannot manufacture deployment attestation.
- Provider mediation is not equivalent to provider enforcement.
- Process category/name is not equivalent to process isolation.
- Minimum required guarantee negotiation remains later composition/PEP work.
- M4-030+, M4-040+ and M6 remain unauthorized.
- PR #3 remains Draft; no merge without explicit user authorization.

## Resume instruction

1. refresh PR #3 exact head/base/reviews/threads;
2. compare current head with M4-024 final-governance `08acc32c...`;
3. require exactly Spec 0036, guarantee-assignment corpus and CURRENT;
4. mechanically validate corpus JSON, count and `GA-001..GA-030` uniqueness/order;
5. review Spec 0036 for accidental early PEP/platform/attestation semantics;
6. require exact-head normal CI + pinned Harness rc5 source-conformance PASS;
7. only then declare M4-025 PROTOCOL-FIRST GATE CLOSED and authorize production implementation;
8. keep M4-030+, M4-040+, M6 and PR merge unauthorized.
