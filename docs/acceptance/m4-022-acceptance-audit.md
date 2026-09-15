# M4-022 Acceptance Audit — Deterministic Capability Lease Lookup

Status: **ACCEPTED**  
Milestone: `M4 — Capability Broker v0.1`  
Gate: `M4-022 P0 — lease lookup`

## 1. Acceptance scope

This audit accepts the M4-022 deterministic `CapabilityLease` candidate-lookup boundary only.

Accepted behavior is intentionally narrower than lease validity or authorization. M4-022 discovers exact candidates from one coherent snapshot; it does not establish that a candidate is active, consumable, approved, delegated, or executable.

Later Gates remain outside this acceptance:

- M4-023 — approval routing;
- M4-024 — CapabilityDecision / receipt construction;
- M4-025 — guarantee assignment;
- M4-030 — TTL / expiry validity;
- M4-031 — maxUses / usage validity;
- M4-032 — atomic consume;
- M4-033 — revocation;
- M4-034 — parent-child attenuation;
- M4-040+ — PEP enforcement;
- M6.

## 2. Normative authority

Accepted normative specification:

- `specs/0033-m4-capability-lease-lookup.md`

Accepted portable corpus:

- `fixtures/lease-lookup/cases.json`
- 28 reviewed portable cases.

The protocol-first exact head was:

```text
2def23a6f0523eea17540ec6327fcca372bb4702
```

Exact-head protocol-first evidence:

- normal CI #449 — PASS;
- pinned Harness rc5 source conformance #391 — PASS.

Production implementation was not started until that exact-head dual-green Gate was established.

## 3. Accepted implementation head

Implementation acceptance is based on exact head:

```text
ef465fcfc50687b2590e20001d2ad7a123d2ab73
```

Exact-head evidence:

- normal CI #459 — PASS;
- pinned Harness rc5 source conformance #401 — PASS.

The pinned Harness compatibility evidence remains:

```text
DeepSeek Harness 0.1.0-rc.5
47f943859bef60e4160492346772ded9b24f765a
```

Harness remains compatibility evidence only and distribution-blocked; M4-022 does not acquire a concrete Harness runtime dependency.

## 4. Implementation delta audit

The implementation delta from protocol-first head `2def23a6f0523eea17540ec6327fcca372bb4702` to accepted implementation head `ef465fcfc50687b2590e20001d2ad7a123d2ab73` is limited to seven implementation/build files:

- `packages/capability-broker/src/lease-lookup-types.ts`;
- `packages/capability-broker/src/lease-lookup.ts`;
- `packages/capability-broker/src/lease-lookup.test.ts`;
- `packages/capability-broker/src/index.ts`;
- `packages/capability-broker/package.json`;
- `packages/policy-engine/package.json`;
- `pnpm-lock.yaml`.

No M4-022 normative specification, portable corpus, schema, TCK, Harness baseline, or later-Gate file changed after the protocol-first Gate.

`packages/policy-engine/package.json` is intentionally included in the audited delta. It exposes the already-existing accepted policy-engine public `src/index.ts` surface through an explicit workspace package `exports`/types boundary so capability-broker can reuse M4-003 normalization and deterministic ordering rather than duplicate security-sensitive semantics.

The workspace lockfile was independently audited after a whole-file repair. Relative to the pre-lock implementation head `8de243dbc61eb9bd51ec772513383107d11d2ab8`, the final `pnpm-lock.yaml` net change is exactly `+3/-0`, limited to the capability-broker workspace dependency on `@dsh-safe/policy-engine`. No package-integrity hash churn or unrelated lockfile mutation remains.

## 5. Semantic conformance review

### 5.1 Exact lookup identity

Accepted implementation preserves the normative three-dimensional candidate predicate:

```text
lease.subjectRef === resolvedSubject.id
AND lease.capability === request capability
AND canonical lease Resource === canonical request Resource
```

It does not synthesize Subject references from Subject kind, session, parent, or M4-021 selector syntax.

Request capability validation and Lease capability validation remain intentionally distinct. The request uses the accepted CapabilityRequest lexical profile; the Lease field retains its existing CapabilityLease string-length domain. Matching is exact code-point equality with no case folding, aliasing, wildcarding, prefix matching, or namespace inheritance.

