# M4-032 Acceptance Audit — Atomic CapabilityLease Use Consumption

Status: **IMPLEMENTATION ACCEPTED / AUDIT EXACT-HEAD VERIFICATION PENDING**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-032 P0 — atomic consume`

## 1. Accepted protocol-first authority

Normative specification:

```text
specs/0039-m4-capability-lease-atomic-consume.md
```

Portable corpus:

```text
fixtures/lease-consume/cases.json
```

Portable profile:

```text
M4-032_LEASE_CONSUME_V1
```

Protocol-first exact head:

```text
a5c011e55c7e7c55915e8c1aee5a787688d18e67
```

Relative to M4-031 final-governance head
`6942fa98ebd871927a1db4143c99090f51695c69`, the protocol-first delta was
exactly:

```text
docs/handoff/CURRENT.md
fixtures/lease-consume/cases.json
specs/0039-m4-capability-lease-atomic-consume.md
```

No production TypeScript, CapabilityLease wire type/schema, Shared TCK,
Adapter/Harness baseline, dependency, lockfile, M4-033+, M4-040+ or M6 change
was present.

Protocol-first exact-head evidence:

- normal CI #524 / run `33600833297`: PASS;
- Harness rc5 source-conformance #466 / run `33600833414`: PASS;
- portable corpus: 40 canonical `LCON-001` through `LCON-040` cases;
- the 513-code-point `leaseRef` boundary case was present and exercised;
- PR #3 remained Open, Draft and mergeable with no review/review-thread blocker.

Production implementation was therefore authorized only after the protocol-first
head reached same-head dual-green.

## 2. Accepted implementation head and correction history

Accepted implementation exact head:

```text
8fa634bfc986c2486ccc778d14af5a76ad690bb1
```

The implementation history after the protocol-first head contains three
non-rewritten commits:

```text
3661657c2e63e56f17afdeb3eef134e1d3144b93
feat(capability): implement M4-032 atomic lease consume

dfb4622c4428e60762ac46f41a071c43b6bac736
fix(capability): harden M4-032 atomic consume

8fa634bfc986c2486ccc778d14af5a76ad690bb1
fix(capability): close M4-032 runtime hardening gaps
```

The failed intermediate exact heads were retained as evidence instead of being
rewritten away:

- `3661657c...`: Harness #467 PASS; CI #525 FAIL at strict TypeScript because
  the M4-031 failure union was wider than the M4-032 preserved usage-failure
  vocabulary.
- `dfb4622c...`: Harness #468 PASS; CI #526 reached tests and exposed two real
  runtime defects: revoked-Proxy array detection could throw, and negative-zero
  exhausted evidence was not canonicalized to portable numeric zero.
- `8fa634bf...`: both defects were corrected without weakening any gate and the
  final implementation reached same-head dual-green.

This history is intentionally preserved because the acceptance claim is based on
fixing observed defects, not re-running or suppressing them.

## 3. Exact implementation delta

Comparing protocol-first head `a5c011e55c7e7c55915e8c1aee5a787688d18e67`
to accepted implementation head `8fa634bfc986c2486ccc778d14af5a76ad690bb1`
shows exactly six Capability Broker files:

```text
packages/capability-broker/src/index.ts
packages/capability-broker/src/lease-consume-hardening.test.ts
packages/capability-broker/src/lease-consume-memory-store.ts
packages/capability-broker/src/lease-consume-types.ts
packages/capability-broker/src/lease-consume.test.ts
packages/capability-broker/src/lease-consume.ts
```

The compare is three commits ahead, zero commits behind, and contains no Spec or
portable-corpus rewrite, no protocol wire-model change, no schema change, no
Shared TCK change, no Adapter/Harness baseline change, no dependency/lockfile
change and no M4-033+ implementation.

## 4. Architecture and authority boundary

M4-032 introduces one real abstraction boundary because atomicity cannot be
truthfully implemented as a pure counter helper:

```text
LeaseUseStore.consumeOne(leaseRef)
```

The store port, not the broker, owns the linearization point. The broker does not
perform an authoritative sequence of:

```text
read -> M4-031 check -> later write
```

Instead the store operation returns evidence describing the outcome of one
atomic attempt. This preserves the protocol requirement that validation of the
current authoritative usage state and the successful decrement belong to the
same indivisible logical transition.

The implementation deliberately does not introduce generic repository,
transaction-manager, lock-manager or concurrency-framework layers. The
abstraction exists only where there is a real semantic boundary: an atomic
backend primitive that future storage adapters must implement and prove.

## 5. Reference in-memory store scope

`InMemoryLeaseUseStore` is an explicit reference implementation for tests and
single-process embeddings.

It uses a per-`leaseRef` promise queue so operations on the same Lease are
serialized while operations on different Lease identities do not require one
global lock.

The implementation documentation explicitly states that this proves only
process-local atomicity. It does not claim that an in-process queue makes a
non-atomic external database operation linearizable across processes.

The review also confirmed queue lifecycle cleanup. The queue map stores the
actual per-key tail promise and removes it only when that tail is still current,
preventing completed-key entries from accumulating after uncontended or final
operations.

Any future SQLite/PostgreSQL/distributed adapter must provide backend-specific
atomicity and conformance evidence. This audit does not inherit that guarantee
from the in-memory store.

## 6. Public API boundary

The Capability Broker exposes the M4-032 primitive and narrow store contract:

```text
consumeCapabilityLeaseUse
InMemoryLeaseUseStore
LEASE_CONSUME_PROFILE
LeaseConsumeInput
LeaseConsumeResult
LeaseConsumed
LeaseNotConsumed
LeaseConsumeFailure
LeaseConsumeFailureReason
LeaseConsumeStage
LeaseUseState
LeaseUseStore
LeaseUseStoreOutcome
```

The public consume request is runtime-validated as `unknown`; TypeScript types
are not trusted as the security boundary for deserialized, JavaScript, `any`,
plugin-origin or otherwise dynamically supplied requests.

At this accepted implementation head the package marker is intentionally only:

```text
M4-032-ATOMIC-CONSUME-IMPLEMENTED
```

It does not yet claim package-stage acceptance. That claim is reserved for the
later acceptance-record exact-head transition after this audit itself is
verified.

## 7. Accepted consume semantics

Portable caller input is exactly:

```text
{
  profile: "M4-032_LEASE_CONSUME_V1",
  leaseRef
}
```

The caller supplies identity only. Caller-provided counters, TTL facts or other
lifecycle state are rejected as unexpected authority.

For one authoritative Lease usage state:

```text
missing
  -> NOT_CONSUMED / LEASE_CONSUME_NOT_FOUND

