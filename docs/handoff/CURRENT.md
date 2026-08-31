# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK and accepted exact-head evidence
> remain semantic authority.

## Snapshot

- Recorded at: `2026-08-31`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M4 — Capability Broker v0.1`
- Active pull request: `#3 — feat(policy): begin M4 capability broker`
- Branch: `feat/m4-capability-broker`
- Base: `main@57430273e065be8d38807d67b175fa154c801d43`
- M4-001 through M4-014: **GOVERNANCE CLOSED**
- M4-020 through M4-023: **GOVERNANCE CLOSED**
- M4-024 decision receipt: **IMPLEMENTATION ACCEPTED / ACCEPTANCE-RECORD DUAL-GREEN**
- M4-024 final governance: **IN PROGRESS — this governance head must be dual-green before closure**
- M4-025+, M4-030+, M4-040+ and M6: **NOT AUTHORIZED**

Live GitHub state overrides this file.

## Live ancestry note

The long-running PR retains known ancestry-only drift relative to `main`. The
reconciled merge-base `65870612d039ce026a6952c16d5e069b11bd24a7` and
`main@57430273e065be8d38807d67b175fa154c801d43` point to the same source tree
`ed0c142bf6bbd00f607cc169222f0bf67057fca5`.

Do not rebase, force-update, squash, or rewrite accepted ancestry merely to
change GitHub compare counters.

## Compatibility baseline

DeepSeek Harness remains Adapter compatibility evidence only:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

Harness behavior MUST NOT define Core decision/receipt identity, guarantee
semantics, approval provenance, Lease lifecycle, digest canonicalization or PEP
behavior.

## M4-023 final closure

M4-023 final-governance exact head:

```text
be6b5c3ea88d469a1f94cc17a00b965352a877b1
```

Exact-head evidence:

- normal CI #480 / run `33378220417`: PASS;
- exact Harness rc5 source-conformance #422 / run `33378220400`: PASS.

The accepted final governance delta from acceptance-record head
`4ca482371dde4d865fdc1aa090d0c44b35c952e9` was limited to CURRENT, append-only
HISTORY (`+71/-0`) and only the M4-023 roadmap acceptance marker.

Therefore M4-023 governance is CLOSED.

## M4-024 protocol-first closure

Normative specification:

```text
specs/0035-m4-decision-receipt-construction.md
```

Portable corpus:

```text
fixtures/decision-receipt/cases.json
```

Portable cases: `27`.

Protocol-first exact head:

```text
04cd977078478d414af8daee06e24dc21754618e
```

Relative to M4-023 final governance, the protocol-first delta was exactly:

```text
docs/handoff/CURRENT.md
fixtures/decision-receipt/cases.json
specs/0001-safe-runtime-core.md
specs/0035-m4-decision-receipt-construction.md
```

The Core edit only reconciled the stale §13 Receipt example with the already
published v1alpha1 Schema/TypeScript/fixture wire shape (`effect`,
`argumentDigest`, requestRef-based action correlation). No schema or later-Gate
semantics were changed.

Exact-head protocol-first evidence:

- normal CI #484 / run `33379337103`: PASS;
- exact Harness rc5 source-conformance #426 / run `33379337065`: PASS.

Therefore M4-024 production implementation was authorized only after the
protocol-first head became dual-green.

## M4-024 accepted implementation

Accepted implementation exact head:

```text
8c12354c8e4902945c352b74536d3ea47615e14a
```

Implementation delta from `04cd9770...` is exactly five Capability Broker files:

```text
packages/capability-broker/src/decision-receipt-hardening.test.ts
packages/capability-broker/src/decision-receipt-types.ts
packages/capability-broker/src/decision-receipt.test.ts
packages/capability-broker/src/decision-receipt.ts
packages/capability-broker/src/index.ts
```

No dependency/lockfile, Adapter, Harness baseline, schema, Shared TCK, M4-025+,
M4-030+, M4-040+ or M6 change is part of that implementation delta.

Exact-head implementation evidence:

- normal CI #491 / run `33381979888`: PASS;
- exact Harness rc5 source-conformance #433 / run `33381979902`: PASS;
- frozen install / 124-entry supply-chain policy: PASS;
- architecture boundaries / 16-schema shape / schema baseline: PASS;
- strict workspace TypeScript: PASS;
- 49 test files / 933 tests: PASS;
- M4-024 primary suite: 30 PASS;
- M4-024 hostile-runtime hardening suite: 10 PASS;
- packed Shared TCK + external non-workspace consumer: 44 assets PASS;
- Harness pinned build, reproducible install, projection/idempotence,
  exact-source typecheck and real runtime conformance: PASS.

The repository still reports two pre-existing oxlint warnings unrelated to
M4-024. M4-024 did not add a lint-warning regression and did not fold unrelated
cleanup into this security-sensitive Gate.

