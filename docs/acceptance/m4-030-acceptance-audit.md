# M4-030 Acceptance Audit — Deterministic CapabilityLease TTL Validity

Status: **IMPLEMENTATION ACCEPTED / ACCEPTANCE RECORD PENDING EXACT-HEAD VERIFICATION**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-030 P0 — TTL`

## 1. Accepted protocol-first authority

Normative profile:

```text
specs/0037-m4-capability-lease-ttl.md
```

Portable corpus:

```text
fixtures/lease-ttl/cases.json
```

Portable profile:

```text
M4-030_LEASE_TTL_V1
```

Protocol-first exact head:

```text
8cb3a9054cd8a1f0114f3cc5fdd9cf5000548efd
```

Relative to M4-025 final-governance head
`47f918a83c331db1589cb9cb7f332920521ab51d`, the protocol-first delta was
exactly:

```text
docs/handoff/CURRENT.md
fixtures/lease-ttl/cases.json
specs/0037-m4-capability-lease-ttl.md
```

No production TypeScript, protocol wire type, schema, Shared TCK,
Adapter/Harness baseline, dependency, lockfile, M4-031+, M4-040+ or M6 change
was present.

Protocol-first exact-head evidence:

- normal CI #512: PASS;
- Harness rc5 source-conformance #454: PASS;
- portable corpus: 32 canonical `LTTL-001` through `LTTL-032` cases.

Production implementation was therefore authorized only after the protocol-first
head reached same-head dual-green.

## 2. Accepted implementation head

Accepted implementation and green-after-review hardening exact head:

```text
e7c2832f1263d744e3de6916e01c30db374ce68c
```

The net implementation delta from the protocol-first head remains exactly five
Capability Broker files:

```text
packages/capability-broker/src/index.ts
packages/capability-broker/src/lease-ttl-hardening.test.ts
packages/capability-broker/src/lease-ttl-types.ts
packages/capability-broker/src/lease-ttl.test.ts
packages/capability-broker/src/lease-ttl.ts
```

The compare is three commits ahead and contains no Adapter, Harness
source-conformance baseline, schema, protocol wire model, Shared TCK, dependency,
lockfile or later-Gate file.

The production implementation itself was introduced at:

```text
90c3462320b61b8db2ba74b6bc9fd2be4e397245
```

That head passed normal CI #513 and Harness rc5 source-conformance #455 before
the acceptance review added test-only hardening.

## 3. Package and directory structure review

M4-030 follows the established Capability Broker security-primitive layout:

```text
lease-ttl-types.ts
lease-ttl.ts
lease-ttl.test.ts
lease-ttl-hardening.test.ts
```

This is intentionally consistent with the accepted M4-022 through M4-025
package-root `types / implementation / semantic tests / hostile-runtime tests`
pattern.

A nested `lease/ttl/domain/application/infrastructure` hierarchy was deliberately
not introduced. M4-030 is a pure deterministic domain primitive: it has no I/O,
storage, provider integration, Adapter dependency, host clock acquisition or
infrastructure boundary. Additional architectural layers would therefore create
false abstraction boundaries rather than isolate real responsibilities.

The implementation also deliberately does not extract a broad shared RFC3339 or
hostile-object utility. Time ordering, lexical acceptance, leap-second ordering,
validation precedence and fail-closed reasons are part of this Gate's reviewed
semantic boundary. Prematurely sharing them with later Lease Gates would allow a
future change in one lifecycle primitive to silently alter another Gate's
security behavior.

Reusable extraction should occur only if later accepted Gates demonstrate the
same semantic contract and failure model, not merely similar syntax.

## 4. Public API boundary

The Capability Broker exports:

```text
evaluateCapabilityLeaseTtl
LEASE_TTL_PROFILE
LeaseTtlEvaluationInput
LeaseTtlEvaluationResult
LeaseTtlEligible
LeaseTtlIneligible
LeaseTtlFailure
LeaseTtlFailureReason
LeaseTtlIneligibleReasonCode
LeaseTtlStage
```

The convenience input type is narrow, while the runtime primitive itself accepts
`unknown`. This preserves static ergonomics without trusting TypeScript as a
runtime security boundary for JavaScript, `any`, deserialized or plugin-origin
values.

`PACKAGE_STAGE` deliberately remains:

```text
M4-025-GUARANTEE-ASSIGNMENT-ACCEPTED
```

at the accepted implementation head. The package does not claim M4-030
acceptance before the acceptance-record transition itself is verified.

M4-030 imports no concrete DeepSeek Harness runtime and no Adapter, filesystem,
network, subprocess, database or host-clock API.

## 5. Accepted semantic scope

M4-030 answers only:

> At explicit logical time `observedAt`, is an already-materialized
> CapabilityLease inside its authoritative time window?

Portable input is exactly:

```text
{
  profile: "M4-030_LEASE_TTL_V1",
  issuedAt,
  expiresAt,
  observedAt
}
```

The authoritative lifetime is the half-open interval:

```text
[issuedAt, expiresAt)
```

Accepted boundary behavior is therefore:

```text
observedAt == issuedAt  -> TIME_ELIGIBLE / LEASE_TTL_ACTIVE
observedAt <  issuedAt  -> TIME_INELIGIBLE / LEASE_TTL_NOT_YET_ACTIVE
observedAt == expiresAt -> TIME_INELIGIBLE / LEASE_TTL_EXPIRED
observedAt >  expiresAt -> TIME_INELIGIBLE / LEASE_TTL_EXPIRED
```

A zero-duration or reversed authoritative window fails closed with:

```text
stage: TIME
reasonCode: LEASE_TTL_WINDOW_INVALID
```

Time eligibility is not authorization and does not mean that a Lease is usable.

## 6. Deterministic clock and instant model

The accepted primitive does not acquire time. `observedAt` is an explicit
logical input.

It does not consult:

```text
Date()
new Date()
Date.now()
Date.parse()
Date.UTC()
performance.now()
filesystem timestamps
process uptime
database NOW()
Harness clock state
```

The parser accepts only the Spec 0037 reviewed four-digit RFC3339-compatible
lexical profile and performs deterministic Gregorian validation directly.

The internal ordering representation is:

```text
utcSecond: integer ordering position
leapSecond: explicit marker
fraction: exact decimal digit string
```

For the four-digit year domain, integer UTC-second positions remain well within
JavaScript's exact safe-integer range. Fractional seconds are never converted to
floating point, so arbitrary fractional precision is preserved rather than
rounded to host milliseconds.

Equivalent fractions compare equal through virtual trailing zeros:

```text
.1 == .10 == .1000
```

Numeric offsets are applied to the civil-time position, so textual forms with
different offsets compare by instant rather than by string.

## 7. Gregorian and leap-second review

Calendar validation follows the proleptic Gregorian leap-year rule:

```text
divisible by 4
and
(not divisible by 100 or divisible by 400)
```

Acceptance review added explicit century regressions proving:

```text
1900 -> not a leap year
2000 -> leap year
2100 -> not a leap year
2400 -> leap year
```

The implementation therefore locks the century exception most commonly lost in
hand-written civil-time code rather than relying only on ordinary 2028 leap-year
coverage.

Because the already accepted timestamp lexical domain allows `second == 60`,
the implementation preserves Spec 0037's deterministic protocol ordering:

```text
...:59 < ...:60 < next-minute ...:00
```

A leap second shares the following nominal integer-second position but carries a
marker that sorts it before the ordinary `:00` position at that same integer
position. Fractional digits order normally within the leap second.

This is protocol ordering only; it does not depend on a POSIX or host leap-second
table.

## 8. Validation precedence and stable failures

The accepted implementation preserves the normative observable order:

```text
1. outer record/readability
2. exact own-key domain
3. profile
4. issuedAt
5. expiresAt
6. observedAt
7. lifetime coherence
8. not-yet-active
9. expired
10. active
```

Stable failure reasons are exactly:

```text
LEASE_TTL_INPUT_INVALID
LEASE_TTL_PROFILE_INVALID
LEASE_TTL_ISSUED_AT_INVALID
LEASE_TTL_EXPIRES_AT_INVALID
LEASE_TTL_OBSERVED_AT_INVALID
LEASE_TTL_WINDOW_INVALID
```

No failure payload reflects attacker-controlled timestamps, trap messages,
exception text, stack data or host-parser diagnostics.

## 9. Runtime hostile-object review

The accepted runtime boundary:

- accepts public input as `unknown`;
- requires an outer non-array object;
- enumerates all own keys with `Reflect.ownKeys` inside a defensive boundary;
- requires exactly four reviewed own string keys;
- rejects unexpected string keys and all symbol keys;
- reads security facts through own property descriptors;
- rejects accessor-backed fields without executing getters;
- rejects inherited required fields as authority;
- fails closed if `ownKeys` throws;
- fails closed if `getOwnPropertyDescriptor` throws;
- fails closed on revoked Proxies, including the `Array.isArray` meta-operation;
- never uses `String(value)`, `valueOf` or `Symbol.toPrimitive` to coerce time
  facts;
- returns detached frozen success and failure objects;
- does not retain or echo attacker-controlled input.

Portable JSON fixtures cannot represent these host-language attacks, so they are
kept in the dedicated hardening suite rather than being mixed into portable
semantic authority.

## 10. Green-after-review hardening

Acceptance review did not change the implementation semantics after
`90c34623...`. It strengthened regression evidence in two test-only commits.

### 10.1 Gregorian century boundary regression

Commit:

```text
4931be505b7e0b138d0d2c47f4e1751fcb8e59ee
```

Change:

```text
packages/capability-broker/src/lease-ttl.test.ts
+26 / -0
```

The test locks 1900/2000/2100/2400 century behavior required by the existing
Gregorian specification. No Spec, fixture corpus or production implementation
was changed.

### 10.2 Host-time and descriptor-trap regression

Commit:

```text
e7c2832f1263d744e3de6916e01c30db374ce68c
```

Change:

```text
packages/capability-broker/src/lease-ttl-hardening.test.ts
+51 / -0
```

The added tests directly prove two already normative invariants:

- unreadable property descriptors fail closed at the owning field;
- semantic evaluation does not consult host `Date` or wall-clock APIs.

Again, production implementation and protocol authority were unchanged.

The final accepted candidate is this later head, so earlier workflow evidence is
not substituted for final exact-head evidence.

## 11. Exact-head quality evidence

For accepted implementation/hardening head
`e7c2832f1263d744e3de6916e01c30db374ce68c`:

- normal CI #515 / run `33554652123`: PASS;
- Harness rc5 source-conformance #457 / run `33554649460`: PASS;
- frozen `pnpm install --frozen-lockfile`: PASS;
- supply-chain policy: 124 entries PASS;
- architecture boundaries: PASS;
- schema shape: 16 schemas PASS;
- schema compatibility baseline: PASS;
- strict workspace TypeScript: PASS;
- test files: 53 PASS;
- tests: 1024 PASS;
- M4-030 primary suite: 36 PASS;
- M4-030 hostile-runtime hardening suite: 12 PASS;
- oxlint: 0 errors, two pre-existing repository warnings;
- packed Shared TCK / external non-workspace consumer: 44 registered assets PASS;
- pinned Harness public type build: PASS;
- reproducible safe-runtime install in Harness source-conformance: PASS;
- exact pinned Harness workspace projection: PASS;
- projection idempotence: PASS;
- exact-source rc5 binding typecheck: PASS;
- real rc5 runtime conformance: PASS;
- PR #3: Open, Draft, mergeable;
- submitted reviews: none;
- review threads: none.

The two lint warnings are pre-existing repository warnings (`new
Array(singleArgument)` and a thenable-shape warning). The protocol-first and
pre-M4-030 baselines already contained them. M4-030 introduces no lint error and
no additional warning.

The GitHub Actions runner also reports a platform warning that older
`actions/checkout@v4` / `actions/setup-node@v4` action internals target Node 20
while GitHub forces Node 24. This is workflow/tooling maintenance debt, not an
M4-030 implementation diagnostic, and was not hidden by weakening the Gate.

## 12. Protocol and compatibility authority review

M4-030 preserves the existing `CapabilityLease` wire model. It does not add
`ttlMs`, change timestamp fields or alter protocol schemas.

`CapabilityRequest.requestedLease.ttlMs` and policy `lease.ttlMs` remain issuance
request bounds. The implementation does not reconstruct requested TTL from
`expiresAt - issuedAt` and does not infer a global 24-hour cap for an existing
Lease.

DeepSeek Harness rc5 remains compatibility evidence only. No Harness name,
feature flag, provider behavior, clock behavior or runtime parser defines M4-030
semantics.

This keeps the TTL primitive portable to future Harness releases and non-DSH
Adapters.

## 13. Lifecycle separation and architecture boundary

M4-030 intentionally does not inspect:

```text
maxUses
remainingUses
revocation state
parentLeaseRef
authorization provenance
candidate ranking
approval bypass
atomic consumption
PEP execution
```

Those concerns remain separated by the accepted roadmap:

```text
M4-031 maxUses / usage validity
M4-032 atomic consume
M4-033 revoke
M4-034 parent-child attenuation
M4-040+ PEP integration
```

This separation is important for maintainability: a pure time predicate remains
deterministic and replayable, while stateful consumption/revocation and
composition logic can carry their own atomicity and authority proofs.

`TIME_ELIGIBLE` therefore never means `allow`, `authorized`, `usable`,
`consumable`, `not revoked` or `delegation valid`.

## 14. Non-acceptance boundaries

This audit does **not** accept or authorize:

```text
M4-031 maxUses / usage validity
M4-032 atomic consume
M4-033 revoke
M4-034 parent-child attenuation
M4-040+ PEP integration
host/container/microVM clock acquisition
Adapter-defined Lease semantics
execution/audit persistence
M6 Workspace Transaction
PR #3 merge
```

No later Gate may reinterpret this acceptance as permission to combine Lease
lifecycle concerns without its own protocol-first authority and exact-head
verification.

## 15. Acceptance verdict

```text
M4-030 protocol-first authority: PASS
M4-030 portable corpus: PASS
M4-030 deterministic time semantics: PASS
M4-030 Gregorian/offset/fraction/leap ordering: PASS
M4-030 hostile-runtime boundary: PASS
M4-030 architecture/package boundary: PASS
M4-030 exact-head CI: PASS
M4-030 Harness compatibility: PASS
M4-030 implementation: ACCEPTED
M4-031+: NOT AUTHORIZED
PR #3 merge: NOT AUTHORIZED
```

## 16. Acceptance-record gate

The implementation is accepted by this audit, but governance is not closed by
this document alone.

Following the established Capability Broker acceptance flow, this audit commit
MUST first exist as its own reviewable transition. The subsequent package-stage
transition may change only the package acceptance marker/comment needed to state
that M4-030 is implementation-accepted.

The resulting acceptance-record exact head MUST itself pass:

1. normal repository CI;
2. exact pinned Harness rc5 source-conformance;
3. PR #3 remains Open/Draft/mergeable with no review/review-thread blocker.

Only after that same-head evidence is green may final governance update
`CURRENT.md`, append `HISTORY.md`, mark the M4-030 roadmap item accepted, and
verify the resulting final-governance head.

M4-031 remains unauthorized until M4-030 final governance is itself same-head
dual-green.
