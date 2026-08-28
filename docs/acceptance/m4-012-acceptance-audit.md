# M4-012 Acceptance Audit — MCP Tool Metadata Classifier

Status: **ACCEPTED AT IMPLEMENTATION BOUNDARY**

Accepted hardened implementation head:

```text
debfce009c4d082aed6cd62646943e36242396e1
```

Normative authority:

- `specs/0028-m4-mcp-tool-metadata-classification.md`
- MCP specification `2025-11-25` ToolAnnotations semantics
- safe-runtime protocol/security boundaries already established by the repository

Portable corpus:

- `fixtures/tool-classifier/mcp-metadata-cases.json` — 19 cases.

Compatibility evidence only:

```text
DeepSeek Harness 0.1.0-rc.5
commit 47f943859bef60e4160492346772ded9b24f765a
```

## Acceptance result

M4-012 is accepted at the implementation boundary as a deterministic, IO-free
normalizer for the standard MCP `2025-11-25` ToolAnnotations boolean behavior
hints.

The classifier produces immutable advisory evidence only. It does not create a
`CapabilityRequest`, emit or infer a `StandardCapability`, authorize execution,
evaluate policy, establish server trust, resolve resources, route approval,
allocate or consume leases, assign guarantees, execute a provider, or implement
unknown-tool fallback.

Successful evidence is intentionally fixed to:

```text
kind: MCP_TOOL_ANNOTATIONS
profile: MCP_2025_11_25
authority: ADVISORY_ONLY
trust: UNVERIFIED_SERVER
```

This is a negative authority boundary: successful metadata normalization cannot
be interpreted as evidence that a tool is safe or authorized.

## Version and compatibility boundary

M4-012 is deliberately bound to MCP protocol revision `2025-11-25`, not to the
latest floating MCP specification.

The pinned DeepSeek Harness rc5 compatibility baseline uses the MCP v1 SDK era.
Its MCP bridge does not retain `tool.annotations` in the projected Harness
`ToolDefinition` surface. Therefore the implementation does not pretend that
annotations are available at rc5 call time, does not parse model-facing
`mcp__<server>__<tool>` names to recover metadata or raw identity, and does not
invent an Adapter metadata-retention sidecar or runtime seam.

A future MCP protocol-profile migration or Adapter metadata-preservation seam
must be an explicit reviewed change rather than an in-place reinterpretation of
this classifier.

## Accepted normalization semantics

The classifier inspects only an own data property named `annotations` on a
non-null, non-array metadata object.

Absent `annotations` applies the official MCP defaults while preserving default
provenance:

- `readOnlyHint = false`;
- `destructiveHint = true`;
- `idempotentHint = false`;
- `openWorldHint = true`.

Known fields are inspected in the normative order:

1. `readOnlyHint`;
2. `destructiveHint`;
3. `idempotentHint`;
4. `openWorldHint`.

Each known field accepts only an own boolean data property. Missing or inherited
fields use the MCP default with `source: MCP_DEFAULT`; explicit booleans retain
`source: EXPLICIT`. No coercion is performed.

For `destructiveHint` and `idempotentHint`, applicability is recorded separately
from value/provenance:

- read-only false -> `APPLICABLE`;
- read-only true -> `NOT_APPLICABLE_READ_ONLY`.

The raw normalized boolean and provenance remain present even when the hint is
not applicable.

## Security monotonicity audit

The accepted implementation contains no import or mapping to protocol capability
vocabulary and no allow/deny/ask behavior. It cannot use MCP hints to reduce
required authority or protection.

In particular, M4-012 does not treat any of the following as proof of safety:

- `readOnlyHint == true`;
- `destructiveHint == false`;
- `idempotentHint == true`;
- `openWorldHint == false`.

It also does not skip provider/resource resolution, PDP evaluation, approval,
lease checks, guarantees, containment, or future fallback policy based on those
values.

Risk/fallback interpretation remains a later gate. M4-012 only preserves
versioned, unverified advisory evidence.

## Presentation and forward-compatibility boundary

`title` and unknown annotation fields are not security-classification inputs.
They are not enumerated, inspected, retained, spread, stringified or recursively
traversed.

Unknown future optional fields are ignored rather than rejected. This preserves
MCP forward compatibility without giving unknown metadata authority.

Case variants such as `ReadOnlyHint` remain unknown and cannot override the
standard `readOnlyHint` default.

The classifier likewise ignores unrelated outer MCP metadata such as tool name,
description, `_meta`, schemas and execution/task-support metadata.

## Fail-closed hostile-runtime boundary

The TypeScript API accepts `unknown`, so the implementation treats direct runtime
objects as hostile even though ordinary MCP wire metadata is JSON.

The shared package-internal hostile-input primitive performs bounded record and
own-data-property inspection. Revoked Proxies are converted to explicit
`UNREADABLE` outcomes rather than allowing host exceptions from
`Array.isArray()` or property-descriptor inspection to escape the classifier.

Stable public errors are:

- `MCP_TOOL_METADATA_INVALID`;
- `MCP_TOOL_ANNOTATIONS_INVALID`;
- `MCP_TOOL_READ_ONLY_HINT_INVALID`;
- `MCP_TOOL_DESTRUCTIVE_HINT_INVALID`;
- `MCP_TOOL_IDEMPOTENT_HINT_INVALID`;
- `MCP_TOOL_OPEN_WORLD_HINT_INVALID`;
- `MCP_TOOL_METADATA_UNREADABLE`.

