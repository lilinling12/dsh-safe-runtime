# M4-031 Acceptance Audit — Deterministic CapabilityLease Usage Validity

Status: **IMPLEMENTATION ACCEPTED / AUDIT EXACT-HEAD VERIFICATION PENDING**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-031 P0 — maxUses / usage validity`

## 1. Accepted protocol-first authority

Normative specification:

```text
specs/0038-m4-capability-lease-usage.md
```

Portable corpus:

```text
fixtures/lease-usage/cases.json
```

Portable profile:

```text
M4-031_LEASE_USAGE_V1
```

Protocol-first exact head:

```text
b7fd6b4b127ec393113de15d35f81ee90738fd42
```

Relative to M4-030 final-governance head
`64e6b4a2a2e0c35522f004ec185548e8214b81c1`, the protocol-first delta was
exactly:

```text
docs/handoff/CURRENT.md
fixtures/lease-usage/cases.json
specs/0038-m4-capability-lease-usage.md
```

No production TypeScript, CapabilityLease wire type/schema, Shared TCK,
Adapter/Harness baseline, dependency, lockfile, M4-032+, M4-040+ or M6 change
was present.

Protocol-first exact-head evidence:

- normal CI #519 / run `33586806719`: PASS;
- Harness rc5 source-conformance #461 / run `33586807228`: PASS;
- portable corpus: 32 canonical `LUSE-001` through `LUSE-032` cases;
- PR #3 remained Open, Draft and mergeable with no review/review-thread blocker.

Production implementation was therefore authorized only after this exact
protocol-first head reached same-head dual-green.

## 2. Accepted implementation head

Accepted implementation exact head:

```text
4888db9445f807ce2a17f4434371a3d18aaf97bc
```

Commit:

```text
feat(capability): implement M4-031 lease usage validity
```

The implementation delta from the protocol-first head is exactly five
Capability Broker files:

```text
packages/capability-broker/src/index.ts
packages/capability-broker/src/lease-usage-hardening.test.ts
packages/capability-broker/src/lease-usage-types.ts
packages/capability-broker/src/lease-usage.test.ts
packages/capability-broker/src/lease-usage.ts
```

The compare is one commit ahead and contains no Spec/corpus change, protocol
wire-model change, schema change, Shared TCK change, Adapter/Harness baseline
change, dependency/lockfile change or M4-032+ implementation.

## 3. Package and architecture review

M4-031 follows the established Capability Broker security-primitive layout:

```text
lease-usage-types.ts
lease-usage.ts
lease-usage.test.ts
lease-usage-hardening.test.ts
```

This package-root layout is intentional and consistent with the accepted Lease
and PDP primitives already present in the package.

M4-031 is a small deterministic domain predicate with no I/O, storage,
transaction, lock, Adapter or provider integration. Introducing nested
`domain/application/infrastructure` directories would create artificial layers
rather than isolate real responsibilities.

The implementation also deliberately does not extract a generic hostile-object
or Lease-lifecycle helper merely because M4-030 and M4-031 share defensive
runtime techniques. Validation precedence, failure vocabulary and consumed facts
remain Gate-specific security semantics. Shared extraction should wait until a
later accepted design proves a genuinely common contract rather than syntactic
similarity.

## 4. Public API boundary

The Capability Broker exports:

```text
evaluateCapabilityLeaseUsage
LEASE_USAGE_PROFILE
LeaseUsageEvaluationInput
LeaseUsageEvaluationResult
LeaseUsageEligible
LeaseUsageIneligible
LeaseUsageFailure
LeaseUsageFailureReason
LeaseUsageStage
```

The convenience input type exposes numeric counters, while the runtime evaluator
accepts `unknown`. TypeScript is therefore not trusted as the runtime security
boundary for JavaScript, `any`, deserialized or plugin-origin values.

At this implementation head, `PACKAGE_STAGE` deliberately remains:

```text
M4-030-LEASE-TTL-ACCEPTED
```

The package does not claim M4-031 package-stage acceptance before the audit and
acceptance-record exact heads are independently verified.

## 5. Accepted semantic scope

M4-031 answers only:

> Does the current `maxUses` / `remainingUses` snapshot represent a coherent,
> non-exhausted CapabilityLease usage state?

Portable input is exactly:

```text
{
  profile: "M4-031_LEASE_USAGE_V1",
  maxUses,
  remainingUses
}
```

Accepted usage-state coherence is:

```text
1 <= maxUses <= 9007199254740991
0 <= remainingUses <= maxUses
```

After validation and coherence checking:

```text
remainingUses == 0
  -> USAGE_INELIGIBLE / LEASE_USAGE_EXHAUSTED

remainingUses > 0
  -> USAGE_ELIGIBLE / LEASE_USAGE_AVAILABLE
```

An incoherent positive counter does not become eligible:

```text
remainingUses > maxUses
  -> FAIL_CLOSED / USAGE / LEASE_USAGE_STATE_INVALID
