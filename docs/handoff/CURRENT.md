# Current Engineering Handoff

> Non-normative operational snapshot. Refresh live GitHub state before making
> changes; normative specs/RFCs/schemas/TCK and accepted exact-head evidence
> remain semantic authority.

## Snapshot

- Recorded at: `2026-08-28`
- Repository: `lilinling12/dsh-safe-runtime`
- Phase: `M4 — Capability Broker v0.1`
- Active pull request: `#3 — feat(policy): begin M4 capability broker`
- PR state: `OPEN / DRAFT / mergeable`
- Branch: `feat/m4-capability-broker`
- Base: `main@57430273e065be8d38807d67b175fa154c801d43`
- M2 / M3: **ACCEPTED / MERGED**
- M4-001 through M4-011: **ACCEPTED / GOVERNANCE CLOSED**
- M4-011 final governance head: `f9aebf73e08fdd229d8271e57a73884b810fc4c5`
- M4-011 final governance CI: **PASS — CI #359**
- M4-011 final governance Harness: **PASS — #301**
- M4-012 implementation boundary: **ACCEPTED**
- M4-012 governance: **PENDING ACCEPTANCE-RECORD EXACT-HEAD DUAL-GREEN**
- M4-013+, M4-020+ and M6: **NOT AUTHORIZED until final M4-012 governance dual-green**

Live GitHub state overrides this file.

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

## M4-012 normative boundary

Normative profile:

```text
specs/0028-m4-mcp-tool-metadata-classification.md
```

Portable corpus:

```text
fixtures/tool-classifier/mcp-metadata-cases.json
```

MCP protocol profile:

```text
2025-11-25
```

M4-012 classifies the four standard ToolAnnotations boolean behavior/risk hints
only as immutable advisory evidence. Successful evidence is fixed to:

```text
kind: MCP_TOOL_ANNOTATIONS
profile: MCP_2025_11_25
authority: ADVISORY_ONLY
trust: UNVERIFIED_SERVER
```

It does not map metadata to `StandardCapability`, authorize tool execution,
establish server trust, evaluate policy/PDP, resolve resources, route approval,
allocate leases, assign guarantees, parse MCP public names or invent an Adapter
metadata-retention seam.

`title` and unknown fields are ignored without enumeration or traversal. Unknown
future optional fields gain no authority merely by being tolerated.

## Protocol-first evidence

Protocol-first head:

```text
ca04e4beeb240a88e2dc12cf31e781682eab6795
```

Exact evidence:

- CI #360 / run `33123653051`: PASS;
- Harness rc5 source-conformance #302 / run `33123652932`: PASS.

The pre-implementation review corrected the MCP target to `2025-11-25`, matching
the pinned rc5 MCP v1 SDK compatibility era rather than silently targeting the
newer `2026-07-28` profile.

## Accepted hardened implementation

Accepted hardened implementation head:

```text
debfce009c4d082aed6cd62646943e36242396e1
```

Implementation files are limited to the capability-broker classifier surface:

```text
packages/capability-broker/src/
├── index.ts
└── tool-classifier/
    ├── hostile-input.ts
    ├── mcp-metadata.ts
    └── mcp-metadata.test.ts
```

The classifier:

- accepts only non-null, non-array metadata and annotations records;
- inspects only own data-property descriptors;
- reads known hints in deterministic normative order;
- preserves explicit versus MCP-default provenance;
- records read-only conditional applicability without rewriting values;
- performs no coercion;
- returns stable privacy-preserving error reasons;
- does not retain caller-controlled objects;
- returns recursively frozen successful evidence.

The shared hostile-input primitive converts revoked Proxy record inspection into
explicit `UNREADABLE` rather than allowing host exceptions to escape the
classifier. Existing filesystem and shell classifier public behavior remains
unchanged and green.

## Hostile-runtime acceptance evidence

Runtime tests cover:

- inherited and accessor-backed `annotations`;
- own `annotations: undefined`;
- revoked metadata and annotations Proxies;
- inherited known hints;
- explicit `undefined` and accessors for every known hint;
- unknown outer metadata and `title` getters remaining unread;
- metadata and annotations `ownKeys` traps remaining unused;
- descriptor failure at the carrier and every known-hint inspection position;
- deterministic inspection order and first-failure behavior;
- caller mutation after return;
- recursive output immutability.

Stable public errors remain:

- `MCP_TOOL_METADATA_INVALID`;
- `MCP_TOOL_ANNOTATIONS_INVALID`;
- `MCP_TOOL_READ_ONLY_HINT_INVALID`;
- `MCP_TOOL_DESTRUCTIVE_HINT_INVALID`;
- `MCP_TOOL_IDEMPOTENT_HINT_INVALID`;
- `MCP_TOOL_OPEN_WORLD_HINT_INVALID`;
- `MCP_TOOL_METADATA_UNREADABLE`.

## Exact accepted implementation evidence

At `debfce009c4d082aed6cd62646943e36242396e1`:

- normal CI #366 / run `33136379895`: PASS;
- exact Harness rc5 source-conformance #308 / run `33136379910`: PASS;
- frozen install: PASS;
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

No schema, validator, TCK, dependency, lockfile, Adapter contract or pinned Harness
baseline was changed to obtain green status.

## Acceptance audit

Acceptance audit:

```text
docs/acceptance/m4-012-acceptance-audit.md
```

Audit commit:

```text
10f385990b2c3aff0d3bef902cafe404c47dba61
```

The audit records M4-012 as **ACCEPTED AT IMPLEMENTATION BOUNDARY** only.

## Current gate

This snapshot and the package-stage update form the M4-012 acceptance-record
candidate. The resulting exact head must reach:

1. normal CI PASS;
2. exact pinned Harness rc5 source-conformance PASS.

Only after that dual-green may an independent final governance commit:

1. append the M4-012 acceptance record to `docs/handoff/HISTORY.md`;
2. mark only M4-012 accepted in `docs/roadmap.md`;
3. update this snapshot to record final governance closure and authorize only
   M4-013;
4. make no production-code, schema, TCK, dependency, lockfile or security-boundary
   change.

That final governance head must itself reach exact-head dual-green before M4-013
engineering begins.

Until then:

```text
M4-012 implementation: ACCEPTED
M4-012 acceptance record: PENDING EXACT-HEAD DUAL-GREEN
M4-012 governance: PENDING
M4-013+: NOT AUTHORIZED
M4-020+: NOT AUTHORIZED
M6: NOT AUTHORIZED
```

## Boundaries that remain enforced

- Protocol/spec precedes implementation.
- Specs/schemas/TCK remain semantic authority.
- Harness remains Adapter compatibility evidence only.
- M4-001 through M4-011 remain governance-closed authorities for their concerns.
- M4-012 is advisory MCP ToolAnnotations normalization only.
- Unknown-tool fallback/profile policy remains M4-013.
- Generic/plugin classifier API remains M4-014.
- Subject resolution/full policy evaluation remain M4-020/M4-021.
- Approval remains M4-023.
- Decision receipt/provenance remains M4-024.
- Guarantee assignment remains M4-025.
- Provider-aware containment and execution remain separate enforcement concerns.
- Never weaken schemas, validators, TCK, strict TypeScript, frozen installs,
  supply-chain policy, architecture boundaries, compatibility evidence or
  fail-closed behavior for CI.

## Resume instruction

On the next session:

1. read `docs/handoff/README.md` and this file;
2. fetch PR #3 live head/base, reviews/threads and exact-head workflows;
3. live GitHub state overrides this snapshot;
4. if the M4-012 acceptance-record head is dual-green, prepare only the final
   governance patch for M4-012;
5. otherwise inspect the exact current-head failure before editing;
6. do not start M4-013+, M4-020+ or M6 early.
