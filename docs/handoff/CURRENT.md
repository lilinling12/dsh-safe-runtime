# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK and accepted exact-head evidence
> remain semantic authority.

## Snapshot

- Recorded at: `2026-08-30`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M4 — Capability Broker v0.1`
- Active pull request: `#3 — feat(policy): begin M4 capability broker`
- PR state at final-governance preparation: `OPEN / DRAFT / mergeable`
- Branch: `feat/m4-capability-broker`
- Main: `57430273e065be8d38807d67b175fa154c801d43`
- M4-001 through M4-012: **ACCEPTED / GOVERNANCE CLOSED**
- M4-013 implementation boundary: **ACCEPTED**
- M4-013 accepted implementation head: `bee673cb8463efa04ff314b93d56cfb785dc8b99`
- M4-013 acceptance audit commit: `8dc19ffe482660b3f098653dbff7fe4bd96c1346`
- M4-013 acceptance-record head: `3e5c98813a94ef756135d5f4c3c0bc48c64962f5`
- M4-013 acceptance-record exact-head gates: **DUAL-GREEN**
- M4-013 final governance closure: **PENDING FINAL-GOVERNANCE EXACT-HEAD DUAL-GREEN**
- M4-014+, M4-020+ and M6: **NOT AUTHORIZED until M4-013 final-governance exact-head dual-green**

Live GitHub state overrides this file.

## Live ancestry note

At M4-013 acceptance review, GitHub compare reported the PR head relative to
current `main` as `ahead 150 / behind 2 / diverged`. The compare merge-base
`65870612d039ce026a6952c16d5e069b11bd24a7` and
`main@57430273e065be8d38807d67b175fa154c801d43` both point to tree
`ed0c142bf6bbd00f607cc169222f0bf67057fca5`.

This is therefore ancestry-only drift, not source-tree content drift. Do not
rewrite, rebase or force-update the accepted ancestry merely to make the compare
counter read `behind 0`.

## Accepted compatibility baseline

