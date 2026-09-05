# M4-025 Acceptance Audit — Deterministic Guarantee Level Assignment

Status: **IMPLEMENTATION ACCEPTED / ACCEPTANCE RECORD PENDING EXACT-HEAD VERIFICATION**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-025 P0 — guarantee level`

## 1. Accepted protocol-first authority

Normative profile:

```text
specs/0036-m4-guarantee-assignment.md
```

Portable corpus:

```text
fixtures/guarantee-assignment/cases.json
```

Protocol-first exact head:

```text
79c34ce92e420689cb416f1239a06f07f5d12de7
```

Relative to M4-024 final-governance head
`08acc32c3c7d789c5a0d2c591529414d95bcf39e`, the protocol-first delta was
exactly:

```text
docs/handoff/CURRENT.md
fixtures/guarantee-assignment/cases.json
specs/0036-m4-guarantee-assignment.md
```

No production TypeScript, protocol enum, schema, Shared TCK, Adapter/Harness
baseline, dependency, lockfile, M4-030+, M4-040+ or M6 change was present.

Protocol-first exact-head evidence:

- normal CI #499: PASS;
- Harness rc5 source-conformance #441: PASS;
- portable corpus: 30 canonical `GA-001` through `GA-030` cases.

Therefore production implementation was authorized only after the protocol-first
head reached same-head dual-green.

## 2. Accepted implementation head

Accepted implementation exact head:

```text
0fb296447256ba3d1918ec005326ac79eff2394c
```

Implementation delta from the protocol-first head is exactly five Capability
Broker files:

```text
packages/capability-broker/src/guarantee-assignment-hardening.test.ts
packages/capability-broker/src/guarantee-assignment-types.ts
packages/capability-broker/src/guarantee-assignment.test.ts
packages/capability-broker/src/guarantee-assignment.ts
packages/capability-broker/src/index.ts
```

No Adapter, Harness source-conformance baseline, schema, protocol wire enum,
Shared TCK, dependency, lockfile or later-Gate file changed.

## 3. Package / directory structure review

M4-025 follows the existing Capability Broker PDP-family layout:

```text
guarantee-assignment-types.ts
guarantee-assignment.ts
guarantee-assignment.test.ts
guarantee-assignment-hardening.test.ts
```

A new nested package/directory was deliberately not introduced. Existing
M4-022/M4-023/M4-024 security-sensitive primitives use the package-root
`types / implementation / tests / hardening` pattern. Keeping M4-025 in the same
family reduces navigation and contribution friction without creating a false
abstraction boundary.

The implementation also deliberately did not extract a generic hostile-object
validation framework. The M4-025 evidence state machine has distinct exact-key,
short-circuit and downgrade semantics; hiding them behind a broad reusable
validator would make security review harder and create coupling between otherwise
separate Gates.

## 4. Public API boundary

The package exports:

```text
assignGuaranteeLevel
GUARANTEE_ASSIGNMENT_PROFILE
GuaranteeAssignmentInput / Result / Failure types
GuaranteeEvidenceProjection
ToolEnforcementEvidence
ProviderEnforcementEvidence
ProcessIsolationEvidence
```

The runtime primitive accepts `unknown` despite the convenience input type. This
preserves static ergonomics for trusted callers while maintaining a real runtime
security boundary for JavaScript, `any`, deserialized or cross-plugin input.

The implementation imports only the protocol `GuaranteeLevel` type and does not
import `@dsh-safe/adapter-dsh`, concrete Harness packages, host filesystem,
subprocess, network, container or platform-sandbox APIs.

## 5. Accepted semantics

M4-025 assigns the strongest truthful action-scoped guarantee in this order:

```text
process-isolated
  > provider-enforced
  > tool-enforced
  > advisory
```

This is enforcement-strength classification only, not authorization precedence.

### 5.1 Tool qualification

`tool-enforced` requires exactly:

```text
state                = ENFORCING
authorizationBinding = EXACT_ACTION
dispatchControl      = MANDATORY
```

Tool-policy/guard availability alone remains advisory.

### 5.2 Provider qualification

`provider-enforced` requires exactly:

```text
state                = ENFORCING
authorizationBinding = EXACT_CAPABILITY_RESOURCE
traversal            = MANDATORY
coverage             = COMPLETE
resourceIdentity     = PROVIDER_CANONICAL
deploymentEvidence   = VERIFIED
```

Mediation alone, partial coverage, bypassable traversal, non-canonical identity
or unverified deployment evidence do not qualify.

### 5.3 Process-isolation qualification

`process-isolated` requires an accepted security-boundary category plus:

```text
authorizationBinding = EXACT_CAPABILITY_RESOURCE
coverage             = COMPLETE
directHostBypass     = BLOCKED
deploymentEvidence   = VERIFIED
```

Plain processes, worker threads and the pinned Harness same-world sandbox are
explicitly modeled as non-security-boundary observations and cannot produce
`process-isolated` by category/name alone.

### 5.4 Weak versus malformed evidence

A central accepted invariant is:

```text
valid but explicitly weaker evidence
  -> continue to a weaker boundary

