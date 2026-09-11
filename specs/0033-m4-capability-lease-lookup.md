# M4-022 — Deterministic Capability Lease Lookup

Status: **DRAFT NORMATIVE SPECIFICATION**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-022 P0 — lease lookup`  
Depends on: M1 Capability model, M4-003 canonical resource normalization, M4-020 Subject resolution, M4-021 policy evaluation

## 1. Purpose

M4-022 defines the portable lookup boundary for discovering existing
`CapabilityLease` **candidates** for one already-resolved capability request.

This Gate deliberately does **not** decide whether a candidate is currently
usable. It answers only this narrower question:

> Within one immutable lookup snapshot, which Lease records are bound to the
> exact resolved Subject reference, exact capability, and exact canonical
> Resource requested by this action?

A lookup candidate is not an allow decision, not a CapabilityDecision, and not
proof that a Lease is unexpired, unexhausted, unrevoked, delegable, consumable,
or authorized for execution.

This narrow contract is required because the roadmap separates:

- M4-022 — lookup;
- M4-023 — approval routing;
- M4-024 — decision/receipt construction;
- M4-025 — guarantee assignment;
- M4-030 — TTL;
- M4-031 — maxUses / usage validity;
- M4-032 — atomic consume;
- M4-033 — revoke;
- M4-034 — parent-child attenuation.

M4-022 MUST NOT collapse those later Gates into one early "valid lease" check.

## 2. Existing protocol authority

This specification preserves the existing v0.1 protocol rather than creating a
parallel lease model.

### 2.1 CapabilityLease

`schemas/v1alpha1/capability-lease.schema.json` already defines:

```text
CapabilityLease {
  apiVersion
  kind
  leaseRef
  subjectRef
  parentLeaseRef?
  capability
  resource
  constraints?
  issuedAt
  expiresAt
  maxUses
  remainingUses
  authorization
}
```

M4-022 does not add a `revoked` flag, turn-bound lifetime field, delegation mode,
or alternative lease identity.

The ordinary portable lookup domain is a snapshot of complete values that
conform to that existing CapabilityLease schema. M4-022 does not create a second
"lookup lease" wire model with lifecycle/provenance fields removed.

The schema-validity boundary and lookup-semantics boundary are distinct:

- schema validity determines whether a value is a CapabilityLease;
- M4-022 interprets only the fields required for candidate lookup;
- lifecycle/provenance fields remain present but their later-Gate semantics are
  not evaluated here.

Portable hostile/bypass cases MAY intentionally violate one lookup-consumed
field to prove fail-closed runtime handling, but ordinary positive and mismatch
cases MUST use complete schema-shaped CapabilityLease values.

### 2.2 Subject reference binding

The protocol's Subject carries a stable `id` field. Existing portable fixtures
already use the same stable value in both places:

```text
CapabilityRequest.subject.id == "agent/root"
CapabilityLease.subjectRef    == "agent/root"
```

Therefore M4-022 binds a Lease to a resolved Subject by exact comparison:

```text
lease.subjectRef == resolvedSubject.id
```

M4-022 MUST NOT synthesize another Subject reference by concatenating `kind`,
`id`, session data, parent data, or M4-021 selector syntax.

In particular, these are **not** M4-022 subject-reference rules:

```text
kind + "/" + id
kind + "://" + id
sessionRef + "/" + id
parent + "/" + id
```

The M4-021 policy selector grammar `<SubjectKind>://<SubjectId>` remains policy
selector syntax only. It is not promoted into the `CapabilityLease.subjectRef`
identity domain.

Subject kind is still authoritative where the Subject or policy selector
contract uses it, but `CapabilityLease` itself contains only `subjectRef`.
M4-022 MUST NOT invent a hidden Lease subject-kind field.

`leaseRef`, `subjectRef`, `parentLeaseRef`, and authorization refs retain the
existing `defs.ref` domain: non-empty strings with the accepted maximum length.
M4-022 does not define a new lexical grammar inside those refs.

### 2.3 Capability

The request capability and Lease capability have **different existing schema
surfaces**, and M4-022 MUST preserve that distinction.

A CapabilityRequest capability already uses the request lexical profile:

```text
^[a-z][a-z0-9.-]*\.[a-z][a-z0-9.-]*$
```

with the request's accepted length bound.

