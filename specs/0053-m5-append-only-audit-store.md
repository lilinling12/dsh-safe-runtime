# Spec 0053 — M5-001 Append-Only Audit Store

Status: **DRAFT NORMATIVE SPECIFICATION — PROTOCOL-FIRST / NOT ACCEPTED**

Milestone: `M5 — Audit Ledger + Privacy`

Gate: `M5-001 P0 — append-only store`

Profile: `M5-001_APPEND_ONLY_AUDIT_STORE_V1`

---

## 1. Purpose

M5-001 defines the minimum language-neutral storage semantics required for an
audit ledger to be truthfully described as append-only.

This Gate defines a storage contract and portable state-transition behavior. It
does **not** select a database, define canonical serialization, compute record
digests, build a hash chain, provide an integrity-verification CLI, define
retention, or implement redaction policy.

The architecture requirement is narrow and mandatory:

> Audit Record storage has append-only semantics.

M5-001 turns that statement into testable protocol behavior without importing
later M5 requirements early.

---

## 2. Existing authority retained

This specification MUST preserve the following accepted authority:

1. Core Spec 0001 defines CapabilityReceipt persistence after redaction.
2. Core Spec 0001 distinguishes Claim, Evidence, Check and Verdict.
3. Core Spec 0001 gives Evidence integrity/privacy guidance, but those concerns do
   not make canonicalization, digesting or redaction an M5-001 responsibility.
4. The M2 Adapter sidecar exposes only a persistence seam. Its
   `SidecarEvidenceSink.append()` contract does not define the Audit Ledger store,
   retention, hash chaining or replay indexes.
5. `docs/architecture.md` requires Audit Record append-only semantics and lists a
   hash chain only as a separate recommendation.
6. The roadmap assigns canonical JSON to M5-002, record digest to M5-003, hash
   chain to M5-004, and integrity verification CLI to M5-005.

M5-001 MUST NOT redefine any of those later responsibilities.

---

## 3. Terminology

### 3.1 Audit Record

For this Gate, an `AuditRecord` is caller-supplied structured data accepted by the
store as one logical ledger record.

M5-001 treats the record payload as opaque protocol data. It does not define:

- canonical JSON bytes;
- a record digest;
- a previous-record digest;
- a hash-chain field;
- encryption format;
- compression format;
- redaction transformation;
- retention metadata.

A later Gate MAY add those concerns without changing the append-only state
transition defined here.

### 3.2 Ledger Entry

A `LedgerEntry` is the immutable stored occurrence of one accepted `AuditRecord`.
It has a store-assigned non-negative integer `sequence` used only to define order
inside one ledger.

`sequence` is not a digest, timestamp, database primary-key requirement, global
identifier, or cross-ledger ordering authority.

### 3.3 Ledger

A ledger is an ordered sequence of zero or more immutable `LedgerEntry` values.
Each ledger has its own sequence domain beginning at `0`.

### 3.4 Append attempt

An append attempt requests that one record become the next ledger entry.

The accepted outcome domain is closed:

```text
APPENDED
NOT_APPENDED
INDETERMINATE
```

No other success-like outcome is portable M5-001 authority.

---

## 4. Core append-only invariant

For a ledger state `L = [e0, e1, ... e(n-1)]`, a successful append of record `r`
MUST produce exactly:

```text
L' = [e0, e1, ... e(n-1), en]
```

where:

```text
en.sequence = n
en.record   = r
```

and every pre-existing entry remains unchanged.

A successful append MUST NOT:

- modify any earlier entry;
- replace any earlier entry;
- delete any earlier entry;
- reorder entries;
- insert before the current tail;
- truncate the ledger;
- reuse an existing sequence;
- create more than one entry for that single successful invocation.

---

## 5. Closed mutation surface

The portable M5-001 store mutation surface contains only:

```text
append(record)
```

A conforming M5-001 API MUST NOT expose a portable mutation operation equivalent
to:

```text
update(sequence, record)
replace(sequence, record)
delete(sequence)
truncate(length)
insert(sequence, record)
move(from, to)
clear()
```

Administrative data destruction required by future legal/retention policy is not
silently modeled as an M5-001 ledger mutation. M5-015 owns delete/export workflow
and MUST define any later exception explicitly.

