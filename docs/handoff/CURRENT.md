# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK and accepted exact-head evidence
> remain semantic authority.

## Snapshot

- Recorded at: `2026-08-25`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M4 — Capability Broker v0.1`
- Active pull request: `#3 — feat(policy): begin M4 capability broker`
- PR state: `OPEN / DRAFT`
- Branch: `feat/m4-capability-broker`
- Base: `main@57430273e065be8d38807d67b175fa154c801d43`
- M2: **ACCEPTED / MERGED** — PR #1 merge commit `52233e19c15504d5c5f77522bb4bf58a2d23c56f`
- M3: **ACCEPTED / MERGED** — PR #2 merge commit `57430273e065be8d38807d67b175fa154c801d43`
- M4-001 through M4-008: **ACCEPTED / GOVERNANCE CLOSED**
- M4-008 final governance head: `71046abef4568668ba9e3448b496430b5c48ebb7`
- M4-008 final governance CI: **PASS — CI #337 / run `32814874559`**
- M4-008 final governance Harness: **PASS — #279 / run `32814874566`**
- Current gate: **M4-009 P1 — policy hot reload with atomic swap**
- M4-009 authorization: **AUTHORIZED**
- M4-009 production implementation: **NOT STARTED**
- M4-010+, M4-020+ and M6: **NOT AUTHORIZED by the current gate**

Live GitHub state overrides this file.

## Accepted compatibility baseline

DeepSeek Harness remains an Adapter compatibility target, never protocol authority:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

M4 policy/reload/evaluation semantics MUST NOT be inferred from Harness APIs or
runtime behavior.

## M4-008 final closure

Accepted implementation head:

```text
2aa8250f6c98b9853497481c08e584df866863ff
```

Implementation evidence:

- CI #335 / run `32798605219`: PASS;
- Harness #277 / run `32798605222`: PASS;
- 35 test files / 510 tests: PASS;
- M4-008 diagnostics suite: 33 PASS;
- strict TypeScript / architecture / 16-schema baseline: PASS;
- supply-chain policy: PASS (124 entries);
- oxlint: 0 warnings / 0 errors on 113 files;
- Shared TCK external consumer: 44 assets PASS.

Implementation acceptance record commit:

```text
202283944ae6736dc324f1251e9546b20af5019d
```

- CI #336 / run `32814355683`: PASS;
- Harness #278 / run `32814355684`: PASS.

Final governance head:

```text
71046abef4568668ba9e3448b496430b5c48ebb7
```

- CI #337 / run `32814874559`: PASS;
- Harness #279 / run `32814874566`: PASS.

Therefore M4-008 governance is **CLOSED** and M4-009 is formally authorized.

## M4-009 protocol-first candidate boundary

Draft normative profile:

```text
specs/0025-m4-capability-policy-hot-reload.md
```

Portable candidate corpus:

```text
fixtures/policy-hot-reload/cases.json
```

M4-009 is an in-memory activation/state-management boundary. It is not a file
watcher, distributed config system or hidden PDP.

Candidate preparation is intended to be:

```text
reload request
  -> M4-001 loader with accepted default budgets
  -> M4-002 schema validator
  -> each resource selector in source order
       -> M4-003 selector normalization
       -> M4-004 lexical pattern syntax validation
  -> build complete immutable next active record
  -> one logical atomic publication
```

M4-008 diagnostics may be used independently for operator feedback but MUST NOT
become swap authorization authority.

## M4-009 atomicity and last-known-good requirements

The store begins `EMPTY` at local epoch 0. A successful activation publishes one
frozen `ACTIVE { epoch, policy }` record. Epochs increment exactly once per
successful explicit activation and do not change on rejected reloads.

Before publication, every candidate must be fully loaded, schema-validated and
resource-preflighted. A rejected candidate must preserve the exact previous
active record and epoch. Failed first activation leaves `EMPTY` unchanged.

Readers may observe only a complete old record or a complete new record. They
must never observe a temporary EMPTY state, a partially prepared candidate, or a
mixed old/new epoch-policy tuple.

An older snapshot handle remains immutable and stable after a later successful
swap. A future PDP may therefore acquire one snapshot and retain it for one
complete evaluation; M4-009 itself does not evaluate policy.

M4-009 deliberately does not hard-reject M4-008 warning/info findings such as
duplicate rule IDs, redundant priorities or an empty rule set. It also does not
interpret subjects, constraints, delegation, lease, approval, receipt,
provenance or guarantee semantics beyond currently accepted schema/processing
boundaries.

## Active gate rule

Production TypeScript MUST NOT begin until the protocol-first candidate head
containing Spec 0025 + portable fixtures reaches exact-head:

```text
normal CI
+ exact Harness rc5 source-conformance
```

Until then:

```text
M4-008 governance: CLOSED
M4-009 protocol-first profile: IN PROGRESS
M4-009 implementation: NOT STARTED
M4-010+: NOT AUTHORIZED
M4-020+: NOT AUTHORIZED
M6: NOT AUTHORIZED
```

## Boundaries that remain enforced

- Protocol/spec precedes implementation.
- Specs/schemas/TCK remain semantic authority.
- Harness is compatibility evidence only.
- M4-001 remains document-loading authority.
- M4-002 remains schema-validity authority.
- M4-003 remains resource-normalization authority.
- M4-004 remains lexical resource-pattern/structural-ordering authority.
- M4-005/M4-006/M4-007 remain downstream effect/default/explanation semantics.
- M4-008 diagnostics remain non-authoritative for activation/authorization.
- M4-009 must preserve last-known-good state and atomic immutable snapshot reads.
- Subject resolution/full policy evaluation remain M4-020/M4-021.
- Approval remains M4-023.
- Decision receipt/provenance remains M4-024.
- Guarantee assignment remains M4-025.
- Never weaken schemas, validators, TCK, strict TypeScript, frozen installs,
  supply-chain policy, architecture boundaries, compatibility evidence, or
  fail-closed behavior for CI.

## Resume instruction

On the next session:

1. read `docs/handoff/README.md` and this file;
2. fetch PR #3 live base/head and exact-head workflows;
3. live GitHub state overrides this snapshot;
4. continue only from the M4-009 protocol-first candidate gate;
5. do not write production M4-009 implementation until the candidate is CI +
   Harness dual-green;
6. inspect exact current-head diagnostics before fixing any failure;
7. do not start M4-010+, M4-020+ or M6 early.
