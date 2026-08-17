# Governance

## Normative authority

Normative semantics flow in this order:

```text
Design rationale / RFC
  -> Normative specification
  -> JSON Schema
  -> Fixtures
  -> TCK
  -> Reference implementation
  -> Acceptance audit
  -> Ready
```

The reference implementation is never the normative source of truth.

## Change classes

### Normative change

Any change that alters required behavior, schema semantics, state transitions,
security guarantees, verdict meaning, or compatibility expectations.

A normative change MUST update, as applicable:

- normative specification;
- JSON Schema;
- valid and invalid fixtures;
- TCK assertions;
- compatibility notes;
- changelog.

### Implementation change

An implementation-only optimization MAY proceed without a normative change only
when observable protocol behavior remains unchanged.

## Security posture

Security claims MUST name their guarantee level:

- `advisory`
- `tool-enforced`
- `provider-enforced`
- `process-isolated`

A lower level MUST NOT be marketed as a higher one.
