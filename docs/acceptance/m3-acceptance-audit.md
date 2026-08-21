# M3 Acceptance Audit — Shared TCK Foundation

Status: **NOT ACCEPTED — DoD REMEDIATION REQUIRED**  
Milestone: `M3 — Shared TCK Foundation`  
Audit opened: `2026-08-21`  
PR: `#2 — feat(testkit): establish M3 shared TCK foundation`  
Accepted M2 base: `6a9c64155ec6c376908e64d70f2b50d5b8de1285`  
Exact Harness compatibility baseline: `0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a`

This document is an acceptance record, not a normative specification. Green CI
is necessary but insufficient for milestone acceptance. M3 is accepted only when
its Definition of Done has direct evidence at the correct boundary.

## 1. Authority and audit method

The audit reconciles, in descending authority:

1. normative M3 specs and portable fixture semantics;
2. `docs/tck-security-acceptance.md`;
3. exact accepted implementation evidence for M3-001 through M3-017;
4. the repository's package/publication surface;
5. `docs/roadmap.md` as planning/tracking state only.

DeepSeek Harness remains Adapter compatibility evidence and never becomes Shared
TCK protocol authority.

The audit deliberately does not equate either of these with acceptance:

- all numbered implementation tasks being complete;
- normal CI and exact Harness source-conformance being green.

## 2. Verified implementation baseline

The final numbered Adapter TCK gate, M3-017 replay reconciliation, is accepted on
implementation/manifest head:

```text
2ad59d90962954e200f5aab081c3dc8ce0787571
```

Exact evidence:

- normal CI #198 / run `32466962066`: PASS;
- `pnpm install --frozen-lockfile`: PASS;
- `pnpm check:all`: PASS;
- Harness rc5 source-conformance #157 / run `32466962084`: PASS;
- pinned source build/projection/idempotence steps 6–9: PASS;
- exact binding TypeScript step 10: PASS;
- real rc5 runtime conformance step 11: PASS.

The M3-017 manifest registration was independently audited before branch ref
movement. The commit changes only `fixtures/manifest.json`, is a single tail
append hunk, and has `+48/-0`, registering exactly eight replay fixtures without
removing or reordering existing records.

Governance handoff head after M3-017 closure:

```text
e7c54f0e95b1ac99a6bd7472a8f93d9d40808e65
```

Its normal CI #199 passed. Exact Harness rc5 source-conformance #158 is the
required governance-head compatibility check and must be green before any M3 DoD
remediation implementation begins.

## 3. Numbered M3 implementation gates

The repository has direct implementation evidence for all currently numbered M3
gates:

| Gate | Result | Evidence class |
| --- | --- | --- |
| M3-001 | PASS | language-independent fixture envelope |
| M3-002 | PASS | runner lifecycle/status contract |
| M3-003 | PASS | explicit deterministic seed/logical clock |
| M3-004 | PASS | deterministic fake approval |
| M3-005 | PASS | deterministic fake tool runtime |
| M3-006 | PASS | deterministic fake filesystem/subprocess world |
| M3-007 | PASS | deterministic fault injection |
| M3-010 | PASS | Adapter DSH turn lifecycle Shared TCK |
| M3-011 | PASS | tool ordering Shared TCK |
| M3-012 | PASS | denied body-entry Shared TCK |
| M3-013 | PASS | authoritative final-result Shared TCK |
| M3-014 | PASS | approval-unavailable Shared TCK |
| M3-015 | PASS | cancellation Shared TCK |
| M3-016 | PASS | disposal Shared TCK |
| M3-017 | PASS | replay reconciliation Shared TCK |

There is no M3-018 item in the current roadmap. The next engineering work is DoD
remediation, not a new Adapter behavior gate.

## 4. Cross-gate semantic audit

### 4.1 Protocol-first ownership

**PASS.** Shared-TCK behavior was introduced through normative language-independent
specs and portable fixtures before TypeScript runner/Adapter implementation. The
TypeScript package remains a projection rather than protocol authority.

### 4.2 Portable fixture envelope

**PASS.** The shared fixture contract is JSON-based, uses explicit API version,
profile, deterministic seed/logical clock, stimulus and expectation values, and
keeps profile data inside JSON values. The TypeScript projection expresses the
same JSON value domain and does not add class, symbol, function, Date, undefined,
or other TypeScript/JavaScript-only fixture values.

### 4.3 Determinism

**PASS.** M3 fake services and profile runners reject ambient timing/randomness as
semantic authority. Replay reconciliation orders by durable sequence and defined
UTF-8 byte ordering instead of host time.

### 4.4 Runner result integrity

**PASS.** Shared runner status vocabulary preserves `PASS`, `FAIL`, `UNSUPPORTED`,
and `ERROR`. Profile runners distinguish malformed implementation output/throws
from valid semantic mismatch. Expectation data is comparison-only for Adapter
profile runners and cannot manufacture source-side evidence.

### 4.5 Adapter authority consistency

**PASS.** M3-010 through M3-017 remain mutually consistent:

- durable tool request intent does not become final execution outcome;
- M3-013 live final `tools/result` remains authoritative completion evidence;
- denial/cancellation require their accepted policy/result correlations;
- unavailable approval fails closed;
- disposal is separated into ownership/cutoff/drain/completion;
- replay reconciliation restores durable identity/evidence anchors only and does
  not manufacture lost live-only completion authority;
- crash-repair unknown outcomes remain unknown.

### 4.6 Harness independence

