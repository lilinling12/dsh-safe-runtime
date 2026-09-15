# M5-001 Acceptance Audit — Append-Only Audit Store

Status: **ACCEPTED — IMPLEMENTATION / CONFORMANCE**

Milestone: `M5 — Audit Ledger + Privacy`

Gate: `M5-001 P0 — append-only store`

Normative specification:

```text
specs/0053-m5-append-only-audit-store.md
```

Portable corpus:

```text
fixtures/append-only-audit-store/cases.json
profile: M5-001_APPEND_ONLY_AUDIT_STORE_V1
cases: AOS-001..AOS-028
```

Pinned DeepSeek Harness compatibility baseline:

```text
0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a
```

This audit accepts the M5-001 implementation/conformance only. It authorizes the
M5-001 governance transition; it does **not** close governance, authorize M5-002,
or authorize PR #3 merge.

---

## 1. Predecessor governance authority

M4-052 closure-record head:

```text
a502d3018f3ae7dbab399ebaaebf0b0f3ab0c8b3
CI #646 / run 34297562557: PASS
Harness #588 / run 34297562612: PASS
Harness job 102297370394 step 10: PASS
Harness job 102297370394 step 11: PASS
```

That closure records M5-001 as the sole newly authorized protocol-first Gate.
M5-002+ remained unauthorized.

---

## 2. Protocol-first evidence

Protocol-first exact head:

```text
3178d195774c4abed033bd0137bd0df5112519dc
```

Exact predecessor:

```text
a502d3018f3ae7dbab399ebaaebf0b0f3ab0c8b3
```

The exact protocol-first diff contains only:

```text
docs/handoff/CURRENT.md                          +102 / -55
fixtures/append-only-audit-store/cases.json      +150 / -0
specs/0053-m5-append-only-audit-store.md          +446 / -0
```

No production/package implementation, dependency, lockfile, Schema, Shared TCK,
Adapter rewrite, HISTORY, roadmap marker, workflow, or M5-002+ artifact entered
the protocol-first commit.

Exact-head Gate evidence:

```text
CI #647 / run 34298176493: PASS
Harness #589 / run 34298176532: PASS
Harness job 102299244534 step 10: PASS
Harness job 102299244534 step 11: PASS
```

Implementation therefore began only after protocol-first dual-green.

---

## 3. Architecture / package ownership decision

Repository bootstrap currently materializes eight packages, while the existing
production architecture document already reserves a separate `packages/storage/`
boundary. M5-001 therefore does not overload `protocol`, `adapter-dsh`, or
`capability-broker`, and does not invent an `audit-ledger` package name.

The implementation adds the architecture-reserved package:

```text
@dsh-safe/storage
```

It is runtime/Harness neutral and has no runtime package dependencies. The package
boundary checker is extended only to treat `storage` like the other core packages
that may not import concrete `adapter-dsh` types.

This is consistent with the existing architecture rule that the portable core
must not depend on Harness concrete types.

---

## 4. Reviewed implementation

Primary clean implementation head:

```text
5cdb33921c241bc3679b1325cf1ccdb90bb8b8b0
```

Its parent is exactly the dual-green protocol-first head
`3178d195774c4abed033bd0137bd0df5112519dc`.

Primary implementation behavior:

- `AppendOnlyAuditStore.append(record)` is the only portable mutation surface;
- `snapshot()` is observational/read-only;
- successful appends publish exactly one immutable tail occurrence;
- per-ledger sequence begins at `0`, remains unique, gap-free, and monotonic;
- overlapping appends are serialized into one observable total order;
- duplicate payload occurrences remain allowed and are not deduplicated;
- caller-owned input is deeply copied before publication;
- returned history cannot mutate stored history through aliases;
- outcome domain is exactly `APPENDED`, `NOT_APPENDED`, `INDETERMINATE`;
- unknown publication state remains `INDETERMINATE` rather than being collapsed
  into false success/failure authority;
- invalid structured input returns `NOT_APPENDED` without partial ledger state;
- opaque own property names including `__proto__`, `constructor`, and `prototype`
  are preserved using null-prototype owned objects rather than invoking Object's
  legacy prototype setter.

The in-memory reference implementation explicitly claims process-memory
publication only. It does not claim crash durability, fsync, replication,
exactly-once delivery, or tamper evidence.

Exact-head evidence for this primary implementation head:

```text
CI #648 / run 34301190141: PASS
Harness #590 / run 34301190140: PASS
Harness job 102308245913 step 10: PASS
Harness job 102308245913 step 11: PASS
```

---

## 5. Pre-acceptance hardening findings

Implementation work was validated on temporary candidate branches before clean
commits entered PR #3. Temporary workflow commits never entered the product
branch history.

The candidate process found and corrected three concrete issues before
acceptance:

1. **TypeScript narrowing defect.** Initial candidate validation failed with
   `TS2322` in `append-only-store.ts`: the recursive readonly array/object union
   was not statically narrowed to `Readonly<AuditRecord>`. The fix adds a local
   post-shape-check assertion only; protocol/storage semantics were unchanged.
2. **Test false positive.** A static non-binding test matched the word `fsync` in
   the implementation's explicit *non-claim* prose. The test was corrected to
   detect actual `node:fs`, SQLite, or PostgreSQL imports instead of treating a
   security/durability disclaimer as an implementation.
