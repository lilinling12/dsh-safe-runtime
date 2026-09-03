# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before changes;
> normative specs/schemas/TCK and accepted exact-head evidence remain authority.

## Snapshot

- Recorded at: `2026-09-03`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M4 — Capability Broker v0.1`
- Active PR: `#3 — feat(policy): begin M4 capability broker`
- Branch: `feat/m4-capability-broker`
- Base: `main@57430273e065be8d38807d67b175fa154c801d43`
- Parent governance-closed head: `0bbb8f4cfdadd08b62f42c2133334ee18ef99036` (M4-034)
- M4-001..014: **GOVERNANCE CLOSED**
- M4-020..025: **GOVERNANCE CLOSED**
- M4-030..034: **GOVERNANCE CLOSED**
- M4-035 P1 lease listing CLI: **IMPLEMENTATION/AUDIT/PACKAGE ACCEPTED; FINAL GOVERNANCE EXACT-HEAD VERIFICATION REQUIRED**
- M4-036 P1 revoke CLI: **NOT AUTHORIZED until M4-035 final-governance exact head is dual-green**
- M4-040+, M6, M10 integrated CLI implementation, M13, M15: **NOT AUTHORIZED by the current Gate**
- PR #3 merge: **NOT AUTHORIZED without explicit user authorization**

Live GitHub state overrides this snapshot.

## M4-035 accepted authority

Normative specification:

```text
specs/0042-m4-capability-lease-listing-cli.md
profile: M4-035_LEASE_LISTING_V1
```

Portable corpus:

```text
fixtures/lease-listing/cases.json
35 cases: LLST-001 through LLST-035
```

Protocol-first exact head:

```text
943c6a7a6f1aaa9b0e5db9aa9e5b0bf8eb0e4777
```

Protocol-first exact-head evidence:

- normal CI #557 / run `33708615697`: PASS;
- exact pinned Harness rc5 source-conformance #499 / run `33708615763`: PASS.

The implementation-stage corpus source later received one JSON-safe escaping
correction for raw terminal-control source text. The parsed runtime strings and
LLST expectations did not change.

## Final accepted implementation/hardening

Accepted implementation/hardening exact head:

```text
959babf2839510b7437a0af331573602e78b1590
```

Accepted behavior:

- independent read-only `LeaseInventoryStore` rather than widening M4-032/033/034
  mutation ports;
- one coherent logical inventory snapshot per successful invocation;
- portable `MAX_LEASE_LIST_ENTRIES = 1024` hard bound with fail-loud overflow and
  no silent truncation/pagination claim;
- explicit Broker `observedAt`; the Broker never reads host time;
- exact M4-003 Resource projection;
- independent M4-030 TTL, M4-031 usage and M4-033 revocation facts;
- no synthesized `active`, `usable`, `authorized`, effective quota or attenuation
  verdict;
- `parentLeaseRef` remains descriptive and is not traversed;
- raw arbitrary Lease constraints are not emitted; only `NONE | NON_EMPTY` is
  exposed;
- deterministic Unicode code-point `leaseRef` presentation order;
- human terminal output escapes control and bidi formatting code points;
- JSON output preserves semantic strings after parsing;
- a gate-local `lease list [--json] [--observed-at ...]` adapter exists without
  creating a product-wide binary, parser dependency or M10 CLI framework;
- hostile JavaScript inputs/store evidence fail closed without coercion/getter
  authority;
- reference inventory snapshots preserve malformed own-property shape for Broker
  validation and detach the top-level constraint key shape without traversing
  constraint values.

Reference-store limitation remains explicit: `InMemoryLeaseInventoryStore` is a
single-process immutable inventory reference and does not automatically share live
state with the separate M4-032/M4-033/M4-034 in-memory stores. A production live
listing must bind the inventory port to the same authoritative Lease backend and
provide backend-specific coherent-snapshot/isolation evidence.

Exact implementation evidence:

