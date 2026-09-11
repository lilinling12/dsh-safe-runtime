# Spec 0028 — M4-012 MCP Tool Metadata Classification

Status: **M4-012 normative profile**  
Scope: **MCP ToolAnnotations advisory-evidence classification only**  
MCP protocol baseline: `2025-11-25`  
DeepSeek Harness compatibility baseline: `0.1.0-rc.5` at `47f943859bef60e4160492346772ded9b24f765a`

## 1. Purpose

M4-012 defines a deterministic, fail-closed classifier for the standard MCP
`Tool.annotations` risk hints supported by the pinned compatibility era.

The classifier converts known MCP annotation fields into immutable **advisory
evidence**. It does not create a `CapabilityRequest`, emit a
`StandardCapability`, evaluate policy, or authorize execution.

It answers only:

> Which standard MCP ToolAnnotations hints are present, which values come from
> the protocol defaults, and which conditional hints are semantically
> applicable?

It does not answer:

> What authority does the tool actually require, or may the call execute?

This separation is security-critical. The MCP specification says all
ToolAnnotations properties are hints, does not guarantee that they faithfully
describe behavior, and says clients must not make tool-use decisions from
annotations received from untrusted servers.

## 2. Authority and reference hierarchy

High-quality open-source design requires separating normative authority from
compatibility evidence and from engineering inspiration.

### 2.1 Normative MCP authority

M4-012 is version-bound to the official MCP `2025-11-25` specification:

- `https://modelcontextprotocol.io/specification/2025-11-25/server/tools`
- `https://modelcontextprotocol.io/specification/2025-11-25/schema#toolannotations`

The standard ToolAnnotations fields are:

- `title?: string` — presentation metadata;
- `readOnlyHint?: boolean` — default `false`;
- `destructiveHint?: boolean` — default `true`, meaningful only when
  `readOnlyHint == false`;
- `idempotentHint?: boolean` — default `false`, meaningful only when
  `readOnlyHint == false`;
- `openWorldHint?: boolean` — default `true`.

M4-012 classifies only the four boolean behavior/risk hints. `title` is not a
security-classification input and MUST NOT be inspected or retained.

### 2.2 DeepSeek Harness compatibility evidence

DeepSeek Harness remains Adapter compatibility evidence only. Exact pinned
baseline:

```text
version: 0.1.0-rc.5
commit: 47f943859bef60e4160492346772ded9b24f765a
```

Pinned `@deepseek-ai/dsh-mcp-client` depends on the MCP v1 SDK line and discovers
tools through `tools/list`. Its bridge establishes stable identity as
`(serverName, rawName)`, derives a deterministic model-facing public name, and
calls the raw MCP tool name on the wire.

Critically, the pinned bridge projects MCP tools into Harness `ToolDefinition`
without retaining `tool.annotations`, and the pinned `ToolDefinition` public
surface has no generic MCP-annotations field.

Therefore M4-012 MUST NOT:

- pretend rc5 exposes ToolAnnotations at `tools/pre-execute` or call time;
- parse `mcp__<server>__<tool>` public names to reconstruct raw identity or
  metadata;
- fabricate an Adapter metadata store that does not exist in the pinned source;
- let Harness field names redefine MCP or safe-runtime protocol semantics.

M4-012 defines the portable metadata-classification primitive only. A future
Adapter integration may preserve MCP discovery metadata through an explicit,
reviewed seam; that is not invented in this Gate.

### 2.3 Mature open-source engineering references

These sources inform engineering practice but are not protocol authority:

- **Official MCP TypeScript SDK** — public API versioning treats new optional
  fields on existing types as backward-compatible additions. M4-012 therefore
  validates the known standard fields strictly but ignores unknown future
  annotation fields rather than converting compatible protocol evolution into a
  denial-of-service condition.
  Reference: `https://github.com/modelcontextprotocol/typescript-sdk/blob/main/VERSIONING.md`.
- **Official MCP servers** — ToolAnnotations are used to communicate behavior and
  risk to clients, not to establish resource identity or authorization.
  Reference: `https://github.com/modelcontextprotocol/servers`.
- **Open Policy Agent (OPA)** — policy decision-making is deliberately separated
  from structured input and enforcement. M4-012 follows the same architectural
  principle: metadata is evidence input, not embedded policy.
  Reference: `https://www.openpolicyagent.org/docs/philosophy`.
- **Kubernetes API machinery** — known fields receive explicit typed validation
  and deterministic diagnostics. M4-012 adopts that discipline for known MCP
  fields, while it intentionally does not copy strict-unknown-field rejection
  because MCP's own compatibility contract permits future optional fields.

If any engineering reference conflicts with the MCP specification or
safe-runtime normative protocol, the normative source wins.

## 3. Scope and non-goals

The conceptual operation is:

```text
classifyMcpToolMetadata(metadata: unknown)
  -> McpToolMetadataClassification
```