DeepSeek Harness remains Adapter compatibility evidence only:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
distribution: distribution-blocked
```

Harness APIs/runtime behavior MUST NOT define Core protocol capability semantics,
provider containment, policy/PDP semantics, classifier fallback policy or plugin
classifier precedence.

## M4-013 normative boundary

Normative profile:

```text
specs/0029-m4-unknown-tool-fallback-resolution.md
```

Portable corpus:

```text
fixtures/tool-classifier/unknown-tool-fallback-cases.json
```

Portable cases: `22`.

The only portable fallback profile is:

```text
STRICT_DENY_V1
```

Resolver semantics are fixed to:

```text
validate profile
-> validate toolName
-> classifyBuiltinFilesystemTool
-> if NOT_APPLICABLE classifyBuiltinShellTool
-> if still NOT_APPLICABLE return UNCLASSIFIED / BLOCK
```

Recognized `CLASSIFIED` and `ERROR` results are preserved as-is. Unknown-tool
arguments remain opaque and are not enumerated, cloned, spread, stringified,
recursively traversed or retained.

MCP-looking model-facing names remain opaque. M4-012 ToolAnnotations evidence
remains `ADVISORY_ONLY / UNVERIFIED_SERVER` and cannot turn an unknown tool into
allow/ask or reduce the strict fallback.

M4-013 creates no synthetic capability, CapabilityRequest/Decision, approval,
lease, guarantee, plugin registry or runtime PEP/enforcement claim.

## Protocol-first evidence

Protocol-first head:

```text
7c1f5e650923475045e197e13b8c6d6baab0bc2c
```

Exact evidence:

- CI #371 / run `33213233181`: PASS;
- Harness rc5 source-conformance #313 / run `33213233223`: PASS.

## Accepted implementation evidence

Accepted implementation head:

```text
bee673cb8463efa04ff314b93d56cfb785dc8b99
```

Implementation delta from the protocol-first head is three commits ahead and
zero behind and is limited to:

- `packages/capability-broker/src/tool-classifier/unknown-tool-fallback.ts`;
- `packages/capability-broker/src/tool-classifier/unknown-tool-fallback.test.ts`;
- `packages/capability-broker/src/index.ts`.

Exact implementation-head evidence:

- CI #374 / run `33213727426`: PASS;
- Harness rc5 source-conformance #316 / run `33213727405`: PASS.

The review confirmed all 22 portable fixtures are consumed by production tests
and runtime tests cover invalid-profile/name inspection ordering, untouched
getters/ownKeys, revoked Proxy behavior, owning-classifier error preservation,
frozen M4-013 results and no caller argument retention.

## Acceptance audit

Acceptance audit:

```text
docs/acceptance/m4-013-acceptance-audit.md
```

Audit commit:

```text
8dc19ffe482660b3f098653dbff7fe4bd96c1346
```

The audit records **M4-013 ACCEPTED AT IMPLEMENTATION BOUNDARY** and found no
acceptance-blocking implementation defect.

## Acceptance-record evidence

Acceptance-record head:

```text
3e5c98813a94ef756135d5f4c3c0bc48c64962f5
```

Exact acceptance-record evidence:

- CI #376 / run `33278767205`: PASS;
- Harness rc5 source-conformance #318 / run `33278767065`: PASS.

The acceptance-record exact head is therefore dual-green and the final M4-013
governance transition may proceed.

## Current gate

This final-governance candidate is intentionally limited to:

1. appending M4-013 acceptance evidence to `docs/handoff/HISTORY.md` without
   rewriting prior history;
2. marking only M4-013 accepted in `docs/roadmap.md`, while leaving M4-014
   unchecked;
3. refreshing this non-normative handoff with acceptance-record dual-green facts;
4. making no production classifier, spec, schema, Shared TCK, dependency,
   lockfile, Harness baseline, architecture rule or security-boundary change.

This final-governance exact head must itself reach normal CI plus exact pinned
Harness rc5 source-conformance dual-green.

If it does, M4-013 governance is CLOSED immediately and M4-014 P1
plugin-supplied classifier API becomes the next and only newly authorized Gate.
Do not create a closure-only follow-up commit merely to restate that result; the
exact-head workflow evidence can be recorded with the next material M4-014
change.

Until final-governance exact-head dual-green:

```text
M4-013 implementation: ACCEPTED
M4-013 acceptance record: DUAL-GREEN
M4-013 governance: PENDING FINAL EXACT-HEAD DUAL-GREEN
M4-014+: NOT AUTHORIZED
M4-020+: NOT AUTHORIZED
M6: NOT AUTHORIZED
```

## Boundaries that remain enforced

- Protocol/spec precedes implementation.
- Specs/schemas/TCK remain semantic authority.
- Harness remains Adapter compatibility evidence only.
- Filesystem and shell classifier `ERROR` results must never degrade to unknown fallback.
- Unknown tool arguments remain completely opaque.
- No MCP public-name parsing or metadata-based authorization.
- No synthetic capability vocabulary.
- Generic/plugin classifier API remains M4-014.
- Subject resolution/full PDP remain M4-020/M4-021.
- Approval remains M4-023.
- Receipt/provenance remains M4-024.
- Guarantee assignment remains M4-025.
- Actual pre-execution PEP/enforcement remains M4-040+.
- M6 workspace transaction remains unauthorized.
- Never weaken schemas, validators, TCK, strict TypeScript, frozen installs,
  supply-chain policy, architecture boundaries, compatibility evidence or
  fail-closed behavior for CI.

## Resume instruction

On the next session:

1. refresh PR #3 exact head/base/reviews/threads and exact-head workflows;
2. live GitHub state overrides this snapshot;
3. if the M4-013 final-governance head is not dual-green, inspect only its exact
   failing workflow/job/step before editing;
4. only after final-governance exact-head dual-green may M4-014 begin
   protocol-first;
5. do not create a closure-only follow-up commit after final-governance
   dual-green.
