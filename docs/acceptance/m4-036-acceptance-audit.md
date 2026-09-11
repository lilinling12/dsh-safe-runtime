# M4-036 Acceptance Audit — Deterministic CapabilityLease Revoke CLI

Status: **IMPLEMENTATION ACCEPTED / AUDIT EXACT-HEAD VERIFICATION PENDING**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-036 P1 — revoke CLI`

## 1. Gate authority

Normative specification:

```text
specs/0043-m4-capability-lease-revoke-cli.md
```

Portable corpus:

```text
fixtures/lease-revoke-cli/cases.json
```

CLI conformance profile:

```text
M4-036_LEASE_REVOKE_CLI_V1
```

Underlying authoritative mutation profile reused unchanged:

```text
M4-033_LEASE_REVOKE_V1
```

M4-036 is intentionally a CLI projection Gate. It does not define a second Lease
revocation state machine, store port, wire model, or mutation protocol.

## 2. Protocol-first accepted head

Protocol-first exact head:

```text
4ba51a16ef6d40ba51ea21ac920e590e9702f6cc
```

Its parent is the governance-closed M4-035 head:

```text
ebf6510fb8e802157ac0d133379c98244022eb49
```

The protocol-first delta was exactly:

```text
docs/handoff/CURRENT.md
fixtures/lease-revoke-cli/cases.json
specs/0043-m4-capability-lease-revoke-cli.md
```

No production TypeScript, package manifest, dependency, lockfile, public
CapabilityLease schema/type, M4-033 primitive/store, Shared TCK registration,
HISTORY, roadmap acceptance marker, Adapter/Harness baseline, M4-040+, M5, M6,
M10 integrated CLI implementation, M13 or M15 work was changed by the
protocol-first commit.

Protocol-first exact-head evidence:

```text
CI #568
run: 33728290773
PASS

