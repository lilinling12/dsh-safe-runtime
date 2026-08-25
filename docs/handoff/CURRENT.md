# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK and accepted exact-head evidence
> remain semantic authority.

## Snapshot

- Recorded at: `2026-08-25`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M4 — Capability Broker v0.1`
- Active pull request: `#3 — feat(policy): begin M4 capability broker`
- PR state: `OPEN / DRAFT`
- Branch: `feat/m4-capability-broker`
- Base: `main@57430273e065be8d38807d67b175fa154c801d43`
- M2 / M3: **ACCEPTED / MERGED**
- M4-001 through M4-008: **ACCEPTED / GOVERNANCE CLOSED**
- M4-009 implementation boundary: **ACCEPTED**
- Accepted M4-009 implementation head: `76dd50e731df617c1fafc1929be306f73458b7d4`
- M4-009 acceptance audit: `docs/acceptance/m4-009-acceptance-audit.md`
- M4-009 accepted-head CI: **PASS — CI #346 / run `32822338122`**
- M4-009 accepted-head Harness: **PASS — #288 / run `32822338113`**
- M4-009 governance closure: **PENDING ACCEPTANCE/GOVERNANCE-HEAD DUAL-GREEN**
- M4-010+, M4-020+ and M6: **NOT AUTHORIZED by the current gate**

Live GitHub state overrides this file.

## Accepted compatibility baseline

DeepSeek Harness remains Adapter compatibility evidence only:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

Harness APIs/runtime behavior MUST NOT define M4 policy, reload or future PDP semantics.

## M4-008 final closure

Final governance head:

```text
71046abef4568668ba9e3448b496430b5c48ebb7
```

- CI #337 / run `32814874559`: PASS;
- Harness #279 / run `32814874566`: PASS.

This formally authorized M4-009.

## M4-009 accepted normative boundary

Normative profile:

```text
specs/0025-m4-capability-policy-hot-reload.md
```

Portable corpus:

```text
fixtures/policy-hot-reload/cases.json
```

The corrected protocol-first head is:

```text
0c150746125d6ad46157ef00e5515128b155bae3
```

It passed:

- CI #339;
- Harness #281.

The correction preserved M4-001 as the sole supported-format authority by keeping
reload `format` as a string rather than narrowing it to JSON/YAML before loader
invocation.

## M4-009 accepted implementation

M4-009 is a synchronous in-memory activation store, not a watcher, distributed
config system, classifier, PDP, approval/lease engine, receipt/provenance layer,
or Adapter enforcement mechanism.

Candidate preparation is exactly:

```text
reload request materialization
  -> M4-001 loader using accepted default budgets
  -> M4-002 trusted schema validator compiled once at store creation
  -> source-order resources
       -> M4-003 normalizePolicyResourceSelector()
       -> M4-004 package-internal lexical pattern validation
  -> construct complete frozen next ACTIVE record and success result
  -> one active-record reference publication
```

M4-008 diagnostics remain operator feedback and are not activation authority.
Duplicate-rule-ID/redundant-priority/empty-rules diagnostics therefore do not
silently become reload blockers.

## Atomicity / last-known-good boundary

State is one immutable record reference:

```text
EMPTY  { status: "EMPTY", epoch: 0 }
ACTIVE { status: "ACTIVE", epoch, policy }
```

The publication assignment is the single-isolate linearization point. A reader
can observe only the complete old or complete new record. Failed reloads do not
clear or partially replace active state.

The accepted tests prove exact old-record reference preservation for:

- REQUEST rejection;
- LOAD rejection;
- SCHEMA rejection;
- RESOURCE rejection;
- STATE epoch exhaustion.

Old ACTIVE handles remain immutable and valid after later swaps. Successful
explicit identical-content reloads increment epoch; there is no implicit policy
content deduplication.

## Runtime hardening

The reload API accepts `unknown` and reads exactly own data properties `format`
and `source`. Accessor-backed, inherited, missing, extra, symbol and revoked-proxy
requests fail closed. Both `format` and `source` getters are proven not to execute.