## M4-024 accepted semantics

M4-024 is a deterministic record-construction primitive, not a PEP or execution
engine. It consumes an already-final M4-023 routing fact plus explicit caller
inputs:

```text
requestRef
decisionRef
receiptRef
guaranteeLevel
decidedAt
observedAt
```

It does not generate IDs or read host time/randomness.

Accepted mapping is:

```text
M4-023 routed allow  -> Decision allow + Receipt allowed
M4-023 routed deny   -> Decision deny  + Receipt denied
M4-023 FAIL_CLOSED   -> Decision deny  + Receipt error
```

Post-routing `ask` / `approval-required` is not emitted by this profile.

The exact `guaranteeLevel` is validated and copied into both records but is not
determined or justified by M4-024. M4-025 owns trusted guarantee assignment.

M4-024 deliberately omits fabricated or not-yet-authoritative fields:

```text
Decision: policyRef, matchedRuleRefs, free-text reason
Receipt:  leaseRef, resourceDigest, argumentDigest, resultDigest
```

It also does not fabricate `approvalRef` or `AuthorizationRef(kind=approval)`.
The broker decision Receipt is an observation of the authorization decision, not
proof that the governed action executed or succeeded.

## Runtime/security hardening

The accepted TypeScript implementation:

- consumes runtime input as `unknown` despite providing typed caller surfaces;
- reads security-relevant values through own data-property descriptors;
- rejects accessors without executing getters;
- rejects unexpected string/symbol fields in the narrow input projections;
- fails closed on revoked Proxies and unreadable ownKeys/descriptors;
- performs exact scalar comparisons without `String(value)` or implicit coercion;
- validates opaque refs by Unicode code points, including 512-astral PASS and
  513-astral FAIL regressions;
- uses deterministic lexical/calendar RFC3339-compatible timestamp validation
  rather than locale-sensitive host parsing;
- returns detached/frozen outer result, Decision and Receipt;
- never emits partial records on failure;
- never echoes attacker-controlled refs/timestamps/errors in failure output.

Acceptance review found and fixed one semantic hardening defect after an earlier
green implementation: valid M4-023 failure `stage` and `reasonCode` values had
been validated independently, allowing impossible cross-stage combinations to be
persisted. The accepted head validates stage-to-reason ownership coherence and
rejects forged combinations such as `POLICY + LEASE_LOOKUP_DUPLICATE_LEASE_REF`.

## Acceptance record

Acceptance audit:

```text
docs/acceptance/m4-024-acceptance-audit.md
```

Acceptance-record exact head:

```text
bfb42d9600b223937081f8ebaf19627ea4282bbc
```

Relative to accepted implementation head `8c12354c...`, the acceptance-record
delta is exactly:

```text
docs/acceptance/m4-024-acceptance-audit.md
packages/capability-broker/src/index.ts   # package stage only
```

Exact-head acceptance-record evidence:

- normal CI #493 / run `33382353257`: PASS;
- exact Harness rc5 source-conformance #435 / run `33382353285`: PASS;
- Harness steps 6–11 all PASS.

## Final-governance transition

This transition is intentionally limited to:

```text
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md   # append-only; deletions MUST equal 0
docs/roadmap.md           # only M4-024 acceptance marker
```

No production implementation, normative Spec/corpus/schema, Shared TCK,
dependency, lockfile, Adapter/Harness baseline, M4-025+, M4-030+, M4-040+ or M6
change is authorized in final governance.

The resulting exact governance head MUST itself reach:

1. normal CI PASS;
2. exact pinned Harness rc5 source-conformance PASS.

Only after that same-head dual-green evidence may M4-024 governance be declared
CLOSED and M4-025 P0 guarantee level become the next protocol-first Gate.

## Boundaries that remain enforced

- Specs/schemas/TCK remain semantic authority.
- Harness remains compatibility evidence only.
- Never weaken schema validation, TCK, strict TypeScript, frozen installs,
  supply-chain policy, architecture boundaries, source-conformance or fail-closed
  behavior for CI.
- M4-024 records are not PEP execution authority.
- M4-024 does not determine guarantee truth.
- M4-024 does not claim Lease use, approval provenance completeness, persistence
  or action execution.
- No merge of PR #3 without explicit user authorization.

## Resume instruction

1. refresh PR #3 exact head/base/reviews/threads;
2. if the final-governance head is not yet created, require a three-file-only
   CURRENT/HISTORY/roadmap transition from acceptance-record head `bfb42d96...`;
3. mechanically require HISTORY deletions = 0 and roadmap only M4-024 marker;
4. require final-governance exact-head normal CI + pinned Harness dual-green;
5. only then declare M4-024 governance CLOSED and authorize M4-025
   protocol-first work;
6. keep M4-030+, M4-040+, M6 and PR merge unauthorized.