Harness rc5 source conformance #510
run: 33728290780
PASS
```

Production implementation was authorized only after that exact head became
dual-green.

## 3. Final accepted implementation/hardening head

Final reviewed implementation/hardening head:

```text
b997dc882eff26487c8d399467c60cba3f0b01d9
```

The accepted ancestry after the protocol-first head contains six implementation /
hardening commits and is not rebased or squashed away.

The initial production implementation reached:

```text
bf7eca42c08dcf5e34d1f0ad7f46aebc715cc301
```

with exact-head:

```text
CI #571 / run 33734104397: PASS
Harness #513 / run 33734104418: PASS
```

That green candidate was **not** treated as sufficient for acceptance. Source-level
review continued and found a failure-privacy defect in the public command envelope.
The defect was corrected, additional hostile-runtime regression coverage was added,
and the resulting final hardening head `b997dc88...` was reverified independently.

## 4. Exact implementation delta

Comparing protocol-first head
`4ba51a16ef6d40ba51ea21ac920e590e9702f6cc` to final implementation/hardening
head `b997dc882eff26487c8d399467c60cba3f0b01d9` shows:

```text
status: ahead
ahead_by: 6
behind_by: 0
total_commits: 6
```

Exactly four files differ:

```text
packages/capability-broker/src/index.ts
packages/capability-broker/src/lease-revoke-cli.ts
packages/capability-broker/src/lease-revoke-cli.test.ts
packages/capability-broker/src/lease-revoke-cli-hardening.test.ts
```

There is no implementation-stage change to:

```text
specs/0043-m4-capability-lease-revoke-cli.md
fixtures/lease-revoke-cli/cases.json
packages/capability-broker/src/lease-revoke.ts
packages/capability-broker/src/lease-revoke-types.ts
packages/capability-broker/src/lease-revoke-memory-store.ts
public CapabilityLease schema/type
Shared TCK manifest/assets
package manifests
dependencies
pnpm-lock.yaml
docs/handoff/CURRENT.md
docs/handoff/HISTORY.md
docs/roadmap.md
DeepSeek Harness baseline
M4-040+
M5
M6
M10 integrated CLI implementation
M13
M15
```

## 5. Architectural decision

M4-036 does not create a new CLI package or product-wide executable.

The accepted implementation remains inside `@dsh-safe/capability-broker` as a
small gate-local adapter adjacent to M4-035 listing support.

This preserves the repository's current architecture:

```text
CLI projection -> capability-broker accepted primitive -> authoritative store port
```

and avoids:

```text
protocol/core -> CLI reverse dependency
new parser dependency
new workspace package
new package manifest importer
lockfile churn
premature M10 integrated CLI framework
```

M10 remains owner of binary naming, global configuration, remote transport,
authentication, tenant selection and numeric process exit codes.

## 6. No second revocation primitive

The production adapter calls the already accepted M4-033 primitive:

```text
revokeCapabilityLease()
```

and constructs exactly:

```text
{
  profile: "M4-033_LEASE_REVOKE_V1",
  leaseRef: <exact ref>
}
```

The implementation does not:

- define a second mutation profile;
- widen `LeaseRevocationStore`;
- reimplement store-result validation;
- reinterpret M4-033 idempotency;
- add revocation fields to CapabilityLease;
- bypass M4-033 fail-closed behavior.

`M4-036_LEASE_REVOKE_CLI_V1` remains a CLI conformance identifier only.

## 7. Exact command grammar

The accepted logical command is:

```text
lease revoke --lease-ref <exact-ref> [--json]
```

`--json` may appear before or after `--lease-ref`.

The implementation does not accept positional Lease targeting.

This is deliberate because the existing ref domain is opaque and a legal ref can
begin with `--`.

For example:

```text
lease revoke --lease-ref --json --json
```

is interpreted as:

```text
leaseRef = "--json"
format = JSON
```

The first `--json` token is consumed unconditionally as the value following
`--lease-ref`; only the later token is interpreted as the format option.

This preserves the existing Lease identity domain rather than silently reserving
option-looking ref values.

## 8. Exact identity handling

The adapter validates the existing `defs.ref` cardinality:

```text
1..512 Unicode code points
```

It preserves the exact ref value and does not apply:

```text
trim
case folding
Unicode normalization
URL decoding
prefix matching
substring matching
fuzzy lookup
alias resolution
numeric/string coercion
```

Astral Unicode code points are counted as code points, not UTF-16 code units.

The M4-033 primitive still defensively validates the constructed Broker request.

## 9. Hostile argv boundary

The public adapter accepts argv as `unknown`.

It only accepts a dense ordinary array of string data properties with the expected
command-bound length.

It fails as CLI usage error before M4-033/store access for:

- non-array values;
- null;
- sparse arrays;
- accessor-backed indexed properties;
- named array properties;
- symbol properties;
- non-string elements;
- revoked/unreadable Proxy meta-operations;
- wrong command words;
- missing `--lease-ref`;
- missing target value;
- duplicate `--lease-ref`;
- duplicate `--json`;
- unknown options;
- positional targets;
- unexpected trailing values;
- command arrays beyond the finite grammar bound.

The stable parser result is:

```text
CLI_USAGE_ERROR / LEASE_REVOKE_CLI_ARGUMENT_INVALID
```

and no store call occurs.

## 10. Exactly one target

One valid command projects exactly one `leaseRef` into exactly one M4-033 invocation.

The accepted implementation has no:

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
```

There is no target expansion, Lease search, inventory enumeration, parent traversal
or descendant discovery.

## 11. No pre-list race

The command does not call M4-035 listing before mutation.

The accepted sequence is:

```text
parse argv
-> validate exact Lease identity
-> construct M4-033 request
-> invoke M4-033 once
-> map result class
-> render output
```

No advisory read is used to decide whether the Lease is active, revoked, expired or
exhausted before the authoritative mutation.

This avoids creating a stale check-then-act race outside the M4-033 store boundary.

## 12. TTL and usage remain independent

M4-036 does not read or rewrite:

```text
issuedAt
expiresAt
maxUses
remainingUses
```

An exhausted or expired-looking Lease may still be revoked because revocation is an
independent lifecycle fact.

The portable corpus explicitly proves preserved TTL/usage evidence around a revoke
operation rather than inventing revoke preconditions.

## 13. No bulk or cascade semantics

Revoking an exact parent Lease changes only that exact M4-033 revocation identity.

The command does not fabricate child revocation records.

M4-034 hierarchy-aware consumption may later reject descendant authority because an
ancestor is revoked, but that is a composition effect, not M4-036 cascade mutation.

## 14. No premature audit metadata

M4-036 intentionally does not accept:

```text
--reason
--ticket
--comment
--actor
--revoked-at
```

The repository does not yet have an accepted durable M5 audit-ledger binding for
such operator metadata.

Accepting those fields in M4-036 without a durable recording authority would create
a misleading interface that appears auditable while potentially discarding the
metadata.

## 15. No automatic retry

The adapter invokes the M4-033 primitive once per operator invocation.

