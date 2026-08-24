# M3 Acceptance Audit — Shared TCK Foundation

Status: **ACCEPTED**  
Milestone: `M3 — Shared TCK Foundation`  
Audit opened: `2026-08-21`  
Audit closed: `2026-08-21`  
PR: `#2 — feat(testkit): establish M3 shared TCK foundation`  
Accepted M2 base: `6a9c64155ec6c376908e64d70f2b50d5b8de1285`  
Exact Harness compatibility baseline: `0.1.0-rc.5@47f943859bef60e4160492346772ded9b24f765a`

This document is an acceptance record, not a normative specification. Green CI
is necessary but insufficient for milestone acceptance. M3 is accepted because
all numbered gates and all three Definition-of-Done requirements have direct
evidence at their intended boundaries.

## 1. Authority and audit method

The audit reconciles, in descending authority:

1. normative M3 specs and portable fixture semantics;
2. `docs/tck-security-acceptance.md`;
3. exact accepted implementation evidence for M3-001 through M3-017;
4. the independently packed `@dsh-safe/testkit` publication surface;
5. an external non-workspace dummy consumer using only packed public artifacts;
6. `docs/roadmap.md` as planning/tracking state only.

DeepSeek Harness remains Adapter compatibility evidence and never becomes Shared
TCK protocol authority. No Harness behavior is promoted into protocol semantics by
this acceptance.

## 2. Verified numbered-gate baseline

The final numbered Adapter TCK gate, M3-017 replay reconciliation, was accepted on
implementation/manifest head:

```text
2ad59d90962954e200f5aab081c3dc8ce0787571
```

Exact evidence for that boundary:

- normal CI #198 / run `32466962066`: PASS;
- `pnpm install --frozen-lockfile`: PASS;
- `pnpm check:all`: PASS;
- Harness rc5 source-conformance #157 / run `32466962084`: PASS;
- pinned source build/projection/idempotence steps 6–9: PASS;
- exact binding TypeScript step 10: PASS;
- real rc5 runtime conformance step 11: PASS.

The M3-017 manifest registration was independently audited before branch ref
movement. It changed only `fixtures/manifest.json`, as one tail append hunk with
`+48/-0`, registering exactly eight replay fixtures without removing or
reordering existing records.

## 3. Numbered M3 implementation gates

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

There is no M3-018 item in the current roadmap.

## 4. Cross-gate semantic audit

### 4.1 Protocol-first ownership

**PASS.** Shared-TCK behavior was introduced through normative language-independent
specs and portable fixtures before TypeScript runner/Adapter implementation. The
TypeScript package remains a projection rather than protocol authority.

### 4.2 Portable fixture envelope

**PASS.** The shared fixture contract is JSON-based, uses explicit API version,
profile, deterministic seed/logical clock, stimulus and expectation values, and
keeps profile data inside JSON values. The TypeScript projection does not add
class, symbol, function, Date, undefined, or other TypeScript/JavaScript-only
fixture values.

### 4.3 Determinism

**PASS.** M3 fake services and profile runners reject ambient timing/randomness as
semantic authority. Replay reconciliation orders by durable sequence and defined
UTF-8 byte ordering instead of host time.

### 4.4 Runner result integrity

**PASS.** Shared runner status vocabulary preserves `PASS`, `FAIL`, `UNSUPPORTED`,
and `ERROR`. Profile runners distinguish malformed implementation output/throws
from valid semantic mismatch. Expectation data is comparison-only and cannot
manufacture source-side evidence.

### 4.5 Adapter authority consistency

**PASS.** M3-010 through M3-017 remain mutually consistent:

- durable tool request intent does not become final execution outcome;
- M3-013 live final `tools/result` remains authoritative completion evidence;
- denial/cancellation require their accepted policy/result correlations;
- unavailable approval fails closed;
- disposal separates ownership, cutoff, drain and completion;
- replay reconciliation restores durable identity/evidence anchors only and does
  not manufacture lost live-only completion authority;
- crash-repair unknown outcomes remain unknown.

### 4.6 Harness independence

**PASS.** Concrete Harness packages are confined to Adapter and exact
source-conformance evidence. Shared fixture/profile semantics and the external
consumer do not require Harness object instances, private listener collections,
concrete runtime types, Adapter internals, or Reference Runtime internals.

### 4.7 Negative/fail-closed behavior

**PASS.** M3 contains explicit malformed, unsupported, denial, cancellation,
unavailable, disposal-boundary, replay-gap, contradiction, orphan and other
negative cases. Absence of an observed failure is not treated as success.

## 5. M3 Definition-of-Done audit

### DoD-1 — TCK can be published independently

**PASS.** M3-A1 established an independently packable `@dsh-safe/testkit`
artifact rather than merely clearing the old `private` flag.

Direct evidence:

1. `packages/testkit` is intentionally publishable;
2. package-local TypeScript build emits the public API to `dist`;
3. package metadata defines explicit public exports and a `files` allow-list;
4. pack-time preparation copies the canonical root manifest, all registered TCK
   fixture assets, and the shared fixture schema into the package artifact;
5. package assets are generated from canonical repository assets and checked
   byte-for-byte/structurally before external consumption, so they do not become a
   second handwritten semantic authority;
