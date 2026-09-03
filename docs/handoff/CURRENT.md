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
- Parent governance-closed head: `ebf6510fb8e802157ac0d133379c98244022eb49` (M4-035)
- M4-001..014: **GOVERNANCE CLOSED**
- M4-020..025: **GOVERNANCE CLOSED**
- M4-030..035: **GOVERNANCE CLOSED**
- M4-036 P1 revoke CLI: **AUTHORIZED / PROTOCOL-FIRST IN PROGRESS**
- M4-036 production implementation: **NOT AUTHORIZED before protocol-first exact-head dual-green**
- M4-040+, M5, M6, M10 integrated CLI implementation, M13, M15: **NOT AUTHORIZED by the current Gate**
- PR #3 merge: **NOT AUTHORIZED without explicit user authorization**

Live GitHub state overrides this snapshot.

## M4-035 final closure

Final governance exact head:

```text
ebf6510fb8e802157ac0d133379c98244022eb49
```

Exact-head evidence:

- normal CI #567 / run `33726849153`: PASS;
- exact pinned Harness rc5 source-conformance #509 / run `33726849164`: PASS;
- PR #3 remained Open, Draft and mergeable;
- base remained `main@57430273e065be8d38807d67b175fa154c801d43`;
- reviews: none;
- review threads: none.

Therefore M4-035 governance is CLOSED and M4-036 P1 revoke CLI is the sole newly
authorized engineering Gate.

## M4-036 authority reconciliation

Roadmap names:

```text
M4-036 P1 — revoke CLI
```

M4-033 already owns the authoritative mutation:

```text
profile: M4-033_LEASE_REVOKE_V1

LeaseRevokeInput {
  profile
  leaseRef
}
```

and the accepted state transition is only:

```text
revoked: false -> true
```

with exact outcomes:

```text
REVOKED / LEASE_REVOKED
ALREADY_REVOKED / LEASE_ALREADY_REVOKED
NOT_REVOKED / LEASE_REVOKE_NOT_FOUND
FAIL_CLOSED / INPUT|STORE / <stable M4-033 reason>
```

M4-036 MUST NOT define a second mutation profile, widen `LeaseRevocationStore`,
add public Lease fields, invent unrevoke, or reinterpret M4-033 failure semantics.

M4-035 established a gate-local CLI adapter precedent without creating a product
binary, parser dependency, global configuration model or M10 exit-code policy.
M4-036 reuses only that architecture precedent.

## Protocol-first authority

Normative draft:

```text
specs/0043-m4-capability-lease-revoke-cli.md
CLI conformance profile: M4-036_LEASE_REVOKE_CLI_V1
mutation profile reused unchanged: M4-033_LEASE_REVOKE_V1
```

Portable corpus:

```text
fixtures/lease-revoke-cli/cases.json
34 cases: LRCL-001 through LRCL-034
```

M4-036 is a CLI projection Gate, not a new Broker mutation Gate.

## Command grammar

Portable logical command:

```text
lease revoke --lease-ref <exact-ref> [--json]
```

`--lease-ref` is required exactly once and `--json` is optional at most once.

The token immediately following `--lease-ref` is consumed unconditionally as the
ref value, even if it begins with `--`. This preserves the full existing opaque
`defs.ref` domain instead of making option-looking refs impossible.

No positional target syntax is portable M4-036 semantics.

## Exact identity and parser boundary

The CLI validates the existing `defs.ref` domain:

```text
1..512 Unicode code points
```

with no trim, case folding, Unicode normalization, prefix/fuzzy lookup, alias
resolution or coercion.

Invalid argv/option/ref shape maps to:

```text
CLI_USAGE_ERROR / LEASE_REVOKE_CLI_ARGUMENT_INVALID
```

before Broker/store invocation.

The TypeScript implementation later must reject sparse/accessor/named/symbol/
unreadable argv shapes without invoking getters and without weakening hostile
JavaScript boundaries.

## One target only

M4-036 revokes one exact supplied identity.

Explicitly unsupported:

```text
--all
--filter
--subject
--capability
--recursive
--cascade
--descendants
--parent
--force
--reason
--ticket
--comment
```

The command does not pre-list inventory, search by prefix, discover descendants,
or fabricate child revocation.

