# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK and accepted exact-head evidence
> remain semantic authority.

## Snapshot

- Recorded at: `2026-08-21`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M3 — Shared TCK Foundation`
- Pull request: `#2 — feat(testkit): establish M3 shared TCK foundation`
- PR state: `OPEN / DRAFT`
- Branch: `feat/m3-shared-tck-foundation`
- Stacked base: `feat/m2-harness-adapter@6a9c64155ec6c376908e64d70f2b50d5b8de1285`
- M2 acceptance: **ACCEPTED**
- Latest accepted M3 implementation/manifest head: `2ad59d90962954e200f5aab081c3dc8ce0787571`
- Current next gate: **M3 Acceptance / Definition-of-Done Audit**

Live GitHub state always overrides this file. PR #2 remains intentionally stacked
on the accepted M2 branch so M3 work cannot mutate the accepted M2 evidence line.

## Accepted compatibility baseline

DeepSeek Harness remains an adapter compatibility target, never protocol authority:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

M2 acceptance authority remains `docs/acceptance/m2-acceptance-audit.md`.

## M3 gate status

The following implementation gates are complete by accepted evidence:

```text
M3-001  language-independent fixture format
M3-002  shared runner contract
M3-003  deterministic seed / logical clock
M3-004  deterministic fake approval
M3-005  deterministic fake tool runtime
M3-006  deterministic fake filesystem / subprocess execution world
M3-007  deterministic fault injection
M3-010  Adapter DSH turn lifecycle Shared TCK
M3-011  Adapter DSH tool ordering Shared TCK
M3-012  denied tool call never enters body Shared TCK
M3-013  authoritative final-result mapping Shared TCK
M3-014  approval-unavailable Shared TCK
M3-015  cancellation Shared TCK
M3-016  disposal Shared TCK
M3-017  replay reconciliation Shared TCK
```

M3-017 is the final numbered Adapter TCK item in the current roadmap. There is no
M3-018 gate. **Do not enter M4 merely because M3-017 is complete.** The M3
milestone must first pass its Definition-of-Done / acceptance audit.

## M3-017 — Adapter DSH replay reconciliation

**ACCEPTED on implementation/manifest head
`2ad59d90962954e200f5aab081c3dc8ce0787571`.**

Normative authority is
`specs/0016-m3-adapter-dsh-replay-reconciliation-tck.md`.

M3-017 is evidence reconciliation, not generalized execution replay. Its accepted
portable semantics are:

1. durable fact identity is `(sessionRef, durableSequence)` with canonical
   `<sessionRef>/seq:<durableSequence>` event reference and an opaque digest;
2. a snapshot is a complete contiguous durable prefix beginning at sequence `0`;
3. live durable facts are strictly increasing and may overlap the snapshot;
4. exact same-sequence/ref/digest overlap is idempotently emitted once;
5. a contiguous live tail extends the snapshot without wall-clock inference;
6. sidecar evidence must anchor to an exact reconciled durable fact;
7. exactly repeated sidecar evidence is idempotent;
8. evidence ordering is deterministic by durable sequence and UTF-8 byte order of
   `evidenceRef`;
9. semantic conflicts remain explicit and fail closed in this precedence order:

   ```text
   DURABLE_FACT_CONFLICT
   DURABLE_SEQUENCE_GAP
   SIDECAR_ORPHAN
   EVIDENCE_CONFLICT
   ```

10. malformed/non-portable input is distinct from structurally valid semantic
    conflict;
11. expectation data is comparison-only and never a reconciliation oracle;
12. live authoritative `tools/result` remains the M3-013 final-result seam;
13. crash-repair `TOOL_OUTCOME_UNKNOWN` / `TOOL_NOT_STARTED` remain opaque
    durable history and are never promoted into `tool.completed` authority;
14. durable approval `approval/asked` / `approval/decided` pairs remain
    replay-linkable by exact durable event identity;
15. no host time, sleeps, object identity, private Harness listener collections,
    private Session fields, or concrete agent-loop implementation dependency is
    used as reconciliation authority.

### M3-017 implementation evidence

Protocol/fixture/testkit work was completed before the production helper:

- Spec 0016 protocol-first head: `23aa9211013c20128dc8b78b70ff63fdfe424178`;
- eight portable replay fixtures were added before manifest registration;
- generic testkit runner/boundary head:
  `596a7599a35437784c4d51e473f4f4ec55e41c06`;
- public testkit export head:
  `1fb6a527df9f234d20f48b8a9a91bb7d871ac18d`;
- runtime-independent Adapter reconciliation helper + independent unit tests:
  `51858d4af1ff7f02ef9ee411225ae6520bb02f10`;
- Adapter public replay export:
  `465761ac45f61cdee8eac66d32a02f697b2529ed`;
- exact pinned rc5 replay source-conformance:
  `74331541f60e8aeb54878768d661e01f7a14ee5b`;
- final manifest registration:
  `2ad59d90962954e200f5aab081c3dc8ce0787571`.

The Adapter helper is runtime-independent. It separates malformed input from
semantic conflict, defensively snapshots/freezes accepted output, preserves
opaque digests/correlation refs, and does not require a `binding.ts` correctness
change.

### Exact pinned rc5 proof

The exact rc5 conformance test uses public seams only and proves:

