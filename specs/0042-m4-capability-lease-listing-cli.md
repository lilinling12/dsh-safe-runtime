# M4-035 — Deterministic CapabilityLease Listing CLI

Status: **DRAFT NORMATIVE SPECIFICATION**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-035 P1 — lease listing CLI`  
Profile: `M4-035_LEASE_LISTING_V1`  
Depends on: M1 CapabilityLease model, M4-003 exact Resource normalization, M4-030 TTL validity, M4-031 usage validity, M4-033 revocation state, M4-034 attenuation boundary  
Separated from: M4-036 revoke CLI, M4-040+ PEP composition, M10 integrated CLI, M15 distributed/multi-node storage

## 1. Purpose

M4-035 defines a deterministic, read-only operator listing boundary for already-issued
CapabilityLeases and the minimal CLI projection required by the roadmap.

This Gate answers one narrow question:

> From one coherent authoritative Lease inventory snapshot and one explicit logical
> observation time, what descriptive Lease and independent lifecycle facts can be
> shown deterministically without converting listing into authorization?

The listing is observability/administration support. It is **not** an allow decision,
not a CapabilityDecision, not an execution reservation, and not proof that any listed
Lease is currently usable by an Action.

M4-035 MUST NOT create an `active`, `usable`, `authorized`,
`effectiveAuthority`, `attenuationValid`, or equivalent aggregate authorization
field.

## 2. Repository and architecture reconciliation

At the M4-035 parent head, the repository has no existing CLI package, no package
`bin` entry, no root CLI script, and no CLI parser dependency. The existing
Capability Broker package is a library package.

Therefore M4-035 defines:

1. a runtime-independent read-only Lease inventory/listing semantic boundary; and
2. a minimal logical `lease list` CLI projection over that boundary.

The protocol-first Gate does **not** authorize a new CLI package, dependency,
manifest change, lockfile change, or production command implementation.

If production implementation later introduces a dedicated `packages/cli` package,
that is an implementation architecture choice which MUST preserve this contract and
the repository architecture rules. The Capability Broker MUST NOT acquire a reverse
dependency on a CLI/presentation package.

M10 remains the owner of the eventual integrated product CLI. M4-035 MUST NOT
preemptively define unrelated global commands, remote transport, global configuration
discovery, shell completion, or product-wide exit-code conventions.

## 3. Existing authority preserved

### 3.1 Published CapabilityLease wire model

M4-035 does not add fields to the public v1alpha1 CapabilityLease schema/type.
The published wire fields remain:

```text
apiVersion
kind
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

`revoked` remains M4-033 authoritative operational state keyed by `leaseRef`; it is
not promoted into the CapabilityLease wire object.

### 3.2 Existing lifecycle primitives remain distinct

M4-035 reuses existing accepted meanings instead of inventing a second lifecycle
model:

- M4-003 — exact Resource normalization;
- M4-030 — TTL/lifetime validity at explicit `observedAt`;
- M4-031 — usage-state validity/exhaustion;
- M4-033 — exact Lease revocation fact;
- M4-034 — parent-child attenuation and hierarchy-aware consume.

Listing MUST NOT reinterpret those semantics.

### 3.3 M4-022 snapshot/determinism precedent

M4-022 established two reusable deterministic inventory principles:

- one invocation observes one coherent Lease snapshot; and
- Lease refs used for presentation are ordered by Unicode code-point lexicographic
  order, not storage insertion order.

M4-035 reuses those principles, but does not reuse M4-022 request matching or
candidate semantics.

## 4. Trust and visibility boundary

M4-035 is a **trusted operator/admin read surface** over a configured authoritative
Lease store scope.

This Gate does not define tenant/user authorization for exposing Lease inventory to an
untrusted remote caller. A deployment that exposes the listing through HTTP, RPC,
multi-tenant SaaS, or another remote interface MUST add an independent authorization
boundary appropriate to that deployment.

The inventory store's configured scope determines which Lease records are visible to
the local operator invocation. The portable M4-035 caller cannot widen or narrow that
scope with arbitrary filters.

