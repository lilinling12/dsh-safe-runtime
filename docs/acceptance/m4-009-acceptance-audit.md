# M4-009 Acceptance Audit — CapabilityPolicy Hot Reload with Atomic Swap

Status: **ACCEPTED AT IMPLEMENTATION BOUNDARY**

Accepted implementation head:

```text
76dd50e731df617c1fafc1929be306f73458b7d4
```

Normative authority:

- `specs/0025-m4-capability-policy-hot-reload.md`
- `specs/0017-m4-capability-policy-document-loader.md`
- `specs/0018-m4-capability-policy-schema-validation.md`
- `specs/0019-m4-canonical-resource-normalization.md`
- `specs/0020-m4-deterministic-rule-ordering.md`
- `specs/0024-m4-capability-policy-diagnostics.md`
- `schemas/v1alpha1/capability-policy.schema.json`

Portable corpus:

- `fixtures/policy-hot-reload/cases.json` — 16 cases.

## Acceptance result

M4-009 is accepted as a narrow, synchronous, single-JavaScript-isolate policy
activation store. It does not implement a watcher, distributed configuration,
policy evaluation/PDP, tool classification, subject resolution, approval,
leases, receipt/provenance, guarantee assignment, or Adapter enforcement.

The accepted preparation pipeline reuses existing authorities rather than
reimplementing them:

```text
request materialization
  -> M4-001 load with accepted default budgets
  -> M4-002 schema validation
  -> source-order M4-003 selector normalization
  -> M4-004 lexical pattern syntax validation
  -> construct frozen next ACTIVE record + frozen success result
  -> one active-record reference publication
```

M4-008 diagnostics remain non-authoritative. Schema-valid policies with duplicate
rule IDs, redundant priority diagnostics, or an empty rule set are not rejected
merely because diagnostics would report warnings/info.

## Atomicity and last-known-good evidence

The store starts at frozen `EMPTY { status: "EMPTY", epoch: 0 }`. A successful
reload constructs a complete frozen `ACTIVE { status, epoch, policy }` record and
a complete frozen success result before the single publication assignment.
Readers therefore observe a complete old record or complete new record, never a
mixed epoch/policy tuple or temporary empty state during replacement.

Rejected candidates preserve the exact previously published active record
reference and epoch. Green-after-review hardening explicitly proves this for all
portable rejection stages:

- REQUEST;
- LOAD;
- SCHEMA;
- RESOURCE;
- STATE epoch exhaustion.

Older ACTIVE handles remain frozen and stable after later successful swaps.
Identical-content explicit reloads still increment the local epoch; M4-009 does
not invent digest/equality deduplication.

## Runtime hardening

The public reload boundary accepts `unknown` and materializes exactly own data
properties `format` and `source`. It rejects inherited, missing, accessor-backed,
unexpected string, symbol and revoked-proxy request shapes without executing
getters. Green-after-review tests explicitly cover both `format` and `source`
accessors.

The trusted M4-002 validator is compiled once when the store is created. No
caller-supplied validation callback or asynchronous hook participates in the
reload critical section. Candidate source text is never retained as store state
or copied into failure output.

The M4-002 frozen/detached validated policy snapshot is reused directly. Schema
issue arrays remain frozen/detached. Resource preflight reuses the accepted
M4-003 normalizer and package-internal M4-004 compiler seam. Unexpected internal
compiler/configuration states fail closed as `POLICY_RELOAD_INTERNAL_FAILURE`
rather than being exposed as invented portable resource reasons.

The epoch-exhaustion test seam is package-internal and is not exported from the
package root; the portable maximum remains `Number.MAX_SAFE_INTEGER`.

## Review findings resolved before acceptance

The initial Spec 0025 candidate incorrectly narrowed reload `format` to
`"JSON" | "YAML"` while also requiring unsupported formats to preserve the
M4-001 loader reason. Before production implementation, the spec was corrected
to `format: string`, leaving supported-format authority solely with M4-001.
Corrected protocol head `0c150746125d6ad46157ef00e5515128b155bae3`
passed CI #339 and Harness #281.

Implementation CI then exposed two strict TypeScript defects on head
`8c18bda7...`; both were fixed without weakening TypeScript. A later runtime test
on `40538b7e...` found `Array.isArray()` could throw on a revoked proxy before the
fail-closed `try`; the check was moved inside that boundary. The resulting head
`1de040a5...` was already dual-green, but acceptance review added three further
hardening tests before choosing the final accepted implementation head.

## Exact accepted-head evidence

At `76dd50e731df617c1fafc1929be306f73458b7d4`:

- normal CI #346 / run `32822338122`: **PASS**;
- exact Harness rc5 source-conformance #288 / run `32822338113`: **PASS**;
- frozen pnpm install: PASS;
- supply-chain policy: PASS (124 entries);
- architecture boundaries: PASS;
- schema shape: PASS (16 schemas);
- schema compatibility baseline: PASS;
- strict workspace TypeScript: PASS;
- 37 test files / 538 tests: PASS;
- primary M4-009 hot-reload suite: 25 PASS;
- M4-009 green-after-review hardening: 3 PASS;
- M4-008 diagnostics: 33 PASS;
- M4-007 explanation: 33 PASS;
- M4-006 default deny: 35 PASS;
- M4-005 effect resolution: 32 PASS;
- M4-004 rule ordering: 19 PASS;
- M4-003 normalizer regressions: 38 + 2 PASS;
- M4-002 schema validator regressions: 6 PASS;
- M4-001 loader regressions: 18 PASS;
- oxlint: 0 warnings / 0 errors on 117 files;
- packed Shared TCK + external non-workspace consumer: 44 assets PASS;
- Harness source-conformance steps 6–11: all PASS.

No dependency, lockfile, JSON Schema, protocol Decision/Receipt, Adapter, full
PDP, tool-classifier, lease, approval, guarantee, M6 transaction or security
boundary was weakened or pulled forward.

## Governance gate

This audit accepts M4-009 only at its implementation boundary. The acceptance
record/package-stage handoff head must itself reach exact-head normal CI + exact
Harness rc5 source-conformance dual-green. After that, HISTORY/roadmap governance
must be recorded and that final governance head must also be dual-green before
M4-010 or any later M4 gate is authorized.

Until final governance closure:

```text
M4-009 implementation: ACCEPTED
M4-009 governance: PENDING
M4-010+: NOT AUTHORIZED
M4-020+: NOT AUTHORIZED
M6: NOT AUTHORIZED
```
