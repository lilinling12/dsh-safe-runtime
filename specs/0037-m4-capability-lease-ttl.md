# M4-030 — Deterministic Capability Lease TTL Validity

Status: **DRAFT NORMATIVE SPECIFICATION**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-030 P0 — TTL`  
Depends on: M1 CapabilityLease model, M4-022 deterministic Lease lookup, M4-025 accepted guarantee assignment

## 1. Purpose

M4-030 defines the portable time-validity boundary for an already-materialized
`CapabilityLease`.

This Gate answers one narrow question:

> At an explicit logical observation timestamp, is the Lease inside its
> authoritative `[issuedAt, expiresAt)` time window?

M4-030 does **not** decide whether the Lease is fully usable. A time-eligible
Lease can still be exhausted, revoked, non-consumable, invalidly delegated, or
blocked by a later PEP/composition rule.

The roadmap deliberately separates:

- M4-030 — TTL / time-window validity;
- M4-031 — `maxUses` / usage validity;
- M4-032 — atomic consume;
- M4-033 — revoke;
- M4-034 — parent-child attenuation;
- M4-040+ — PEP integration and execution-time enforcement.

M4-030 MUST NOT collapse those later Gates into one "valid Lease" predicate.

## 2. Existing protocol authority

M4-030 preserves the published v1alpha1 Lease wire model.

`CapabilityLease` already contains:

```text
issuedAt:  defs.timestamp
expiresAt: defs.timestamp
```

Core §11 already requires a Lease to have a bounded lifetime and to become
invalid immediately after expiry. Spec 0033 explicitly defers `issuedAt` /
`expiresAt` lifecycle validity to M4-030.

M4-030 introduces no new Lease wire field and does not modify:

```text
schemas/v1alpha1/capability-lease.schema.json
packages/protocol/src/capability.ts
```

The evaluator input defined below is a runtime-independent semantic projection,
not a second CapabilityLease wire model.

## 3. Scope boundary

M4-030 consumes only time facts.

It MUST NOT inspect, validate, decrement, rank, or derive authority from:

```text
leaseRef
subjectRef
parentLeaseRef
capability
resource
constraints
maxUses
remainingUses
authorization
```

Those values are either already handled by earlier Gates or owned by later
Gates.

In particular:

- `remainingUses == 0` does not change the M4-030 result;
- authorization kind does not change the M4-030 result;
- parent lineage does not change the M4-030 result;
- revocation state is not inferred from timestamps;
- no Lease is consumed by this primitive.

## 4. No `ttlMs` import into an existing Lease

The existing `CapabilityRequest.requestedLease.ttlMs` and
`CapabilityPolicy.rules[].lease.ttlMs` are issuance-request bounds. They are not
stored on `CapabilityLease` and are not available as M4-030 lookup identity.

M4-030 MUST NOT:

- reconstruct a missing `ttlMs` from `expiresAt - issuedAt`;
- reject an otherwise coherent Lease merely because its lifetime is greater than
  the `leaseRequest.ttlMs` schema maximum;
- guess which request or policy produced an existing Lease;
- compare an existing Lease against a caller-supplied requested TTL.

Any future issuance rule that binds requested TTL to emitted `expiresAt` requires
its own authoritative issuance context. M4-030 only interprets the timestamps
actually carried by the existing Lease.

## 5. Portable logical input

The portable projection is:

```text
LeaseTtlEvaluationInput {
  profile: "M4-030_LEASE_TTL_V1"
  issuedAt: timestamp
  expiresAt: timestamp
  observedAt: timestamp
}
```

`issuedAt` and `expiresAt` are projected from the `CapabilityLease`.

`observedAt` is supplied explicitly by the caller. It is the logical time at
which the caller is deciding time eligibility for the Lease.

There are no optional input fields in this profile.

## 6. Explicit logical clock

M4-030 MUST NOT read:

```text
Date.now()
new Date()
performance.now()
filesystem timestamps
process uptime
database server NOW()
Harness clock state
```

to decide a portable fixture outcome.

The primitive uses only `observedAt`.

A host integration may obtain an authoritative time outside this primitive, but
that time MUST be passed in explicitly. Tests and deterministic replay can
therefore supply the same logical timestamp and obtain the same result.

## 7. Timestamp domain

All three timestamps MUST conform to the existing v1alpha1 `defs.timestamp` /
JSON Schema `date-time` contract.

The reference profile MUST use deterministic RFC 3339 lexical and Gregorian
calendar validation. It MUST NOT rely on locale-sensitive parsing.

The accepted lexical profile is the same shape already used by the M4-024
reference implementation:

```text
YYYY-MM-DD[Tt]HH:MM:SS[.fraction](Z|z|±HH:MM)
```

with:

- valid Gregorian calendar date;
- hour `00..23`;
- minute `00..59`;
- second `00..60`;
- non-empty fractional digits when the fraction is present;
- offset hour `00..23`;
- offset minute `00..59`.

Timestamp strings are interpreted as instants for comparison. Textual equality
is not required. Equivalent offset representations MUST compare as the same
instant.

Examples:

```text
2026-09-02T01:00:00Z
2026-09-02T09:00:00+08:00
```

represent the same instant.

## 8. Deterministic instant ordering

Implementations MUST compare timestamps without truncating fractional precision.

A conforming comparison may use any internal representation that produces the
following portable ordering:

1. validate and parse the Gregorian civil fields;
2. convert the civil date/time and numeric offset to one UTC ordering position;
3. preserve arbitrary fractional-second digits as an exact decimal fraction;
4. treat trailing fractional zeros as equivalent (`.1 == .10 == .100`);
5. compare by UTC position, then exact fractional value.

### 8.1 Leap-second ordering

Because the accepted timestamp validator permits `second == 60`, M4-030 MUST
define deterministic ordering rather than delegating leap-second behavior to a
host parser.

For a timestamp with `second == 60`:

1. compute the UTC ordering second corresponding to the following nominal
   `:00` second after applying the offset;
2. mark the value as a leap-second position;
3. at an equal UTC ordering second, all leap-second positions sort before an
   ordinary `second == 00` position;
4. fractional digits order within the leap second normally.

Thus:

```text
...:59 < ...:60 < next-minute ...:00
```

and no host leap-second table is required for portable comparison.

This is a deterministic protocol ordering rule, not a claim about POSIX epoch
encoding.

## 9. Authoritative lifetime interval

A coherent CapabilityLease lifetime is the half-open interval:

```text
[issuedAt, expiresAt)
```

Therefore:

```text
issuedAt <= observedAt < expiresAt
```

is time-eligible.

The exact boundaries are normative:

- `observedAt == issuedAt` => time-eligible;
- `observedAt < issuedAt` => not yet active;
- `observedAt == expiresAt` => expired;
- `observedAt > expiresAt` => expired.

Expiry is therefore immediate at the `expiresAt` instant.

## 10. Lifetime coherence

A Lease time window MUST have positive duration:

```text
issuedAt < expiresAt
```

If the two timestamps represent the same instant, even through different textual
offset/fraction representations, the window is incoherent.

If `issuedAt > expiresAt`, the window is also incoherent.

Both cases fail closed. They are not normalized into "already expired" because a
reversed/zero-duration authoritative lifetime is malformed Lease lifecycle data.

## 11. Result contract

### 11.1 Time eligible

```text
{
  status: "TIME_ELIGIBLE",
  reasonCode: "LEASE_TTL_ACTIVE"
}
```

This means only that the observation instant falls inside the Lease time window.

`TIME_ELIGIBLE` MUST NOT be interpreted as:

```text
allow
usable lease
remaining use available
not revoked
atomically consumable
delegation valid
PEP enforced
```

### 11.2 Time ineligible — not yet active

```text
{
  status: "TIME_INELIGIBLE",
  reasonCode: "LEASE_TTL_NOT_YET_ACTIVE"
}
```

### 11.3 Time ineligible — expired

```text
{
  status: "TIME_INELIGIBLE",
  reasonCode: "LEASE_TTL_EXPIRED"
}
```

### 11.4 Fail closed

```text
{
  status: "FAIL_CLOSED",
  stage: "INPUT" | "TIME",
  reasonCode: <stable M4-030 reason>
}
```

Portable M4-030 failure reasons are:

```text
LEASE_TTL_INPUT_INVALID
LEASE_TTL_PROFILE_INVALID
LEASE_TTL_ISSUED_AT_INVALID
LEASE_TTL_EXPIRES_AT_INVALID
LEASE_TTL_OBSERVED_AT_INVALID
LEASE_TTL_WINDOW_INVALID
```

Failure output MUST NOT echo any attacker-controlled timestamp, exception,
object, accessor value, stack, or host-parser diagnostic.

## 12. Deterministic validation and evaluation order

Implementations MUST apply this observable order:

```text
1. outer input record/readability
2. exact input-key domain
3. profile exact equality
4. issuedAt deterministic timestamp validation/materialization
5. expiresAt deterministic timestamp validation/materialization
6. observedAt deterministic timestamp validation/materialization
7. issuedAt < expiresAt lifetime-coherence proof
8. observedAt < issuedAt ? NOT_YET_ACTIVE
9. observedAt >= expiresAt ? EXPIRED
10. otherwise TIME_ELIGIBLE
11. detached immutable-equivalent result
```

A malformed earlier field MUST NOT be hidden by a later lifecycle outcome.

For example, malformed `expiresAt` cannot be reported as simply expired because
`observedAt` appears late by some host parser.

## 13. Runtime hostile-object boundary

Portable JSON fixtures cannot express JavaScript accessors, inherited
properties, symbols, or revoked Proxies. A TypeScript reference implementation
MUST still treat the public runtime input as `unknown`.

Security-relevant fields MUST be inspected as own data properties without
executing getters:

```text
profile
issuedAt
expiresAt
observedAt
```

The reference implementation MUST:

- reject unexpected own string fields;
- reject own symbol fields;
- reject inherited required fields;
- reject accessor-backed required fields without invoking getters;
- fail closed on unreadable `ownKeys` / property descriptors / revoked Proxies;
- avoid `String(value)`, numeric coercion hooks, `Date.parse`, locale parsing, and
  other attacker-controlled coercion;
- return detached frozen result objects.

No failure path may expose attacker-controlled values.

## 14. Determinism and purity

For the same accepted input, M4-030 MUST return the same result regardless of:

- host timezone;
- locale;
- daylight-saving configuration;
- wall-clock time;
- process uptime;
- storage ordering;
- DeepSeek Harness availability;
- Adapter/provider selection.

The primitive performs no I/O and no mutation.

## 15. Portable corpus

The portable conformance corpus is:

```text
fixtures/lease-ttl/cases.json
```

Profile:

```text
M4-030_LEASE_TTL_V1
```

The corpus MUST cover at least:

- issued boundary;
- expiry boundary;
- before-issued and after-expiry;
- fractional precision and equivalent fractions;
- offset-equivalent instants;
- cross-day and leap-year ordering;
- lowercase `t` / `z`;
- leap-second deterministic ordering;
- zero/reversed windows;
- malformed lexical/calendar/offset values;
- missing/unexpected/profile-invalid inputs;
- proof that an existing Lease lifetime is not capped by `leaseRequest.ttlMs`.

Portable fixture cases are semantic authority for implementations but do not
model host-language Proxy/accessor attacks; those belong in production
implementation tests after this protocol-first head is accepted.

## 16. Explicit non-goals

M4-030 does not:

- inspect or decrement `maxUses` / `remainingUses`;
- atomically reserve/consume a Lease;
- define revocation storage;
- follow `parentLeaseRef`;
- prove attenuation;
- issue a CapabilityLease;
- derive `expiresAt` from requested `ttlMs`;
- select one Lease among M4-022 candidates;
- bypass M4-023 approval routing in the currently accepted composition;
- create CapabilityDecision/Receipt records;
- assign GuaranteeLevel;
- enforce a PEP;
- change DeepSeek Harness behavior;
- implement M4-031+ or M6.

## 17. Acceptance boundary for production implementation

Production TypeScript implementation is **not authorized** merely because this
specification exists.

Before M4-030 production code begins, the exact protocol-first head containing
only the authorized protocol-first delta MUST reach:

1. normal repository CI PASS;
2. exact pinned DeepSeek Harness rc5 source-conformance PASS;
3. PR #3 remains Open/Draft/mergeable with no review/review-thread blocker.

Only then may the production implementation of this exact M4-030 profile begin.

Any semantic ambiguity discovered during implementation MUST be resolved in this
spec/corpus first rather than hidden in TypeScript behavior.

## 18. Later-Gate boundary

After M4-030 is accepted:

- M4-031 may consume the same Lease only for usage validity;
- M4-032 may define atomic consume;
- M4-033 may define revocation state;
- M4-034 may define parent-child attenuation.

A future composition Gate must require all relevant Lease facts before a Lease
can replace an approval or authorize execution.

M4-030 alone never authorizes an action.