This Gate MUST NOT be described as a tenant-isolation or remote-admin authorization
protocol.

## 5. Portable Broker input

The logical Broker input is exactly:

```text
LeaseListingInput {
  profile: "M4-035_LEASE_LISTING_V1"
  observedAt: RFC3339 timestamp
}
```

No optional fields exist.

The caller MUST NOT provide:

```text
leaseRef
subjectRef
parentLeaseRef
capability
resource
authorization
revoked
activeOnly
includeRevoked
limit
cursor
sort
tenant
scope
```

Unknown string or symbol properties fail closed.

`observedAt` is explicit so the Broker never reads the host clock and identical input
plus identical inventory snapshot produces identical semantic output.

`observedAt` MUST satisfy the same deterministic RFC3339/Gregorian/offset/fraction/
leap-second grammar accepted by M4-030. M4-035 MUST NOT use JavaScript `Date`,
locale parsing, or host timezone semantics to define that grammar.

## 6. Minimal logical CLI projection

The logical command is:

```text
lease list
```

M4-035 defines only these command-local options:

```text
--json
--observed-at <RFC3339>
```

Semantics:

- `--json` selects structured JSON rendering;
- without `--json`, rendering is human-oriented text/table output;
- `--observed-at` supplies the exact Broker `observedAt`;
- when `--observed-at` is omitted, the CLI wrapper captures its injected/host clock
  exactly once at command start and passes that one timestamp to the Broker.

The Broker itself never reads a clock.

Unknown options, duplicate singleton options, missing option values, malformed
timestamps, unexpected positional arguments, or other command shapes fail as a CLI
usage error **before** inventory store access. An invalid command MUST NOT silently
fall back to a broader listing.

The executable/binary name is intentionally not portable M4-035 semantics.

M4-035 does not assign global numeric process exit codes. It defines only logical
classes:

```text
SUCCESS
CLI_USAGE_ERROR
RUNTIME_FAILURE
```

M10 may later map those classes into product-wide numeric exit codes.

## 7. Independent read-only inventory port

M4-035 MUST NOT widen or redefine the accepted M4-032, M4-033, or M4-034 mutation
ports.

The logical read-only port is:

```text
LeaseInventoryStore {
  listSnapshot(maxEntries: 1024): LeaseInventoryStoreOutcome
}
```

Portable outcomes are:

```text
SNAPSHOT {
  states: LeaseInventoryState[]
}

LIMIT_EXCEEDED

UNAVAILABLE
```

The operation is read-only. There is no `OUTCOME_UNKNOWN` mutation result because
M4-035 commits no authoritative state transition.

The Broker invokes the inventory store at most once per listing request.

### 7.1 Coherent snapshot

A successful `SNAPSHOT` MUST represent one coherent logical snapshot of all Lease
inventory visible in the configured operator scope.

The store MUST NOT construct one listing by mixing independently read records from
different logical versions if doing so can fabricate a state that never existed.

Storage technology is not portable semantics. Memory, SQLite, PostgreSQL,
transactional KV, or another backend may satisfy the contract with backend-appropriate
snapshot/isolation evidence.

### 7.2 Bounded inventory

The portable v1 listing bound is:

```text
MAX_LEASE_LIST_ENTRIES = 1024
```

The bound applies before returning a successful snapshot.

If the visible inventory contains more than 1024 records, the store returns
`LIMIT_EXCEEDED`, mapped to:

```text
FAIL_CLOSED / STORE / LEASE_LIST_SNAPSHOT_LIMIT_EXCEEDED
```

M4-035 MUST NOT silently truncate, return the first 1024 records, or claim a partial
result is complete.

Portable pagination is intentionally deferred. A future paginated profile MUST define
cursor/snapshot consistency explicitly rather than bolting an unstable cursor onto
this profile.

## 8. Authoritative operational inventory state

The trusted inventory state is:

```text
LeaseInventoryState {
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
}
```