The caller invokes this operation only after the surrounding integration has
identified the value as an MCP tool metadata carrier for this profile. M4-012
does not establish server authenticity or provenance.

M4-012 does not inspect or classify:

- tool name or description;
- icons;
- input/output schemas;
- `_meta`;
- `execution.taskSupport`;
- tool arguments or results;
- transport/authentication headers;
- arbitrary server extensions.

M4-012 does not implement:

- allow / deny / ask;
- capability inference or `StandardCapability` mapping;
- policy/PDP evaluation;
- approval routing;
- lease lookup or consumption;
- decision receipts or guarantee assignment;
- server authentication or trust establishment;
- unknown-tool fallback/profile policy (M4-013);
- generic/plugin classifier API (M4-014);
- Adapter runtime preservation of annotations;
- M4-020+ or M6 behavior.

## 4. Input contract

### 4.1 Metadata carrier

`metadata` MUST be a non-null, non-array object.

Only the own data property `annotations` is relevant:

- inherited `annotations` is treated as absent;
- absent `annotations` means all four boolean hints use their official MCP
  defaults;
- an own accessor MUST NOT be executed;
- descriptor/proxy inspection failure is unreadable input;
- an explicit value MUST be a non-null, non-array object;
- an own `annotations: undefined` is present-but-invalid, not omission.

The last rule preserves the difference between absent portable JSON and an
invalid JavaScript value supplied through the direct API.

### 4.2 Known standard fields

Within `annotations`, inspect exactly these own data properties in this
normative order:

1. `readOnlyHint`;
2. `destructiveHint`;
3. `idempotentHint`;
4. `openWorldHint`.

For each known field:

- missing or inherited -> use the MCP default and record `source: MCP_DEFAULT`;
- own boolean data property -> preserve it and record `source: EXPLICIT`;
- own non-boolean value, including `undefined` -> field-specific invalid error;
- own accessor or descriptor/proxy failure -> `MCP_TOOL_METADATA_UNREADABLE`.

No type coercion is allowed. For example, `"false"`, `0`, and `1` are invalid.

### 4.3 Unknown and presentation fields

`title` and unknown annotation fields MUST NOT be enumerated, inspected,
retained, spread, stringified, or recursively traversed.

Unknown fields are ignored rather than rejected. This is deliberate forward
compatibility, not permissive authorization. A future optional field has no
security meaning until a later normative profile explicitly defines one.

Case variants and misspellings such as `ReadOnlyHint` are unknown fields; they
MUST NOT override the default for `readOnlyHint`.

## 5. Output contract

A result is exactly one of:

```text
CLASSIFIED
ERROR
```

There is no `NOT_APPLICABLE` in this primitive because source/profile selection
is the caller's responsibility. M4-013 remains the owner of unknown-tool and
profile fallback decisions.

### 5.1 `CLASSIFIED`

A successful result has this shape:

```text
status: CLASSIFIED
evidence:
  kind: MCP_TOOL_ANNOTATIONS
  profile: MCP_2025_11_25
  authority: ADVISORY_ONLY
  trust: UNVERIFIED_SERVER
  hints:
    readOnlyHint:
      value: boolean
      source: EXPLICIT | MCP_DEFAULT
    destructiveHint:
      value: boolean
      source: EXPLICIT | MCP_DEFAULT
      applicability: APPLICABLE | NOT_APPLICABLE_READ_ONLY
    idempotentHint:
      value: boolean
      source: EXPLICIT | MCP_DEFAULT
      applicability: APPLICABLE | NOT_APPLICABLE_READ_ONLY
    openWorldHint:
      value: boolean
      source: EXPLICIT | MCP_DEFAULT
```

`CLASSIFIED` means only that the known metadata profile was normalized. It MUST
NOT be interpreted as a capability classification or authorization result.

Fixed evidence fields mean:

- `kind = MCP_TOOL_ANNOTATIONS`: this evidence uses the standard ToolAnnotations
  profile;
- `profile = MCP_2025_11_25`: defaults/applicability are bound to the reviewed
  protocol revision;
- `authority = ADVISORY_ONLY`: evidence alone cannot authorize or reduce
  enforcement;
- `trust = UNVERIFIED_SERVER`: this classifier has no independent server-trust
  proof.

`UNVERIFIED_SERVER` does not claim the server is malicious. It records the
absence of trust proof at this classification boundary.

### 5.2 Provenance

Every hint records whether its value was explicitly supplied or came from the
standard default. An MCP default MUST NOT be rewritten as though the server
explicitly attested it.

This distinction is required for auditability and later conservative policy
logic.

### 5.3 Conditional applicability

For `destructiveHint` and `idempotentHint`:

- `readOnlyHint == false` -> `APPLICABLE`;
- `readOnlyHint == true` -> `NOT_APPLICABLE_READ_ONLY`.

