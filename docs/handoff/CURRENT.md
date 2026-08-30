# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK and accepted exact-head evidence
> remain semantic authority.

## Snapshot

- Recorded at: `2026-08-30`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M4 — Capability Broker v0.1`
- Active pull request: `#3 — feat(policy): begin M4 capability broker`
- PR state at acceptance-record preparation: `OPEN / DRAFT`
- Branch: `feat/m4-capability-broker`
- Main: `57430273e065be8d38807d67b175fa154c801d43`
- M4-001 through M4-013: **ACCEPTED / GOVERNANCE CLOSED**
- M4-014 implementation boundary: **ACCEPTED**
- M4-014 governance: **PENDING ACCEPTANCE-RECORD + FINAL-GOVERNANCE EXACT-HEAD DUAL-GREEN**
- M4-020+ PDP, M4-040+ PEP and M6: **NOT AUTHORIZED**

Live GitHub state overrides this file.

## Live ancestry note

The long-running PR retains known ancestry-only drift relative to `main`. The
previously reconciled merge-base `65870612d039ce026a6952c16d5e069b11bd24a7`
and `main@57430273e065be8d38807d67b175fa154c801d43` point to the same source tree
`ed0c142bf6bbd00f607cc169222f0bf67057fca5`.

Do not rebase, force-update or rewrite accepted ancestry merely to change GitHub
compare counters.

## Accepted compatibility baseline

DeepSeek Harness remains Adapter compatibility evidence only:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

Harness runtime behavior MUST NOT define Core protocol semantics, plugin
precedence, PDP/PEP behavior or provider security guarantees.

## M4-013 closure evidence

Final-governance head:

```text
48e8a16ee747e620ffc16e2d57844874fe59ba1e
```

Exact evidence:

- CI #377 / run `33302539105`: PASS;
- Harness rc5 source-conformance #319 / run `33302539079`: PASS.

M4-013 is governance-closed.

## M4-014 protocol-first evidence

Normative profile:

```text
specs/0030-m4-plugin-tool-classifier-api.md
```

Portable corpus:

```text
fixtures/tool-classifier/plugin-classifier-cases.json
```

Portable cases: `27`.

Initial assembled protocol-first head:

```text
f4d41277efd722396c28b8425dbb0765059e183a
```

- CI #380 / run `33303317938`: PASS;
- Harness #322 / run `33303317919`: PASS.

Before production implementation, a wording review clarified that the stricter
non-blank / bounded tool-name rule belongs only to the new M4-014 registry-aware
resolver and does not retroactively change accepted M4-013 behavior. It also
made fixture generation directives explicit test encoding rather than runtime
API values.

Clarified protocol-first head:

```text
979f1a2d60e90254a85a992e38f33bf13689be51
```

- CI #382 / run `33303563719`: PASS;
- Harness #324 / run `33303563713`: PASS.

Production implementation began only after this clarified exact head was
dual-green.

## M4-014 accepted implementation

Accepted implementation head:

```text
4290249c282426e7e95aa0ad133ff17a7ca9a9c0
```

Compared with clarified protocol-first head `979f1a2d...`, the final net delta is
limited to:

- `packages/capability-broker/src/tool-classifier/plugin-classifier-registry.ts`;
- `packages/capability-broker/src/tool-classifier/plugin-classifier-registry.test.ts`;
- `packages/capability-broker/src/index.ts`.

Exact implementation-head evidence:

- CI #388 / run `33303937406`: PASS;
- Harness rc5 source-conformance #330 / run `33303937405`: PASS.

Harness #330 passed exact Harness checkout/build, reproducible install,
workspace projection, projection idempotence, real rc5 typecheck and real rc5
runtime conformance.

One superseded intermediate implementation SHA failed strict TypeScript due to
lost `Array.isArray` narrowing before descriptor inspection. The final
implementation corrected the boundary without weakening TypeScript or any Gate.
That intermediate file does not exist in the accepted net tree.

## M4-014 accepted semantics

The accepted composition is:

```text
validate M4-014 registry-aware toolName
-> accepted filesystem classifier
-> preserve CLASSIFIED / ERROR
-> accepted shell classifier
-> preserve CLASSIFIED / ERROR
-> exact immutable plugin-owner lookup using toolName only
-> invoke at most one exact owner
-> validate + detach existing FILESYSTEM or SHELL_PROCESS evidence
-> no owner => M4-013 STRICT_DENY_V1 terminal block
```