This is an operational projection for listing. It is not a second public
CapabilityLease wire model.

`revoked` is the M4-033 operational fact. All other fields correspond to the existing
Lease semantic fields.

The store result is still validated defensively before it becomes public listing
output.

## 9. Snapshot identity and state preflight

Every state in a successful snapshot MUST have a valid exact `leaseRef`, and all
`leaseRef` values MUST be globally unique within the snapshot.

Duplicate identity fails the whole listing:

```text
FAIL_CLOSED / SNAPSHOT / LEASE_LIST_DUPLICATE_LEASE_REF
```

No first/last/storage-order winner is selected.

The Broker validates the fields it exposes or interprets:

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

The existing ref domain is preserved: 1..512 Unicode code points, exact value, with
no trim, normalization, case folding, prefixing, parsing, alias resolution, or
coercion.

The existing CapabilityLease capability domain is preserved: string length 3..256.
M4-035 MUST NOT retroactively import the stricter CapabilityRequest capability regex.

Authorization is limited to the existing kinds:

```text
policy
approval
lease
system
```

with a valid exact ref.

`revoked` MUST be an exact boolean. Truthy/falsy coercion is forbidden.

## 10. Resource projection

Every inventory Resource is normalized through the accepted M4-003 exact Resource
boundary.

M4-035 preserves the canonical exact fields:

```text
scheme
locator
providerIdentity?
```

It MUST NOT apply M4-004 wildcard semantics or infer filesystem/provider containment.

An M4-003 Resource failure aborts the whole snapshot and preserves the accepted
Resource reason under M4-035 `RESOURCE` stage.

A listing containing a malformed Resource MUST NOT quietly omit that row.

## 11. TTL projection

For each preflight-valid inventory state, M4-035 evaluates:

```text
M4-030_LEASE_TTL_V1 {
  issuedAt
  expiresAt
  observedAt: listing observedAt
}
```

Successful per-row descriptive TTL facts are exactly the accepted M4-030
eligible/ineligible results:

```text
TIME_ELIGIBLE / LEASE_TTL_ACTIVE

TIME_INELIGIBLE / LEASE_TTL_NOT_YET_ACTIVE

TIME_INELIGIBLE / LEASE_TTL_EXPIRED
```

An M4-030 failure aborts the whole listing and preserves the accepted M4-030 reason
under M4-035 `TIME` stage.

M4-035 MUST NOT convert `TIME_ELIGIBLE` into `active`, `usable`, or `authorized`.

## 12. Usage projection

For each state, M4-035 evaluates the accepted M4-031 usage projection:

```text
M4-031_LEASE_USAGE_V1 {
  maxUses
  remainingUses
}
```

Successful descriptive facts remain:

```text
USAGE_ELIGIBLE / LEASE_USAGE_AVAILABLE

USAGE_INELIGIBLE / LEASE_USAGE_EXHAUSTED
```

An M4-031 failure aborts the whole listing and preserves the accepted M4-031 reason
under M4-035 `USAGE` stage.

Listing never decrements, reserves, consumes, repairs, or normalizes counters.

## 13. Revocation projection

The listing copies the exact M4-033 authoritative `revoked` boolean.

Revocation is independent of TTL and usage. For example, a Lease may simultaneously
be:

```text
revoked == true
ttl == LEASE_TTL_EXPIRED
usage == LEASE_USAGE_EXHAUSTED
```

and the listing MUST preserve all three facts independently.

M4-035 MUST NOT simulate revocation from exhaustion, expiry, missing parent, or
authorization provenance.

## 14. Parent-child boundary

`parentLeaseRef`, when present, is descriptive identity in M4-035.

The listing MUST NOT:

```text
require the parent to appear in the listing snapshot
walk parentLeaseRef
validate M4-034 attenuation
inherit ancestor revocation into a child row
calculate effective ancestor budget
calculate effectiveRemainingUses
infer runtime Subject lineage
```

A child row with a parent not present in the configured listing scope may still be
listed.