invalid maxUses / remainingUses
  -> FAIL_CLOSED / USAGE / preserved M4-031 usage reason

remainingUses == 0
  -> NOT_CONSUMED / LEASE_USAGE_EXHAUSTED

remainingUses > 0
  -> atomically commit remainingUses := remainingUses - 1
  -> CONSUMED / LEASE_USE_CONSUMED
```

A successful result reports the detached values immediately around the one-use
transition:

```text
remainingUsesBefore
remainingUsesAfter == remainingUsesBefore - 1
```

No successful invocation can decrement by more than one.

## 8. Per-Lease linearizability review

The reference store serializes each `leaseRef` independently. Under one key,
each call observes the state produced by the previous completed transition in
that key's queue.

The portable concurrency corpus proves aggregate behavior including:

```text
1 remaining / 2 attempts -> 1 CONSUMED + 1 EXHAUSTED
2 remaining / 3 attempts -> 2 CONSUMED + 1 EXHAUSTED
5 remaining / 3 attempts -> 3 CONSUMED, final 2
0 remaining / concurrent attempts -> all EXHAUSTED
different leaseRefs -> independent consumption
```

The implementation does not prescribe a winner among overlapping attempts.
That identity is deliberately non-portable.

No counter underflow, lost update or duplicate use of the same remaining unit was
found in the accepted host-language concurrency path.

## 9. Store outcome and failure classification

The broker recognizes the reviewed abstract store outcomes and maps them without
implicit retry:

```text
NOT_FOUND
UNAVAILABLE_NOT_APPLIED
OUTCOME_UNKNOWN
EXHAUSTED
CONSUMED
```

The stable external classifications are:

```text
UNAVAILABLE_NOT_APPLIED
  -> FAIL_CLOSED / STORE / LEASE_CONSUME_STORE_UNAVAILABLE

OUTCOME_UNKNOWN
  -> FAIL_CLOSED / STORE / LEASE_CONSUME_OUTCOME_UNKNOWN
