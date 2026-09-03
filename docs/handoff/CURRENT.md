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
- M4-036 P1 revoke CLI: **IMPLEMENTATION/AUDIT/PACKAGE ACCEPTED; FINAL GOVERNANCE EXACT-HEAD VERIFICATION REQUIRED**
- M4-040 P0 `tools/pre-execute`: **NOT AUTHORIZED until M4-036 final-governance exact head is dual-green**
- M4-041+, M4-050+, M5, M6, M10 integrated CLI implementation, M13, M15: **NOT AUTHORIZED by the current Gate**
- PR #3 merge: **NOT AUTHORIZED without explicit user authorization**

Live GitHub state overrides this snapshot.

## M4-036 accepted authority

Normative specification:

```text
specs/0043-m4-capability-lease-revoke-cli.md
CLI conformance profile: M4-036_LEASE_REVOKE_CLI_V1
underlying mutation profile: M4-033_LEASE_REVOKE_V1
```

Portable corpus:

```text
fixtures/lease-revoke-cli/cases.json
34 cases: LRCL-001 through LRCL-034
```

Protocol-first exact head:

```text
4ba51a16ef6d40ba51ea21ac920e590e9702f6cc
```

Protocol-first exact-head evidence:

- normal CI #568 / run `33728290773`: PASS;
- exact pinned Harness rc5 source-conformance #510 / run `33728290780`: PASS.

M4-036 remains a CLI projection Gate. The authoritative state transition remains
M4-033 `M4-033_LEASE_REVOKE_V1`; no second revoke profile/store/wire model was
created.

## Final accepted implementation/hardening

Accepted implementation/hardening exact head:

```text
b997dc882eff26487c8d399467c60cba3f0b01d9
```

Accepted behavior:

- gate-local logical command `lease revoke --lease-ref <exact-ref> [--json]`;
- one exact opaque `leaseRef`, preserving the existing 1..512 Unicode-code-point
  ref domain without trim, case folding, Unicode normalization, coercion, prefix,
  fuzzy or alias matching;
- the token after `--lease-ref` is consumed unconditionally as data, so legal refs
  beginning with `--` remain representable;
- no positional target grammar, bulk target expansion, `--all`, recursive/cascade,
  descendant traversal, `--force`, or parent/child mutation fabrication;
- no M4-035 pre-list/read-before-write race; one valid command constructs one exact
  M4-033 request and invokes the accepted primitive once;
- no automatic retry after known-not-applied, ambiguous, malformed or thrown store
  failure; a later explicit CLI invocation remains a new operator action;
- expiry/exhaustion are not revoke preconditions and M4-036 does not read/mutate
  `issuedAt`, `expiresAt`, `maxUses`, or `remainingUses`;
- no `--reason`/ticket/comment/actor metadata before a durable M5 audit contract;
- `REVOKED` and `ALREADY_REVOKED` map to command `SUCCESS`, `NOT_REVOKED` remains
  `NOT_FOUND`, M4-033 fail-closed remains `RUNTIME_FAILURE`, and parse/ref failure
  remains `CLI_USAGE_ERROR`;
- human and JSON renderers expose only fixed accepted M4-033 result vocabulary and
  do not echo the target ref, store diagnostics, exception text or stack traces;
- hostile argv is validated as a bounded dense ordinary string array; sparse,
  accessor, named/symbol, non-string and revoked/unreadable Proxy shapes fail before
  store access;
- post-green source review removed `brokerInput.leaseRef` from NOT_FOUND and
  RUNTIME_FAILURE public envelopes so serializing a failed command cannot reflect
  attacker-controlled exact identity;
- command outputs are detached/frozen and successful positive projection evidence
  may retain a frozen exact Broker input.

M4-036 does not create the M10 product-wide executable/parser/config/exit-code
framework and does not establish remote-admin, tenant or RBAC authorization.

Exact final implementation evidence:

