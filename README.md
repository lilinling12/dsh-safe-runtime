# DSH Safe Runtime

Production-oriented safe execution infrastructure for agent harnesses.
DeepSeek Harness is the first adapter, not the protocol domain model.

## Architecture

```text
Agent / Subagent
      |
      v
Capability Broker       -- who may act?
      |
      v
Transactional Runtime   -- where do effects happen?
      |
      v
Acceptance Engine       -- did required checks pass?
      |
      v
Evidence / AVP Bridge   -- can the result be proved?
      |
   COMMIT / ROLLBACK
```

## Non-negotiable boundaries

1. `packages/protocol` MUST NOT depend on `@deepseek-ai/*`.
2. Core semantics MUST NOT be inferred from the DeepSeek Harness adapter.
3. Harness-specific event payloads MUST remain inside `packages/adapter-dsh`.
4. v1 workspace transactions cover workspace filesystem effects only.
5. Tool-level policy MUST NOT be described as isolation of arbitrary in-process plugins.
6. Unknown or unsupported guarantees fail closed; they never silently degrade to PASS.

## v0.1 plugin security boundary

**DSH Safe Runtime v0.1 is not a sandbox for arbitrary in-process plugins.**

The Capability Broker can enforce actions that reach the supported ToolRuntime /
provider enforcement seams. Code running in the same host process can still use
host APIs outside those seams when ordinary OS permissions allow it; the accepted
M4-050 direct-host filesystem witness documents one such boundary. Therefore
`tool-enforced` MUST NOT be presented as `process-isolated`.

M4-051 separately shows that shell command text is not a complete authority for
nested effects; recognized shell calls still remain `process.exec`. A future
process-isolated Plugin Host is tracked as M14 and is not part of v0.1.

## Maturity pipeline

```text
DRAFT -> SPECIFIED -> SCHEMA_COMPLETE -> TCK_COMPLETE ->
REFERENCE_IMPLEMENTED -> ACCEPTANCE_AUDITED -> READY
```

## Current milestone

M0 + M1 baseline:

- repository/governance foundation;
- runtime-independent normative protocol;
- JSON Schema Draft 2020-12 contracts;
- positive/negative fixtures;
- protocol TypeScript projection;
- architecture boundary checks.

See `docs/roadmap.md`.