---

## 6. Append ordering

Within one ledger, every `APPENDED` result MUST have one unique sequence.

If successful append `A` is observed before successful append `B` begins, then:

```text
A.sequence < B.sequence
```

For overlapping concurrent appends, the store MUST choose one total order that is
consistent with the final ledger state. The store MUST NOT publish duplicate
sequences or a partially ordered ledger.

M5-001 does not require a particular locking, transaction, consensus, WAL, SQLite
or PostgreSQL implementation.

---

## 7. Outcome semantics

### 7.1 APPENDED

`APPENDED(sequence)` means the store can authoritatively report that this append
invocation produced exactly one new immutable tail entry at `sequence`.

The returned sequence MUST identify the newly appended entry in the store's
observable ledger order.

### 7.2 NOT_APPENDED

`NOT_APPENDED(reason)` means the store can authoritatively report that this append
invocation produced no new ledger entry.

The ledger state after the failed invocation MUST be observationally equivalent
to the state before that invocation, except for append activity by other
independent concurrent invocations.

### 7.3 INDETERMINATE

`INDETERMINATE(reason)` means the implementation cannot safely determine whether
the attempted record became visible before an interruption/failure boundary.

This outcome is required whenever the implementation cannot prove either
`APPENDED` or `NOT_APPENDED`.

The caller MUST NOT reinterpret `INDETERMINATE` as either success or failure.
Automatic retry is outside M5-001 because a retry may create a second occurrence
without a later idempotency/deduplication contract.

M5-001 therefore does not claim exactly-once delivery across crash or transport
ambiguity.

---

## 8. Failure truthfulness

The store MUST fail loud rather than report a false append success.

The following are forbidden:

- returning `APPENDED` before the store's own publication boundary is reached;
- returning `NOT_APPENDED` when the implementation knows the record is already
  visible;
- collapsing an ambiguous post-publication failure into `NOT_APPENDED`;
- silently dropping an append while returning success;
- mutating an earlier record as recovery for a failed append.

M5-020 later owns the product policy for an unavailable audit store. M5-021 later
owns durable local spooling. M5-001 defines neither policy.

---

## 9. Record immutability and ownership

Once an append is reported `APPENDED`, subsequent caller mutation of its original
in-memory input MUST NOT alter the logical stored entry.

A conforming implementation MUST establish independent stored ownership before
reporting `APPENDED`.

This requirement is semantic, not a serialization mandate. Implementations MAY
copy, encode or otherwise materialize records internally, but M5-001 does not
specify canonical bytes.

Likewise, values returned from a read/snapshot surface MUST NOT provide a mutable
alias capable of changing already stored ledger state.

---

## 10. Read observability required for conformance

An implementation MUST expose enough read-only observation to verify the
append-only invariant.

The portable conformance model uses:

```text
snapshot() -> ordered LedgerEntry[]
```

`snapshot()` is observational only. It MUST NOT expose mutation authority over the
ledger.

A snapshot MUST list entries in strictly increasing `sequence` order beginning at
`0` with no gaps for the current ledger state.

M5-001 does not define pagination, indexes, filtering, query language, replay
indexes or retention windows.

---

## 11. Duplicate records

M5-001 does not define record identity or deduplication.

Appending two structurally equal caller records in two successful invocations is
permitted and MUST produce two different ledger occurrences with different
sequences.

A conforming implementation MUST NOT invent digest-based, reference-based or
payload-based deduplication as part of this Gate.

Any future idempotency mechanism must be separately specified and must not rewrite
history.

---

## 12. Multiple ledgers

Sequence and ordering are scoped to one ledger.

M5-001 does not define global ordering across independent ledgers. One ledger's
append failure MUST NOT mutate another ledger as hidden compensation.

How a product chooses ledger partition keys is outside this Gate.

---

## 13. Persistence boundary

M5-001 defines append-only store semantics, not a universal durability level.

An implementation MUST document its own publication/durability boundary and MUST
only return `APPENDED` according to that declared boundary.

The portable contract does not equate `APPENDED` with:

- fsync to physical media;
- replication quorum;
- remote object-store durability;
- crash-proof exactly-once behavior;
- tamper evidence.

