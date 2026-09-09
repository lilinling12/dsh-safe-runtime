# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before changes;
> normative specs/schemas/TCK and accepted exact-head evidence remain authority.

## Snapshot

- Recorded at: `2026-09-09`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M5 — Audit Ledger + Privacy`
- Active PR: `#3 — feat(policy): begin M4 capability broker`
- Branch: `feat/m4-capability-broker`
- Base: `main@57430273e065be8d38807d67b175fa154c801d43`
- M4-001..014: **GOVERNANCE CLOSED**
- M4-020..025: **GOVERNANCE CLOSED**
- M4-030..036: **GOVERNANCE CLOSED**
- M4-040..052: **GOVERNANCE CLOSED**
- M5-001 P0 append-only store: **PROTOCOL-FIRST CANDIDATE / IMPLEMENTATION NOT AUTHORIZED UNTIL THIS EXACT HEAD IS DUAL-GREEN**
- M5-002+: **NOT AUTHORIZED by the current Gate**
- M6, M10, M13, M14 implementation, M15: **NOT AUTHORIZED by the current Gate**
- PR #3 merge: **NOT AUTHORIZED without explicit user authorization**

Live GitHub state overrides this snapshot.

## M4-052 final closure evidence

Closure-record exact head:

```text
a502d3018f3ae7dbab399ebaaebf0b0f3ab0c8b3
CI #646 / run 34297562557: PASS
Harness #588 / run 34297562612: PASS
Harness job 102297370394 step 10: PASS
Harness job 102297370394 step 11: PASS
```

M4-052 is therefore **GOVERNANCE CLOSED**.

The live roadmap contains no M4-053 item. The next numbered engineering Gate is
`M5-001 P0 — append-only store`.

## M5-001 recovered authority

Roadmap ownership:

```text
M5-001 P0 append-only store
M5-002 P0 canonical JSON
M5-003 P0 record digest
M5-004 P1 hash chain
M5-005 P1 integrity verify CLI
```

Architecture authority requires:

```text
Audit Record MUST have append-only semantics.
```

The architecture's hash-chain sketch is not M5-001 authority because the roadmap
assigns hash chaining separately to M5-004.

Core Spec 0001 already establishes that governed CapabilityReceipt state is
persisted after redaction and that Evidence has integrity/privacy semantics.
M5-001 does not redefine those wire objects or pull canonicalization, digesting,
redaction, retention or integrity verification into this Gate.

The existing M2 Adapter sidecar exposes a minimal persistence seam:

```text
SidecarEvidenceSink.append(record)
```

Its own source explicitly leaves storage, retention, hash chaining and replay
indexes to later safe-runtime milestones. M5-001 therefore does not redefine
`SidecarEvidenceRecord`, make Harness storage the portable ledger authority, or
reuse Harness durable sequence as Audit Ledger sequence authority.

There is no existing `audit-ledger` package in the current repository package
set. Package ownership/creation is intentionally not decided by this
protocol-first commit and must be justified during implementation review after
this exact head becomes dual-green.

## Current Gate — M5-001 protocol-first candidate

Normative candidate:

```text
specs/0053-m5-append-only-audit-store.md
```

Portable requirement corpus:

```text
fixtures/append-only-audit-store/cases.json
profile: M5-001_APPEND_ONLY_AUDIT_STORE_V1
cases: AOS-001..AOS-028
```

Pinned Harness compatibility baseline remains:

```text
0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a
```

The candidate defines append-only as a language-neutral state-transition
contract:

- `append(record)` is the only portable mutation;
- successful append adds exactly one immutable tail occurrence;
- pre-existing history cannot be updated, replaced, deleted, truncated,
  inserted-before or reordered;
- successful occurrences have unique, gap-free, monotonic per-ledger sequence;
- overlapping successful appends must resolve to one observable total order;
- caller or snapshot aliases cannot mutate stored history;
- outcome domain is `APPENDED`, `NOT_APPENDED`, `INDETERMINATE`;
- ambiguous publication failure must remain `INDETERMINATE`, preventing false
  success/failure and preventing an implicit exactly-once claim;
- structurally equal records may be appended more than once because M5-001 does
  not define deduplication or record identity.

## Explicit later-Gate exclusions

M5-001 MUST NOT implement or claim:

```text
canonical JSON                         # M5-002
record digest                          # M5-003
hash chain                             # M5-004
integrity verify CLI                   # M5-005
secret detector / env redaction       # M5-010 / M5-011
args/result digest defaults            # M5-012
source-content retention opt-in        # M5-013
retention TTL                          # M5-014
delete/export workflow                 # M5-015
audit-store unavailable product policy # M5-020
durable local spool / reconciliation   # M5-021 / M5-022
```

The candidate also does not claim SQLite/PostgreSQL/WAL/fsync/replication,
durable exactly-once, M6 transactionality, M7 commit-journal behavior, M9 AVP
ledger completion or M14 isolation.

## Protocol-first delta boundary

This candidate is restricted to exactly:

```text
specs/0053-m5-append-only-audit-store.md
fixtures/append-only-audit-store/cases.json
docs/handoff/CURRENT.md
```

No production implementation, new package, dependency, lockfile, Schema, Shared
TCK, Adapter rewrite, HISTORY, roadmap acceptance marker, workflow or M5-002+
artifact may change before this exact protocol-first head passes normal CI plus
exact pinned Harness rc5 source-conformance.

After that exact head becomes dual-green, only the smallest M5-001 runtime-neutral
store implementation/conformance delta becomes authorized. Package ownership must
be justified from the existing module boundaries rather than guessed from the
roadmap wording.

PR #3 remains Open / Draft and merge remains unauthorized without explicit user
approval.