3. **Hostile-key ownership risk.** Pre-PR implementation review found that cloning
   into ordinary `{}` could mishandle an own `__proto__` key through the legacy
   prototype setter. The store now clones structured objects into null-prototype
   objects and includes a regression proving opaque hostile keys remain data and
   do not pollute prototypes.

These changes strengthened implementation correctness without weakening the
M5-001 contract or adding later-Gate functionality.

---

## 6. Portable corpus executable conformance

Final test-only conformance hardening head:

```text
4c42752b45f4990ebd3c5423d3e338e8f89385ad
```

Its parent is exactly `5cdb33921c241bc3679b1325cf1ccdb90bb8b8b0`
and its entire diff is one new file:

```text
packages/storage/src/append-only-store.corpus.test.ts   +215 / -0
```

The test executes the complete `AOS-001..AOS-028` case ID domain through an
explicit conformance switch rather than merely counting corpus IDs.

Coverage includes:

- empty/tail append and immutable prefix;
- unique, gap-free sequence ordering;
- duplicate payload occurrences;
- absence of update/replace/delete/truncate/clear/insert/move mutation surfaces;
- truthful `APPENDED`, `NOT_APPENDED`, and `INDETERMINATE` classification;
- failure atomicity;
- no implicit retry/exactly-once claim;
- caller/snapshot alias isolation;
- overlapping append total order and real-time sequential ordering;
- independent ledger sequence domains and failure isolation;
- absence of canonical JSON, digest/hash-chain, Harness/sidecar authority leakage;
- executable verification of the declared protocol-first file-boundary wording.

For `AOS-028`, the executable test verifies the protocol-first boundary is
explicitly declared by Spec/CURRENT, while this audit's exact GitHub compare is
the stronger historical evidence that the protocol-first commit actually changed
only Spec 0053, the corpus, and CURRENT.

Final reviewed exact-head Gate evidence:

```text
CI #649 / run 34301571222: PASS
Harness #591 / run 34301571253: PASS
Harness job 102309382800 step 10: PASS
Harness job 102309382800 step 11: PASS
```

---

## 7. Cumulative post-protocol diff review

Exact cumulative compare:

```text
3178d195774c4abed033bd0137bd0df5112519dc
  -> 4c42752b45f4990ebd3c5423d3e338e8f89385ad
```

The cumulative implementation/conformance files are exactly:

```text
packages/storage/package.json
packages/storage/src/append-only-store.corpus.test.ts
packages/storage/src/append-only-store.test.ts
packages/storage/src/append-only-store.ts
packages/storage/src/index.ts
packages/storage/tsconfig.json
pnpm-lock.yaml
scripts/verify-boundaries.mjs
```

No post-protocol change touched:

```text
specs/0053-m5-append-only-audit-store.md
fixtures/append-only-audit-store/cases.json
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md
docs/roadmap.md
schemas/
packages/adapter-dsh/
packages/protocol/
packages/testkit/
.github/workflows/
```

The lockfile delta is only the new dependency-free workspace importer. The
boundary script delta only registers `storage` in the existing concrete-Adapter
import prohibition.

---

## 8. Later-Gate separation

M5-001 implementation does **not** implement or claim completion of:

```text
M5-002 canonical JSON
M5-003 record digest
M5-004 hash chain
M5-005 integrity verify CLI
M5-010 secret detector interface
M5-011 env redaction
M5-012 args/result digest default
M5-013 source-content retention opt-in
M5-014 retention TTL
M5-015 delete/export workflow
M5-020 unavailable audit-store product policy
M5-021 durable local spool
M5-022 spool reconciliation
```

It also does not claim SQLite/PostgreSQL/WAL persistence, M6 transactionality,
M7 commit-journal semantics, M9 AVP ledger completion, or M14 process isolation.

No Schema, GuaranteeLevel, Capability wire type, Shared TCK, Adapter/Harness
runtime contract, or existing security boundary was weakened to obtain green CI.

---

## 9. PR / review state

At final implementation review:

```text
PR #3: Open
Draft: true
Merged: false
Mergeable: true
Base: main@57430273e065be8d38807d67b175fa154c801d43
Head: 4c42752b45f4990ebd3c5423d3e338e8f89385ad
Reviews: none
Review threads: none
Requested reviewers: none
```

The PR description is stale historical metadata and is not protocol authority.
PR #3 merge remains unauthorized without explicit user authorization.

---

## 10. Acceptance verdict

**PASS — M5-001 implementation/conformance is ACCEPTED.**

The exact final reviewed head has dual-green normal CI and pinned Harness rc5
source/runtime conformance. The implementation satisfies the append-only
state-transition contract, preserves immutable history, truthfully represents
publication ambiguity, has explicit per-ledger total ordering, prevents caller
and snapshot alias rewrites, hardens hostile property keys, executes the complete
portable corpus, and preserves later-Gate boundaries.

This acceptance authorizes only the M5-001 governance-transition record:

```text
CURRENT + append-only HISTORY + only the M5-001 roadmap marker/details
```

M5-001 is **not GOVERNANCE CLOSED** until that governance-transition exact head
passes normal CI plus pinned Harness rc5 source-conformance and a separate
CURRENT + append-only HISTORY closure-record exact head also reaches dual-green.

M5-002 remains unauthorized until M5-001 governance is closed.
