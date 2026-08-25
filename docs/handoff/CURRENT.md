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
- M2: **ACCEPTED / MERGED** — PR #1 merge commit `52233e19c15504d5c5f77522bb4bf58a2d23c56f`
- M3: **ACCEPTED / MERGED** — PR #2 merge commit `57430273e065be8d38807d67b175fa154c801d43`
- M4-001 through M4-007: **ACCEPTED / GOVERNANCE CLOSED**
- M4-008 implementation boundary: **ACCEPTED**
- M4-008 acceptance record: `docs/acceptance/m4-008-acceptance-audit.md`
- Accepted M4-008 implementation head: `2aa8250f6c98b9853497481c08e584df866863ff`
- M4-008 normal CI: **PASS — CI #335 / run `32798605219`**
- M4-008 Harness rc5 source-conformance: **PASS — #277 / run `32798605222`**
- M4-008 governance closure: **PENDING FINAL GOVERNANCE-HEAD DUAL-GREEN**
- M4-009 implementation: **NOT STARTED**
- M4-009 authorization: **PENDING FINAL M4-008 GOVERNANCE-HEAD DUAL-GREEN**
- M4-020+ and M6: **NOT AUTHORIZED by the current gate**

Live GitHub state overrides this file.

## Accepted compatibility baseline

DeepSeek Harness remains an Adapter compatibility target, never protocol authority:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

M4 policy/diagnostic/evaluation semantics MUST NOT be inferred from Harness APIs
or runtime behavior.

## Repository topology

Accepted M2 and M3 milestone PRs are merged into `main` using merge commits so
accepted exact SHAs remain reachable in main ancestry.

PR #3 is directly based on `main` and remains Draft while M4 is in progress. M4
history has not been rebased, squashed, or force-rewritten during accepted gate
cleanup.

## M4-007 final closure

Accepted implementation head:

```text
1c8bc9ef50a6c680a930814821267e76d79357ac
```

Final governance head:

```text
1f8d5a4a879d1dbc2df2b592896ffdb008c9f177
```

Final governance evidence:

- normal CI #331 / run `32717328232`: PASS;
- exact Harness rc5 source-conformance #273 / run `32717328229`: PASS.

Therefore M4-007 governance is **CLOSED** and M4-008 was formally authorized.

## M4-008 accepted authority

Normative profile:

```text
specs/0024-m4-capability-policy-diagnostics.md
```

Final portable corpus:

```text
fixtures/policy-diagnostics/cases.json
```

The final corpus contains 21 cases and is itself proven to pass the real
M4-001 -> M4-002 boundary before diagnostics are invoked.

Reconciled accepted authority:

```text
specs/0018-m4-capability-policy-schema-validation.md
specs/0019-m4-canonical-resource-normalization.md
specs/0020-m4-deterministic-rule-ordering.md
specs/0021-m4-effect-resolution.md
specs/0022-m4-defensive-default-deny.md
specs/0023-m4-policy-effect-explanation.md
schemas/v1alpha1/capability-policy.schema.json
```

## M4-008 accepted semantic boundary

M4-008 is a deterministic static authoring/preflight diagnostics layer over an
already M4-002-validated policy. It is not another schema validator and never
changes authorization behavior.

Accepted built-in diagnostics are limited to facts already justified by accepted
M4 semantics:

1. M4-003 resource-selector normalization errors;
2. M4-004 resource-pattern syntax errors through the reused internal compiler;
3. exact duplicate rule-ID authoring warning;
4. redundant explicit priority on `deny`;
5. redundant explicit `priority: 0` on `allow`/`ask`;
6. empty rule set informational finding.

M4-008 does not implement early semantics for:

- subject reachability;
- capability overlap/full applicability;
- arbitrary constraint satisfiability;
- lease behavior;
- approval routing;
- full-PDP rule shadowing;
- guarantee assignment;
- provider containment;
- decision receipt/provenance.

Those remain M4-020+ or provider-specific responsibilities.

## M4-008 deterministic output boundary

Portable output contains only stable machine-readable diagnostics:

```text
severity: ERROR | WARNING | INFO
code: stable machine-readable code
instancePath: RFC 6901 JSON Pointer
relatedPaths?: RFC 6901 JSON Pointer list
```

No resource selector, capability, subject, constraint, secret, policy source,
host path, stack trace, or library-specific error object is copied into portable
output.

Diagnostics are emitted in deterministic source traversal order and capped at
256 findings. A 257th proven finding sets `truncated: true`. This order is only
presentation/truncation order and is never authorization precedence.

## Protocol-first and implementation evidence