This does not prove the child is usable. Hierarchy-aware execution remains M4-034 and
later PEP/composition work.

## 15. Constraint privacy boundary

The CapabilityLease wire schema permits arbitrary JSON object constraints, but there
is no accepted generic constraint evaluation/display language and constraint values
may carry sensitive operational context.

M4-035 therefore does **not** emit raw `constraints` in its listing result.

It emits only:

```text
constraintsState: "NONE" | "NON_EMPTY"
```

Classification:

```text
constraints omitted -> NONE
constraints {}      -> NONE
constraints with >=1 own JSON key -> NON_EMPTY
```

Malformed/unreadable/non-object runtime values fail closed as:

```text
FAIL_CLOSED / SNAPSHOT / LEASE_LIST_CONSTRAINTS_INVALID
```

The listing MUST NOT stringify, recursively traverse, log, or echo constraint values
merely to determine `NON_EMPTY`.

This is a privacy/minimization rule, not permission to ignore constraints during
authorization. M4-035 does not authorize anything.

## 16. Authorization provenance projection

The existing `authorization.kind` and `authorization.ref` may be listed as
descriptive provenance.

M4-035 MUST NOT dereference the ref, invoke approval, rerun policy, prove delegated
authority, or treat one authorization kind as stronger than another.

Listing provenance is evidence, not a grant.

## 17. Successful result

Broker success is:

```text
LISTED {
  status: "LISTED"
  profile: "M4-035_LEASE_LISTING_V1"
  observedAt: <exact validated input>
  entries: LeaseListingEntry[]
}
```

Each entry is:

```text
LeaseListingEntry {
  leaseRef
  subjectRef
  parentLeaseRef?
  capability
  resource
  issuedAt
  expiresAt
  maxUses
  remainingUses
  authorization
  revoked
  constraintsState: "NONE" | "NON_EMPTY"
  ttl: M4-030 eligible/ineligible fact
  usage: M4-031 eligible/ineligible fact
}
```

No raw `constraints` field is returned.

Entries MUST be sorted by exact `leaseRef` in Unicode code-point lexicographic order.
This is presentation determinism only. It is never authorization precedence.

The result and every nested public object/array MUST be detached and immutable-
equivalent; the TypeScript reference implementation returns recursively frozen
output.

## 18. Failure algebra

M4-035 stages are:

```text
INPUT
STORE
SNAPSHOT
RESOURCE
TIME
USAGE
```

M4-035-owned stable failures are:

```text
LEASE_LIST_INPUT_INVALID
LEASE_LIST_PROFILE_INVALID
LEASE_LIST_OBSERVED_AT_INVALID
LEASE_LIST_STORE_UNAVAILABLE
LEASE_LIST_STORE_RESULT_INVALID
LEASE_LIST_SNAPSHOT_LIMIT_EXCEEDED
LEASE_LIST_SNAPSHOT_INVALID
LEASE_LIST_LEASE_REF_INVALID
LEASE_LIST_SUBJECT_REF_INVALID
LEASE_LIST_PARENT_LEASE_REF_INVALID
LEASE_LIST_CAPABILITY_INVALID
LEASE_LIST_CONSTRAINTS_INVALID
LEASE_LIST_AUTHORIZATION_INVALID
LEASE_LIST_REVOKED_STATE_INVALID
LEASE_LIST_DUPLICATE_LEASE_REF
```

M4-003 Resource reasons are preserved under `RESOURCE`.
M4-030 failures are preserved under `TIME`.
M4-031 failures are preserved under `USAGE`.

Failure output MUST NOT echo attacker-controlled refs, Resource values, constraints,
authorization refs, host exception text, terminal control sequences, or stack traces.

CLI parsing additionally owns:

```text
LEASE_LIST_CLI_ARGUMENT_INVALID
```

which maps to logical `CLI_USAGE_ERROR` and occurs before Broker/store invocation.

## 19. Observable validation order

Portable Broker observable order is:

```text
1. outer input is a readable record
2. exact own key set is profile + observedAt
3. profile == M4-035_LEASE_LISTING_V1
4. observedAt satisfies accepted M4-030 timestamp grammar
5. invoke inventory store exactly once with maxEntries = 1024
6. classify store outcome
7. reject LIMIT_EXCEEDED / UNAVAILABLE / malformed store envelope
8. validate snapshot array container and <= 1024 cardinality
9. preflight states in store snapshot order:
   a. state object/readability
   b. leaseRef
   c. subjectRef
   d. parentLeaseRef when present
   e. CapabilityLease capability domain
   f. exact Resource normalization
   g. constraints container/key-presence classification without value traversal
   h. authorization kind/ref
   i. revoked boolean
   j. M4-030 TTL evaluation using the one observedAt
   k. M4-031 usage evaluation
10. global duplicate leaseRef detection
11. Unicode code-point leaseRef sort
12. detached immutable result
```

Snapshot input order determines only which malformed consumed field is reported first.
It does not define final presentation order.

Physical backend read order may differ only if the visible result is equivalent to one
coherent snapshot and preserves this observable failure contract.

## 20. Concurrency and snapshot meaning

Listing is read-only and does not serialize all mutations globally.

A conforming backend MAY observe the inventory before or after a concurrent consume
or revoke operation, but the successful result MUST correspond to one coherent
logical snapshot according to that backend's documented isolation mechanism.

M4-035 does not promise that a displayed state remains unchanged after the command
returns.

Therefore listing output MUST NOT be used as a reservation for later execution.

## 21. JSON machine rendering

`--json` renders the Broker result as structured JSON.

Requirements:

- the parsed JSON preserves the exact semantic strings returned by the Broker;
- no raw constraints are introduced by the renderer;
- no synthesized authorization/usable status is introduced;
- JSON string escaping is used for control characters as required by JSON;
- rendering MUST NOT invoke attacker-controlled coercion hooks;
- output is valid UTF-8 JSON.

M4-035 does not define canonical JSON bytes or a digest. Object member order and
whitespace MUST NOT be treated as protocol identity. M10 or the Evidence plane may
later define stronger byte-level conventions if needed.

## 22. Human terminal rendering safety

The existing generic ref domain allows code points that are unsafe to print directly
to a terminal. Resource/capability strings may also contain display-confusing Unicode.

Human rendering MUST apply a deterministic single-line terminal-safe escape to every
untrusted textual field before display.

At minimum, raw output MUST NOT contain these caller/store-derived control classes:

```text
U+0000..U+001F
U+007F
U+0080..U+009F
U+202A..U+202E
U+2066..U+2069
```

They MUST be rendered as visible escapes such as `\u001b`, `\u202e`, or an
equivalent deterministic ASCII escape representation.

Newline, carriage return, tab, ESC/CSI-related controls, and bidi embedding/isolation
controls therefore cannot create extra rows, terminal color/control sequences, or
visual reordering.

This is a presentation safety transformation only. It MUST NOT mutate the Broker's
exact stored/ref identity.

Implementations MAY additionally escape other non-printable/format code points as
long as the rule is deterministic and does not change JSON machine semantics.

## 23. Hostile JavaScript boundary

A TypeScript reference implementation accepts Broker input as `unknown` and MUST:

- inspect exact own data properties only;
- reject inherited/accessor/symbol/unexpected request authority;
- fail closed on revoked Proxy / `ownKeys` / descriptor failures;
- perform no `String(value)` or other authority coercion;
- invoke the store at most once;
- reject malformed/unreadable store outcome/state evidence;
- avoid recursively traversing raw constraint values;
- preserve stage/reason sanitization;
- return detached frozen results.

The CLI wrapper likewise treats `argv` and clock/provider results defensively and MUST
NOT execute user-controlled conversion hooks to construct command authority.

## 24. No side effects

M4-035 is observational only.

It MUST NOT:

```text
consume a use
revoke/unrevoke a Lease
repair malformed state
delete a Lease
issue a Lease
write a tombstone
rewrite TTL
rewrite counters
rerun approval
rerun policy
execute an Action
write an audit success merely because a Lease was listed
```

Store calls for M4-035 are read-only by contract.

## 25. M4-036 separation

M4-036 owns revoke CLI behavior.

M4-035 MUST NOT add:

```text
lease revoke
--revoke
interactive revoke prompt
bulk revoke
delete
unrevoke
```

The listing may show `revoked: true|false`; that does not authorize a mutation.

## 26. M10 integrated CLI separation

M10-012 later calls for integrated `lease list/revoke` product CLI behavior.

M4-035 intentionally does not define:

- product-global binary name;
- config/profile discovery;
- daemon/remote connection;
- authentication;
- tenant selection;
- pagination UX;
- shell completion;
- global numeric exit codes;
- combined list+revoke workflows.

M10 may compose the accepted M4-035 listing semantics rather than redefine them.

## 27. Harness boundary

DeepSeek Harness `0.1.0-rc.5` remains Adapter compatibility evidence only.

M4-035 does not import Harness session, parentSession, workflow, run ID,
delegationDepth, approval UI, or CLI behavior as Lease inventory authority.

No Harness source change is required to define the portable listing semantics.

## 28. Portable conformance corpus

Portable corpus:

```text
fixtures/lease-listing/cases.json
profile: M4-035_LEASE_LISTING_V1
LLST-001 .. LLST-035
```

Fixture-only state compression:

- `stateDefaults` shallow-fills omitted inventory-state fields;
- each state supplies `leaseRef`;
- an explicitly supplied field replaces the whole default field;
- `generatedStates` may generate the deterministic 1025-row limit case.

These fixture defaults are not production Lease defaults.

The corpus covers:

- empty and ordinary listing;
- deterministic storage-independent and Unicode ref ordering;
- independent TTL/usage/revocation facts;
- parent display without traversal;
- constraint minimization;
- authorization/provider identity preservation;
- duplicate and malformed snapshot states;
- M4-003/M4-030/M4-031 failure preservation;
- explicit observedAt and no host-clock Broker behavior;
- store unavailable/malformed/over-limit outcomes;
- minimal CLI argument/clock projection;
- terminal control/bidi escaping;
- JSON exact parsed-string preservation;
- absence of synthesized active/usable/authorized fields.

## 29. Explicit non-goals

M4-035 does not:

- add fields to CapabilityLease schema/type;
- create a second public Lease model;
- issue or mint Leases;
- select an M4-022 candidate for execution;
- prove current authorization;
- validate M4-034 parent attenuation during listing;
- compute ancestor-effective quota/revocation;
- consume or reserve uses;
- revoke a Lease;
- stop an Action;
- establish remote/multi-tenant admin authorization;
- implement pagination;
- create a database/distributed storage adapter;
- define M10's whole CLI framework;
- modify Harness semantics;
- register new Shared TCK assets in this protocol-first step.

## 30. Protocol-first Gate boundary

The M4-035 protocol-first delta is exactly:

```text
specs/0042-m4-capability-lease-listing-cli.md
fixtures/lease-listing/cases.json
docs/handoff/CURRENT.md
```

This commit MUST NOT change:

```text
production TypeScript
package manifests or a CLI package
dependencies or pnpm-lock.yaml
public CapabilityLease schema/type
Core wire semantics
Shared TCK manifest/assets
docs/handoff/HISTORY.md
docs/roadmap.md acceptance marker
Adapter/Harness baseline
M4-036
M4-040+
M6
M10 implementation
M13
M15
```

Production implementation may begin only after this exact protocol-first head
reaches:

1. normal repository CI PASS;
2. exact pinned DeepSeek Harness rc5 source-conformance PASS;
3. PR #3 remains Open, Draft and mergeable;
4. no blocking review/review thread exists.

Any semantic ambiguity discovered during implementation MUST first be corrected in
this specification/corpus rather than hidden in TypeScript or CLI behavior.
