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
- Parent governance-closed head: `0bbb8f4cfdadd08b62f42c2133334ee18ef99036`
- M4-001..014: **GOVERNANCE CLOSED**
- M4-020..025: **GOVERNANCE CLOSED**
- M4-030..034: **GOVERNANCE CLOSED**
- M4-035 P1 lease listing CLI: **AUTHORIZED / PROTOCOL-FIRST IN PROGRESS**
- M4-035 production implementation: **NOT AUTHORIZED before protocol-first exact-head dual-green**
- M4-036, M4-040+, M6, M10 implementation, M13, M15: **NOT AUTHORIZED**
- PR #3 merge: **NOT AUTHORIZED without explicit user authorization**

Live GitHub state overrides this snapshot.

## M4-034 final closure

Final governance exact head:

```text
0bbb8f4cfdadd08b62f42c2133334ee18ef99036
```

Exact-head evidence:

- normal CI #556 / run `33706403554`: PASS;
- exact pinned Harness rc5 source-conformance #498 / run `33706403644`: PASS;
- frozen install and 124-entry supply-chain policy: PASS;
- architecture boundaries: PASS;
- 16-schema shape and compatibility baseline: PASS;
- strict workspace TypeScript: PASS;
- 62 test files / 1204 tests: PASS;
- M4-034 portable suite: 29 PASS;
- hostile/store/concurrency hardening: 10 PASS;
- multi-defect failure-precedence suite: 6 PASS;
- packed Shared TCK + external non-workspace consumer: 44 assets PASS;
- PR #3 remained Open, Draft and mergeable;
- reviews: none;
- review threads: none.

Therefore M4-034 governance is CLOSED and M4-035 is the sole newly authorized
engineering Gate.

## M4-035 authority reconciliation

Roadmap names:

```text
M4-035 P1 — lease listing CLI
```

but the repository currently contains no CLI package, no package `bin` entry, no
root CLI script and no CLI parser dependency. M4-035 therefore MUST NOT assume an
existing command framework.

Core §11 defines Lease lifecycle fundamentals but does not define a Lease listing
command, filters, output columns or a current-usability status. M4-035 must define
its own narrow portable operator-listing semantics without claiming those details
come from Core.

M4-032/M4-033/M4-034 accepted store ports are mutation-specific:

```text
consumeOne(leaseRef)
revokeOne(leaseRef)
consumeHierarchy(leaseRef)
```

They have no portable enumeration operation. M4-035 therefore introduces a
separate read-only inventory port rather than widening accepted mutation ports.

M4-022 provides reusable snapshot/determinism precedent: one invocation observes
one coherent Lease snapshot, and deterministic presentation uses Unicode
code-point ordering of `leaseRef`. M4-035 reuses those principles without importing
M4-022 candidate matching or treating a listed Lease as an allow decision.

## Protocol-first authority

Normative draft:

```text
specs/0042-m4-capability-lease-listing-cli.md
profile: M4-035_LEASE_LISTING_V1
```

Portable corpus:

```text
fixtures/lease-listing/cases.json
35 cases: LLST-001 through LLST-035
```

The protocol-first profile is read-only and operator-oriented.

Broker input is exactly:

```text
{
  profile: "M4-035_LEASE_LISTING_V1"
  observedAt: <explicit RFC3339 timestamp>
}
```

The Broker never reads host time.

Minimal logical CLI projection:

```text
lease list
--json
--observed-at <RFC3339>
```

When `--observed-at` is omitted, only the CLI wrapper may capture its injected/host
clock, exactly once, and pass that value to the Broker.

## Inventory/store boundary

M4-035 uses an independent read-only logical port:

```text
LeaseInventoryStore {
  listSnapshot(maxEntries: 1024)
}
```

The successful snapshot must be one coherent logical inventory view in the
configured trusted-operator scope.

Portable bound:

```text
MAX_LEASE_LIST_ENTRIES = 1024
```

More than 1024 visible records fails closed. Silent truncation is forbidden.
Portable pagination is deferred until a later profile defines cursor/snapshot
consistency.