Initial protocol candidate:

```text
ee8ff0355e330f9805c4250c527101a432384f7b
```

During strict pre-implementation review, the portable corpus was corrected before
production code began:

- added the required control-code locator case;
- corrected fixture lease field `ttlSeconds` to schema-defined `ttlMs`;
- rejected a temporary automation result that caused whole-file formatting churn.

Corrected protocol head:

```text
28dd52c4712f072137226a34abd7d249130938c8
```

Corrected protocol-head evidence:

- CI #333 / run `32797955050`: PASS;
- Harness #275 / run `32797955082`: PASS.

Initial implementation head:

```text
d87ad0bbb2bc5e6baa6daa08a7203976e1e192cf
```

It was already dual-green at CI #334 / Harness #276, but acceptance review did
not stop at the first green head.

Final accepted implementation head:

```text
2aa8250f6c98b9853497481c08e584df866863ff
```

Exact accepted implementation evidence:

- normal CI #335 / run `32798605219`: PASS;
- exact Harness rc5 source-conformance #277 / run `32798605222`: PASS;
- frozen install: PASS;
- supply-chain policy: PASS (124 entries);
- architecture boundaries: PASS;
- schema shape: PASS (16 schemas);
- schema compatibility baseline: PASS;
- strict workspace TypeScript: PASS;
- 35 test files / 510 tests: PASS;
- M4-008 diagnostics suite: 33 PASS;
- M4-007 explanation suite: 33 PASS;
- M4-006 default-deny suite: 35 PASS;
- M4-005 effect-resolution suite: 32 PASS;
- M4-004 rule-ordering suite: 19 PASS;
- M4-004 resource-pattern suite: 24 PASS;
- M4-003 normalizer regressions: 38 + 2 PASS;
- M4-002 validator regressions: 6 PASS;
- M4-001 loader regressions: 18 PASS;
- oxlint: 0 warnings / 0 errors on 113 files;
- Shared TCK packed artifact + external consumer: 44 assets PASS;
- Harness compatibility steps 6–11: all PASS.

## Runtime hardening

The normal input is an M4-002 frozen JSON snapshot, but direct JavaScript callers
can bypass that boundary. The implementation therefore inspects only the narrow
owned data fields required by Spec 0024:

```text
spec
rules
id
effect
resources
priority (optional)
```

The accepted suite proves:

- accessors on inspected fields do not execute;
- accessor-backed array elements fail safely;
- sparse/named/symbol arrays fail safely;
- revoked top-level/rules/resources proxies fail safely;
- inherited required rule fields cannot become input;
- deferred capability/subject/constraint/lease getters are never read;
- caller input is not mutated;
- result, diagnostics, and related paths are frozen/detached;
- >256 diagnostics are capped deterministically.

The M4-004 pattern syntax check is reused through a package-internal compiler
validation seam rather than reimplemented or simulated with a synthetic resource.
The seam is not exported from the package root.

## Current governance gate

`docs/acceptance/m4-008-acceptance-audit.md` records **M4-008 ACCEPTED AT
IMPLEMENTATION BOUNDARY**.

The next operation is governance recording only:

1. append M4-008 acceptance/closure evidence to `docs/handoff/HISTORY.md`;
2. change only roadmap M4-008 from unchecked to accepted;
3. keep M4-009 unchecked;
4. run exact-head normal CI + Harness rc5 source-conformance on that final
   governance head.

Until the final governance head is dual-green:

```text
M4-008 implementation: ACCEPTED
M4-008 governance closure: PENDING
M4-009 implementation: NOT STARTED
M4-009 authorization: PENDING
M4-020+: NOT AUTHORIZED
M6: NOT AUTHORIZED
```

## Boundaries that remain enforced

- Protocol/spec precedes implementation.
- Specs/schemas/TCK remain semantic authority.
- Harness is compatibility evidence only.
- M4-002 remains schema validity authority.
- M4-003 remains resource normalization authority.
- M4-004 remains lexical pattern/structural ordering authority.
- M4-005 remains effect-resolution authority over fully-applicable rules.
- M4-006 remains defensive default-deny authority.
- M4-007 explanation remains separate from full PDP/provenance.
- M4-008 diagnostics remain non-authoritative for authorization.
- M4-009 hot reload is not authorized yet.
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
2. fetch PR #3 live base/head and exact-head workflows;
3. live GitHub state overrides this snapshot;
4. continue only from M4-008 acceptance governance;
5. do not start M4-009 until the final M4-008 governance head is dual-green;
6. inspect exact current-head diagnostics before fixing any failure;
7. do not start M4-020+ or M6 early.