1. constructor seed events are absent from the live `session/event` firehose;
2. `firstLiveSeq` identifies the constructor seed boundary;
3. the auto durable `session/end-seed` marker may occupy `firstLiveSeq` before
   store attachment and therefore is not itself a live publication;
4. listener-before-snapshot can intentionally create snapshot/live overlap;
5. exact overlap reconciles once and a later live append extends contiguously;
6. a real ApprovalService durable asked/decided pair remains correlated after
   reconstruction and supports an exact sidecar anchor;
7. public crash repair can produce `TOOL_OUTCOME_UNKNOWN` durable history without
   causing the Adapter to fabricate a live `tool.completed` event;
8. a later ordinary live event still reaches the observer, proving the negative
   crash-replay result is an authority boundary rather than a dead pipeline.

Exact replay conformance head `74331541...`:

| Gate | State | Evidence |
| --- | --- | --- |
| Normal CI | **PASS** | CI #197 |
| Exact Harness rc5 source-conformance | **PASS** | Harness #156 |
| Exact pinned binding typecheck | **PASS** | source-conformance step 10 |
| Real pinned rc5 runtime conformance | **PASS** | source-conformance step 11 |

### Final manifest registration

Final manifest commit `2ad59d90...` was prepared transactionally before the PR
branch ref moved:

- candidate manifest blob was created from the exact prior blob;
- candidate tree was based on exact head tree `fc0a3640...`;
- candidate commit was parented directly to exact replay head `74331541...`;
- `compare_commits` proved `ahead_by=1`, `behind_by=0`;
- exactly one file changed: `fixtures/manifest.json`;
- patch statistics were exactly `+48/-0`;
- the patch is one tail hunk appending exactly eight M3-017 records;
- existing manifest entries were not deleted, reordered, or semantically changed;
- only after patch audit passed was the branch fast-forwarded with `force=false`.

Final exact-head evidence for `2ad59d90...`:

| Gate | State | Evidence |
| --- | --- | --- |
| Normal CI | **PASS** | CI #198 / run `32466962066` |
| Frozen install | **PASS** | `pnpm install --frozen-lockfile` |
| Repository checks | **PASS** | `pnpm check:all` |
| Exact Harness rc5 source-conformance | **PASS** | Harness #157 / run `32466962084` |
| Exact pinned source build/projection/idempotence | **PASS** | steps 6–9 |
| Exact pinned binding typecheck | **PASS** | step 10 |
| Real pinned rc5 runtime conformance | **PASS** | step 11 |

No schema, validator, TypeScript strictness, frozen lockfile, architecture/security
gate, TCK expectation, compatibility baseline, or final-result authority boundary
was weakened to obtain this result.

## Current gate — M3 Acceptance / Definition-of-Done Audit

The next work is **not another Adapter implementation gate**. Audit the milestone
against normative artifacts and live evidence before deciding whether M3 is
accepted and whether M4 may be unlocked.

At minimum the audit must resolve the current roadmap M3 DoD:

```text
TCK can be published independently
A dummy implementation outside the Reference Runtime can run it
Fixtures contain no TypeScript-only semantics
```

The audit must also verify:

- protocol/spec precedes implementation for all Shared TCK profiles;
- portable fixtures are language-independent and Harness-independent;
- generic testkit remains one projection, not protocol authority;
- PASS/FAIL/UNSUPPORTED/ERROR semantics remain intact;
- all Adapter DSH authority boundaries established in M3-010 through M3-017 are
  mutually consistent;
- conflict/negative cases fail closed instead of silently degrading;
- manifest/index coverage is complete and no fixture is orphaned;
- release/publication readiness claims do not exceed actual package/repository
  state;
- M4 Capability Broker and M6 Workspace Transaction semantics were not pulled
  forward.

If an M3 DoD item lacks direct evidence, classify it as a real blocker or define
a narrowly scoped remediation gate. **Do not mark M3 accepted merely because all
numbered implementation items are complete or because CI is green.**

## Boundaries that remain enforced

- Spec/Schema/fixtures define shared semantics before TypeScript implementation.
- `packages/testkit` is one implementation; it does not define portable semantics.
- Shared TCK fixtures must remain consumable by a non-TypeScript implementation.
- DeepSeek Harness is an Adapter and must not define protocol/core semantics.
- Shared contracts must not leak concrete Harness package paths.
- No host wall-clock or ambient randomness may decide a fixture result.
- Unknown versions/profiles/operations/semantics fail explicitly.
- Do not weaken TypeScript strictness, schemas, compatibility baseline,
  validators, conformance tests, frozen installs, architecture/security gates, or
  security claims for CI.
- Do not enter M4 or M6 until the M3 acceptance audit explicitly authorizes it.

## Governance follow-up

`HISTORY.md` remains append-only. The connected GitHub API has no append-file
primitive, so do not rewrite the large history file merely to duplicate this
snapshot; add the M3-017 closure entry only through a safe append-capable path.
`docs/roadmap.md` is planning state and should be reconciled only as part of the
M3 acceptance audit, not used as current semantic authority.

## Resume instruction

On the next work session:

1. read `docs/handoff/README.md` and this file;
2. fetch PR #2 live head and exact-head workflow results;
3. live GitHub evidence overrides this snapshot;
4. if this governance head is not dual-green, inspect and repair that exact
   failure without weakening any gate;
5. only after governance is dual-green, begin the **M3 Acceptance /
   Definition-of-Done Audit**;
6. do not start M4 early.