malformed / unknown / unreadable evidence
  -> FAIL_CLOSED
```

The implementation does not treat malformed stronger evidence as permission to
fall through to a weaker guarantee.

## 6. Runtime hostile-object review

The accepted implementation:

- validates narrow exact own-key domains;
- rejects unexpected string/symbol fields;
- consumes fields through own data-property descriptors;
- does not execute accessor getters;
- does not use inherited values as authority;
- does not call `String(value)`, template coercion, `valueOf`,
  `Symbol.toPrimitive` or generic JSON serialization on security facts;
- fails closed on unreadable descriptor/ownKeys operations;
- fails closed on revoked Proxies;
- short-circuits after a qualifying stronger boundary;
- does not traverse provider/tool nested records after process isolation already
  qualifies;
- does not traverse tool nested records after provider enforcement qualifies;
- returns detached frozen success/failure records;
- does not echo attacker-controlled evidence or thrown error details.

## 7. CI-discovered revoked-Proxy defect and repair

The first complete implementation candidate was:

```text
da72f106627ec93d8d451c4a8e226a01525bf2dc
```

Normal CI #504 failed one hostile-runtime regression while all portable M4-025
cases passed. The exact diagnostic was a `TypeError` from:

```text
Array.isArray(revokedProxy)
```

inside the local `isRecord()` predicate.

This was a genuine runtime hardening defect: ECMAScript's array check can throw
for a revoked Proxy, so the primitive could leak a host exception instead of
returning the stable fail-closed contract.

The test was not weakened or removed. The implementation was corrected so the
array/meta-object check itself is inside the defensive boundary; an unreadable
or revoked object is classified as invalid evidence and returns the stable M4-025
failure.

Corrected implementation head:

```text
0fb296447256ba3d1918ec005326ac79eff2394c
```

The implementation delta remained the same five Broker files after the repair.

## 8. Exact-head quality evidence

For corrected accepted implementation head `0fb29644...`:

- normal CI #505: PASS;
- Harness rc5 source-conformance #447: PASS;
- frozen install: PASS;
- supply-chain policy: 124 entries PASS;
- architecture boundaries: PASS;
- 16-schema shape check: PASS;
- schema compatibility baseline: PASS;
- strict workspace TypeScript: PASS;
- test files: 51 PASS;
- tests: 976 PASS;
- M4-025 primary suite: 32 PASS;
- M4-025 hostile-runtime hardening suite: 10 PASS;
- oxlint: 0 errors, two pre-existing repository warnings;
- packed Shared TCK / external non-workspace consumer: 44 registered assets PASS;
- Harness pinned public type build: PASS;
- Harness reproducible install: PASS;
- exact workspace projection: PASS;
- projection idempotence: PASS;
- exact-source rc5 binding typecheck: PASS;
- real rc5 runtime conformance: PASS.

The two lint warnings are pre-existing repository warnings (`new Array(single)`
and thenable-shape warning) and are unrelated to M4-025. No M4-025 lint error or
new warning was accepted.

## 9. Compatibility / authority review

The implementation does not derive guarantee truth from Harness feature flags,
provider names or provider `full` strings. DeepSeek Harness rc5 remains
compatibility evidence only.

The accepted primitive classifies an already trusted portable projection. The
future composition layer remains responsible for proving that a concrete
selected tool/provider/isolation path is actually active for the action before it
constructs that projection.

This separation preserves portability to future Harness releases and to non-DSH
Adapters without making Safe Runtime Core depend on one provider's terminology.

## 10. Non-acceptance boundaries

This audit does **not** accept or authorize:

```text
M4-030+ Lease lifecycle
M4-040+ PEP integration
host/container/microVM probing
minimum-guarantee negotiation
Adapter-to-evidence composition
execution/audit persistence
M6 Workspace Transaction
PR #3 merge
```

M4-025 does not prove that the current deployment is process-isolated or
provider-enforced. It proves deterministic classification of a trusted,
action-scoped evidence projection under Spec 0036.

## 11. Acceptance-record gate

The implementation is accepted, but governance is not closed by this document
alone.

The acceptance-record transition is intentionally limited to:

```text
docs/acceptance/m4-025-acceptance-audit.md
packages/capability-broker/src/index.ts   # package stage only
```

The resulting exact head MUST itself pass normal CI and pinned Harness rc5
source-conformance before final governance may begin.