A parent target revokes only the exact parent record. M4-034 hierarchy composition
may make descendant use ineligible because of ancestor revocation without writing
child `revoked` state.

## No stale pre-read

Valid command flow is exactly:

```text
parse argv
-> validate exact leaseRef
-> construct M4-033 input
-> invoke M4-033 once
-> map command class
-> render output
```

The CLI MUST NOT call M4-035 listing or another read path before revoke. A stale
read would not strengthen M4-033 authority and would create unnecessary TOCTOU.

## Command result mapping

Logical command classes:

```text
M4-033 REVOKED          -> SUCCESS
M4-033 ALREADY_REVOKED  -> SUCCESS
M4-033 NOT_REVOKED      -> NOT_FOUND
M4-033 FAIL_CLOSED      -> RUNTIME_FAILURE
parser/ref failure      -> CLI_USAGE_ERROR
```

`ALREADY_REVOKED` is successful idempotent desired state, while the exact Broker
result remains visible.

`NOT_FOUND` remains distinct from success.

M10 later owns numeric process exit codes.

## Store/retry boundary

M4-036 invokes M4-033 at most once per operator invocation and adds no store calls
of its own.

No automatic retry occurs after:

```text
LEASE_REVOKE_STORE_UNAVAILABLE
LEASE_REVOKE_OUTCOME_UNKNOWN
LEASE_REVOKE_STORE_RESULT_INVALID
```

A later explicit second CLI invocation is allowed under M4-033 monotonic revocation
semantics and may observe `ALREADY_REVOKED` if an earlier ambiguous call committed.
The original ambiguous invocation remains `RUNTIME_FAILURE`.

## Output and terminal safety

Default human output is fixed stable Broker status/reason text only:

```text
REVOKED<TAB>LEASE_REVOKED
ALREADY_REVOKED<TAB>LEASE_ALREADY_REVOKED
NOT_REVOKED<TAB>LEASE_REVOKE_NOT_FOUND
FAIL_CLOSED<TAB><stage><TAB><reasonCode>
```

The target `leaseRef` is deliberately not echoed.

`--json` serializes only the M4-033 result object. No target ref, store value,
exception text, stack trace or free-text reason is added.

This avoids reflecting control/bidi content from an opaque ref and avoids creating
another identity-rendering contract.

## TTL / usage / audit boundaries

Expiry and exhaustion are not revoke preconditions. M4-036 does not read or mutate:

```text
issuedAt
expiresAt
maxUses
remainingUses
```

M4-036 also does not accept portable `--reason`/ticket/comment metadata because M5
has not yet defined the durable audit ledger contract. The CLI must not accept
operator metadata that it cannot bind to accepted durable evidence.

## DeepSeek Harness boundary

DeepSeek Harness remains Adapter compatibility evidence only:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

Harness CLI conventions, session lineage or internal command behavior are not
protocol authority.

## Authorized protocol-first delta

Exactly:

```text
specs/0043-m4-capability-lease-revoke-cli.md
fixtures/lease-revoke-cli/cases.json
docs/handoff/CURRENT.md
```

Not authorized in this protocol-first commit:

```text
production TypeScript
package.json or dependency changes
pnpm-lock.yaml
public CapabilityLease schema/type changes
M4-033 primitive/store changes
Shared TCK registration
docs/handoff/HISTORY.md
docs/roadmap.md
Adapter/Harness baseline
M4-040+
M5
M6
M10 integrated CLI implementation
M13
M15
PR #3 merge
```

Production implementation may begin only after the resulting exact protocol-first
head reaches normal CI + exact pinned Harness rc5 source-conformance dual-green
with PR #3 still Open/Draft/mergeable and no review/thread blocker.

## Resume instruction

1. refresh PR #3 exact head/base/Open/Draft/mergeability/reviews/threads;
2. verify parent `ebf6510f...` -> M4-036 protocol-first candidate is exactly the
   three authorized files;
3. require exact-head normal CI + pinned Harness rc5 source-conformance green;
4. only after dual-green authorize M4-036 production implementation;
5. if implementation reveals semantic ambiguity, correct Spec 0043/corpus first;
6. keep M4-040+, M5, M6, M10 integrated CLI implementation, M13, M15 and PR #3
   merge unauthorized.