Both request and Lease Resources reuse the accepted M4-003 normalization boundary. Exact equality includes `scheme`, `locator`, and the presence/value of optional `providerIdentity`. Lease resource locators are not interpreted as policy selectors or globs.

### 5.2 Snapshot identity and deterministic output

Every materialized `leaseRef` is defensively preflighted before request-dependent filtering. Duplicate Lease identity fails the whole snapshot before filtering with:

```text
LEASE_LOOKUP_DUPLICATE_LEASE_REF
```

All exact candidates are returned. Candidate references are ordered using the accepted Unicode code-point comparator. Storage/snapshot insertion order does not become authorization precedence.

Successful result arrays are detached from caller-owned collections and frozen where supported.

### 5.3 Constraint boundary

The accepted implementation preserves the deliberately narrow v0.1 constraint profile:

- omitted constraints: zero portable predicates;
- `{}`: zero portable predicates;
- non-empty constraints on an otherwise exact candidate: fail closed with `LEASE_CONSTRAINT_PROFILE_UNSUPPORTED`;
- constraints on a Subject/capability/Resource non-match are not recursively traversed merely to block an unrelated request.

No new generic constraint language, filesystem containment rule, argv rule, provider rule, or deep-object semantics were invented.

### 5.4 Deferred lifecycle and authority

Self-review confirms M4-022 does not read a host clock and does not determine TTL/expiry validity.

The lookup implementation does not interpret or rank candidates by:

- `issuedAt`;
- `expiresAt`;
- `maxUses`;
- `remainingUses`;
- `authorization`;
- `parentLeaseRef`.

It does not mutate counters, consume a Lease, infer revocation, traverse parents, prove attenuation, invoke approval, construct a CapabilityDecision/receipt, assign guarantees, or execute a PEP action.

A schema-valid expired-looking or exhausted-looking Lease may therefore remain an M4-022 candidate exactly as required; candidate discovery is not authorization.

### 5.5 Runtime-bypass boundary

The ordinary portable input remains a snapshot of complete schema-valid `CapabilityLease` values. The host-language defensive projection is deliberately limited to fields M4-022 consumes for lookup, matching Spec 0033 section 11.

This boundary is security-significant: broadening the defensive projection to evaluate lifecycle/provenance fields would incorrectly pull M4-030+ semantics into M4-022.

The TypeScript reference implementation reads security-relevant lookup fields as own data properties and does not execute getters. Hostile-runtime tests cover:

- top-level accessors;
- Subject identity accessors;
- Lease lookup-field accessors;
- deferred lifecycle/provenance getters;
- matching constraint accessors;
- hostile/revoked constraint objects;
- sparse, named, and symbol-bearing snapshot arrays;
- unexpected/symbol Lease fields;
- revoked input, Subject, snapshot, and Lease proxies;
- duplicate identity before filtering;
- detached/frozen deterministic output;
- sanitized failures that do not echo attacker-controlled refs.

Nonmatching constraint bodies are not traversed. Lifecycle/provenance getters are demonstrably not executed by lookup.

## 6. CI and quality evidence

Normal CI #459 passed on the exact accepted implementation head. This includes the repository's frozen-install, architecture/import, schema-baseline, strict TypeScript/build, unit/portable tests, lint, and package/testkit checks.

Pinned Harness rc5 source conformance #401 passed on the same exact head.

An earlier exact head exposed three implementation-boundary defects through normal CI: missing workspace package exports/types for policy-engine, an overly narrow empty-result type, and an `exactOptionalPropertyTypes` incompatibility. They were corrected without weakening TypeScript strictness, changing protocol semantics, altering fixtures, or bypassing CI.

## 7. Acceptance decision

M4-022 deterministic CapabilityLease candidate lookup is **accepted** at implementation head:

```text
ef465fcfc50687b2590e20001d2ad7a123d2ab73
```

This acceptance does not yet constitute final governance closure. The acceptance-record head and final governance head must each independently satisfy the repository's exact-head dual-green requirements before M4-022 is declared governance-closed and M4-023 is authorized.