**PASS at portable layer.** Concrete Harness packages are confined to Adapter and
exact source-conformance evidence. Shared fixture/profile semantics do not require
Harness object instances, private listener collections, or concrete runtime types.

### 4.7 Negative/fail-closed behavior

**PASS.** M3 includes explicit malformed, unsupported, denial, cancellation,
unavailable, disposal-boundary, replay-gap, contradiction, orphan and other
negative cases. Absence of an observed failure is not treated as success.

## 5. M3 Definition-of-Done audit

The current roadmap defines exactly three M3 DoD items.

### DoD-1 — TCK can be published independently

**BLOCKED.** `packages/testkit/package.json` currently declares:

```json
{
  "name": "@dsh-safe/testkit",
  "version": "0.1.0-alpha.0",
  "private": true
}
```

It also currently lacks the package surface required for a verifiable standalone
artifact:

- no package-local build/typecheck configuration;
- no `exports` contract for compiled public API;
- no `files` allow-list for the published artifact;
- no pack-time inclusion strategy for portable TCK fixtures/manifest and the
  schema assets needed to validate them;
- no CI evidence that a packed artifact can be installed and consumed outside
  the monorepo workspace graph.

Changing only `private: true` to false would not satisfy this DoD and is explicitly
not an acceptable remediation.

### DoD-2 — A dummy implementation outside the Reference Runtime can run the TCK

**BLOCKED.** Existing testkit profile tests exercise deterministic test-side
projections and Adapter conformance, but the repository does not currently expose
a separately packaged/installed dummy consumer that proves the public TCK artifact
can be used outside the Reference Runtime package graph.

A conforming remediation must consume only the public packed TCK surface. It must
not import `packages/testkit/src/*`, Adapter internals, Reference Runtime internals,
or workspace-only source paths.

### DoD-3 — Fixtures contain no TypeScript-only semantics

**PASS WITH DIRECT CONTRACT EVIDENCE.** Portable fixtures are JSON documents under
`fixtures/tck`; the envelope schema's stimulus/expect domain is JSON value only;
and
the TypeScript projection follows that domain rather than expanding it. Profile
boundary tests additionally reject non-portable runtime values such as cycles,
exotic objects, sparse/decorated arrays, symbols, and non-finite numbers where
direct-call inputs could otherwise bypass JSON parsing.

This PASS does not substitute for DoD-1 or DoD-2. A JSON fixture can be portable
while the package carrying its runner/assets is still not independently
publishable.

## 6. Acceptance verdict

```text
M3 numbered implementation gates: PASS
M3 DoD-1 independent publication: BLOCKED
M3 DoD-2 external dummy consumer: BLOCKED
M3 DoD-3 no TypeScript-only fixture semantics: PASS
M3 milestone: NOT ACCEPTED
M4 Capability Broker: NOT AUTHORIZED
M6 Workspace Transaction: NOT AUTHORIZED
```

## 7. Required remediation

### M3-A1 P0 — Publishable Shared TCK artifact

Create a real standalone `@dsh-safe/testkit` package boundary that can be built and
packed reproducibly.

Minimum acceptance evidence:

1. package is intentionally publishable rather than `private`;
2. package-local TypeScript build emits the public API to `dist`;
3. package defines explicit `exports` and `files` allow-list;
4. the packed artifact contains the portable TCK fixture manifest, all registered
   TCK fixtures required by its public profiles, and the schema assets needed to
   validate the shared envelope;
5. package contents are generated/copied from canonical repository assets without
   introducing a second manually maintained semantic source of truth;
6. `pnpm pack` (or equivalent package-manager pack command) succeeds under frozen
   dependencies;
7. tarball inspection proves no repository-private build/cache/source-conformance
   internals are accidentally shipped.

### M3-A2 P0 — External dummy consumer conformance

Use the packed artifact from M3-A1 in an isolated temporary consumer that is not a
workspace package and has no source-tree import path.

Minimum acceptance evidence:

1. install the produced tarball into the isolated consumer;
2. import only `@dsh-safe/testkit` public exports;
3. discover/load portable fixture assets from the installed package contract;
4. run at least one successful case and negative/mismatch/error behavior through a
   dummy implementation that does not use the Reference Runtime or Adapter
   internals;
5. prove the consumer does not resolve `workspace:*` or repository source paths at
   runtime;
6. run the consumer in normal CI from a clean generated directory.

M3-A1 and M3-A2 may be implemented in one tightly scoped remediation sequence, but
acceptance evidence must remain separately identifiable.

## 8. Quality constraints for remediation

The remediation MUST NOT:

- copy portable semantics into a second handwritten fixture set;
- make generated package assets authoritative over root specs/schemas/fixtures;
- expose Harness concrete types through `@dsh-safe/testkit`;
- require the external dummy consumer to know repository-relative paths;
- turn workspace resolution success into publication proof;
- add broad `any`, type assertions, `ts-ignore`, relaxed compiler settings, schema
  weakening, validator weakening, test skips, or frozen-lockfile exceptions;
- silently omit registered TCK fixtures from the packed artifact;
- claim npm publication occurred merely because `pnpm pack` succeeds.

## 9. Next gate

The only authorized implementation work after this audit is:

```text
M3-A1 P0 — Publishable Shared TCK artifact
then
M3-A2 P0 — External dummy consumer conformance
```

After both are dual-green, refresh this audit with direct pack/consumer evidence.
Only an accepted M3 audit may authorize M4.