The accepted M4-002 frozen policy snapshot is stored directly. Source text is not
stored as state or disclosed in failure output. Schema issue arrays remain frozen
and detached. The epoch-exhaustion seam is package-internal and not exported from
`index.ts`.

## Accepted implementation evidence

Final accepted implementation head:

```text
76dd50e731df617c1fafc1929be306f73458b7d4
```

Exact-head evidence:

- normal CI #346 / run `32822338122`: PASS;
- exact Harness rc5 source-conformance #288 / run `32822338113`: PASS;
- frozen install: PASS;
- supply-chain policy: PASS (124 entries);
- architecture boundaries: PASS;
- schema shape: PASS (16 schemas);
- schema compatibility baseline: PASS;
- strict workspace TypeScript: PASS;
- 37 test files / 538 tests: PASS;
- M4-009 primary suite: 25 PASS;
- M4-009 green-after-review hardening: 3 PASS;
- M4-008 diagnostics: 33 PASS;
- M4-007 explanation: 33 PASS;
- M4-006 default deny: 35 PASS;
- M4-005 effect resolution: 32 PASS;
- M4-004 rule ordering: 19 PASS;
- M4-003 normalization regressions: 38 + 2 PASS;
- M4-002 validator regressions: 6 PASS;
- M4-001 loader regressions: 18 PASS;
- oxlint: 0 warnings / 0 errors on 117 files;
- Shared TCK packed artifact + external consumer: 44 assets PASS;
- Harness steps 6–11: all PASS.

Intermediate failures were resolved from current-head evidence without weakening
any Gate: strict TS exposed a broad internal M4-004 failure union and readonly
record narrowing issue; runtime tests then exposed revoked-proxy `Array.isArray`
throwing outside the fail-closed boundary. Both were corrected narrowly.

## Current gate

`docs/acceptance/m4-009-acceptance-audit.md` records **M4-009 ACCEPTED AT
IMPLEMENTATION BOUNDARY**.

Next actions are governance only:

1. verify the acceptance-record/PACKAGE_STAGE/CURRENT head with exact normal CI +
   Harness rc5 source-conformance;
2. after dual-green, append M4-009 acceptance/closure to `HISTORY.md` and mark only
   M4-009 accepted in `docs/roadmap.md`;
3. verify that final governance head with exact normal CI + Harness;
4. only then determine the next authorized M4 gate from roadmap/live state.

Until final M4-009 governance dual-green:

```text
M4-009 implementation: ACCEPTED
M4-009 governance: PENDING
M4-010+: NOT AUTHORIZED
M4-020+: NOT AUTHORIZED
M6: NOT AUTHORIZED
```

## Boundaries that remain enforced

- Protocol/spec precedes implementation.
- Specs/schemas/TCK remain semantic authority.
- Harness is compatibility evidence only.
- M4-001 remains document-loading/format authority.
- M4-002 remains schema-validity authority.
- M4-003 remains resource-normalization authority.
- M4-004 remains lexical pattern/ordering authority.
- M4-005/006/007 remain downstream effect/default/explanation authorities.
- M4-008 diagnostics remain non-authoritative for activation.
- M4-009 is activation/state management only.
- Tool classification remains M4-010+.
- Subject resolution/full policy evaluation remain M4-020/M4-021.
- Approval remains M4-023.
- Decision receipt/provenance remains M4-024.
- Guarantee assignment remains M4-025.
- Never weaken schemas, validators, TCK, strict TypeScript, frozen installs,
  supply-chain policy, architecture boundaries, compatibility evidence, or
  fail-closed behavior for CI.

## Resume instruction

On the next session:

1. read `docs/handoff/README.md` and this file;
2. fetch PR #3 live head/base and exact-head workflows;
3. live GitHub state overrides this snapshot;
4. continue only from M4-009 acceptance/governance;
5. do not start M4-010+ until final M4-009 governance head is dual-green;
6. inspect exact current-head failures before editing;
7. do not start M4-020+ or M6 early.