Runtime hardening tests prove:

- inherited `annotations` are absent rather than authority-bearing;
- an own `annotations: undefined` is invalid, not omission;
- annotations accessors are rejected without getter execution;
- revoked metadata and annotations Proxies fail closed without host-exception
  escape;
- inherited known hints cannot override MCP defaults;
- explicit `undefined` for every known hint receives the field-specific invalid
  diagnostic;
- accessors for every known hint are rejected without execution;
- unknown outer metadata getters and standard `title` getters remain untouched;
- carrier and annotations `ownKeys` traps are not required;
- unknown annotation getters remain untouched;
- descriptor failures fail closed at the carrier and at every known-hint
  inspection position;
- descriptor inspection follows the normative order and stops deterministically
  at the first failure;
- successful evidence is detached from later caller mutation;
- successful evidence is recursively frozen.

No attacker-controlled object, unknown nested value, accessor result or source
metadata object is retained in successful evidence.

## Maintainability and package boundary

The accepted production surface remains deliberately small:

```text
packages/capability-broker/src/
  index.ts
  tool-classifier/
    hostile-input.ts
    mcp-metadata.ts
    mcp-metadata.test.ts
```

M4-012 extends the existing package-internal hostile-input primitives rather than
creating a second unsafe object-inspection path. Existing filesystem and shell
classifiers retain their public surfaces and remain green.

The package index exports the portable MCP metadata classifier only. It does not
introduce a generic classifier registry, plugin precedence API, Adapter metadata
store, MCP SDK dependency, or DeepSeek Harness runtime dependency.

Generic/plugin classifier registration remains M4-014. Unknown-tool fallback and
profile policy remain M4-013.

## Protocol-first evidence

The M4-012 protocol-first head is:

```text
ca04e4beeb240a88e2dc12cf31e781682eab6795
```

It introduced Spec 0028 and the reviewed 19-case portable corpus before
production implementation and passed:

- CI #360 / run `33123653051`: **PASS**;
- Harness rc5 source-conformance #302 / run `33123652932`: **PASS**.

The protocol review corrected the compatibility target from the newer MCP
`2026-07-28` era to the exact `2025-11-25` profile appropriate to the pinned rc5
MCP v1 SDK compatibility line before production implementation was accepted.

## Implementation delta audit

Compared with protocol-first head
`ca04e4beeb240a88e2dc12cf31e781682eab6795`, the accepted hardened head
`debfce009c4d082aed6cd62646943e36242396e1` is six commits ahead and zero behind.
The implementation delta is limited to four capability-broker files:

- `packages/capability-broker/src/index.ts`;
- `packages/capability-broker/src/tool-classifier/hostile-input.ts`;
- `packages/capability-broker/src/tool-classifier/mcp-metadata.ts`;
- `packages/capability-broker/src/tool-classifier/mcp-metadata.test.ts`.

No dependency manifest, lockfile, schema, TCK corpus, Adapter contract or Harness
source baseline was changed to obtain green status.

The post-implementation review hardened revoked-Proxy handling and expanded
hostile-runtime coverage before acceptance rather than accepting the first green
implementation head unchanged.

## Exact accepted-head evidence

At `debfce009c4d082aed6cd62646943e36242396e1`:

- normal CI #366 / run `33136379895`: **PASS**;
- exact Harness rc5 source-conformance #308 / run `33136379910`: **PASS**;
- frozen pnpm install: PASS;
- supply-chain policy: PASS (124 entries);
- architecture boundaries: PASS;
- schema shape: PASS (16 schemas);
- schema compatibility baseline: PASS;
- strict workspace TypeScript: PASS;
- 40 test files / 654 tests: PASS;
- M4-012 MCP metadata classifier suite: 44 PASS;
- M4-011 shell classifier suite: 38 PASS;
- M4-010 filesystem classifier suite: 34 PASS;
- oxlint: 0 warnings / 0 errors on 125 files;
- packed Shared TCK + external non-workspace consumer: 44 assets PASS;
- Harness source-conformance steps 6–11: PASS.

No schema, validator, TCK, TypeScript strictness, frozen lockfile, supply-chain
policy, architecture boundary, compatibility baseline, protocol capability
vocabulary, Adapter/provider containment boundary, fail-closed invariant,
unknown-tool fallback, generic plugin classifier API, PDP, subject resolution,
lease, approval, receipt/provenance, guarantee or M6 boundary was weakened or
pulled forward.

The GitHub Actions runner emitted a platform deprecation warning concerning
Node.js 20-based action internals being forced onto Node.js 24. This did not
change the configured project Node.js `22.19.0`, did not fail a Gate, and is not
used as acceptance evidence.

## Governance gate

This audit accepts M4-012 only at its implementation boundary.

The next meaningful state change must create the M4-012 acceptance-record head,
including the operational handoff snapshot and package-stage transition. That
new exact head must itself reach normal CI plus exact pinned Harness rc5
source-conformance dual-green.

Only after the acceptance-record head is dual-green may an independent final
governance commit append HISTORY, mark only M4-012 accepted in the roadmap, and
record the next authorized gate. The final governance head must also reach
exact-head dual-green before M4-013 is authorized.

Until final governance closure:

```text
M4-012 implementation: ACCEPTED
M4-012 governance: PENDING
M4-013+: NOT AUTHORIZED
M4-020+: NOT AUTHORIZED
M6: NOT AUTHORIZED
```
