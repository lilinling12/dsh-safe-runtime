# M5-001 Acceptance Audit Amendment — Governance-Phase Conformance Remediation

Status: **ACCEPTED — AUDIT AMENDMENT / GOVERNANCE REVALIDATION AUTHORIZED**

Milestone: `M5 — Audit Ledger + Privacy`

Gate: `M5-001 P0 — append-only store`

Original acceptance audit:

```text
docs/acceptance/m5-001-acceptance-audit.md
head: be616ba066d971261282a227f51100e9ff07503b
```

Normative specification:

```text
specs/0053-m5-append-only-audit-store.md
profile: M5-001_APPEND_ONLY_AUDIT_STORE_V1
cases: AOS-001..AOS-028
```

Pinned Harness baseline:

```text
0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a
```

This amendment preserves the original M5-001 implementation/conformance acceptance
verdict while correcting one governance-phase assumption in the executable AOS-028
projection. It records the exact failed governance Gate evidence, the minimal
conformance remediation, and the final dual-green remediation head. It does **not**
close M5-001 governance, authorize M5-002, or authorize PR #3 merge.

---

## 1. Amendment scope

The original acceptance audit correctly established that the protocol-first commit
changed only:

```text
specs/0053-m5-append-only-audit-store.md
fixtures/append-only-audit-store/cases.json
docs/handoff/CURRENT.md
```

That historical fact remains supported by the exact GitHub compare recorded in the
original audit.

However, section 6 of the original audit also described AOS-028 as executable
verification that the protocol-first boundary remained explicitly declared by both
Spec 0053 and the **current** `docs/handoff/CURRENT.md`.

That second assertion was phase-coupled and too strong. `CURRENT.md` is an
operational handoff snapshot and is intentionally rewritten during governance
transition. Therefore current-file text cannot serve as permanent evidence of what
the earlier protocol-first commit contained.

This amendment supersedes only that part of the original section 6 wording.

Correct authority is:

1. Spec 0053 §18 permanently declares the protocol-first candidate boundary.
2. Exact Git commit comparison proves the historical protocol-first delta.
3. `CURRENT.md` may evolve as governance state evolves and MUST NOT be treated as
   immutable historical evidence by the executable conformance suite.

No append-only runtime behavior, corpus requirement, package boundary, Harness
compatibility contract, or later-Gate exclusion is weakened by this correction.

---

## 2. Governance transition candidate and first failure

Governance transition candidate:

```text
3d0d3d7c5851ef5cd5f3cabd0cb425ec5a9d2d8f
parent: be616ba066d971261282a227f51100e9ff07503b
```

Exact transition diff:

```text
docs/handoff/CURRENT.md   +72 / -105
docs/handoff/HISTORY.md   +50 / -0
docs/roadmap.md            +1 / -1
```

The transition therefore preserved the intended governance file boundary:
CURRENT plus append-only HISTORY plus only the M5-001 roadmap marker.

Exact-head Gate evidence:

```text
CI #651 / run 34302192147: FAIL
CI job 102311266899: pnpm check:all FAIL
Harness #593 / run 34302192174: PASS
Harness job 102311267034 step 10: PASS
Harness job 102311267034 step 11: PASS
```

First actionable CI diagnostic:

```text
packages/storage/src/append-only-store.corpus.test.ts
AOS-028 expected CURRENT.md to contain the protocol-first-only wording:
"No production implementation, new package, dependency, lockfile, Schema, Shared"
```

The governance transition had correctly replaced the protocol-first handoff snapshot
with current governance state, so the assertion failed.

Classification: **TEST / EVIDENCE PHASE-COUPLING DEFECT**.

It was not a storage runtime failure, not a Spec violation, not a Harness rc5
compatibility failure, and not evidence that HISTORY or roadmap scope was wrong.

Because normal CI was red, the transition was not accepted and no closure record was
authorized at this head.

---

## 3. First remediation and second failure

First test-only remediation:

```text
baf9300823044039daf7c5a12ea993b29e0bcc3d
parent: 3d0d3d7c5851ef5cd5f3cabd0cb425ec5a9d2d8f
```

Exact diff:

```text
packages/storage/src/append-only-store.corpus.test.ts   +3 / -5
```

The remediation removed the mutable `CURRENT.md` assertion and retained Spec-based
verification plus historical Git evidence in acceptance documentation.

Exact-head Gate evidence:

```text
CI #652 / run 34302490188: FAIL
CI job 102312178049: pnpm check:all FAIL
Harness #594 / run 34302490182: PASS
Harness job 102312178211 step 10: PASS
Harness job 102312178211 step 11: PASS
```

First actionable CI diagnostic:

```text
AOS-028 expected Spec 0053 to contain:
"protocol-first commit MUST be restricted to exactly"
```

The normative Spec did not use that invented sentence. Its actual §18 wording is:

```text
The protocol-first candidate for M5-001 is restricted to exactly:
```

Classification: **TEST WORDING MISMATCH**.

Again, the failure was confined to the repository conformance test. Harness source
and runtime conformance remained green.

---

## 4. Final exact remediation

Final test-only remediation:

```text
75cf36a60751ebed595bc550670669b7acef8ead
parent: baf9300823044039daf7c5a12ea993b29e0bcc3d
```

Exact diff:

```text
packages/storage/src/append-only-store.corpus.test.ts   +1 / -1
```

The test now checks the actual stable Spec 0053 §18 wording instead of a paraphrase.
No production source, protocol/corpus, Schema, Shared TCK, dependency/lockfile,
workflow, CURRENT, HISTORY, roadmap, Adapter, or Harness contract changed.

Exact-head Gate evidence:

```text
CI #653 / run 34302612489: PASS
CI job 102312556678: pnpm check:all PASS
Harness #595 / run 34302612485: PASS
Harness job 102312556787 step 10: PASS
Harness job 102312556787 step 11: PASS
```

Therefore `75cf36a60751ebed595bc550670669b7acef8ead` is the first post-transition
remediation head that is normal-CI + pinned-Harness dual-green.

---

## 5. Corrected AOS-028 evidence model

AOS-028 remains part of the required `AOS-001..AOS-028` executable projection.
Its responsibility is now intentionally split by evidence type:

### Executable repository check

The test verifies that Spec 0053 permanently declares the protocol-first boundary
and names the three authorized protocol-first paths.

### Historical acceptance evidence

The exact compare:

```text
a502d3018f3ae7dbab399ebaaebf0b0f3ab0c8b3
  -> 3178d195774c4abed033bd0137bd0df5112519dc
```

proves that the protocol-first commit actually changed only Spec 0053, the corpus,
and CURRENT. Historical commit shape is a Git fact and MUST NOT be reconstructed
from mutable current handoff text.

This separation is stricter than the previous test because it prevents governance
state evolution from invalidating otherwise-correct protocol evidence.

---

## 6. Acceptance impact

The original implementation/conformance acceptance remains valid for:

- append-only tail publication;
- immutable historical ownership;
- unique, monotonic, gap-free per-ledger sequence;
- concurrent total ordering;
- truthful `APPENDED` / `NOT_APPENDED` / `INDETERMINATE` outcomes;
- caller/snapshot alias isolation;
- hostile own-key preservation;
- duplicate occurrence allowance;
- absence of history-rewriting mutation APIs;
- absence of M5-002+ canonicalization/digest/hash-chain functionality;
- runtime/Harness-neutral `@dsh-safe/storage` package ownership.

The amendment changes no runtime semantic and weakens no Gate. It only corrects how
a historical protocol-first boundary is evidenced after `CURRENT.md` advances.

---

## 7. PR state at amendment authorization

Live state immediately before this amendment was prepared:

```text
PR #3: Open
Draft: true
Merged: false
Mergeable: true
Base: main@57430273e065be8d38807d67b175fa154c801d43
Head: 75cf36a60751ebed595bc550670669b7acef8ead
Reviews: none
Review threads: none
Requested reviewers: none
```

The PR description remains stale historical metadata and is not authority.
PR #3 merge remains unauthorized without explicit user approval.

---

## 8. Amendment verdict

**PASS — M5-001 acceptance evidence is corrected and governance revalidation is authorized.**

This amendment does not retroactively turn `3d0d3d7c...` into a green transition
head. The failed CI #651 and #652 remain part of the audit trail.

After this amendment exact head itself reaches normal-CI + pinned-Harness dual-green,
a dedicated governance revalidation record may update only:

```text
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md   # append-only, existing byte prefix preserved
```

The already-applied M5-001 roadmap marker must not be toggled or rewritten during
that revalidation. The revalidation must record the failed transition evidence,
the two test-only remediation commits, and the final dual-green remediation head.

Only after that governance revalidation exact head is dual-green may a separate
CURRENT + append-only HISTORY closure-record be created. M5-002 remains
unauthorized until the closure-record exact head is also dual-green.