```

`USAGE_ELIGIBLE` means only that the observed usage snapshot is coherent and has
at least one remaining use. It is not an allow decision, reservation,
consumption result or execution authorization.

## 6. Exact-integer interoperability review

The implementation uses JavaScript `Number.isSafeInteger` before counter
comparison. This locks the Spec 0038 portable exact-integer domain instead of
silently accepting values whose JSON numeric representation may have already
lost integer precision in IEEE-754 hosts.

The accepted upper boundary is:

```text
9007199254740991
```

The implementation rejects:

- non-number values;
- `NaN` / infinities through the safe-integer predicate;
- fractional numbers;
- unsafe integers;
- negative `remainingUses`;
- `maxUses < 1`;
- implicit string/boolean/object coercion.

JavaScript negative zero is an exact numeric zero. Therefore `remainingUses:
-0` is deterministically exhausted, matching the portable corpus.

## 7. Request-bound versus existing-Lease boundary

The accepted implementation does not import the existing `leaseRequest.maxUses`
request-time maximum of `100000` into an already-materialized CapabilityLease.

A coherent existing Lease such as:

```text
maxUses: 100001
remainingUses: 100001
```

remains usage-eligible under this Gate.

M4-031 does not guess the request or policy that issued the Lease, reconstruct
historical consumption, or claim issuance compliance. Those concerns require
their own authoritative context.

## 8. Validation precedence and stable failures

The implementation preserves the normative observable order:

```text
1. outer value is a readable non-array record
2. exact own key set: profile + maxUses + remainingUses
3. exact profile
4. maxUses exact integer / field domain
5. remainingUses exact integer / field domain
6. remainingUses <= maxUses coherence
7. remainingUses == 0 -> exhausted
8. otherwise -> available
```

Stable failures are exactly:

```text
LEASE_USAGE_INPUT_INVALID
LEASE_USAGE_PROFILE_INVALID
LEASE_USAGE_MAX_USES_INVALID
LEASE_USAGE_REMAINING_USES_INVALID
LEASE_USAGE_STATE_INVALID
```

Multi-defect inputs are therefore deterministic: an invalid profile wins before
counter inspection, and invalid `maxUses` wins before `remainingUses` is read.

No failure result echoes attacker-controlled counter values, trap messages,
exception text or stack data.

## 9. Runtime hostile-object review

The accepted runtime boundary:

- accepts public input as `unknown`;
- rejects null and arrays;
- enumerates own keys through `Reflect.ownKeys` inside a fail-closed boundary;
- requires exactly the three reviewed own string keys;
- rejects unexpected string keys and every symbol key;
- reads security facts through own property descriptors;
- rejects accessor-backed fields without invoking getters;
- rejects inherited required fields as authority;
- fails closed when `Array.isArray`, `ownKeys` or property-descriptor inspection
  fails on hostile/revoked Proxies;
- uses no `Number(...)`, unary plus, `parseInt`, `valueOf` or
  `Symbol.toPrimitive` coercion;
- short-circuits later fields after an earlier validation failure;
- does not mutate caller input;
- returns detached frozen success, ineligibility and failure objects;
- never reflects attacker input or host exception detail into results.

The hardening suite separately exercises these host-language attacks because
portable JSON fixtures cannot represent accessors, symbols or Proxy traps.

## 10. Read-only / no-consume boundary

M4-031 remains a pure snapshot evaluator.

It does not:

```text
remainingUses--
reserve a use
issue a reservation token
compare-and-swap
lock
start a transaction
persist a counter
claim serializable isolation
linearize concurrent consumers
execute an action
```

The implementation contains no storage/provider dependency and no state
publication point.

A result showing one remaining use can become stale immediately under
concurrency. This is an explicit design boundary, not a hidden atomicity claim.

Atomic validation-and-consume remains exclusively M4-032 and is not authorized
by this acceptance audit.

## 11. Separation from other Lease lifecycle gates

M4-031 does not inspect or derive authority from:

```text
issuedAt / expiresAt
revocation state
parentLeaseRef
authorization provenance
lease lookup ranking
policy or approval state
GuaranteeLevel
PEP state
```

M4-030 and M4-031 remain independent predicates. A future composition may
require both time and usage eligibility, but this Gate does not define that
composite authorization operation.

Likewise, M4-033 revocation and M4-034 parent-child attenuation remain separate
future Gates.

## 12. Portable corpus and regression review

The portable corpus contains 32 canonical cases:

```text
LUSE-001 .. LUSE-032
```

It covers:

- fully available state;
- final remaining use;
- exhausted state;
- `remainingUses > maxUses` incoherence;
- existing-Lease `maxUses > 100000` acceptance;
- exact safe-integer ceiling and immediately-below-ceiling values;
- zero/negative/fractional/string/null/boolean invalid counters;
- unsafe integer rejection;
- missing and unexpected fields;
- unknown profile;
- deterministic multi-defect precedence;
- JSON negative zero behavior.

The semantic test suite consumes that reviewed corpus rather than duplicating a
second handwritten portable truth table.

Dedicated runtime hardening tests additionally cover descriptor/accessor traps,
revoked proxies, own-key traps, symbols, inherited properties, coercion hooks,
validation short-circuiting, frozen/detached outputs and attacker-echo
resistance.

Independent review found no missing semantic case requiring a production change
or a green-after-review hardening commit at this Gate.

## 13. Exact-head quality evidence

For accepted implementation head
`4888db9445f807ce2a17f4434371a3d18aaf97bc`:

- normal CI #520 / run `33588237365`: PASS;
- Harness rc5 source-conformance #462 / run `33588237362`: PASS;
- frozen `pnpm install --frozen-lockfile`: PASS;
- supply-chain policy: 124 entries PASS;
- architecture boundaries: PASS;
- schema shape: 16 schemas PASS;
- schema compatibility baseline: PASS;
- strict workspace TypeScript: PASS;
- test files: 55 PASS;
- tests: 1070 PASS;
- M4-031 primary suite: 35 PASS;
- M4-031 hostile-runtime hardening suite: 11 PASS;
- oxlint: 158 files, 0 errors, two inherited repository warnings;
- packed Shared TCK / external non-workspace consumer: 44 registered assets PASS;
- exact pinned Harness source checkout: PASS;
- pinned Harness public type-surface build: PASS;
- reproducible safe-runtime dependency install: PASS;
- exact pinned Harness workspace projection: PASS;
- workspace projection idempotence: PASS;
- real rc5 binding typecheck against pinned source: PASS;
- real rc5 runtime conformance: PASS;
- PR #3: Open, Draft, mergeable;
- submitted reviews: none;
- review threads: none.

The two oxlint warnings are inherited repository warnings already present before
this Gate; M4-031 introduces no lint error and no new warning.

## 14. Protocol and compatibility authority review

M4-031 preserves the existing CapabilityLease wire model:

```text
maxUses: number/integer field
remainingUses: number/integer field
```

It adds no Lease field and changes neither
`schemas/v1alpha1/capability-lease.schema.json` nor
`packages/protocol/src/capability.ts`.

The safe-integer ceiling is a portable evaluator interoperability rule, not a
retroactive rewrite of `leaseRequest.maxUses` and not a schema mutation in this
Gate.

DeepSeek Harness rc5 remains compatibility evidence only. No Harness runtime
counter behavior, provider behavior or implementation detail defines M4-031
semantics.

## 15. Independent acceptance findings

Independent code/security review specifically confirmed:

- exact own-key and own-data-property handling matches Spec 0038;
- validation precedence is observable and deterministic;
- `Number.isSafeInteger` enforces the reviewed exact numeric domain;
- `remainingUses == -0` follows numeric-zero exhausted semantics;
- positive but incoherent `remainingUses > maxUses` fails closed;
- `maxUses > 100000` is not incorrectly rejected;
- hostile property access cannot execute getters as authority;
- invalid earlier fields do not traverse later hostile accessors;
- result objects are frozen and detached;
- input is not mutated;
- no attacker-controlled value or exception detail is returned;
- no host time, randomness, storage or external state participates;
- no consume/reservation/CAS/lock/transaction behavior is present;
- the implementation delta is confined to the reviewed five package files;
- no M4-032 semantic or code path was pulled forward.

No defect was found that requires implementation correction before acceptance.

## 16. Non-acceptance boundaries

This audit does **not** accept, close or authorize:

```text
M4-032 atomic consume
M4-033 revoke
M4-034 parent-child attenuation
M4-040+ PEP integration
composite "usable Lease" authorization
Lease persistence / transaction semantics
Adapter-defined usage semantics
M6 Workspace Transaction
PR #3 merge
```

No later Gate may reinterpret `USAGE_ELIGIBLE` as proof that a use has been
reserved or that execution is authorized.

## 17. Acceptance verdict

```text
M4-031 protocol-first authority: PASS
M4-031 portable corpus: PASS
M4-031 exact-integer semantics: PASS
M4-031 usage-state coherence: PASS
M4-031 hostile-runtime boundary: PASS
M4-031 read-only / no-consume separation: PASS
M4-031 architecture/package boundary: PASS
M4-031 exact-head CI: PASS
M4-031 Harness compatibility: PASS
M4-031 implementation: ACCEPTED
M4-032+: NOT AUTHORIZED
PR #3 merge: NOT AUTHORIZED
```

## 18. Audit exact-head gate

The implementation is accepted by this review, but this document does not close
M4-031 governance and does not immediately authorize a package-stage change.

This audit MUST first exist as its own reviewable exact-head transition. The
audit exact head MUST reach:

1. normal repository CI PASS;
2. exact pinned Harness rc5 source-conformance PASS;
3. PR #3 remains Open/Draft/mergeable with no review/review-thread blocker.

Only after that audit head is same-head dual-green may the package-stage
acceptance-record transition change the package marker/comment to state M4-031
implementation acceptance.

That later acceptance-record head must itself be dual-green before final
governance may update `CURRENT.md`, append `HISTORY.md`, and mark only M4-031 in
the roadmap.

M4-032 remains unauthorized until M4-031 final-governance exact head is itself
same-head dual-green.