6. protocol and testkit tarballs are produced from the same clean CI run;
7. the actual testkit `.tgz`, not a dry-run prediction, is inspected for required
   public API/assets and for forbidden source, source-conformance, node_modules,
   build-cache, staging and test-source leakage;
8. the package check is part of root `pnpm check:all`, so normal CI cannot be green
   while this publication boundary is broken.

### DoD-2 — A dummy implementation outside the Reference Runtime can run the TCK

**PASS.** M3-A2 now proves the public artifact boundary from a generated consumer
that is physically outside the repository and is not a pnpm workspace package.

The accepted implementation/remediation head is:

```text
e6522a18760268b56b09f9ac5d9c822671c41666
```

Normal CI #218 / run `32482908193` directly proves:

1. the consumer is created under the system temporary directory, outside the
   repository/workspace tree;
2. the same-run `protocol.tgz` and `testkit.tgz` are copied into that directory;
3. npm 10.9.3 installs those local tarballs with `--offline --ignore-scripts` and
   no package lock, so registry availability cannot mask a workspace/source-path
   dependency;
4. exactly the installed `@dsh-safe/testkit` public exports are imported from
   `node_modules`;
5. the installed package manifest contains no `workspace:` dependency specifier;
6. the installed manifest, fixture schema, and all 44 registered fixture assets
   are loadable from the package contract;
7. an external dummy implementation returns the required `PASS` for a valid turn
   lifecycle fixture;
8. a deliberate semantic mismatch returns `FAIL` with
   `ADAPTER_DSH_TURN_LIFECYCLE_EVENTS_MISMATCH`;
9. a thrown implementation returns `ERROR` with
   `ADAPTER_DSH_TURN_LIFECYCLE_IMPLEMENTATION_ERROR`;
10. runtime resolution is asserted to come from installed `node_modules`, not
    repository `packages/testkit/src` or another workspace-only source path;
11. installed package contents are rechecked against the same forbidden internal
    leakage classes used for the tarball boundary.

The CI evidence ends with:

```text
External dummy consumer passed 44 installed TCK asset checks.
Packed @dsh-safe/testkit artifact and external non-workspace dummy consumer: OK
```

This satisfies the literal M3-A2 requirement; no temporary workspace was used to
obtain the final accepted evidence.

### DoD-3 — Fixtures contain no TypeScript-only semantics

**PASS WITH DIRECT CONTRACT EVIDENCE.** Portable fixtures are JSON documents under
`fixtures/tck`; the envelope schema stimulus/expect domain is JSON value only; and
the TypeScript projection follows that domain rather than expanding it. Profile
boundary tests additionally reject non-portable runtime values where direct-call
inputs could otherwise bypass JSON parsing.

## 6. Final exact remediation evidence

Accepted remediation implementation head:

```text
e6522a18760268b56b09f9ac5d9c822671c41666
```

| Gate | State | Evidence |
| --- | --- | --- |
| Normal CI | **PASS** | CI #218 / run `32482908193` |
| Frozen repository install | **PASS** | `pnpm install --frozen-lockfile` |
| Architecture boundaries | **PASS** | `verify-boundaries.mjs` |
| Schema shape | **PASS** | 16 schemas |
| Schema compatibility baseline | **PASS** | unchanged compatibility gate |
| Strict TypeScript typecheck | **PASS** | all checked workspace packages |
| Repository tests | **PASS** | 24 files / 261 tests |
| Lint | **PASS** | 0 warnings / 0 errors |
| Packed artifact inspection | **PASS** | actual protocol/testkit `.tgz` files |
| External non-workspace consumer | **PASS** | offline npm install + public TCK run |
| Exact Harness rc5 source-conformance | **PASS** | Harness #177 / run `32482908210` |
| Exact pinned source build | **PASS** | step 6 |
| Reproducible safe-runtime install | **PASS** | step 7 |
| Exact workspace projection | **PASS** | step 8 |
| Projection idempotence | **PASS** | step 9 |
| Exact pinned binding typecheck | **PASS** | step 10 |
| Real pinned rc5 runtime conformance | **PASS** | step 11 |

No schema, validator, TypeScript strictness, TCK expectation, conformance test,
frozen lockfile, architecture/security gate, compatibility baseline, or security
authority boundary was weakened to obtain acceptance.

## 7. Acceptance verdict

```text
M3 numbered implementation gates: PASS
M3 DoD-1 independent publication: PASS
M3 DoD-2 external non-workspace dummy consumer: PASS
M3 DoD-3 no TypeScript-only fixture semantics: PASS
M3 milestone: ACCEPTED
M4 Capability Broker: AUTHORIZED AS NEXT MILESTONE, SPEC/PROTOCOL-FIRST
M6 Workspace Transaction: NOT AUTHORIZED
```

## 8. Scope unlocked by this acceptance

M3 acceptance authorizes entering the **first M4 Capability Broker v0.1 gate**.
It does not authorize skipping M4 protocol/schema work or implementing later M4
items opportunistically.

The next session must refresh GitHub live state and then start only the first
uncompleted M4 gate from `docs/roadmap.md`, preserving the repository's existing
protocol-first and fail-closed process. At the current roadmap boundary that is:

```text
M4-001 P0 — YAML/JSON loader
```

Before production implementation, establish the M4 normative contract needed by
that gate. Capability Broker semantics must not be inferred from DeepSeek Harness.

M6 Workspace Transaction semantics remain explicitly out of scope until their own
future gate is authorized.