The Broker invokes the inventory store at most once. Because listing is read-only,
there is no mutation `OUTCOME_UNKNOWN` result.

## Descriptive lifecycle facts, not authorization

Each listed row preserves descriptive Lease identity/scope/provenance plus:

```text
revoked
constraintsState: NONE | NON_EMPTY
ttl: M4-030 eligible/ineligible fact
usage: M4-031 eligible/ineligible fact
```

M4-035 MUST NOT synthesize:

```text
active
usable
authorized
effectiveAuthority
effectiveRemainingUses
attenuationValid
```

TTL, usage and revocation remain independent facts.

`parentLeaseRef` is descriptive only. Listing does not walk parent state, inherit
ancestor revocation, validate attenuation, or calculate effective quota. Those
claims would cross M4-034 / PEP composition boundaries.

## Privacy and terminal safety

Raw arbitrary Lease `constraints` are not emitted. Listing reports only:

```text
NONE
NON_EMPTY
```

This minimizes accidental disclosure while avoiding invented constraint semantics.

The generic `defs.ref` domain permits control code points, and other displayed
strings may contain Unicode formatting controls. Human terminal rendering therefore
must escape untrusted control/bidi code points instead of printing them raw,
including at minimum:

```text
U+0000..U+001F
U+007F
U+0080..U+009F
U+202A..U+202E
U+2066..U+2069
```

JSON machine output preserves exact parsed semantic strings using JSON escaping.
Human escaping is presentation-only and must never mutate authoritative identity.

## Deterministic validation

Observable Broker order is fixed:

```text
input shape
-> exact profile/observedAt keys
-> profile
-> observedAt grammar
-> one bounded store call
-> store envelope / limit
-> snapshot container
-> per-state leaseRef / subjectRef / parentRef / capability
-> M4-003 Resource
-> constraints classification
-> authorization / revoked
-> M4-030 TTL
-> M4-031 usage
-> duplicate leaseRef detection
-> Unicode code-point leaseRef sort
-> detached immutable result
```

M4-003 Resource failures, M4-030 time failures and M4-031 usage failures retain
their accepted reason codes under M4-035 stages.

## Explicit non-claims

M4-035 does not:

- alter the public CapabilityLease schema/type;
- issue, consume, reserve, revoke, delete, repair or rewrite a Lease;
- prove end-to-end Lease authorization;
- select a candidate for execution;
- validate parent attenuation while listing;
- create tenant/remote admin authorization;
- define a distributed store;
- define M10's complete product CLI or numeric exit codes;
- implement M4-036 revoke CLI;
- wire M4-040+ PEP;
- change DeepSeek Harness semantics.

DeepSeek Harness remains Adapter compatibility evidence only:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

## Authorized protocol-first delta

Exactly:

```text
specs/0042-m4-capability-lease-listing-cli.md
fixtures/lease-listing/cases.json
docs/handoff/CURRENT.md
```

Not authorized in this protocol-first commit:

```text
production TypeScript
new CLI package or package.json changes
dependencies or pnpm-lock.yaml
public schema/protocol wire type
Shared TCK registration
docs/handoff/HISTORY.md
docs/roadmap.md
Adapter/Harness baseline
M4-036
M4-040+
M6
M10 implementation
M13
M15
```

Production implementation may begin only after the resulting exact protocol-first
head reaches normal CI + exact pinned Harness rc5 source-conformance dual-green
with PR #3 still Open/Draft/mergeable and no blocking review/thread.

## Resume instruction

1. refresh PR #3 exact head/base/Open/Draft/mergeability/reviews/threads;
2. verify parent `0bbb8f4c...` -> M4-035 protocol-first candidate is exactly the
   three authorized files;
3. require exact-head normal CI + pinned Harness rc5 source-conformance green;
4. only after dual-green authorize M4-035 production implementation;
5. if implementation reveals semantic ambiguity, correct Spec 0042/corpus first;
6. keep M4-036, M4-040+, M6, M10 implementation, M13, M15 and PR #3 merge
   unauthorized.