By contrast, the existing CapabilityLease schema currently constrains its
`capability` field only as a string of length `3..256`; it does not apply the
CapabilityRequest regex. M4-022 MUST NOT retroactively tighten the Lease schema
by importing the request regex into Lease validation.

Lookup matching is exact code-point equality between the validated request
capability and the Lease capability. Therefore a schema-valid Lease capability
such as `Process.exec` is an ordinary non-match for request `process.exec`; it is
not a malformed snapshot merely because it would be invalid as a
CapabilityRequest capability.

There is no namespace inheritance, prefix match, wildcard, case folding, or
alias lookup.

`LEASE_LOOKUP_CAPABILITY_INVALID` is reserved for a runtime value that bypasses
the CapabilityLease validation boundary and violates the Lease field's own
string/length domain, not for a schema-valid differently spelled capability.

### 2.4 Resource

`CapabilityLease.resource` is an exact structured `CapabilityResource`, not a
policy `resources[]` selector.

Both the request Resource and every Lease lookup Resource MUST be processed by
the accepted M4-003 exact-resource normalization boundary before equality is
considered.

A Lease resource matches a request resource only when all canonical portable
fields are equal, including presence/value of optional `providerIdentity`:

```text
lease.scheme == request.scheme
AND lease.locator == request.locator
AND providerIdentity presence is equal
AND, when present, providerIdentity value is equal
```

M4-022 MUST NOT apply M4-004 wildcard semantics to a Lease resource locator.
Characters such as `*`, `**`, `?`, `/`, `:` and `://` inside an exact resource
locator remain ordinary locator data at this Gate.

M4-022 also MUST NOT infer provider containment from locator or opaque-provider
string prefixes.

## 3. Lookup input

The portable logical input is:

```text
LeaseLookupInput {
  subject: ResolvedSubject
  capability: CapabilityRequest capability
  resource: CapabilityResource
  leases: CapabilityLease[]
}
```

`subject` is the already-resolved M4-020 Subject identity/context fact.

The normal portable contract assumes the `leases` snapshot consists of complete
CapabilityLease values that satisfy the existing CapabilityLease schema. This is
a precondition, not permission for M4-022 to reinterpret lifecycle fields.

A host-language reference implementation MUST still defensively fail closed when
a caller bypasses that validated boundary and provides malformed values in fields
that M4-022 actually consumes for lookup. It is not required to invent M4-030+
lifecycle validation while performing M4-022 lookup.

`leases` represents one immutable lookup snapshot. The storage technology is not
portable M4-022 semantics. The snapshot MAY originate from memory, SQLite,
PostgreSQL, or another store, but one invocation MUST observe one coherent
snapshot rather than silently mixing records from different store versions.

### 3.1 No policy-rule lease input

`CapabilityPolicy.rules[].lease` is a `leaseRequest` containing `ttlMs` and/or
`maxUses`. It describes requested issuance bounds associated with policy; it is
not the identity of an existing Lease and is not a lookup key.

M4-022 therefore MUST NOT:

- search by `rule.lease.ttlMs`;
- search by `rule.lease.maxUses`;
- treat a missing `rule.lease` as "no existing Lease allowed";
- create a Lease from policy configuration.

### 3.2 No CapabilityRequest requestedLease matching

`CapabilityRequest.requestedLease` asks for future Lease parameters. It does not
identify an existing Lease. M4-022 MUST NOT use requested TTL/maxUses as a filter
for existing candidate discovery.

## 4. Candidate semantics

A Lease becomes an M4-022 candidate only when all three lookup dimensions match:

```text
SubjectRef exact match
AND capability exact match
AND exact canonical Resource match
```

The result is candidate discovery only.

The following fields MUST NOT change candidate ranking or lookup precedence:

```text
issuedAt
expiresAt
maxUses
remainingUses
authorization.kind
authorization.ref
parentLeaseRef
```

Those fields remain present on the CapabilityLease for later Gates, but M4-022
does not prefer "newer", "longer", "more uses", "approval-backed",
"parentless", or otherwise apparently stronger candidates.

## 5. Candidate multiplicity and deterministic order

More than one Lease may match the same Subject/capability/Resource tuple.
M4-022 MUST NOT silently select one using:

- storage insertion order;
- first/last wins;
- issuance time;
- expiry time;
- remaining uses;
- authorization kind;
- parent depth;
- lexical resource tricks;
- random choice.

