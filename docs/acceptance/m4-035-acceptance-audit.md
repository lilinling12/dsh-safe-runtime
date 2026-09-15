# M4-035 Acceptance Audit — Deterministic CapabilityLease Listing CLI

Status: **IMPLEMENTATION ACCEPTED / AUDIT EXACT-HEAD VERIFICATION PENDING**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-035 P1 — lease listing CLI`

## 1. Accepted protocol authority

Normative specification:

```text
specs/0042-m4-capability-lease-listing-cli.md
```

Portable corpus:

```text
fixtures/lease-listing/cases.json
```

Portable profile:

```text
M4-035_LEASE_LISTING_V1
```

Protocol-first exact head:

```text
943c6a7a6f1aaa9b0e5db9aa9e5b0bf8eb0e4777
```

The protocol-first delta was limited to:

```text
docs/handoff/CURRENT.md
fixtures/lease-listing/cases.json
specs/0042-m4-capability-lease-listing-cli.md
```

No production TypeScript, new CLI package, package manifest, dependency,
lockfile, public CapabilityLease schema/type, Shared TCK registration,
HISTORY, roadmap acceptance marker, Harness baseline, M4-036+, M4-040+, M6,
M10 implementation, M13 or M15 work was changed by the protocol-first commit.

Exact-head protocol evidence:

- normal CI #557 / run `33708615697`: PASS;
- exact pinned Harness rc5 source-conformance #499 / run `33708615763`: PASS;
- portable corpus intent: 35 canonical `LLST-001` through `LLST-035` cases;
- PR #3 remained Open, Draft and mergeable;
- submitted reviews: none;
- review threads: none.

Production implementation was authorized only after that exact head became
dual-green.

### 1.1 Corpus source-encoding correction discovered during implementation

The original protocol-first corpus encoded the terminal-injection cases with a raw
U+001B ESC code point inside JSON source text. The intended runtime value was clear,
but raw ESC is not legal JSON string source and the defect became observable only
when the production fixture runner began parsing this new corpus.

Commit:

```text
6ba8293110fa4427d95d1fe4aeeaddeb102b2beb
fix(protocol): escape M4-035 control fixtures
```

changed only the source representation of the affected LLST-033/LLST-034 string
literals to JSON-safe `\u001b`/Unicode escapes. After JSON parsing, the runtime
strings and all case expectations remain the same.

This was a protocol-corpus serialization correction, not a semantic relaxation or
post-hoc change to the listing contract. The final implementation exact head
includes the corrected corpus and has exact-head CI/Harness dual-green evidence.
The fixture runner also now parses and integrity-checks all 35 cases, so this class
of malformed-corpus error is covered by normal CI going forward.

## 2. Final accepted implementation/hardening head

Final implementation/hardening exact head:

```text
959babf2839510b7437a0af331573602e78b1590
```

The implementation history is intentionally preserved rather than rebased or
squashed away.

Implementation/hardening commits after the protocol-first head are:

```text
8e6007614851540c6c0eacf98dae191e130d548d
  feat(capability): implement M4-035 lease listing

2585d576c828b463742bb51fcefb8962634ec9c4
  fix(capability): narrow M4-035 listing state reads

6ba8293110fa4427d95d1fe4aeeaddeb102b2beb
  fix(protocol): escape M4-035 control fixtures

bd70f8c71975a2b57d3a1f9dc5fd5691e6ebe340
  fix(capability): detach M4-035 constraint shape

316647079ec35a412bb6c56bffcb2b09805291d2
  fix(capability): preserve M4-035 snapshot shape

5a4492e0ef314de92e55aeabf9e7eb9abf6fdf99
  test(capability): harden M4-035 inventory snapshots

959babf2839510b7437a0af331573602e78b1590
  fix(capability): type M4-035 descriptor snapshot