```

A thrown or rejected store call is conservatively classified as outcome unknown
because the broker cannot prove whether a backend linearization happened before
the failure became observable.

The primitive invokes the store at most once and performs no automatic retry.
This preserves the explicit distinction between per-invocation linearizability
and distributed exactly-once semantics across caller retries.

## 10. Authoritative state validation and store-evidence hardening

Store evidence is not blindly trusted as a successful consume merely because a
provider returns `status: "CONSUMED"`.

The broker independently verifies:

- the returned Lease identity matches the requested exact `leaseRef`;
- before-state usage is M4-031-valid and eligible;
- after-state usage is M4-031-valid;
- `maxUses` is unchanged across the transition;
- `remainingUsesAfter == remainingUsesBefore - 1`;
- malformed or incomplete store evidence fails closed.

Only these M4-031 usage-state failures are preserved through M4-032:

```text
LEASE_USAGE_MAX_USES_INVALID
LEASE_USAGE_REMAINING_USES_INVALID
LEASE_USAGE_STATE_INVALID
```

The wider M4-031 input/profile failure union is not leaked into M4-032. Such a
failure would contradict M4-032's internally constructed M4-031 evaluation
shape and is therefore classified as invalid store/internal evidence instead of
expanding the M4-032 protocol vocabulary.

## 11. Input validation and hostile runtime boundary

The accepted request-validation order remains:

```text
1. readable non-array record
2. exact own key set: profile + leaseRef
3. exact M4-032 profile
4. leaseRef 1..512 Unicode code points
5. invoke store once
6. classify/validate store evidence
7. return detached frozen result
```

The runtime boundary:

- rejects null and arrays;
- rejects inherited request authority;
- rejects unexpected string and symbol keys;
- reads request values through own property descriptors;
- rejects accessor-backed request properties without invoking getters;
- catches revoked-Proxy `Array.isArray`, own-key and descriptor failures;
- performs no `leaseRef` coercion, trimming, case folding or normalization;
- never echoes host exception text;
- does not mutate request input;
- returns detached frozen result objects.

Dedicated hardening tests also verify malformed store result objects and
accessor-backed store result status values fail closed without executing those
accessors.

## 12. Exact-integer and negative-zero review

M4-032 inherits the exact M4-031 domain:

```text
1 <= maxUses <= 9007199254740991
0 <= remainingUses <= maxUses
```

A decrement is performed only after the current store state has been classified
as M4-031 usage-eligible.

The accepted implementation therefore does not coerce strings, booleans,
objects, bigints, unsafe integers or fractions into counters.

JavaScript `-0` has portable numeric-zero semantics. The reference store treats
it as exhausted and canonicalizes detached snapshot/evidence output to numeric
`0`, matching the portable corpus rather than leaking host-specific signed-zero
representation into final state evidence.

The request-time Lease issuance cap of `100000` is not imported into existing
Lease consumption; coherent existing Lease counters may use the full accepted
safe-integer domain.

## 13. No exactly-once or execution claim

M4-032 proves one atomic usage-unit transition per successful invocation. It does
not prove that repeated invocations for the same higher-level logical action
consume only once.

There is no accepted `requestRef`, `actionRef`, `consumeRef` or durable
deduplication record in this Gate, so the implementation makes no distributed
exactly-once retry claim.

Likewise `CONSUMED` is not a CapabilityDecision allow, approval result,
GuaranteeLevel, proof of execution or proof of action success.

M4-040+ remains responsible for execution-time PEP composition. Later execution
must not reinterpret a counter transition as complete Lease authorization.

## 14. Separation from other Lease lifecycle gates

M4-032 deliberately does not inspect or compose:

```text
issuedAt / expiresAt
revocation state
parentLeaseRef / parent usage
subject/capability/resource authorization
approval state
GuaranteeLevel
PEP execution state
```

TTL remains M4-030, usage snapshot validity remains M4-031, revocation remains
M4-033, parent-child attenuation remains M4-034, and execution-time PEP remains
M4-040+.

No M4-033+ code path was pulled forward by the accepted implementation.

## 15. Portable corpus and regression coverage

The portable corpus contains 40 canonical cases:

```text
LCON-001 .. LCON-040
```

It covers:

- single-use final decrement;
- multi-use exact decrement;
- safe-integer ceiling arithmetic;
- existing-Lease values above the request-time issuance cap;
- exhausted state including numeric negative zero;
- exact missing-Lease behavior;
- invalid authoritative max/remaining counters;
- incoherent `remainingUses > maxUses`;
- exact request shape and profile validation;
- caller counter and TTL authority rejection;
- 513-code-point `leaseRef` rejection;
- known-not-applied store failure;
- ambiguous outcome and no retry;
- concurrent final-use races and oversubscription;
- exhausted concurrent attempts;
- independent different-Lease consumption;
- sequential committed-state observation;
- string/null/boolean counter non-coercion.

The primary semantic suite executes the portable corpus directly rather than
maintaining a second handwritten truth table.

Host-language hardening separately covers accessors, inherited request identity,
symbol keys, revoked Proxy behavior, store throw/no-retry behavior, fabricated
store transitions, malformed/accessor store evidence, frozen detached results and
request non-mutation.

## 16. Exact-head quality evidence

For accepted implementation head
`8fa634bfc986c2486ccc778d14af5a76ad690bb1`:

- normal CI #527 / run `33609196856`: PASS;
- Harness rc5 source-conformance #469 / run `33609196891`: PASS;
- frozen `pnpm install --frozen-lockfile`: PASS;
- supply-chain policy: 124 entries PASS;
- architecture boundaries: PASS;
- schema shape: 16 schemas PASS;
- schema compatibility baseline: PASS;
- strict workspace TypeScript: PASS;
- test files: 57 PASS;
- tests: 1118 PASS;
- M4-032 primary suite: 41 PASS;
- M4-032 hostile-runtime/store hardening suite: 7 PASS;
- oxlint: 163 files, 0 errors, two inherited repository warnings;
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
this Gate; M4-032 introduces no lint error.

## 17. Independent acceptance findings

Independent implementation/security review confirmed:

- authoritative consume is not implemented as broker-side split read/check/write;
- the store port is the enforcement dependency that owns atomic mutation;
- the in-memory reference implementation gives per-Lease process-local
  serialization without claiming distributed/database atomicity;
- same-Lease concurrent operations cannot over-consume in the reviewed store;
- different Lease identities do not require one global protocol lock;
- invalid authoritative counters are not repaired, clamped or decremented;
- success evidence proves an exact one-unit transition;
- not-found does not create a Lease;
- known-not-applied and outcome-unknown store failures remain distinct;
- throw/rejection is never automatically retried;
- malformed store evidence cannot fabricate consumption success;
- request accessors and Proxy traps cannot become authority;
- result objects are detached and frozen;
- negative zero follows portable exhausted semantics;
- queue-tail cleanup does not retain completed per-key serialization entries;
- no CapabilityLease schema/type revision or idempotency field was invented;
- no TTL/revocation/attenuation/PEP behavior was silently composed;
- DeepSeek Harness remains compatibility evidence only, not M4-032 protocol
  authority.

No defect was found that requires another implementation correction before
acceptance.

## 18. Non-acceptance boundaries

This audit does **not** accept, close or authorize:

```text
M4-033 revocation
M4-034 parent-child attenuation
M4-040+ PEP integration
composite "usable Lease" authorization
database/distributed Lease-store atomicity
cross-retry exactly-once consumption
automatic retry after ambiguous outcome
Adapter-defined Lease semantics
M6 Workspace Transaction
PR #3 merge
```

It also does not claim that a `CONSUMED` result means an action was authorized,
executed or succeeded.

## 19. Acceptance verdict

```text
M4-032 protocol-first authority: PASS
M4-032 portable corpus: PASS
M4-032 one-use transition: PASS
M4-032 per-Lease linearizability contract: PASS
M4-032 store failure classification: PASS
M4-032 hostile-runtime boundary: PASS
M4-032 store-evidence hardening: PASS
M4-032 exact-integer semantics: PASS
M4-032 no-retry / no-exactly-once overclaim: PASS
M4-032 architecture/store boundary: PASS
M4-032 exact-head CI: PASS
M4-032 Harness compatibility: PASS
M4-032 implementation: ACCEPTED
M4-033+: NOT AUTHORIZED
PR #3 merge: NOT AUTHORIZED
```

## 20. Audit exact-head gate

The implementation is accepted by this review, but this document does not close
M4-032 governance and does not immediately authorize a package-stage acceptance
claim.

This audit MUST first exist as its own reviewable exact-head transition. The
audit exact head MUST reach:

1. normal repository CI PASS;
2. exact pinned Harness rc5 source-conformance PASS;
3. PR #3 remains Open/Draft/mergeable with no review/review-thread blocker.

Only after that audit head is same-head dual-green may the package-stage
acceptance-record transition change the package marker/comment from
`M4-032-ATOMIC-CONSUME-IMPLEMENTED` to an accepted M4-032 package stage.

That later acceptance-record head must itself reach same-head dual-green before
final governance may update `CURRENT.md`, append `HISTORY.md`, and mark only
M4-032 in the roadmap.

M4-033 remains unauthorized until M4-032 final-governance exact head is itself
same-head dual-green.