Instead, every matching candidate Lease reference is returned.

`candidateLeaseRefs` MUST be sorted by Unicode code-point lexicographic order.
This ordering is presentation/determinism only. It is not authorization
precedence and MUST NOT imply that the first Lease should later be consumed.

## 6. Lease reference preflight

`leaseRef` is stable identity. Within one lookup snapshot, every materialized
Lease MUST have a valid exact `leaseRef`, and Lease references MUST be globally
unique before request-dependent filtering.

A duplicate Lease reference MUST fail the whole lookup snapshot even when one of
the duplicate records would later fail Subject/capability/Resource matching.

This prevents corrupted or ambiguous store identity from being hidden by the
current request.

Portable reason:

```text
LEASE_LOOKUP_DUPLICATE_LEASE_REF
```

M4-022 assigns no conflict winner.

## 7. Constraint boundary

The existing CapabilityLease schema exposes `constraints` as an open JSON
object. The Core contains examples such as `resourceWithin`, `argvPrefix`, and
`cwdWithin`, but no accepted portable generic Lease-constraint predicate language
currently defines how arbitrary keys are evaluated.

M4-022 MUST NOT invent equality, subset, deep-merge, argv-prefix, cwd containment,
filesystem containment, network, secret, or provider-specific semantics.

The portable v0.1 lookup profile is therefore:

```text
constraints omitted -> zero portable predicates -> candidate may be returned
constraints {}      -> zero portable predicates -> candidate may be returned
constraints non-empty on an otherwise exact Subject+capability+Resource match
                    -> FAIL_CLOSED / LEASE_CONSTRAINT_PROFILE_UNSUPPORTED
```

A Lease whose Subject, capability, or exact Resource does not match is not a
candidate. Its non-empty constraints are not traversed merely to block an
unrelated request.

This is not permission to ignore constraints. The opposite is normative: an
otherwise matching Lease with unsupported non-empty constraints MUST NOT be
returned as a usable-looking candidate.

## 8. Lifecycle semantics deliberately deferred

M4-022 MUST NOT determine lifecycle validity.

### 8.1 TTL / issuedAt / expiresAt

No host clock is read by M4-022. `issuedAt` and `expiresAt` do not affect lookup
candidate membership.

A schema-valid record whose `expiresAt` is earlier than an observer's current
wall clock can still be returned as an M4-022 **candidate**. M4-030 owns
expiry/lifetime validity.

This does not make an expired Lease usable.

### 8.2 maxUses / remainingUses

M4-022 does not decide usage validity and does not decrement any counter.

A schema-valid Lease with:

```text
remainingUses == 0
```

may still be discovered as a candidate. M4-031 owns usage-validity semantics and
M4-032 owns atomic consumption.

This does not make an exhausted Lease usable.

### 8.3 Revocation

The current `CapabilityLease` schema has no embedded revocation field.
Revocation is store/runtime state and is owned by M4-033.

M4-022 MUST NOT infer revocation from absence, authorization kind, timestamps,
parent references, or arbitrary constraint fields.

### 8.4 Parent leases / attenuation

`parentLeaseRef` is preserved identity/lineage data only at this Gate.
M4-022 MUST NOT:

- recursively follow a parent;
- prove parent existence;
- compare parent and child scope;
- compare expiry or remaining delegable uses;
- prove constraint attenuation;
- authorize a child because a parent exists.

M4-034 owns parent-child attenuation semantics.

## 9. Authorization provenance is not a lookup grant

Every schema-valid `CapabilityLease` carries an `authorization` reference.
M4-022 does not dereference that reference and does not rank by authorization
kind.

In particular:

- `authorization.kind == approval` does not invoke approval;
- `authorization.kind == lease` does not prove delegation validity;
- `authorization.kind == policy` does not re-run policy;
- `authorization.kind == system` does not create stronger authority.

Authorization provenance remains evidence for later decision/receipt and
validation paths.

## 10. Result contract

### 10.1 Candidates found

```text
{
  status: "CANDIDATES_FOUND",
  candidateLeaseRefs: [<leaseRef>, ...]
}
```

The array is detached, immutable-equivalent, unique, and sorted by Unicode
code-point lexicographic order.

`CANDIDATES_FOUND` MUST NOT be interpreted as `allow`.

### 10.2 No candidate