The normalized value and provenance remain present when the hint is not
applicable. M4-012 never silently changes a server-supplied value; it records the
spec-defined applicability separately.

## 6. Security monotonicity

M4-012 evidence alone MUST NEVER reduce required authority or protection.

Without independently established trust, downstream code MUST NOT use these
hints to:

- auto-allow or auto-approve a tool call;
- remove a required capability;
- downgrade a guarantee requirement;
- skip provider/resource resolution;
- skip policy, approval, or lease checks;
- conclude that a tool cannot mutate because `readOnlyHint == true`;
- conclude that a tool is harmless because `destructiveHint == false`;
- conclude that retries are safe because `idempotentHint == true`;
- conclude that no external interaction is possible because
  `openWorldHint == false`.

A later fallback/profile policy may consume unverified hints only
conservatively/monotonically—for example, a risk-increasing explicit hint may
justify stricter treatment—but a hint cannot prove safety.

M4-013 owns that policy. M4-012 only preserves evidence.

## 7. Hostile runtime boundary

Although MCP wire values are JSON, the TypeScript API consumes `unknown` so a
caller cannot bypass the trust boundary with exotic JavaScript objects.

The implementation MUST:

- reject null and arrays for the carrier and explicit annotations object;
- read only own data-property descriptors for known fields;
- never execute getters;
- never consume inherited known fields;
- never enumerate keys (`Object.keys`, `for...in`, spread, `Reflect.ownKeys`);
- never stringify or recursively traverse attacker-controlled metadata;
- fail closed when a proxy prevents descriptor inspection;
- inspect known fields only in the deterministic order from §4.2;
- never touch unknown-field getters or `ownKeys` traps;
- avoid retaining input objects or unknown nested values;
- return detached, recursively frozen successful results.

The deterministic inspection order is normative so multiple hostile fields
produce stable diagnostics across implementations.

## 8. Stable errors

Errors are privacy-preserving and do not echo raw server metadata.

Stable reasons are:

- `MCP_TOOL_METADATA_INVALID`
- `MCP_TOOL_ANNOTATIONS_INVALID`
- `MCP_TOOL_READ_ONLY_HINT_INVALID`
- `MCP_TOOL_DESTRUCTIVE_HINT_INVALID`
- `MCP_TOOL_IDEMPOTENT_HINT_INVALID`
- `MCP_TOOL_OPEN_WORLD_HINT_INVALID`
- `MCP_TOOL_METADATA_UNREADABLE`

After the carrier/profile is selected, malformed known metadata MUST return
`ERROR`; it must not be converted into safe/default evidence except for genuinely
absent fields where the MCP standard defines a default.

## 9. Portable conformance corpus

`fixtures/tool-classifier/mcp-metadata-cases.json` is the portable M4-012 corpus.

It MUST cover:

- absent and empty annotations;
- all official defaults;
- explicit values including values equal to defaults;
- explicit/default provenance;
- read-only applicability for destructive/idempotent hints;
- presentation title ignored;
- unknown future fields ignored;
- case-variant/misspelled fields ignored;
- unrelated outer metadata ignored;
- invalid carrier and annotations shapes;
- non-boolean failures for every known risk hint.

Production runtime tests MUST additionally cover cases JSON cannot express:

- inherited `annotations` and inherited known fields;
- accessor-backed `annotations` and known fields without getter execution;
- unknown-field getters never executed;
- descriptor proxy failures at every inspected step;
- `ownKeys` traps never invoked;
- deterministic property-inspection order;
- caller mutation after return;
- recursive output immutability.

## 10. Compatibility evolution

M4-012 is deliberately versioned by MCP protocol revision rather than by a
floating SDK version.

The current official MCP TypeScript SDK distinguishes the legacy protocol era
through `2025-11-25` from the modern `2026-07-28` era. The pinned Harness rc5 is
on the v1 SDK compatibility line, so this Gate uses `2025-11-25` even though a
newer MCP revision exists.

A future migration to `2026-07-28` MUST be a reviewed compatibility change. It
must compare ToolAnnotations semantics and the Adapter discovery seam rather than
silently changing defaults or profile identity in place.

## 11. Acceptance conditions

M4-012 implementation is authorized only after this spec and its portable corpus
reach exact-head normal CI plus exact pinned Harness source-conformance
dual-green.

Implementation acceptance additionally requires:

- no mapping from annotations directly to `StandardCapability`;
- no authorization/PDP behavior;
- no new concrete Harness dependency in protocol/core;
- no parsing of MCP model-facing public names;
- no invented rc5 metadata-retention seam;
- hostile-runtime tests from §9;
- strict TypeScript and zero-warning lint;
- no weakened schema, validator, TCK, frozen-lockfile, supply-chain,
  architecture, compatibility, or fail-closed requirement;
- exact-head CI and pinned Harness source-conformance on implementation and final
  governance heads.

M4-013+, M4-020+, and M6 remain unauthorized by this Gate.