Registry semantics:

- exact finite ownership only;
- built-in names reserved;
- duplicate IDs/names/ownership rejected;
- no first/last wins, priority, regex/glob/fuzzy matcher or MCP-name parsing;
- construction-time immutable snapshot;
- no callback invocation while constructing;
- unrelated callbacks never receive invocation arguments;
- only the selected exact owner receives the original argument value;
- owner rejection, throw, async return or malformed result fails closed and does
  not fall through;
- plugin output cannot invent unsupported capability families;
- successful plugin classifications are detached and recursively frozen;
- registry handle exposes no mutable ownership map.

Portable limits remain:

```text
MAX_PLUGIN_CLASSIFIERS = 128
MAX_PLUGIN_TOOL_NAMES_PER_CLASSIFIER = 128
MAX_PLUGIN_TOOL_CLAIMS = 1024
MAX_CLASSIFIER_ID_CODE_POINTS = 128
MAX_TOOL_NAME_CODE_POINTS = 256
```

M4-014 is an in-process classification extension seam, not a plugin sandbox or
a provider/PDP/PEP enforcement guarantee.

## Acceptance audit

Acceptance audit:

```text
docs/acceptance/m4-014-acceptance-audit.md
```

Audit commit:

```text
ecfa7aa0e079835f57ae5c11dbbf7a46d7ec6ccb
```

The audit records **M4-014 ACCEPTED AT IMPLEMENTATION BOUNDARY** and found no
acceptance-blocking defect in the final net implementation delta.

## Current gate

This acceptance-record candidate is intentionally limited to:

1. transitioning capability-broker `PACKAGE_STAGE` from
   `M4-014-PLUGIN-CLASSIFIER-IMPLEMENTED` to
   `M4-014-PLUGIN-CLASSIFIER-ACCEPTED`;
2. including the M4-014 acceptance audit already created from the verified
   implementation head;
3. refreshing this non-normative handoff with exact protocol-first,
   implementation and audit evidence;
4. making no production classifier behavior, schema, Shared TCK, dependency,
   lockfile, Harness baseline, architecture rule or security-boundary change.

The exact acceptance-record head must itself reach normal CI plus exact pinned
Harness rc5 source-conformance dual-green.

Only after acceptance-record dual-green may final governance append M4-014 to
`docs/handoff/HISTORY.md`, mark only M4-014 accepted in `docs/roadmap.md`, and
identify the next authorized Gate. That final governance head must also be
exact-head dual-green.

Until then:

```text
M4-014 implementation: ACCEPTED
M4-014 acceptance record: PENDING EXACT-HEAD DUAL-GREEN
M4-014 governance: PENDING
M4-020+: NOT AUTHORIZED
M4-040+: NOT AUTHORIZED
M6: NOT AUTHORIZED
```

## Boundaries that remain enforced

- Specs/schemas/TCK remain semantic authority.
- Harness remains Adapter compatibility evidence only.
- Accepted M4-013 resolver behavior remains unchanged.
- Built-in classifier `CLASSIFIED` and `ERROR` cannot be shadowed.
- Unknown unowned tools terminate at strict block.
- No MCP public-name parsing or ToolAnnotations-based authorization.
- No plugin discovery/loading, remote classifier, mutable global registry or hot
  reload in M4-014 v0.1.
- No plugin isolation claim.
- No synthetic/new capability vocabulary through classifier callbacks.
- Subject resolution/full PDP remain M4-020/M4-021.
- Approval remains M4-023.
- Receipt/provenance remains M4-024.
- Guarantee assignment remains M4-025.
- Actual pre-execution PEP remains M4-040+.
- M6 workspace transaction remains unauthorized.
- Never weaken schemas, validators, TCK, strict TypeScript, frozen installs,
  supply-chain policy, architecture boundaries, compatibility evidence or
  fail-closed behavior for CI.

## Resume instruction

1. refresh PR #3 exact head/base/reviews/threads and workflows;
2. require this M4-014 acceptance-record exact head to be dual-green;
3. if green, perform only final governance bookkeeping for M4-014;
4. final governance exact head must itself be dual-green;
5. do not start the next Gate until that final closure is complete.