- normal CI #574 / run `33736147193`: PASS;
- exact Harness rc5 source-conformance #516 / run `33736147220`: PASS;
- frozen install / 124-entry supply-chain policy: PASS;
- architecture boundaries: PASS;
- 16-schema shape / compatibility baseline: PASS;
- strict workspace TypeScript: PASS;
- 66 test files / 1296 tests: PASS;
- `lease-revoke-cli.test.ts`: 41 PASS;
- `lease-revoke-cli-hardening.test.ts`: 5 PASS;
- oxlint: 0 errors, 2 existing repository warnings;
- packed Shared TCK + external non-workspace consumer: 44 installed asset checks PASS.

## Acceptance audit

Acceptance audit:

```text
docs/acceptance/m4-036-acceptance-audit.md
commit: 4881d72dfeb5c4fa884aa8a134a783b151b22ddc
```

Audit exact-head evidence:

- normal CI #575 / run `33737446149`: PASS;
- exact Harness rc5 source-conformance #517 / run `33737446099`: PASS.

The audit records the real implementation/hardening history, including the
failure-envelope privacy defect found after an earlier implementation head had
already become dual-green.

## Package-stage acceptance record

Package-stage exact head:

```text
6f205a9437dadc723ff5cf80f6ce55df4b4d7048
```

Only `packages/capability-broker/src/index.ts` changed from the audit head, moving:

```text
M4-036-LEASE-REVOKE-IMPLEMENTED
-> M4-036-LEASE-REVOKE-ACCEPTED
```

Package-stage exact-head evidence:

- normal CI #576 / run `33737949527`: PASS;
- exact Harness rc5 source-conformance #518 / run `33737949363`: PASS.

## Final governance gate

This governance transition is authorized only because the package-stage exact head
is dual-green.

The final governance delta is restricted to exactly:

```text
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md   # append-only
docs/roadmap.md           # only M4-036 acceptance marker/details
```

It must not change production code, Spec 0043, the portable corpus, M4-033
primitive/store, public CapabilityLease schema/type, Shared TCK, dependency/
lockfile state, Adapter/Harness baseline, M4-040 implementation, M4-041+, M4-050+,
M5, M6, M10 integrated CLI implementation, M13 or M15.

The final governance commit containing this snapshot is **not itself accepted until
its exact head reaches normal CI + exact pinned Harness rc5 source-conformance
dual-green**.

Only after that evidence may repository state be interpreted as:

```text
M4-036 governance: CLOSED
M4-040 P0 register tools/pre-execute: sole newly authorized protocol-first Gate
```

## Explicit non-claims

M4-036 does not:

- define a second Lease revocation mutation profile;
- alter M4-033 state/store semantics;
- add fields to the public CapabilityLease schema/type;
- implement unrevoke/reactivation;
- list/search before revoke;
- perform bulk, recursive or cascade revocation;
- use TTL/usage as revoke preconditions;
- consume/reserve a Lease use;
- stop an already-running action or roll back external effects;
- establish remote-admin/tenant authorization;
- define durable audit reason metadata;
- create M10's integrated product CLI or numeric exit-code policy;
- wire M4-040+ PEP behavior;
- import DeepSeek Harness CLI/lineage behavior as protocol authority.

DeepSeek Harness remains compatibility evidence only:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

## Resume instruction

1. refresh PR #3 exact head/base/Open/Draft/mergeability/reviews/threads;
2. verify the M4-036 final-governance commit is exactly one commit ahead of
   `6f205a94...` and changes only CURRENT + append-only HISTORY + the M4-036
   roadmap marker/details;
3. require exact-head normal CI + pinned Harness rc5 source-conformance green;
4. only after dual-green mark M4-036 governance CLOSED;
5. then and only then authorize `M4-040 P0 — register tools/pre-execute` as the
   next protocol-first Gate, beginning with exact pinned Harness source recovery of
   the `tools/pre-execute` hook and existing M4 classifier/PDP/Lease/guarantee
   boundaries rather than guessing integration semantics;
6. keep M4-041+, M4-050+, M5, M6, M10 integrated CLI implementation, M13, M15 and
   PR #3 merge unauthorized unless separately authorized by governance/user action.