```text
{
  status: "NO_CANDIDATE",
  candidateLeaseRefs: []
}
```

No candidate is a normal lookup result, not an error and not itself a policy
effect. Later orchestration may route an M4-021 `ask` result toward M4-023, or
may preserve another fail-closed policy outcome, but M4-022 does not define that
routing.

### 10.3 Fail closed

```text
{
  status: "FAIL_CLOSED",
  stage: <portable stage>,
  reasonCode: <portable reason>
}
```

No attacker-controlled Lease, Subject, capability, Resource, constraint, or
store value is echoed into the portable failure payload.

Portable stages:

```text
INPUT
SUBJECT
RESOURCE
LEASE_SNAPSHOT
CONSTRAINT
```

Portable M4-022-owned reasons:

```text
LEASE_LOOKUP_INPUT_INVALID
LEASE_LOOKUP_SUBJECT_INVALID
LEASE_LOOKUP_SNAPSHOT_INVALID
LEASE_LOOKUP_LEASE_REF_INVALID
LEASE_LOOKUP_SUBJECT_REF_INVALID
LEASE_LOOKUP_CAPABILITY_INVALID
LEASE_LOOKUP_DUPLICATE_LEASE_REF
LEASE_CONSTRAINT_PROFILE_UNSUPPORTED
```

When M4-003 rejects the request or Lease resource, its accepted portable resource
reason is preserved rather than translated into a second resource taxonomy.

## 11. Deterministic validation and lookup order

Implementations MUST apply the following observable order:

```text
1. outer lookup-input domain
2. resolved Subject lookup identity
3. request capability under the accepted CapabilityRequest profile
4. request exact Resource normalization
5. lease-snapshot container domain
6. request-independent lookup projection preflight, in snapshot order:
   a. record object/readability
   b. leaseRef under defs.ref domain
   c. subjectRef under defs.ref domain
   d. Lease capability under the CapabilityLease string/length domain
   e. exact Resource normalization
7. global duplicate leaseRef detection
8. exact subjectRef filtering
9. exact capability filtering
10. exact canonical Resource filtering
11. constraints inspection only for otherwise exact matches
12. Unicode code-point ordering of candidateLeaseRefs
13. detached immutable result
```

The normal portable domain has already crossed CapabilityLease schema validation;
step 6 is the required defensive projection for the fields M4-022 consumes if a
host caller bypasses that boundary. It MUST NOT be expanded into TTL/use/revoke
semantics belonging to later Gates.

The input snapshot order determines only which malformed consumed field is
reported first during defensive preflight. It MUST NOT determine candidate
precedence or returned candidate ordering.

## 12. Runtime defensive boundary

Portable JSON fixtures do not model JavaScript accessors, Proxies, sparse arrays,
or inherited properties. The TypeScript reference implementation MUST still
fail closed at that host-language boundary.

Security-relevant lookup fields MUST be read only as own data properties. A
reference implementation MUST NOT execute getters while inspecting:

```text
subject
subject.id
capability
resource
leases
leaseRef
subjectRef
lease capability
lease resource
matching lease constraints
```

It MUST reject or fail closed on unreadable own-key/descriptor operations,
revoked Proxies, inherited lookup identity, sparse/named/symbol snapshot-array
properties, and unexpected authority-bearing wrapper fields according to the
public input contract.

Non-matching Lease constraints MUST not be recursively traversed.

M4-022 MUST NOT inspect lifecycle/provenance fields merely to create hidden
ranking or validity semantics. A later Gate remains responsible for interpreting
those fields against authoritative store state.

Successful output MUST be detached from caller-owned mutable arrays/objects and
SHOULD be frozen where the host language supports that without changing portable
semantics.

## 13. Store and atomicity boundary

M4-022 is a pure lookup over one coherent snapshot. It does not define the
storage backend or a transaction protocol.

A future production Lease Store MAY expose a query API instead of loading every
Lease into memory. That implementation is conforming only if its observable
result is equivalent to this deterministic snapshot contract and it preserves
stable identity/fail-closed behavior.

Critically, an M4-022 result MUST NOT be used as the atomic consumption point.
Before execution, later lifecycle/consume logic must re-establish the required
TTL/use/revocation invariants against authoritative store state. A stale lookup
candidate cannot itself authorize execution.

## 14. Security invariants

A conforming M4-022 implementation MUST satisfy all of the following:

1. **No synthetic Subject identity.** Exact `resolvedSubject.id` is compared to
   `lease.subjectRef`; kind/session/parent are not concatenated into another ref.
2. **No hidden capability equivalence.** Capability matching is exact, while the
   existing request and Lease field-validation profiles remain distinct.
3. **No Lease-resource globbing.** Exact `CapabilityResource` is not a policy
   selector.
4. **Provider identity stays opaque.** No prefix/containment inference.
5. **Duplicate Lease identity fails.** No first/last wins.
6. **Unsupported matching constraints fail closed.** They are never ignored.
7. **No clock authority.** M4-022 does not claim TTL validity.
8. **No usage authority.** M4-022 does not claim maxUses/remainingUses validity.
9. **No consume.** Lookup never mutates usage state.
10. **No revocation inference.** M4-033 remains authoritative later.
11. **No parent attenuation proof.** M4-034 remains authoritative later.
12. **No approval side effect.** M4-023 remains later.
13. **No CapabilityDecision/receipt.** M4-024 remains later.
14. **No guarantee assignment.** M4-025 remains later.
15. **No PEP execution.** M4-040+ remains later.
16. **Candidate is not authorization.** Even one exact candidate does not equal
    `allow`.
17. **No second Lease model.** Ordinary portable lookup cases remain complete
    CapabilityLease values under the existing schema.

## 15. Portable fixture requirements

Before production M4-022 implementation is authorized, a language-independent
fixture corpus MUST cover at least:

### Exact lookup

- one exact Subject/capability/Resource candidate;
- Subject reference mismatch;
- schema-valid differently spelled Lease capability as ordinary mismatch;
- Resource scheme mismatch;
- Resource locator mismatch;
- exact providerIdentity match;
- providerIdentity value mismatch;
- providerIdentity presence mismatch.

### Multiplicity and identity

- more than one exact candidate;
- deterministic Unicode code-point candidate ordering independent of snapshot
  order;
- duplicate leaseRef fails before request-dependent filtering;
- invalid leaseRef / subjectRef / Lease capability fail closed when the validated
  boundary is bypassed;
- invalid Lease resource preserves M4-003 failure.

### Constraints

- omitted constraints;
- empty constraints;
- non-empty constraints on an otherwise exact match fail closed;
- non-empty constraints on Subject-, capability-, or Resource-nonmatching Leases
  do not become unrelated blockers.

### Deferred lifecycle

- expired-looking timestamp remains only a candidate at lookup stage;
- `remainingUses: 0` remains only a candidate at lookup stage;
- parentLeaseRef does not trigger traversal;
- authorization kind does not change lookup ranking.

Except for cases intentionally proving a specific bypass failure, each Lease in
the portable corpus MUST contain the complete required CapabilityLease schema
surface (`apiVersion`, `kind`, refs, capability, Resource, timestamps, counters,
and authorization). Fixtures MUST NOT claim that any returned candidate is
active, consumable, or approved.

## 16. Reference implementation placement

The M4-022 reference implementation SHOULD live under
`packages/capability-broker`, consistent with the repository architecture where
Lease Store/orchestration belongs to Capability Broker rather than the pure
policy parser/matcher.

It MAY depend on the accepted M4-003 normalization public boundary rather than
reimplementing Resource canonicalization. If such a workspace dependency is
introduced, dependency/lockfile and architecture checks MUST remain strict and
reproducible; no dependency rule may be weakened to accommodate it.

The reference implementation MUST NOT import concrete `adapter-dsh` types or
DeepSeek Harness runtime types.

## 17. Acceptance gate

M4-022 production implementation is authorized only after the exact
protocol-first head containing this specification, its portable corpus, and the
handoff transition reaches both:

1. normal CI PASS;
2. exact pinned Harness rc5 source-conformance PASS.

Implementation acceptance later additionally requires:

- all portable cases passing through the real reference implementation;
- hostile runtime regressions for own-data/accessor/proxy/array boundaries;
- deterministic candidate ordering;
- duplicate-ref preflight before request filtering;
- no lifecycle/consume/revoke/attenuation behavior pulled forward;
- no policy/schema/TCK/security weakening;
- exact implementation-head normal CI + Harness dual-green.

M4-023+, M4-030+, M4-040+ and M6 remain unauthorized by this specification.