```

The implementation was not accepted merely because an earlier candidate became
green. Source review continued after dual-green and found reference-store snapshot
aliasing/sanitization defects; those defects were corrected and then reverified at
the final exact head.

## 3. Exact implementation delta

Comparing protocol-first head
`943c6a7a6f1aaa9b0e5db9aa9e5b0bf8eb0e4777` to final implementation/hardening
head `959babf2839510b7437a0af331573602e78b1590` shows:

```text
ahead_by: 7
behind_by: 0
total_commits: 7
```

Exactly these eight files differ:

```text
fixtures/lease-listing/cases.json
packages/capability-broker/src/index.ts
packages/capability-broker/src/lease-list-cli.test.ts
packages/capability-broker/src/lease-list-cli.ts
packages/capability-broker/src/lease-listing-memory-store.ts
packages/capability-broker/src/lease-listing-types.ts
packages/capability-broker/src/lease-listing.test.ts
packages/capability-broker/src/lease-listing.ts
```

The fixture difference is only the JSON-safe source escaping described in §1.1.

There is no implementation-stage change to:

```text
specs/0042-m4-capability-lease-listing-cli.md
schemas/v1alpha1/capability-lease.schema.json
packages/protocol/src/capability.ts
Shared TCK assets/manifest
package manifests
dependencies
pnpm-lock.yaml
DeepSeek Harness baseline
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md
docs/roadmap.md
M4-036+
M4-040+
M6
M10 integrated CLI implementation
M13
M15
```

## 4. Architectural scope

The repository had no existing integrated CLI package, root binary, CLI parser
library, or product-wide command framework at the M4-035 parent head.

The accepted implementation therefore does **not** create `packages/cli`, add a
binary, add a parser dependency, or modify the lockfile.

M4-035 is implemented as two layers inside the existing Capability Broker package:

1. a runtime-independent read-only Lease inventory/listing primitive; and
2. a gate-local `lease list` command adapter that parses only the narrow M4-035
   command-local arguments and renders human/JSON output.

This preserves M10 ownership of the eventual integrated product CLI, including
binary naming, global configuration, remote transport, authentication, tenant
selection, global numeric exit codes and combined list/revoke workflows.

The Capability Broker remains a library package and acquires no dependency on a
presentation/CLI package.

## 5. Public CapabilityLease wire boundary

M4-035 does not create a second public Lease wire model and does not add operational
fields to the published v1alpha1 CapabilityLease type/schema.

The public wire fields remain the existing fields, including:

```text
leaseRef
subjectRef
parentLeaseRef?
capability
resource
constraints?
issuedAt
expiresAt
maxUses
remainingUses
authorization
```

M4-033 `revoked` remains an authoritative operational-store fact keyed by exact
`leaseRef`; M4-035 may describe it in listing output without promoting it into the
CapabilityLease wire object.

No `active`, `usable`, `authorized`, `effectiveAuthority`,
`effectiveRemainingUses`, `attenuationValid`, revision or reservation field is
created.

## 6. Exact Broker input and no host clock

The accepted Broker input is exactly:

```text
{
  profile: "M4-035_LEASE_LISTING_V1",
  observedAt: <RFC3339 timestamp>
}
```

There are no optional caller-authoritative filters or scope overrides.

Unexpected string/symbol fields, inherited values, accessors and unreadable object
meta-operations fail closed before store access.

The Broker never reads the host clock. `observedAt` is explicit and validated using
the already accepted M4-030 timestamp grammar rather than JavaScript `Date`, locale
parsing or host timezone semantics.

The gate-local CLI adapter may capture a supplied/injected clock only when
`--observed-at` is omitted, and it captures that clock exactly once before invoking
the Broker.

## 7. Independent read-only inventory port

M4-035 does not widen or redefine the accepted mutation ports from M4-032, M4-033
or M4-034.

The accepted port is conceptually:

```text
LeaseInventoryStore {
  listSnapshot(maxEntries: 1024)
}
```

Portable store outcomes are:

```text
SNAPSHOT
LIMIT_EXCEEDED
UNAVAILABLE
```

The Broker invokes the inventory store at most once per listing request.

Because listing is read-only, M4-035 has no mutation `OUTCOME_UNKNOWN` result and
performs no automatic mutation retry.

The store scope is a trusted operator/admin scope configured outside the portable
caller input. M4-035 does not establish remote-admin, tenant or user authorization
for exposing the inventory over HTTP/RPC/SaaS interfaces.

## 8. Coherent snapshot and hard bound

A successful store result must represent one coherent logical Lease inventory
snapshot for the configured scope.

The portable bound is:

```text
MAX_LEASE_LIST_ENTRIES = 1024
```

More than 1024 visible states fails closed as:

```text
STORE / LEASE_LIST_SNAPSHOT_LIMIT_EXCEEDED
```

The implementation does not silently truncate, return a partial first page or claim
that an unstable prefix is a complete listing.

Portable pagination remains deferred until a future profile defines cursor/snapshot
consistency explicitly.

The reference `InMemoryLeaseInventoryStore` is single-process only. It does not
claim database, multi-process or distributed snapshot isolation.

## 9. Snapshot identity and defensive state validation

The Broker defensively validates the operational state it consumes instead of
trusting the static TypeScript interface at runtime.

It validates exact own-property shape and the fields it exposes/interprets,
including:

```text
leaseRef
subjectRef
parentLeaseRef?
capability
resource
constraints?
issuedAt
expiresAt
maxUses
remainingUses
authorization
revoked
```

`leaseRef` values must be unique within the coherent snapshot. Duplicate identity
fails the whole listing as:

```text
SNAPSHOT / LEASE_LIST_DUPLICATE_LEASE_REF
```

There is no first/last/storage-order winner.

Reference-store hardening deliberately preserves malformed runtime own-property
shape rather than reconstructing only statically known fields. This ensures an
unexpected authority field, symbol field or accessor is still visible to the
Broker validator and cannot be silently sanitized into an apparently valid state.

## 10. Reference-store detachment and anti-aliasing hardening

Source review found that the first `InMemoryLeaseInventoryStore` implementation
retained the original `constraints` object reference. Because M4-035 interprets
constraint top-level key presence, external mutation of that object after store
construction could change a later `constraintsState` result.

This contradicted the store's detached-snapshot claim.

The final implementation captures a descriptor-preserving top-level constraint
container without reading accessor values or recursively traversing nested values.
Subsequent caller key additions/deletions therefore cannot mutate the captured
snapshot's constraint-key shape.

Source review also found that rebuilding state from the static interface would drop
unknown runtime keys and some malformed optional own-property shapes before Broker
validation. The final reference store instead preserves runtime own-property shape
using descriptor snapshots while detaching the nested Resource, authorization and
constraint containers relevant to M4-035.

Regression tests prove both:

- post-capture constraint-key mutation cannot change listing output and does not
  execute the secret getter; and
- malformed extra own-property state is not sanitized by the reference store and
  is rejected by the Broker as `LEASE_LIST_SNAPSHOT_INVALID`.

## 11. Resource projection

Each inventory Resource passes through the already accepted M4-003 exact Resource
normalization boundary.

M4-035 preserves exact canonical:

```text
scheme
locator
providerIdentity?
```

It does not apply M4-004 wildcard semantics and does not infer filesystem, URL,
provider or path containment.

M4-003 Resource failures are preserved under the M4-035 `RESOURCE` stage rather
than converted into a generic no-match or omitted row.

## 12. Independent TTL projection

Each preflight-valid state is evaluated with M4-030 using the one explicit listing
`observedAt`.

Successful descriptive TTL facts remain exactly the accepted lifecycle facts:

```text
TIME_ELIGIBLE / LEASE_TTL_ACTIVE
TIME_INELIGIBLE / LEASE_TTL_NOT_YET_ACTIVE
TIME_INELIGIBLE / LEASE_TTL_EXPIRED
```

Invalid Lease timestamps/window coherence preserve the accepted M4-030 reason under
M4-035 `TIME`.

`TIME_ELIGIBLE` is descriptive lifecycle evidence only. M4-035 never converts it
into an allow/usable/authorized verdict.

## 13. Independent usage projection

Each state is evaluated with the already accepted M4-031 usage primitive.

Successful descriptive facts remain:

```text
USAGE_ELIGIBLE / LEASE_USAGE_AVAILABLE
USAGE_INELIGIBLE / LEASE_USAGE_EXHAUSTED
```

Invalid safe-integer/coherence state preserves the accepted M4-031 reason under
M4-035 `USAGE`.

Listing never decrements, reserves, consumes, repairs or normalizes usage counters.

## 14. Revocation remains independent

The listing copies the exact M4-033 authoritative operational `revoked` boolean.

Revocation, TTL and usage are intentionally independent descriptive facts. A Lease
can be simultaneously revoked, expired and exhausted and M4-035 preserves all three
facts rather than collapsing them into one synthetic status.

M4-035 does not derive revocation from expiry/exhaustion and does not mutate
revocation state.

## 15. Parent-child boundary

`parentLeaseRef`, when present, is descriptive identity only.

M4-035 does not:

```text
require the parent to be in the listing snapshot
walk parentLeaseRef
validate M4-034 attenuation
inherit ancestor revocation into the child row
compute effective ancestor budget
compute effectiveRemainingUses
prove Subject/runtime lineage
```

A child whose parent is outside the configured listing scope may still be shown.
That does not prove the child is executable.

Hierarchy-aware authority remains M4-034 and later PEP/composition work.

## 16. Constraint privacy/minimization boundary

Raw arbitrary CapabilityLease constraints are not emitted by M4-035.

The only listing projection is:

```text
constraintsState: NONE | NON_EMPTY
```

The Broker determines only top-level own-key presence. It does not stringify,
recursively traverse, log or echo raw constraint values merely to classify the row.

Accessor-backed constraint values can remain unread because only the own-key shape
is relevant to this listing projection.

This privacy/minimization rule is not permission to ignore constraints during
authorization. M4-035 does not authorize anything.

## 17. Authorization provenance is descriptive only

Existing `authorization.kind` / `authorization.ref` may be listed as provenance.

The accepted kinds remain:

```text
policy
approval
lease
system
```

M4-035 does not dereference the ref, rerun policy/approval, rank one provenance kind
as stronger, or prove delegated authority from the listing.

## 18. Deterministic ordering

Successful entries are sorted by exact `leaseRef` using Unicode code-point
lexicographic order.

Storage insertion order does not define presentation order.

The ordering is presentation determinism only and is never authorization
precedence.

Duplicate detection occurs before the final sort according to the accepted
validation sequence.

## 19. CLI projection and separation from M10/M4-036

The gate-local command surface is exactly:

```text
lease list
--json
--observed-at <RFC3339>
```

Unknown options, duplicate singleton options, missing values and unexpected
positionals fail as:

```text
CLI_USAGE_ERROR / LEASE_LIST_CLI_ARGUMENT_INVALID
```

before clock/store access where applicable.

M4-035 does not define a global binary name or global numeric process exit codes.

M4-035 also does not implement:

```text
lease revoke
--revoke
bulk revoke
unrevoke
delete
interactive revoke prompts
```

Those remain M4-036 / M10 concerns.

## 20. Human terminal rendering safety

Human rendering applies deterministic single-line escaping to untrusted textual
fields.

At minimum the accepted implementation escapes:

```text
U+0000..U+001F
U+007F
U+0080..U+009F
U+202A..U+202E
U+2066..U+2069
```

This prevents raw newline/tab/ESC terminal controls and bidi embedding/isolation
controls from creating extra rows, terminal formatting/control sequences or visual
reordering in human output.

The escape is presentation-only; authoritative Lease identity is not normalized or
rewritten inside the Broker.

## 21. JSON machine rendering

`--json` renders the structured Broker result using JSON string escaping and an
additional deterministic escape of C1/bidi controls.

Parsing the emitted JSON preserves the exact semantic strings returned by the
Broker. The renderer does not add raw constraints or synthesize active/usable/
authorized status.

M4-035 does not define canonical JSON bytes or a digest. Object-member order and
whitespace are not protocol identity.

## 22. Hostile JavaScript boundary

The Broker public entry accepts `unknown` and uses own-data-property / descriptor
inspection rather than ordinary getter execution or implicit coercion.

The accepted implementation fails closed on or sanitizes:

- inherited/unexpected/symbol request authority;
- accessor-backed request fields without invoking getters;
- revoked/unreadable Proxy meta-operations;
- malformed snapshot arrays and store envelopes;
- malformed/unreadable inventory states;
- malformed authorization/revocation evidence;
- invalid Resource/time/usage state;
- thrown store operations.

The store is invoked at most once.

Failure output uses stable stage/reason codes and does not echo attacker-controlled
refs, Resource values, constraints, backend exception text or stack traces.

Successful public results and nested structural output are detached/frozen.

## 23. Observable validation order

The implementation follows the accepted M4-035 observable order:

```text
input record/readability
-> exact own key set
-> profile
-> observedAt grammar
-> one bounded store invocation
-> store outcome/limit
-> snapshot array/container
-> per-state identity and capability
-> M4-003 Resource
-> constraints key-state classification
-> authorization
-> revoked
-> M4-030 TTL
-> M4-031 usage
-> global duplicate leaseRef detection
-> Unicode code-point presentation sort
-> detached immutable result
```

No malformed row is silently dropped to make the listing partially succeed.

## 24. No mutation and no reservation claim

M4-035 is observational only.

It does not:

```text
consume a use
reserve a use
revoke/unrevoke
issue/mint/delete a Lease
repair state
rewrite TTL/counters
rerun policy or approval
execute an Action
write an authorization success merely because a Lease was listed
```

A successful listing reflects one snapshot and is not a reservation for future
execution. The underlying state may change immediately after the listing returns.

## 25. Portable corpus and hardening coverage

The portable corpus contains 35 cases:

```text
LLST-001 .. LLST-035
```

Coverage includes:

- empty/ordinary listing;
- storage-independent and Unicode code-point ordering;
- independent TTL/usage/revocation facts;
- parent display without traversal;
- constraint privacy/minimization;
- authorization and providerIdentity preservation;
- duplicate and malformed snapshot states;
- M4-003/M4-030/M4-031 failure preservation;
- explicit observedAt and no Broker host clock;
- store unavailable/malformed/over-limit outcomes;
- minimal CLI argument and one-clock-read behavior;
- terminal control/bidi escaping;
- JSON exact parsed-string preservation;
- absence of synthesized authorization/activity fields.

The Broker suite reports:

```text
lease-listing.test.ts: 37 PASS
```

including corpus integrity and hostile/reference-store hardening.

The command/rendering suite reports:

```text
lease-list-cli.test.ts: 9 PASS
```

## 26. Exact final implementation evidence

Final accepted implementation/hardening head:

```text
959babf2839510b7437a0af331573602e78b1590
```

Exact-head normal CI:

```text
CI #564
run: 33713294276
PASS
```

CI evidence includes:

- `pnpm install --frozen-lockfile`: PASS;
- supply-chain policy: 124 entries PASS;
- architecture boundaries: PASS;
- schema shape: 16 schemas PASS;
- schema compatibility baseline: PASS;
- strict workspace TypeScript: PASS;
- Vitest: 64 test files / 1250 tests PASS;
- `lease-listing.test.ts`: 37 PASS;
- `lease-list-cli.test.ts`: 9 PASS;
- oxlint: 0 errors, 2 existing repository warnings;
- Shared TCK assets prepared: 44 registered fixtures;
- external non-workspace dummy consumer: 44 installed TCK asset checks PASS;
- packed testkit artifact/external consumer boundary: PASS.

Exact pinned DeepSeek Harness source-conformance:

```text
Harness rc5 source conformance #506
run: 33713294087
PASS
```

DeepSeek Harness remains Adapter compatibility/conformance evidence only. It did
not define M4-035 Lease listing semantics and is not imported as protocol authority.

## 27. Review history and quality decisions

The implementation encountered several real defects and they were corrected rather
than hidden by weakening gates:

1. CI #558 found internal TypeScript result narrowing defects. The implementation
   introduced an explicit internal success/failure discriminator instead of using
   unsafe casts to blur public unions.
2. CI #559 found the raw ESC JSON source defect in LLST-033/034. The corpus source
   was corrected to JSON-safe escaping with unchanged runtime values/expectations.
3. Post-green source review found reference-store constraint-key aliasing.
4. The same review found that rebuilding store state from the static interface could
   sanitize malformed runtime own-property shape before Broker validation.
5. Hardening added regressions for both defects.
6. CI #563 then found strict TypeScript issues in the descriptor-preserving clone;
   the implementation was corrected to satisfy `exactOptionalPropertyTypes` rather
   than relaxing TypeScript settings.
7. Final head `959babf2...` reached exact-head CI/Harness dual-green.

No schema, validator, TCK, TypeScript strictness, frozen-lockfile policy,
supply-chain rule, architecture boundary or fail-closed invariant was weakened.

## 28. Reference implementation limitations

The in-memory inventory store is reference/test infrastructure only.

It captures a process-local immutable snapshot and intentionally exposes no mutation
API. It does **not** automatically share live state with the separate M4-032,
M4-033 or M4-034 in-memory reference stores.

A production deployment that needs live Lease lifecycle listing must bind
`LeaseInventoryStore` to the same authoritative backend that owns the relevant
Lease state and must provide backend-specific coherent snapshot/isolation evidence.

M4-035 does not claim database, multi-process or distributed snapshot isolation.
M15 remains the later distributed/multi-node concern.

## 29. Explicit non-claims

M4-035 does not:

- alter the public CapabilityLease schema/type;
- create an authorization/usable/effective-authority verdict;
- issue, consume, reserve, revoke, delete or repair a Lease;
- select an M4-022 candidate for execution;
- validate M4-034 attenuation while listing;
- inherit ancestor lifecycle state into child rows;
- establish remote or multi-tenant admin authorization;
- implement pagination/cursors;
- define a database/distributed Lease inventory adapter;
- create the integrated M10 product CLI;
- implement M4-036 revoke CLI;
- wire M4-040+ PEP enforcement;
- import Harness lineage/CLI semantics as protocol authority;
- authorize PR #3 merge.

## 30. Package-stage state

At the final implementation/hardening head, Capability Broker remains:

```text
PACKAGE_STAGE = "M4-035-LEASE-LISTING-IMPLEMENTED"
```

This audit does **not** change that marker.

Implementation/hardening is accepted at
`959babf2839510b7437a0af331573602e78b1590`, but this audit commit itself must
reach exact-head normal CI + exact pinned Harness rc5 source-conformance dual-green
before the package-stage acceptance record is authorized.

Only after audit dual-green may a package-stage record change the marker to the
accepted M4-035 stage according to repository precedent.

## 31. Current gate decision

Decision:

```text
M4-035 protocol-first: CLOSED
M4-035 production implementation/hardening: ACCEPTED
M4-035 acceptance audit: RECORDED / EXACT-HEAD VERIFICATION PENDING

M4-035 package acceptance record: NOT AUTHORIZED YET
M4-035 final governance: NOT AUTHORIZED
M4-036+: NOT AUTHORIZED
M4-040+: NOT AUTHORIZED
M6: NOT AUTHORIZED
M10 integrated CLI implementation: NOT AUTHORIZED BY THIS GATE
M13: NOT AUTHORIZED
M15: NOT AUTHORIZED
PR #3 merge: NOT AUTHORIZED
```

The implementation acceptance decision is based on the final reviewed exact head and
its dual-green evidence, not on an earlier candidate or on the stale PR description.

The next permitted action is only exact-head verification of this audit commit.