- normal CI #564 / run `33713294276`: PASS;
- exact Harness rc5 source-conformance #506 / run `33713294087`: PASS;
- frozen install / 124-entry supply-chain policy: PASS;
- architecture boundaries: PASS;
- 16-schema shape / compatibility baseline: PASS;
- strict workspace TypeScript: PASS;
- 64 test files / 1250 tests: PASS;
- `lease-listing.test.ts`: 37 PASS;
- `lease-list-cli.test.ts`: 9 PASS;
- oxlint: 0 errors, 2 existing repository warnings;
- packed Shared TCK + external non-workspace consumer: 44 installed asset checks PASS.

## Acceptance audit

Acceptance audit:

```text
docs/acceptance/m4-035-acceptance-audit.md
commit: fd69c93ad1d447e6d3249b7c41c4754485b045fd
```

Audit exact-head evidence:

- normal CI #565 / run `33719687550`: PASS;
- exact Harness rc5 source-conformance #507 / run `33719687552`: PASS.

The audit records implementation acceptance and preserves the real hardening
history instead of treating an earlier green candidate as accepted.

## Package-stage acceptance record

Package-stage exact head:

```text
5942e1f6dee23509741c174474b69817a600f1c9
```

Only `packages/capability-broker/src/index.ts` changed from the audit head, moving:

```text
M4-035-LEASE-LISTING-IMPLEMENTED
-> M4-035-LEASE-LISTING-ACCEPTED
```

Package-stage exact-head evidence:

- normal CI #566 / run `33721333901`: PASS;
- exact Harness rc5 source-conformance #508 / run `33721333870`: PASS;
- PR #3 remained Open, Draft and mergeable;
- base remained `main@57430273e065be8d38807d67b175fa154c801d43`;
- reviews: none;
- review threads: none.

## Final governance gate

This governance transition is authorized only because the package-stage exact head
is dual-green.

The final governance delta is restricted to exactly:

```text
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md   # append-only
docs/roadmap.md           # only M4-035 acceptance marker/details
```

It must not change production code, Spec 0042, the portable corpus, schema/protocol
wire types, Shared TCK, dependency/lockfile state, Adapter/Harness baseline,
M4-036 implementation, M4-040+, M6, M10 implementation, M13 or M15.

The final governance commit containing this snapshot is **not itself accepted until
its exact head reaches normal CI + exact pinned Harness rc5 source-conformance
dual-green**.

Only after that evidence may repository state be interpreted as:

```text
M4-035 governance: CLOSED
M4-036 P1 revoke CLI: sole newly authorized protocol-first Gate
```

## Explicit non-claims

M4-035 does not:

- alter the public CapabilityLease schema/type;
- authorize execution from a listing row;
- issue, consume, reserve, revoke, delete or repair a Lease;
- validate M4-034 attenuation during listing;
- inherit ancestor lifecycle state into a child row;
- establish tenant/remote-admin authorization;
- define pagination/cursor consistency;
- claim DB/multi-process/distributed snapshot isolation from the reference store;
- implement M4-036 revoke CLI;
- create M10's integrated product CLI;
- wire M4-040+ PEP;
- import DeepSeek Harness CLI/lineage behavior as protocol authority.

DeepSeek Harness remains compatibility evidence only:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

## Resume instruction

1. refresh PR #3 exact head/base/Open/Draft/mergeability/reviews/threads;
2. verify the M4-035 final-governance commit is exactly one commit ahead of
   `5942e1f6...` and changes only CURRENT + append-only HISTORY + the M4-035
   roadmap marker/details;
3. require exact-head normal CI + pinned Harness rc5 source-conformance green;
4. only after dual-green mark M4-035 governance CLOSED;
5. then and only then authorize M4-036 P1 revoke CLI as the next protocol-first
   Gate after recovering existing M4-033 revocation and M4-035 CLI boundaries;
6. keep M4-040+, M6, M10 integrated CLI implementation, M13, M15 and PR #3 merge
   unauthorized unless separately authorized by governance/user action.