Those stronger claims require separate authority and evidence.

---

## 14. Relationship to M2 sidecar persistence

`SidecarEvidenceSink.append()` is an Adapter seam and is not automatically the
M5-001 Audit Ledger implementation.

M5-001 MUST NOT:

- import DeepSeek Harness types into a portable store contract;
- make Harness session storage the protocol authority;
- redefine `SidecarEvidenceRecord`;
- require the ledger to use Harness durable sequence as its own ledger sequence;
- claim sidecar persistence already provides canonicalization, digest integrity or
  hash chaining.

A later implementation MAY adapt sidecar records into an M5 store through an
explicit boundary.

---

## 15. Explicit non-goals / later-Gate ownership

M5-001 MUST NOT implement or claim completion of:

```text
M5-002 canonical JSON
M5-003 record digest
M5-004 hash chain
M5-005 integrity verify CLI
M5-010 secret detector interface
M5-011 env redaction
M5-012 args/result digest by default
M5-013 source content opt-in
M5-014 retention TTL
M5-015 delete/export workflow
M5-020 audit store unavailable policy
M5-021 durable local spool
M5-022 spool reconciliation
```

It also does not define M6 transactionality, M7 commit journal semantics, M9 AVP
ledger semantics, or M14 process isolation.

---

## 16. Portable conformance profile

Portable corpus:

```text
fixtures/append-only-audit-store/cases.json
profile: M5-001_APPEND_ONLY_AUDIT_STORE_V1
```

A conforming projection MUST cover every case exactly once.

The corpus tests these classes:

```text
EMPTY_APPEND
TAIL_APPEND
IMMUTABLE_PREFIX
SEQUENCE_ORDER
DUPLICATE_PAYLOAD_ALLOWED
NO_MUTATION_OPERATIONS
NOT_APPENDED_ATOMICITY
INDETERMINATE_TRUTHFULNESS
CALLER_ALIAS_ISOLATION
SNAPSHOT_ALIAS_ISOLATION
CONCURRENT_TOTAL_ORDER
LEDGER_SCOPE
NO_LATER_GATE_SEMANTICS
```

---

## 17. Required implementation properties after protocol acceptance

After this exact protocol-first head becomes normal-CI + pinned Harness dual-green,
M5-001 implementation MUST remain the smallest projection of this contract.

Implementation review MUST verify:

1. a runtime-neutral store abstraction;
2. one append mutation path only;
3. immutable ownership of accepted entries;
4. monotonic, gap-free per-ledger sequence assignment for successful appends;
5. truthful `APPENDED` / `NOT_APPENDED` / `INDETERMINATE` outcomes;
6. concurrent append total ordering without duplicate sequence publication;
7. no caller/read alias can rewrite ledger history;
8. no canonical JSON, record digest or hash-chain implementation;
9. no Harness-specific type leakage into portable storage authority;
10. no weakening of existing protocol, Schema, Shared TCK or security boundaries.

---

## 18. Protocol-first change boundary

The protocol-first candidate for M5-001 is restricted to exactly:

```text
specs/0053-m5-append-only-audit-store.md
fixtures/append-only-audit-store/cases.json
docs/handoff/CURRENT.md
```

It MUST NOT include production implementation, package creation, dependency or
lockfile changes, Schema, Shared TCK, Adapter rewrites, roadmap acceptance marker,
HISTORY modification, workflow changes or M5-002+ artifacts.

Only after the exact protocol-first head passes normal CI plus exact pinned
DeepSeek Harness rc5 source-conformance may implementation begin.

---

## 19. Acceptance rule

M5-001 may be accepted only when all of the following are true:

- protocol-first exact head was dual-green before implementation;
- every portable corpus case has executable conformance coverage;
- implementation exposes no history-rewriting mutation;
- failure/ambiguity outcomes are truthful;
- concurrent successful appends have a deterministic observable total order;
- record/snapshot aliases cannot mutate stored history;
- no M5-002+ concern was pulled into the Gate;
- normal CI is green on the reviewed exact implementation head;
- exact pinned Harness rc5 source-conformance is green on that same head;
- acceptance audit records the exact evidence before governance transition.
