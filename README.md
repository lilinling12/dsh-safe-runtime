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