It does not automatically retry:

```text
LEASE_REVOKE_STORE_UNAVAILABLE
LEASE_REVOKE_OUTCOME_UNKNOWN
LEASE_REVOKE_STORE_RESULT_INVALID
```

An ambiguous result remains runtime failure for that invocation.

A later explicit CLI invocation is a separate operator action and may observe
`ALREADY_REVOKED` if the prior ambiguous operation actually committed.

The portable sequence corpus covers this distinction explicitly.

## 16. Result-class mapping

M4-036 preserves the exact M4-033 broker result algebra and adds only command-local
classification:

```text
M4-033 REVOKED          -> SUCCESS
M4-033 ALREADY_REVOKED  -> SUCCESS
M4-033 NOT_REVOKED      -> NOT_FOUND
M4-033 FAIL_CLOSED      -> RUNTIME_FAILURE
parser/ref failure      -> CLI_USAGE_ERROR
```

`ALREADY_REVOKED` is successful because the requested permanent target state is
already true.

`NOT_FOUND` remains distinct because no authoritative Lease identity was proven or
mutated.

No numeric process exit codes are defined by M4-036.

## 17. Output minimization

Human output contains only fixed M4-033 vocabulary:

```text
REVOKED<TAB>LEASE_REVOKED
ALREADY_REVOKED<TAB>LEASE_ALREADY_REVOKED
NOT_REVOKED<TAB>LEASE_REVOKE_NOT_FOUND
FAIL_CLOSED<TAB>INPUT<TAB><reasonCode>
FAIL_CLOSED<TAB>STORE<TAB><reasonCode>
```

The target ref is not echoed.

JSON rendering serializes only the M4-033 broker result object.

It does not add:

```text
leaseRef
host exception text
store diagnostics
stack traces
implementation-specific fields
```

## 18. Failure-privacy hardening discovered after an earlier green head

The initial dual-green implementation head `bf7eca42...` correctly kept the human
and JSON output strings free of the caller-provided `leaseRef`.

However, source review found that the **public command result envelope** for
`RUNTIME_FAILURE` and `NOT_FOUND` still carried:

```text
brokerInput.leaseRef
```

This created an inconsistent privacy boundary: the rendered output was minimized,
but a caller serializing the public command envelope could still reflect the exact
attacker-controlled ref.

The implementation was therefore hardened so that:

- `SUCCESS` may retain the frozen `brokerInput` as positive exact-projection evidence;
- `NOT_FOUND` does not expose `brokerInput`;
- `RUNTIME_FAILURE` does not expose `brokerInput`;
- `CLI_USAGE_ERROR` exposes only its stable parser reason code.

Regression tests now assert that serializing `NOT_FOUND` or `RUNTIME_FAILURE` does
not contain the target ref.

This hardening was applied even though the earlier head was already CI/Harness
dual-green, because green automation is not a substitute for source review.

## 19. Store exception privacy

Thrown store exceptions remain sanitized by M4-033.

The CLI does not surface backend exception text or stack traces.

A thrown store error is classified by the existing M4-033 ambiguity rule and the
command performs no retry.

Regression evidence asserts that a secret string embedded in a thrown backend error
is absent from the public command result.

## 20. Immutability boundary

Successful command envelopes are frozen/detached at the adapter boundary.

The positive `brokerInput` evidence is frozen, and the underlying M4-033 result is
already a detached/frozen accepted result.

Failure classes are minimized before being frozen so no hidden mutable ref container
remains attached to the public failure envelope.

## 21. Portable corpus

The portable corpus contains:

```text
34 cases
LRCL-001 .. LRCL-034
```

It covers:

- first exact revoke in human and JSON output;
- idempotent already-revoked success;
- exact missing identity / NOT_FOUND;
- case-sensitive and whitespace-preserving identity;
- 512/513 code-point boundaries;
- astral Unicode identity;
- legal ref beginning with `--`;
- option ordering;
- missing/duplicate/unknown arguments;
- positional-target rejection;
- force/all/cascade/reason rejection;
- known-not-applied store failure;
- ambiguous store result with no auto-retry;
- malformed and wrong-identity store evidence;
- exhaustion/expiry not becoming revoke preconditions;
- parent-only mutation without child revocation fabrication;
- explicit idempotent retry sequence;
- explicit retry after ambiguous committed result;
- terminal-control target not reflected in human output;
- non-string and null argv rejection.

## 22. Additional hardening suite

The dedicated hardening suite adds source-review regression coverage outside the
portable corpus for:

- RUNTIME_FAILURE command-envelope ref minimization;
- NOT_FOUND command-envelope ref minimization;
- sparse argv rejection before store access;
- revoked Proxy argv rejection before store access;
- one operator invocation producing at most one authoritative store call.

The dedicated hardening suite remains implementation evidence and does not silently
expand portable protocol semantics.

## 23. Exact final implementation evidence

Final accepted implementation/hardening head:

```text
b997dc882eff26487c8d399467c60cba3f0b01d9
```

Exact-head normal CI:

```text
CI #574
run: 33736147193
PASS
```

Exact-head pinned Harness source conformance:

```text
Harness rc5 source conformance #516
run: 33736147220
PASS
```

CI #574 evidence includes:

```text
pnpm install --frozen-lockfile: PASS
supply-chain policy: 124 entries PASS
architecture boundaries: PASS
schema shape: 16 schemas PASS
schema compatibility baseline: PASS
strict workspace TypeScript: PASS
Vitest: 66 files / 1296 tests PASS
lease-revoke-cli.test.ts: 41 PASS
lease-revoke-cli-hardening.test.ts: 5 PASS
oxlint: 0 errors, 2 existing repository warnings
Shared TCK assets prepared: 44 registered fixtures
external non-workspace dummy consumer: 44 installed asset checks PASS
packed @dsh-safe/testkit external-consumer boundary: PASS
```

No schema, validator, Shared TCK, TypeScript strictness, frozen-lockfile policy,
supply-chain rule, architecture boundary or fail-closed invariant was weakened to
obtain this result.

## 24. Pull request state at acceptance

At the final implementation/hardening head, PR #3 is:

```text
Open
Draft
mergeable: true
head: b997dc882eff26487c8d399467c60cba3f0b01d9
base: main@57430273e065be8d38807d67b175fa154c801d43
reviews: none
review threads: none
```

The PR description remains stale historical text and is not treated as current Gate
authority.

PR #3 merge remains unauthorized without explicit user authorization.

## 25. DeepSeek Harness boundary

DeepSeek Harness remains Adapter/source-conformance evidence only.

Pinned baseline remains:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

Harness CLI conventions, session lineage or internal behavior did not define M4-036
semantics and were not imported as protocol authority.

## 26. Explicit non-claims

M4-036 does not:

- define a new Lease mutation profile;
- change M4-033 store semantics;
- alter the public CapabilityLease wire schema/type;
- implement unrevoke/reactivation;
- implement bulk or recursive revocation;
- cascade revocation to descendants;
- pre-list state before revoke;
- inspect TTL or usage as revoke preconditions;
- consume or reserve a Lease use;
- stop an already-running action;
- roll back external effects;
- establish remote-admin or tenant authorization;
- add durable operator reason/audit metadata;
- create the integrated M10 product CLI;
- wire M4-040+ PEP;
- claim DB/multi-process/distributed atomicity beyond the reused M4-033 store contract;
- authorize M5, M6, M10, M13 or M15 work;
- authorize PR #3 merge.

## 27. Package-stage state

At the final implementation/hardening head, the Capability Broker package marker is
still:

```text
PACKAGE_STAGE = "M4-036-LEASE-REVOKE-IMPLEMENTED"
```

This acceptance audit does **not** change the marker.

Implementation/hardening is accepted at
`b997dc882eff26487c8d399467c60cba3f0b01d9`, but this audit commit itself must
reach exact-head normal CI + exact pinned Harness rc5 source-conformance dual-green
before package-stage acceptance record is authorized.

Only after audit dual-green may the package marker be promoted to the M4-036
`ACCEPTED` stage in a separate one-file package record.

## 28. Current Gate decision

Decision:

```text
M4-035 governance: CLOSED

M4-036 protocol-first: CLOSED
M4-036 production implementation/hardening: ACCEPTED
M4-036 acceptance audit: RECORDED / EXACT-HEAD VERIFICATION PENDING

M4-036 package acceptance record: NOT AUTHORIZED YET
M4-036 final governance: NOT AUTHORIZED

M4-040+: NOT AUTHORIZED
M5: NOT AUTHORIZED
M6: NOT AUTHORIZED
M10 integrated CLI implementation: NOT AUTHORIZED BY THIS GATE
M13: NOT AUTHORIZED
M15: NOT AUTHORIZED
PR #3 merge: NOT AUTHORIZED
```

The next permitted action is only exact-head verification of this audit commit.
